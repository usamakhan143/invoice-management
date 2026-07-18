import type firebase from "firebase/compat/app";
import type { LeadReadPort } from "../../../integration/ports/LeadReadPort";
import type { CompanyId } from "../../../types";
import { ERP_READ_COLLECTIONS } from "./collections";
import { companyScopedDocumentData } from "./companyScope";
import { runAosFirestoreOperation } from "../firestore/errors";

export class LeadReadAdapter implements LeadReadPort {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(ERP_READ_COLLECTIONS.LEADS);
  }

  async leadExists(companyId: CompanyId, leadId: string): Promise<boolean> {
    const summary = await this.getLeadSummary(companyId, leadId);
    return summary !== null;
  }

  async getLeadSummary(
    companyId: CompanyId,
    leadId: string,
  ): Promise<{ title: string; status?: string } | null> {
    return runAosFirestoreOperation("LeadReadAdapter.getLeadSummary", async () => {
      const snap = await this.collection().doc(leadId).get();
      if (!snap.exists) return null;

      const data = companyScopedDocumentData(snap.data(), companyId);
      if (!data) return null;

      const title = String(data.name ?? data.company ?? "").trim();
      if (!title) return null;

      return {
        title,
        status: data.status ? String(data.status) : undefined,
      };
    });
  }
}
