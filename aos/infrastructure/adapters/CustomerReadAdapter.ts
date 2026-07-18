import type firebase from "firebase/compat/app";
import type { CustomerReadPort } from "../../../integration/ports/CustomerReadPort";
import type { CompanyId } from "../../../types";
import { ERP_READ_COLLECTIONS } from "./collections";
import { companyScopedDocumentData } from "./companyScope";
import { runAosFirestoreOperation } from "../firestore/errors";

export class CustomerReadAdapter implements CustomerReadPort {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(ERP_READ_COLLECTIONS.CUSTOMERS);
  }

  async customerExists(companyId: CompanyId, customerId: string): Promise<boolean> {
    const summary = await this.getCustomerSummary(companyId, customerId);
    return summary !== null;
  }

  async getCustomerSummary(
    companyId: CompanyId,
    customerId: string,
  ): Promise<{ name: string; status?: string } | null> {
    return runAosFirestoreOperation("CustomerReadAdapter.getCustomerSummary", async () => {
      const snap = await this.collection().doc(customerId).get();
      if (!snap.exists) return null;

      const data = companyScopedDocumentData(snap.data(), companyId);
      if (!data) return null;

      const name = String(data.name ?? "").trim();
      if (!name) return null;

      return {
        name,
        status: data.status ? String(data.status) : undefined,
      };
    });
  }
}
