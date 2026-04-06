import { db, Timestamp } from "./firebase";
import { resolveCompanyIdForUser } from "./companyId";
import { FirebaseHealth } from "./firebaseHealth";
import type { Business } from "../types";
import type firebase from "firebase/compat/app";

export class BusinessService {
  static resolveCompanyId(
    user: firebase.User,
    userProfile: { isOwner?: boolean; companyId?: string },
  ): string {
    return resolveCompanyIdForUser(user, userProfile);
  }

  static async listByCustomer(
    customerId: string,
    companyId: string,
  ): Promise<Business[]> {
    try {
      const snap = await db
        .collection("businesses")
        .where("companyId", "==", companyId)
        .where("customerId", "==", customerId)
        .get();
      return snap.docs.map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
          }) as Business,
      );
    } catch (e) {
      console.error("listByCustomer businesses:", e);
      return [];
    }
  }

  static async createBusiness(
    data: {
      customerId: string;
      name: string;
      phone?: string;
      email?: string;
      notes?: string;
    },
    user: firebase.User,
    userProfile: { isOwner?: boolean; companyId?: string },
  ): Promise<string> {
    const companyId = this.resolveCompanyId(user, userProfile);
    if (!companyId) {
      throw new Error("Company is still loading. Wait a moment and try again.");
    }
    const id = await FirebaseHealth.safeAddDocument("businesses", {
      companyId,
      customerId: data.customerId,
      name: data.name,
      phone: data.phone?.trim() || "",
      email: data.email?.trim() || "",
      notes: data.notes?.trim() || "",
      createdById: user.uid,
      createdAt: Timestamp.now(),
    });
    if (!id) throw new Error("Failed to create business");
    return id;
  }

  static async updateBusiness(
    businessId: string,
    companyId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      notes?: string;
    },
  ): Promise<void> {
    const id = (businessId || "").trim();
    const cid = (companyId || "").trim();
    if (!id || !cid) {
      throw new Error("Invalid business or company");
    }
    const ref = db.collection("businesses").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error("Business not found");
    }
    if ((snap.data() as Business).companyId !== cid) {
      throw new Error("Business does not belong to this company");
    }
    const patch: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    };
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.phone !== undefined) patch.phone = data.phone?.trim() || "";
    if (data.email !== undefined) patch.email = data.email?.trim() || "";
    if (data.notes !== undefined) patch.notes = data.notes?.trim() || "";
    await FirebaseHealth.safeSetDocument("businesses", id, patch);
  }

  /**
   * Remove a business and clear references on leads that pointed to it (same company only).
   */
  static async deleteBusiness(
    businessId: string,
    companyId: string,
  ): Promise<void> {
    const id = (businessId || "").trim();
    const cid = (companyId || "").trim();
    if (!id || !cid) {
      throw new Error("Invalid business or company");
    }

    const ref = db.collection("businesses").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return;
    }
    const row = snap.data() as Business;
    if (row.companyId !== cid) {
      throw new Error("Business does not belong to this company");
    }

    const byLeadId = new Map<string, firebase.firestore.QueryDocumentSnapshot>();
    try {
      const [linkedSnap, convertedSnap] = await Promise.all([
        db.collection("leads").where("linkedBusinessId", "==", id).get(),
        db.collection("leads").where("convertedBusinessId", "==", id).get(),
      ]);
      linkedSnap.docs.forEach((d) => {
        const ld = d.data() as { companyId?: string };
        if ((ld.companyId || "").trim() === cid) {
          byLeadId.set(d.id, d);
        }
      });
      convertedSnap.docs.forEach((d) => {
        const ld = d.data() as { companyId?: string };
        if ((ld.companyId || "").trim() === cid) {
          byLeadId.set(d.id, d);
        }
      });
    } catch (e) {
      console.error("deleteBusiness: lead lookup failed", e);
      throw e;
    }

    const leadDocs = [...byLeadId.values()];
    const MAX_OPS = 450;
    let batch = db.batch();
    let ops = 0;

    const commitBatch = async () => {
      if (ops === 0) return;
      await batch.commit();
      batch = db.batch();
      ops = 0;
    };

    for (const docSnap of leadDocs) {
      const ld = docSnap.data() as {
        linkedBusinessId?: string | null;
        convertedBusinessId?: string | null;
      };
      const patch: Record<string, unknown> = { updatedAt: Timestamp.now() };
      if ((ld.linkedBusinessId || "").trim() === id) {
        patch.linkedBusinessId = null;
      }
      if ((ld.convertedBusinessId || "").trim() === id) {
        patch.convertedBusinessId = null;
      }
      if (Object.keys(patch).length > 1) {
        batch.update(docSnap.ref, patch);
        ops++;
        if (ops >= MAX_OPS) await commitBatch();
      }
    }

    batch.delete(ref);
    ops++;
    if (ops >= MAX_OPS) await commitBatch();

    await commitBatch();
  }
}
