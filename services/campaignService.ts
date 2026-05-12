import { db, Timestamp, FieldPath } from "./firebase";
import type { Campaign, CampaignStatus, CampaignTag } from "../types";
import type firebase from "firebase/compat/app";

const BATCH_SIZE = 400;

function docToCampaign(
  doc: firebase.firestore.QueryDocumentSnapshot | firebase.firestore.DocumentSnapshot,
): Campaign {
  return { id: doc.id, ...doc.data() } as Campaign;
}

function docToTag(
  doc: firebase.firestore.QueryDocumentSnapshot | firebase.firestore.DocumentSnapshot,
): CampaignTag {
  return { id: doc.id, ...doc.data() } as CampaignTag;
}

function makeSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export class CampaignService {
  // ─── Campaigns ────────────────────────────────────────────────────────────

  /**
   * Real-time stream of all campaigns for a company, sorted by updatedAt desc.
   * Requires composite index: companyId ASC, updatedAt DESC.
   */
  static subscribe(
    companyId: string,
    callback: (campaigns: Campaign[]) => void,
  ): () => void {
    return db
      .collection("campaigns")
      .where("companyId", "==", companyId)
      .orderBy("updatedAt", "desc")
      .onSnapshot(
        (snap) => callback(snap.docs.map(docToCampaign)),
        (err) => console.error("[CampaignService] subscribe:", err),
      );
  }

  static async create(
    companyId: string,
    data: { name: string; description?: string; channelsHint?: string },
    createdById: string,
  ): Promise<string> {
    const now = Timestamp.now();
    const ref = await db.collection("campaigns").add({
      companyId,
      name: data.name.trim(),
      description: data.description?.trim() ?? "",
      channelsHint: data.channelsHint?.trim() ?? "",
      status: "active" as CampaignStatus,
      createdAt: now,
      updatedAt: now,
      createdById,
    });
    return ref.id;
  }

  static async update(
    campaignId: string,
    patch: Partial<{ name: string; description: string; channelsHint: string; status: CampaignStatus }>,
  ): Promise<void> {
    const clean: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (patch.name !== undefined) clean.name = patch.name.trim();
    if (patch.description !== undefined) clean.description = patch.description.trim();
    if (patch.channelsHint !== undefined) clean.channelsHint = patch.channelsHint.trim();
    if (patch.status !== undefined) clean.status = patch.status;
    await db.collection("campaigns").doc(campaignId).update(clean);
  }

  /**
   * Delete a campaign and **all** its tags.
   * Does NOT remove campaignId/campaignTagIds from leads — those become stale refs,
   * which the UI handles gracefully (shows nothing if campaign not found).
   */
  static async delete(campaignId: string): Promise<void> {
    const tagsSnap = await db
      .collection("campaignTags")
      .where("campaignId", "==", campaignId)
      .get();
    const batch = db.batch();
    tagsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(db.collection("campaigns").doc(campaignId));
    await batch.commit();
  }

  /** One-time fetch (for dropdowns / detail loads). */
  static async getById(campaignId: string): Promise<Campaign | null> {
    const doc = await db.collection("campaigns").doc(campaignId).get();
    if (!doc.exists) return null;
    return docToCampaign(doc);
  }

  /** Paginated export for backup. */
  static async getAllForCompany(companyId: string): Promise<Campaign[]> {
    const acc: Campaign[] = [];
    let last: firebase.firestore.QueryDocumentSnapshot | null = null;
    for (;;) {
      let q = db
        .collection("campaigns")
        .where("companyId", "==", companyId)
        .orderBy(FieldPath.documentId())
        .limit(BATCH_SIZE) as firebase.firestore.Query;
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      snap.docs.forEach((d) => acc.push(docToCampaign(d)));
      if (snap.size < BATCH_SIZE) break;
      last = snap.docs[snap.docs.length - 1];
    }
    return acc;
  }

  // ─── Campaign Tags ─────────────────────────────────────────────────────────

  /**
   * Real-time stream of tags for a single campaign, ordered by sortOrder.
   * `companyId` must be included so Firestore security rules can validate the query.
   * Requires composite index: companyId ASC, campaignId ASC, sortOrder ASC.
   */
  static subscribeTags(
    companyId: string,
    campaignId: string,
    callback: (tags: CampaignTag[]) => void,
  ): () => void {
    return db
      .collection("campaignTags")
      .where("companyId", "==", companyId)
      .where("campaignId", "==", campaignId)
      .orderBy("sortOrder", "asc")
      .onSnapshot(
        (snap) => callback(snap.docs.map(docToTag)),
        (err) => console.error("[CampaignService] subscribeTags:", err),
      );
  }

  static async getTagsForCampaign(companyId: string, campaignId: string): Promise<CampaignTag[]> {
    const snap = await db
      .collection("campaignTags")
      .where("companyId", "==", companyId)
      .where("campaignId", "==", campaignId)
      .orderBy("sortOrder", "asc")
      .get();
    return snap.docs.map(docToTag);
  }

  static async createTag(data: {
    companyId: string;
    campaignId: string;
    label: string;
    color?: string;
    description?: string;
    sortOrder?: number;
  }): Promise<string> {
    const ref = await db.collection("campaignTags").add({
      companyId: data.companyId,
      campaignId: data.campaignId,
      slug: makeSlug(data.label),
      label: data.label.trim(),
      color: data.color ?? "gray",
      description: data.description?.trim() ?? "",
      sortOrder: data.sortOrder ?? Date.now(),
      createdAt: Timestamp.now(),
    });
    return ref.id;
  }

  static async updateTag(
    tagId: string,
    patch: Partial<{ label: string; color: string; description: string; sortOrder: number }>,
  ): Promise<void> {
    const clean: Record<string, unknown> = {};
    if (patch.label !== undefined) {
      clean.label = patch.label.trim();
      clean.slug = makeSlug(patch.label);
    }
    if (patch.color !== undefined) clean.color = patch.color;
    if (patch.description !== undefined) clean.description = patch.description.trim();
    if (patch.sortOrder !== undefined) clean.sortOrder = patch.sortOrder;
    await db.collection("campaignTags").doc(tagId).update(clean);
  }

  static async deleteTag(tagId: string): Promise<void> {
    await db.collection("campaignTags").doc(tagId).delete();
  }

  /** Paginated export for backup (all tags across all campaigns for a company). */
  static async getAllTagsForCompany(companyId: string): Promise<CampaignTag[]> {
    const acc: CampaignTag[] = [];
    let last: firebase.firestore.QueryDocumentSnapshot | null = null;
    for (;;) {
      let q = db
        .collection("campaignTags")
        .where("companyId", "==", companyId)
        .orderBy(FieldPath.documentId())
        .limit(BATCH_SIZE) as firebase.firestore.Query;
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      snap.docs.forEach((d) => acc.push(docToTag(d)));
      if (snap.size < BATCH_SIZE) break;
      last = snap.docs[snap.docs.length - 1];
    }
    return acc;
  }
}
