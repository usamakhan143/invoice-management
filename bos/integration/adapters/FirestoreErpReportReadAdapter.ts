import type firebase from "firebase/compat/app";
import { db } from "../../../services/firebase";
import type { CompanyId } from "../../types";
import type { ErpReportReadPort } from "../ports/ErpReportReadPort";

export class FirestoreErpReportReadAdapter implements ErpReportReadPort {
  constructor(private readonly firestore: firebase.firestore.Firestore = db) {}

  async listExpenseTotalsByCompany(
    companyId: CompanyId,
    options?: { fromMs?: number; toMs?: number },
  ): Promise<Array<{ expenseId: string; amount: number; currency: string; dateMs: number }>> {
    const snap = await this.firestore
      .collection("expenses")
      .where("companyId", "==", companyId)
      .get();

    return snap.docs
      .map((doc) => {
        const data = doc.data();
        const dateMs = data.date?.toMillis?.() ?? data.createdAt?.toMillis?.() ?? 0;
        return {
          expenseId: doc.id,
          amount: Number(data.amount ?? 0),
          currency: String(data.currency ?? "USD"),
          dateMs,
        };
      })
      .filter((row) => {
        if (options?.fromMs !== undefined && row.dateMs < options.fromMs) return false;
        if (options?.toMs !== undefined && row.dateMs > options.toMs) return false;
        return true;
      });
  }
}

export const firestoreErpReportReadAdapter = new FirestoreErpReportReadAdapter();
