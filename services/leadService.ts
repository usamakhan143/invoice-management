import { db, Timestamp } from "./firebase";
import { resolveCompanyIdForUser } from "./companyId";
import { FirebaseHealth } from "./firebaseHealth";
import { CustomerService } from "./customerService";
import { BusinessService } from "./businessService";
import type {
  Lead,
  LeadAssignmentEvent,
  LeadCallLog,
  LeadCallOutcome,
  LeadExtras,
  LeadStatus,
  Customer,
} from "../types";
import { normalizeLeadTargetSalesGender } from "../config/leadTargetSalesGender";
import type firebase from "firebase/compat/app";

function normalizePhone(phone?: string): string | undefined {
  if (!phone?.trim()) return undefined;
  const digits = phone.replace(/\D/g, "");
  return digits.length ? digits : undefined;
}

function normalizeEmail(email?: string): string | undefined {
  const t = email?.trim().toLowerCase();
  return t || undefined;
}

/** Min digits (after stripping non-digits) before we show “possible duplicate” for phone. Avoids hints on “+1 ” / “+92 ” only. */
const MIN_PHONE_DIGITS_FOR_DUPLICATE_HINT = 8;

function docToLead(doc: firebase.firestore.QueryDocumentSnapshot | firebase.firestore.DocumentSnapshot): Lead {
  const data = doc.data() as Record<string, unknown>;
  return {
    id: doc.id,
    ...data,
  } as Lead;
}

const loggedFirestoreIndexErrors = new Set<string>();

function logFirestoreQueryError(scope: string, err: unknown): void {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  if (code === "failed-precondition") {
    if (loggedFirestoreIndexErrors.has(scope)) return;
    loggedFirestoreIndexErrors.add(scope);
    const msg =
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: string }).message)
        : "";
    console.warn(
      `[LeadService] Firestore index missing or still building (${scope}). ` +
        "Deploy `firestore.indexes.json` (firebase deploy --only firestore:indexes) or open the link in the message below; wait until indexes are Enabled.",
      msg || err,
    );
    return;
  }
  console.error(`[LeadService] ${scope}:`, err);
}

function mergeLeadSnapshots(
  docs: firebase.firestore.QueryDocumentSnapshot[],
): Lead[] {
  const map = new Map<string, Lead>();
  for (const d of docs) {
    map.set(d.id, docToLead(d));
  }
  return Array.from(map.values()).sort((a, b) => {
    const aT = a.createdAt?.toMillis?.() ?? 0;
    const bT = b.createdAt?.toMillis?.() ?? 0;
    return bT - aT;
  });
}

export class LeadService {
  static resolveCompanyId(user: firebase.User, userProfile: { isOwner?: boolean; companyId?: string }): string {
    return resolveCompanyIdForUser(user, userProfile);
  }

  /** Scoped list: assigned to user OR created by user. */
  static userCanViewLead(lead: Lead, userId: string, viewAll: boolean): boolean {
    if (viewAll) return true;
    return lead.assignedUserId === userId || lead.createdById === userId;
  }

  static async getLeads(
    user: firebase.User,
    userProfile: { isOwner?: boolean; companyId?: string },
    viewAll: boolean,
  ): Promise<Lead[]> {
    const companyId = this.resolveCompanyId(user, userProfile);
    if (!companyId) {
      return [];
    }
    try {
      if (viewAll) {
        const snap = await db
          .collection("leads")
          .where("companyId", "==", companyId)
          .orderBy("createdAt", "desc")
          .get();
        return snap.docs.map((doc) => docToLead(doc));
      }

      const [assignedSnap, createdSnap] = await Promise.all([
        db
          .collection("leads")
          .where("companyId", "==", companyId)
          .where("assignedUserId", "==", user.uid)
          .orderBy("createdAt", "desc")
          .get(),
        db
          .collection("leads")
          .where("companyId", "==", companyId)
          .where("createdById", "==", user.uid)
          .orderBy("createdAt", "desc")
          .get(),
      ]);
      return mergeLeadSnapshots([...assignedSnap.docs, ...createdSnap.docs]);
    } catch (e) {
      logFirestoreQueryError("getLeads", e);
      return [];
    }
  }

