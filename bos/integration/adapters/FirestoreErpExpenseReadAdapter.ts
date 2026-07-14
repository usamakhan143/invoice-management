import type firebase from "firebase/compat/app";
import { db } from "../../../services/firebase";
import type { CompanyId } from "../../types";
import type { ErpExpenseListItem, ErpExpenseReadPort } from "../ports/ErpExpenseReadPort";

function mapExpenseDoc(
  id: string,
  data: firebase.firestore.DocumentData,
): ErpExpenseListItem | null {
  if (!data) return null;
  return {
    expenseId: id,
    title: String(data.title ?? data.description ?? "Expense"),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "USD"),
    dateMs: data.date?.toMillis?.() ?? data.createdAt?.toMillis?.() ?? 0,
  };
}

/**
 * Read-only Firestore adapter for ERP expenses.
 * Used by BOS attribution services — never writes to expenses.
 */
export class FirestoreErpExpenseReadAdapter implements ErpExpenseReadPort {
  constructor(private readonly firestore: firebase.firestore.Firestore = db) {}

  private collection() {
    return this.firestore.collection("expenses");
  }

  async expenseExists(companyId: CompanyId, expenseId: string): Promise<boolean> {
    const snap = await this.collection().doc(expenseId).get();
    if (!snap.exists) return false;
    const data = snap.data();
    return data?.companyId === companyId || data?.userId === companyId;
  }

  async getExpenseSummary(
    companyId: CompanyId,
    expenseId: string,
  ): Promise<{ amount: number; currency: string; title: string } | null> {
    const snap = await this.collection().doc(expenseId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (!data) return null;
    if (data.companyId !== companyId && data.userId !== companyId) return null;

    return {
      amount: Number(data.amount ?? 0),
      currency: String(data.currency ?? "USD"),
      title: String(data.title ?? data.description ?? "Expense"),
    };
  }

  async listExpensesForCompany(companyId: CompanyId, limit = 200): Promise<ErpExpenseListItem[]> {
    const [companySnap, legacySnap] = await Promise.all([
      this.collection().where("companyId", "==", companyId).limit(limit).get(),
      this.collection().where("userId", "==", companyId).limit(limit).get(),
    ]);

    const merged = new Map<string, ErpExpenseListItem>();
    for (const doc of [...companySnap.docs, ...legacySnap.docs]) {
      const row = mapExpenseDoc(doc.id, doc.data());
      if (row) merged.set(doc.id, row);
    }

    return Array.from(merged.values()).sort((a, b) => b.dateMs - a.dateMs);
  }
}

export const firestoreErpExpenseReadAdapter = new FirestoreErpExpenseReadAdapter();
