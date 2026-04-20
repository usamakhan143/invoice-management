import { db, Timestamp, FieldPath } from "./firebase";
import { FirebaseHealth } from "./firebaseHealth";
import type { OutreachChannel, OutreachEvent } from "../types";
import type firebase from "firebase/compat/app";

const BATCH_SIZE = 400;

function docToEvent(
  doc: firebase.firestore.QueryDocumentSnapshot | firebase.firestore.DocumentSnapshot,
): OutreachEvent {
  return { id: doc.id, ...doc.data() } as OutreachEvent;
}

export class OutreachService {
  /**
   * Real-time stream of outreach events for a single lead, newest first.
   * Requires the composite index: companyId ASC, leadId ASC, createdAt DESC.
   */
  static subscribeByLead(
    companyId: string,
    leadId: string,
    callback: (events: OutreachEvent[]) => void,
  ): () => void {
    return db
      .collection("outreachEvents")
      .where("companyId", "==", companyId)
      .where("leadId", "==", leadId)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => callback(snap.docs.map(docToEvent)),
        (err) => console.error("[OutreachService] subscribeByLead:", err),
      );
  }

  /**
   * Add a new outreach event. If nextFollowUpDate is set, propagates it to the
   * lead document as well (same behaviour as the old callLogs flow).
   */
  static async addEvent(params: {
    companyId: string;
    leadId: string;
    channel: OutreachChannel;
    notes: string;
    outcome?: string | null;
    nextFollowUpDate?: firebase.firestore.Timestamp | null;
    createdByUserId: string;
    createdByDisplayName: string;
    campaignId?: string | null;
    campaignTagIds?: string[];
  }): Promise<void> {
    const {
      companyId,
      leadId,
      channel,
      notes,
      outcome,
      nextFollowUpDate,
      createdByUserId,
      createdByDisplayName,
      campaignId,
      campaignTagIds,
    } = params;

    const payload: Omit<OutreachEvent, "id"> = {
      companyId,
      leadId,
      channel,
      notes: notes?.trim() ?? "",
      createdAt: Timestamp.now(),
      createdByUserId,
      createdByDisplayName,
    };

    if (outcome !== undefined) payload.outcome = outcome ?? null;
    if (nextFollowUpDate !== undefined) payload.nextFollowUpDate = nextFollowUpDate;
    if (campaignId) payload.campaignId = campaignId;
    if (campaignTagIds?.length) payload.campaignTagIds = campaignTagIds;

    await db.collection("outreachEvents").add(payload);

    if (nextFollowUpDate) {
      await FirebaseHealth.safeSetDocument("leads", leadId, {
        nextFollowUpDate,
        updatedAt: Timestamp.now(),
      });
    }
  }

  /** Delete a single outreach event. */
  static async deleteEvent(eventId: string): Promise<void> {
    await db.collection("outreachEvents").doc(eventId).delete();
  }

  /** Admin QA: recording/reference and call verification fields. */
  static async updateAdminFields(
    eventId: string,
    patch: {
      recordingRef?: string | null;
      callVerifiedAt?: firebase.firestore.Timestamp | null;
      callVerifiedByUserId?: string | null;
    },
  ): Promise<void> {
    const clean: Record<string, unknown> = {};
    if (patch.recordingRef !== undefined) {
      const t = typeof patch.recordingRef === "string" ? patch.recordingRef.trim() : "";
      clean.recordingRef = t || null;
    }
    if (patch.callVerifiedAt !== undefined) clean.callVerifiedAt = patch.callVerifiedAt;
    if (patch.callVerifiedByUserId !== undefined) clean.callVerifiedByUserId = patch.callVerifiedByUserId;
    await db.collection("outreachEvents").doc(eventId).update(clean);
  }

  /**
   * Batch-delete all outreach events for a lead (called when the lead itself is deleted).
   * Runs in pages of BATCH_SIZE to handle large timelines.
   */
  static async batchDeleteByLead(leadId: string): Promise<void> {
    let snap = await db
      .collection("outreachEvents")
      .where("leadId", "==", leadId)
      .limit(BATCH_SIZE)
      .get();

    while (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      snap = await db
        .collection("outreachEvents")
        .where("leadId", "==", leadId)
        .limit(BATCH_SIZE)
        .get();
    }
  }

  /**
   * Paginated one-time fetch of all outreach events for a company (used by backup).
   */
  static async getAllForCompany(companyId: string): Promise<OutreachEvent[]> {
    const acc: OutreachEvent[] = [];
    let last: firebase.firestore.QueryDocumentSnapshot | null = null;
    for (;;) {
      let q = db
        .collection("outreachEvents")
        .where("companyId", "==", companyId)
        .orderBy(FieldPath.documentId())
        .limit(BATCH_SIZE) as firebase.firestore.Query;
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      snap.docs.forEach((d) => acc.push(docToEvent(d)));
      if (snap.size < BATCH_SIZE) break;
      last = snap.docs[snap.docs.length - 1];
    }
    return acc;
  }
}