  static getLeadsRealTime(
    user: firebase.User,
    userProfile: { isOwner?: boolean; companyId?: string },
    viewAll: boolean,
    callback: (leads: Lead[]) => void,
  ): () => void {
    const companyId = this.resolveCompanyId(user, userProfile);
    if (!companyId) {
      callback([]);
      return () => {};
    }

    if (viewAll) {
      return db
        .collection("leads")
        .where("companyId", "==", companyId)
        .orderBy("createdAt", "desc")
        .onSnapshot(
          (snap) => callback(snap.docs.map((d) => docToLead(d))),
          (err) => {
            logFirestoreQueryError("getLeadsRealTime viewAll", err);
            callback([]);
          },
        );
    }

    let assigned: Lead[] = [];
    let created: Lead[] = [];

    const emit = () => {
      const byId = new Map<string, Lead>();
      [...assigned, ...created].forEach((l) => byId.set(l.id, l));
      callback(
        Array.from(byId.values()).sort((a, b) => {
          const aT = a.createdAt?.toMillis?.() ?? 0;
          const bT = b.createdAt?.toMillis?.() ?? 0;
          return bT - aT;
        }),
      );
    };

    const unSubA = db
      .collection("leads")
      .where("companyId", "==", companyId)
      .where("assignedUserId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => {
          assigned = snap.docs.map((d) => docToLead(d));
          emit();
        },
        (err) => {
          logFirestoreQueryError("getLeadsRealTime assigned", err);
          assigned = [];
          emit();
        },
      );

