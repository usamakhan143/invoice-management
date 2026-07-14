import type firebase from "firebase/compat/app";
import { db } from "../../../services/firebase";
import type { CompanyId } from "../../types";
import type { ErpLeadReadPort } from "../ports/ErpLeadReadPort";

export class FirestoreErpLeadReadAdapter implements ErpLeadReadPort {
  constructor(private readonly firestore: firebase.firestore.Firestore = db) {}

  private collection() {
    return this.firestore.collection("leads");
  }

  async leadExists(companyId: CompanyId, leadId: string): Promise<boolean> {
    const snap = await this.collection().doc(leadId).get();
    if (!snap.exists) return false;
    return snap.data()?.companyId === companyId;
  }

  async getLeadSummary(
    companyId: CompanyId,
    leadId: string,
  ): Promise<{ title: string; status?: string } | null> {
    const snap = await this.collection().doc(leadId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (!data || data.companyId !== companyId) return null;
    return {
      title: String(data.name ?? data.company ?? "Lead"),
      status: data.status ? String(data.status) : undefined,
    };
  }
}

export const firestoreErpLeadReadAdapter = new FirestoreErpLeadReadAdapter();
