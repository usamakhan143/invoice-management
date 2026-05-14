import { db, Timestamp, FieldPath } from "./firebase";
import { FirebaseHealth } from "./firebaseHealth";
import type { OutreachChannel, OutreachEvent } from "../types";
import type firebase from "firebase/compat/app";
import { localCalendarDayBoundsForDayKey } from "../utils/myCallActivityBusinessDay";

const BATCH_SIZE = 400;
/** Firestore `in` queries accept at most 30 disjunctions. */
const LEAD_ID_IN_CHUNK = 30;

/** Scan recent outreach docs (newest first) until we find a call row — bounded reads, uses companyId+leadId+createdAt index. */
const OUTREACH_RECENT_SCAN_CAP = 24;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const cap = Math.min(Math.max(1, limit), items.length);
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: cap }, () => worker()));
  return out;
}

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
  /**
   * Returns lead IDs (subset of `leadIds`) that have at least one outreach event with
   * channel `call`. Used for workspace queues (batched `in` queries).
   */
  /**
   * Call outreach events in `[start, endExclusive)` on `createdAt` (UTC instants).
   * Used by dashboard “My call activity” (local calendar or business workday windows).
   */
  static async fetchMyCallEventsForInstantRange(
    companyId: string,
    createdByUserId: string,
    start: Date,
    endExclusive: Date,
  ): Promise<OutreachEvent[]> {
    const cid = companyId.trim();
    const uid = createdByUserId.trim();
    if (!cid || !uid) return [];
    if (!(start instanceof Date) || !(endExclusive instanceof Date)) return [];
    if (endExclusive.getTime() <= start.getTime()) return [];

    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(endExclusive);

    const snap = await db
      .collection("outreachEvents")
      .where("companyId", "==", cid)
      .where("createdByUserId", "==", uid)
      .where("channel", "==", "call")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<", endTs)
      .get();

    return snap.docs.map(docToEvent);
  }

  /**
   * @deprecated Prefer `fetchMyCallEventsForInstantRange` + `localCalendarDayBoundsForDayKey` /
   * business workday helpers. Kept for call sites that still pass a calendar day key only.
   */
  static async fetchMyCallEventsForLocalDay(
    companyId: string,
    createdByUserId: string,
    dayKey: string,
  ): Promise<OutreachEvent[]> {
    const bounds = localCalendarDayBoundsForDayKey(dayKey);
    if (!bounds) return [];
    return OutreachService.fetchMyCallEventsForInstantRange(
      companyId,
      createdByUserId,
      bounds.start,
      bounds.endExclusive,
    );
  }

  /**
   * One-time fetch of outreach events for a single lead (newest first). Caps document reads for modals/lists.
   */
  static async fetchEventsByLead(
    companyId: string,
    leadId: string,
    options?: { maxDocs?: number },
  ): Promise<OutreachEvent[]> {
    const cid = companyId.trim();
    const lid = leadId.trim();
    if (!cid || !lid) return [];
    const max = Math.min(120, Math.max(1, options?.maxDocs ?? 60));
    const snap = await db
      .collection("outreachEvents")
      .where("companyId", "==", cid)
      .where("leadId", "==", lid)
      .orderBy("createdAt", "desc")
      .limit(max)
      .get();
    return snap.docs.map(docToEvent);
  }

  /**
   * Latest call-channel outreach outcome per lead (newest call event by `createdAt`).
   * Legacy `callLogs` are not included — merge with `LeadService.getLatestLegacyCallLogOutcome` in the UI if needed.
   */
  static async fetchLatestCallOutcomesForLeads(
    companyId: string,
    leadIds: string[],
    options?: { concurrency?: number },
  ): Promise<Map<string, string | null>> {
    const cid = companyId.trim();
    const unique = [...new Set(leadIds.map((id) => (id || "").trim()).filter(Boolean))];
    const out = new Map<string, string | null>();
    if (!cid || unique.length === 0) return out;
    const conc = Math.min(20, Math.max(1, options?.concurrency ?? 12));
    const pairs = await mapWithConcurrency(unique, conc, async (leadId) => {
      try {
        const snap = await db
          .collection("outreachEvents")
          .where("companyId", "==", cid)
          .where("leadId", "==", leadId)
          .orderBy("createdAt", "desc")
          .limit(OUTREACH_RECENT_SCAN_CAP)
          .get();
        for (const doc of snap.docs) {
          const ev = doc.data() as { channel?: string; outcome?: string | null };
          if (ev.channel !== "call") continue;
          const raw = ev.outcome;
          const o = raw != null && String(raw).trim() ? String(raw).trim() : null;
          return [leadId, o] as const;
        }
        return [leadId, null] as const;
      } catch (e) {
        console.error("[OutreachService] fetchLatestCallOutcomesForLeads:", leadId, e);
        return [leadId, null] as const;
      }
    });
    for (const [leadId, o] of pairs) out.set(leadId, o);
    return out;
  }

  /**
   * Counts call-channel outreach events per lead (for workspace “how many times called”).
   * Legacy `callLogs` are not included — add `LeadService.countLegacyCallLogs` per lead and sum.
   */
  static async fetchCallChannelCountsForLeads(
    companyId: string,
    leadIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const cid = companyId.trim();
    const unique = [...new Set(leadIds.map((id) => (id || "").trim()).filter(Boolean))];
    if (!cid || unique.length === 0) return counts;

    for (let i = 0; i < unique.length; i += LEAD_ID_IN_CHUNK) {
      const chunk = unique.slice(i, i + LEAD_ID_IN_CHUNK);
      // eslint-disable-next-line no-await-in-loop
      const snap = await db
        .collection("outreachEvents")
        .where("companyId", "==", cid)
        .where("channel", "==", "call")
        .where("leadId", "in", chunk)
        .get();
      for (const d of snap.docs) {
        const lid = (d.data() as { leadId?: string }).leadId;
        if (!lid) continue;
        counts.set(lid, (counts.get(lid) ?? 0) + 1);
      }
    }
    return counts;
  }

  /**
   * Latest call-channel outreach event per lead. Bounded reads, one query per visible lead.
   * Use for list rows where owner needs last outcome / caller / time without loading full timelines.
   */
  static async fetchLatestCallEventsForLeads(
    companyId: string,
    leadIds: string[],
    options?: { concurrency?: number },
  ): Promise<Map<string, OutreachEvent | null>> {
    const cid = companyId.trim();
    const unique = [...new Set(leadIds.map((id) => (id || "").trim()).filter(Boolean))];
    const out = new Map<string, OutreachEvent | null>();
    if (!cid || unique.length === 0) return out;
    const conc = Math.min(16, Math.max(1, options?.concurrency ?? 8));
    const pairs = await mapWithConcurrency(unique, conc, async (leadId) => {
      try {
        const snap = await db
          .collection("outreachEvents")
          .where("companyId", "==", cid)
          .where("leadId", "==", leadId)
          .orderBy("createdAt", "desc")
          .limit(OUTREACH_RECENT_SCAN_CAP)
          .get();
        for (const doc of snap.docs) {
          const ev = docToEvent(doc);
          if (ev.channel === "call") return [leadId, ev] as const;
        }
        return [leadId, null] as const;
      } catch (e) {
        console.error("[OutreachService] fetchLatestCallEventsForLeads:", leadId, e);
        return [leadId, null] as const;
      }
    });
    for (const [leadId, ev] of pairs) out.set(leadId, ev);
    return out;
  }

  static async getLeadIdsWithCallOutreach(
    companyId: string,
    leadIds: string[],
  ): Promise<Set<string>> {
    const out = new Set<string>();
    const unique = [...new Set(leadIds.filter(Boolean))];
    for (let i = 0; i < unique.length; i += LEAD_ID_IN_CHUNK) {
      const chunk = unique.slice(i, i + LEAD_ID_IN_CHUNK);
      const snap = await db
        .collection("outreachEvents")
        .where("companyId", "==", companyId)
        .where("channel", "==", "call")
        .where("leadId", "in", chunk)
        .get();
      snap.docs.forEach((d) => {
        const leadId = (d.data() as { leadId?: string }).leadId;
        if (leadId) out.add(leadId);
      });
    }
    return out;
  }

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

  /**
   * Recent call-channel events per lead (bounded: one query per lead, concurrency-limited).
   * For large lists, call with only visible / expanded lead IDs.
   */
  static async fetchCallEventsForLeads(
    companyId: string,
    leadIds: string[],
    options?: { maxPerLead?: number; concurrency?: number },
  ): Promise<Map<string, OutreachEvent[]>> {
    const cid = companyId.trim();
    const unique = [...new Set(leadIds.map((id) => (id || "").trim()).filter(Boolean))];
    const out = new Map<string, OutreachEvent[]>();
    if (!cid || unique.length === 0) return out;
    const maxPerLead = Math.min(100, Math.max(1, options?.maxPerLead ?? 30));
    const scanCap = Math.min(200, maxPerLead * 4);
    const conc = Math.min(12, Math.max(1, options?.concurrency ?? 6));
    const pairs = await mapWithConcurrency(unique, conc, async (leadId) => {
      const ev = await OutreachService.fetchEventsByLead(cid, leadId, { maxDocs: scanCap });
      const calls = ev.filter((e) => e.channel === "call").slice(0, maxPerLead);
      return [leadId, calls] as const;
    });
    for (const [leadId, calls] of pairs) {
      out.set(leadId, calls);
    }
    return out;
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