    const unSubC = db
      .collection("leads")
      .where("companyId", "==", companyId)
      .where("createdById", "==", user.uid)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => {
          created = snap.docs.map((d) => docToLead(d));
          emit();
        },
        (err) => {
          logFirestoreQueryError("getLeadsRealTime createdBy", err);
          created = [];
          emit();
        },
      );

    return () => {
      unSubA();
      unSubC();
    };
  }

  static async getLeadById(leadId: string): Promise<Lead | null> {
    const doc = await db.collection("leads").doc(leadId).get();
    if (!doc.exists) return null;
    return docToLead(doc);
  }

  static async saveLead(
    data: Partial<Lead> & {
      source: string;
      status?: LeadStatus;
      assignedUserId?: string;
    },
    user: firebase.User,
    userProfile: { displayName?: string; companyName?: string; email?: string | null; isOwner?: boolean; companyId?: string },
    leadId?: string,
  ): Promise<string> {
    const companyId = this.resolveCompanyId(user, userProfile);
    if (!companyId) {
      throw new Error("Company is still loading. Wait a moment and try again, or sign out and back in.");
    }

    const phoneNorm = normalizePhone(data.phone);
    const emailNorm = normalizeEmail(data.email);

    const payload: Record<string, unknown> = {
      name: data.name?.trim() || "",
      company: data.company?.trim() || "",
      country: data.country?.trim() || "",
      category: data.category?.trim() || "",
      phone: data.phone?.trim() || "",
      email: data.email?.trim() || "",
      source: data.source?.trim() || "",
      status: data.status || "New",
      notes: data.notes?.trim() || "",
      nextFollowUpDate: data.nextFollowUpDate ?? null,
      companyId,
      extras: data.extras || {},
      linkedCustomerId: data.linkedCustomerId ?? null,
      linkedBusinessId: data.linkedBusinessId ?? null,
      phoneNormalized: phoneNorm || null,
      emailNormalized: emailNorm || null,
      targetSalesGender: normalizeLeadTargetSalesGender(data.targetSalesGender),
      updatedAt: Timestamp.now(),
    };

    if (!leadId) {
      payload.assignedUserId =
        typeof data.assignedUserId === "string" ? data.assignedUserId : "";
    } else if (data.assignedUserId !== undefined && data.assignedUserId !== null) {
      payload.assignedUserId = data.assignedUserId;
    }

    if (leadId) {
      await FirebaseHealth.safeSetDocument("leads", leadId, payload);
      return leadId;
    }

    const createPayload = {
      ...payload,
      createdById: user.uid,
      createdAt: Timestamp.now(),
      convertedCustomerId: null,
      convertedBusinessId: null,
    };

    const id = await FirebaseHealth.safeAddDocument("leads", createPayload);
    if (!id) throw new Error("Failed to create lead");
    return id;
  }

  static async deleteLead(leadId: string): Promise<void> {
    const ok = await FirebaseHealth.safeDeleteDocument("leads", leadId);
    if (!ok) throw new Error("Failed to delete lead");
  }

  static async getCallLogs(leadId: string): Promise<LeadCallLog[]> {
    const snap = await db
      .collection("leads")
      .doc(leadId)
      .collection("callLogs")
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeadCallLog));
  }

  static subscribeCallLogs(
    leadId: string,
    callback: (logs: LeadCallLog[]) => void,
  ): () => void {
    return db
      .collection("leads")
      .doc(leadId)
      .collection("callLogs")
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) =>
          callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeadCallLog))),
        (e) => console.error("callLogs listener:", e),
      );
  }

  static async addCallLog(
    leadId: string,
    outcome: LeadCallOutcome,
    notes: string,
    nextFollowUpDate: firebase.firestore.Timestamp | null,
    user: firebase.User,
    userProfile: { displayName?: string; companyName?: string; email?: string | null },
  ): Promise<void> {
    const createdBy =
      userProfile?.displayName || userProfile?.companyName || user.email || "User";
    await db
      .collection("leads")
      .doc(leadId)
      .collection("callLogs")
      .add({
        outcome,
        notes: notes?.trim() || "",
        nextFollowUpDate,
        createdAt: Timestamp.now(),
        createdBy,
      });

    if (nextFollowUpDate) {
      await FirebaseHealth.safeSetDocument("leads", leadId, {
        nextFollowUpDate,
        updatedAt: Timestamp.now(),
      });
    }
  }

  static async deleteCallLog(leadId: string, logId: string): Promise<void> {
    await db.collection("leads").doc(leadId).collection("callLogs").doc(logId).delete();
  }

  /** Admin QA: recording/reference + verification flags on an existing call log */
  static async updateCallLogAdminFields(
    leadId: string,
    logId: string,
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
    if (patch.callVerifiedByUserId !== undefined) {
      clean.callVerifiedByUserId = patch.callVerifiedByUserId;
    }
    await db.collection("leads").doc(leadId).collection("callLogs").doc(logId).update(clean);
  }

  static async getAssignmentEvents(leadId: string): Promise<LeadAssignmentEvent[]> {
    const snap = await db
      .collection("leads")
      .doc(leadId)
      .collection("assignmentEvents")
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeadAssignmentEvent));
  }

  static subscribeAssignmentEvents(
    leadId: string,
    callback: (events: LeadAssignmentEvent[]) => void,
  ): () => void {
    return db
      .collection("leads")
      .doc(leadId)
      .collection("assignmentEvents")
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) =>
          callback(
            snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeadAssignmentEvent)),
          ),
        (e) => console.error("assignmentEvents listener:", e),
      );
  }

  static async assignLead(
    leadId: string,
    fromUserId: string | null,
    toUserId: string,
    assignedByUserId: string,
    reason?: string,
  ): Promise<void> {
    const toId = (toUserId || "").trim();
    if (!toId) {
      throw new Error("assignLead: assignee user id is required");
    }
    const batch = db.batch();
    const leadRef = db.collection("leads").doc(leadId);
    batch.update(leadRef, {
      assignedUserId: toId,
      updatedAt: Timestamp.now(),
    });
    const evRef = leadRef.collection("assignmentEvents").doc();
    batch.set(evRef, {
      fromUserId,
      toUserId: toId,
      assignedByUserId,
      reason: reason?.trim() || "",
      createdAt: Timestamp.now(),
    });
    await batch.commit();
  }

  static async updateLeadFields(
    leadId: string,
    patch: Partial<{
      name: string;
      company: string;
      country: string;
      category: string;
      phone: string;
      email: string;
      source: string;
      status: LeadStatus;
      notes: string;
      nextFollowUpDate: firebase.firestore.Timestamp | null;
      extras: LeadExtras;
      linkedCustomerId: string | null;
      linkedBusinessId: string | null;
      assignedUserId: string;
      targetSalesGender: string;
    }>,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      ...patch,
      updatedAt: Timestamp.now(),
    };
    if (patch.phone !== undefined) {
      update.phoneNormalized = normalizePhone(patch.phone) || null;
    }
    if (patch.email !== undefined) {
      update.emailNormalized = normalizeEmail(patch.email) || null;
    }
    await FirebaseHealth.safeSetDocument("leads", leadId, update);
  }

  static isPhoneSufficientForDuplicateHint(phone?: string): boolean {
    const d = normalizePhone(phone);
    return !!d && d.length >= MIN_PHONE_DIGITS_FOR_DUPLICATE_HINT;
  }

  /** Local@something with at least 2 chars in domain — skips “a@” while typing. */
  static isEmailSufficientForDuplicateHint(email?: string): boolean {
    const t = email?.trim() ?? "";
    if (!t.includes("@")) return false;
    const [local, domain = ""] = t.split("@");
    return local.length >= 1 && domain.trim().length >= 2;
  }

  /** In-memory match for duplicate hints (same company customers already loaded). */
  static findCustomersMatchingContact(
    customers: Customer[],
    phone?: string,
    email?: string,
  ): Customer[] {
    const p = normalizePhone(phone);
    const e = normalizeEmail(email);
    if (!p && !e) return [];
    return customers.filter((c) => {
      const cp = normalizePhone(c.phone);
      const ce = normalizeEmail(c.email);
      if (p && cp && p === cp) return true;
      if (e && ce && e === ce) return true;
      return false;
    });
  }

  /** In-memory duplicate hints against leads already loaded for the list. */
  static findLeadsMatchingContact(
    leads: Lead[],
    phone?: string,
    email?: string,
  ): Lead[] {
    const p = normalizePhone(phone);
    const e = normalizeEmail(email);
    if (!p && !e) return [];
    return leads.filter((l) => {
      const lp = normalizePhone(l.phone);
      const le = normalizeEmail(l.email);
      if (p && lp && p === lp) return true;
      if (e && le && e === le) return true;
      return false;
    });
  }

  /**
   * Real-time stream of leads assigned to the current user in their company.
   */
  static getLeadsAssignedToMeRealTime(
    user: firebase.User,
    userProfile: { isOwner?: boolean; companyId?: string },
    callback: (leads: Lead[]) => void,
  ): () => void {
    const companyId = this.resolveCompanyId(user, userProfile);
    if (!companyId) {
      callback([]);
      return () => {};
    }
    return db
      .collection("leads")
      .where("companyId", "==", companyId)
      .where("assignedUserId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => callback(snap.docs.map((d) => docToLead(d))),
        (err) => {
          logFirestoreQueryError("getLeadsAssignedToMeRealTime", err);
          callback([]);
        },
      );
  }

  /**
   * When `toUserId` last appeared as assignee in assignment history (most recent matching event).
   */
  static async getLastAssignmentToUserAsAssignee(
    leadId: string,
    toUserId: string,
  ): Promise<firebase.firestore.Timestamp | null> {
    try {
      const snap = await db
        .collection("leads")
        .doc(leadId)
        .collection("assignmentEvents")
        .orderBy("createdAt", "desc")
        .limit(40)
        .get();
      for (const docSnap of snap.docs) {
        const d = docSnap.data() as { toUserId?: string; createdAt?: firebase.firestore.Timestamp };
        if (d.toUserId === toUserId && d.createdAt) return d.createdAt;
      }
    } catch (e) {
      console.error("getLastAssignmentToUserAsAssignee", leadId, e);
    }
    return null;
  }

  /**
   * Company leads that reference this customer (Won conversion and/or CRM link).
   */
  static async findLeadsForCustomer(
    customerId: string,
    companyId: string,
  ): Promise<Lead[]> {
    const id = (customerId || "").trim();
    const cid = (companyId || "").trim();
    if (!id || !cid) {
      return [];
    }
    try {
      const [linkedSnap, convertedSnap] = await Promise.all([
        db
          .collection("leads")
          .where("companyId", "==", cid)
          .where("linkedCustomerId", "==", id)
          .get(),
        db
          .collection("leads")
          .where("companyId", "==", cid)
          .where("convertedCustomerId", "==", id)
          .get(),
      ]);
      return mergeLeadSnapshots([...linkedSnap.docs, ...convertedSnap.docs]);
    } catch (e) {
      logFirestoreQueryError("findLeadsForCustomer", e);
      return [];
    }
  }

  /**
   * Convert Won lead → customer (+ optional business). Does not delete the lead.
   */
  static async convertWonLead(
    lead: Lead,
    user: firebase.User,
    userProfile: { displayName?: string; companyName?: string; email?: string | null; isOwner?: boolean; companyId?: string },
    options: {
      createBusiness: boolean;
      businessName?: string;
    },
  ): Promise<{ customerId: string; businessId?: string }> {
    if (lead.status !== "Won") {
      throw new Error("Only leads in Won status can be converted");
    }
    if (lead.convertedCustomerId) {
      throw new Error("Lead is already converted");
    }

    const name =
      lead.name?.trim() ||
      lead.company?.trim() ||
      "Converted lead";
    const email = lead.email?.trim() || `converted-${lead.id}@placeholder.local`;
    const phone = lead.phone?.trim() || "";
    const address = lead.extras?.address?.trim() || "";

    const customerId = await CustomerService.saveCustomer(
      { name, email, phone, address },
      user,
      userProfile,
      undefined,
    );

    let businessId: string | undefined;
    if (options.createBusiness && options.businessName?.trim()) {
      businessId = await BusinessService.createBusiness(
        {
          customerId,
          name: options.businessName.trim(),
          phone: lead.phone?.trim(),
          email: lead.email?.trim(),
          notes: lead.notes,
        },
        user,
        userProfile,
      );
    }

    await FirebaseHealth.safeSetDocument("leads", lead.id, {
      convertedCustomerId: customerId,
      convertedBusinessId: businessId || null,
      linkedCustomerId: lead.linkedCustomerId || customerId,
      linkedBusinessId: businessId ? businessId : lead.linkedBusinessId ?? null,
      updatedAt: Timestamp.now(),
    });

    return { customerId, businessId };
  }
}
