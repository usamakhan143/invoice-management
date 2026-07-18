import type firebase from "firebase/compat/app";
import type { UserReadPort } from "../../../integration/ports/UserReadPort";
import type { CompanyId } from "../../../types";
import { ERP_READ_COLLECTIONS } from "./collections";
import { isCompanyOwnerUser } from "./companyScope";
import { runAosFirestoreOperation } from "../firestore/errors";

interface ResolvedCompanyUser {
  displayName: string;
  email?: string;
}

export class UserReadAdapter implements UserReadPort {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  async userExists(companyId: CompanyId, userId: string): Promise<boolean> {
    const summary = await this.getUserSummary(companyId, userId);
    return summary !== null;
  }

  async getUserSummary(
    companyId: CompanyId,
    userId: string,
  ): Promise<{ displayName: string; email?: string } | null> {
    return runAosFirestoreOperation("UserReadAdapter.getUserSummary", async () => {
      const resolved = await this.resolveCompanyUser(companyId, userId);
      return resolved;
    });
  }

  private async resolveCompanyUser(
    companyId: CompanyId,
    userId: string,
  ): Promise<ResolvedCompanyUser | null> {
    if (isCompanyOwnerUser(companyId, userId)) {
      const ownerSnap = await this.firestore
        .collection(ERP_READ_COLLECTIONS.USERS)
        .doc(companyId)
        .get();
      if (!ownerSnap.exists) return null;

      const data = ownerSnap.data();
      const displayName = String(
        data?.displayName ?? data?.companyName ?? data?.email ?? "",
      ).trim();
      if (!displayName) return null;

      return {
        displayName,
        email: data?.email ? String(data.email) : undefined,
      };
    }

    const userSnap = await this.firestore.collection(ERP_READ_COLLECTIONS.USERS).doc(userId).get();
    if (userSnap.exists) {
      const data = userSnap.data();
      if (data && String(data.companyId ?? "") === companyId) {
        const displayName = String(
          data.displayName ?? data.companyName ?? data.email ?? "",
        ).trim();
        if (!displayName) return null;

        return {
          displayName,
          email: data.email ? String(data.email) : undefined,
        };
      }
    }

    const membershipSnap = await this.firestore
      .collection(ERP_READ_COLLECTIONS.COMPANY_USERS)
      .where("companyId", "==", companyId)
      .where("uid", "==", userId)
      .limit(1)
      .get();

    if (membershipSnap.empty) return null;

    const membership = membershipSnap.docs[0].data();
    const userData = userSnap.exists ? userSnap.data() : undefined;

    const displayName = String(
      membership.displayName ?? userData?.displayName ?? membership.email ?? userData?.email ?? "",
    ).trim();
    if (!displayName) return null;

    const email = membership.email
      ? String(membership.email)
      : userData?.email
        ? String(userData.email)
        : undefined;

    return { displayName, email };
  }
}
