import type firebase from "firebase/compat/app";
import { db } from "../../../services/firebase";
import type { CompanyId } from "../../types";
import type { ErpInvoiceReadPort } from "../ports/ErpInvoiceReadPort";

export class FirestoreErpInvoiceReadAdapter implements ErpInvoiceReadPort {
  constructor(private readonly firestore: firebase.firestore.Firestore = db) {}

  private collection() {
    return this.firestore.collection("invoices");
  }

  async invoiceExists(companyId: CompanyId, invoiceId: string): Promise<boolean> {
    const snap = await this.collection().doc(invoiceId).get();
    if (!snap.exists) return false;
    return snap.data()?.companyId === companyId;
  }

  async getInvoiceSummary(
    companyId: CompanyId,
    invoiceId: string,
  ): Promise<{ total: number; currency: string; customerName?: string } | null> {
    const snap = await this.collection().doc(invoiceId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (!data || data.companyId !== companyId) return null;
    return {
      total: Number(data.total ?? data.amount ?? 0),
      currency: String(data.currency ?? "USD"),
      customerName: data.customerName ? String(data.customerName) : undefined,
    };
  }
}

export const firestoreErpInvoiceReadAdapter = new FirestoreErpInvoiceReadAdapter();
