import { db, Timestamp } from "./firebase";
import { FirebaseHealth } from "./firebaseHealth";
import type { Business } from "../types";
import type firebase from "firebase/compat/app";

export class BusinessService {
  static resolveCompanyId(
    user: firebase.User,
    userProfile: { isOwner?: boolean; companyId?: string },
  ): string {
    return userProfile?.isOwner ? user.uid : userProfile?.companyId || user.uid;
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
}
