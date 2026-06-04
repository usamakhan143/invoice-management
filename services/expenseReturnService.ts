import { db, Timestamp, FieldValue } from "./firebase";
import type { ExpenseReturn, ExpenseReturnType } from "../types";
import type firebase from "firebase/compat/app";

/**
 * Expense returns / refunds / cashbacks.
 *
 * Design (backward compatible & audit-friendly):
 * - The original `expenses` document is NEVER reduced. Each received return is an
 *   append-only document in `expenseReturns` plus a credit to the destination bank account.
 * - The expense keeps cached `totalReturnedAmount` / `returnStatus` for fast UI, but these
 *   are always recomputable from the `expenseReturns` collection (source of truth).
 * - All balance-affecting writes run inside a Firestore transaction.
 */
export class ExpenseReturnService {
  /** Returns recorded against a single expense (newest first). Equality-only query (no index needed). */
  static async listForExpense(
    companyId: string,
    expenseId: string,
  ): Promise<ExpenseReturn[]> {
    const cid = (companyId || "").trim();
    const eid = (expenseId || "").trim();
    if (!cid || !eid) return [];
    const snap = await db
      .collection("expenseReturns")
      .where("companyId", "==", cid)
      .where("expenseId", "==", eid)
      .get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExpenseReturn);
    rows.sort(
      (a, b) =>
        (b.receivedDate?.toMillis?.() ?? 0) - (a.receivedDate?.toMillis?.() ?? 0),
    );
    return rows;
  }

  /**
   * Real-time stream of all expense returns for a company scope.
   * Mirrors the expenses listener scoping: company-wide vs own rows. Equality-only (no index needed).
   */
  static subscribeForScope(
    params: { companyWide: boolean; companyId: string; userId: string },
    onData: (rows: ExpenseReturn[]) => void,
    onError?: (err: unknown) => void,
  ): () => void {
    const { companyWide, companyId, userId } = params;
    let query: firebase.firestore.Query;
    if (companyWide && companyId) {
      query = db.collection("expenseReturns").where("companyId", "==", companyId);
    } else {
      query = db.collection("expenseReturns").where("userId", "==", userId);
    }
    return query.onSnapshot(
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ExpenseReturn,
        );
        onData(rows);
      },
      (err) => {
        console.error("[ExpenseReturnService] subscribeForScope:", err);
        onError?.(err);
      },
    );
  }

  /**
   * Record a received return against an expense and credit the destination bank account.
   * Validates (inside the transaction) that cumulative returns never exceed the expense amount.
   *
   * Returns the new return id and the updated cached totals for the expense.
   */
  static async receiveReturn(params: {
    companyId: string;
    userId: string;
    createdByDisplayName?: string;
    expenseId: string;
    expenseTitle?: string;
    expenseAmount: number;
    amount: number;
    returnType: ExpenseReturnType;
    receivedDate: firebase.firestore.Timestamp;
    destinationBankAccountId: string;
    destinationBankAccountName: string;
    currency: string;
    currencySymbol: string;
    notes?: string;
  }): Promise<{ returnId: string; totalReturnedAmount: number; returnStatus: "partial" | "full" }> {
    const cid = (params.companyId || "").trim();
    const eid = (params.expenseId || "").trim();
    const destId = (params.destinationBankAccountId || "").trim();
    const amount = Number(params.amount);

    if (!cid) throw new Error("Missing company id");
    if (!eid) throw new Error("Missing expense id");
    if (!destId) throw new Error("Select a destination account");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid return amount greater than 0");
    }

    const expenseRef = db.collection("expenses").doc(eid);
    const bankRef = db.collection("bankAccounts").doc(destId);
    const returnRef = db.collection("expenseReturns").doc();

    let totalReturnedAmount = 0;
    let returnStatus: "partial" | "full" = "partial";

    await db.runTransaction(async (transaction) => {
      const expenseSnap = await transaction.get(expenseRef);
      if (!expenseSnap.exists) {
        throw new Error("Expense not found");
      }
      const expData = expenseSnap.data() as {
        amount?: number;
        totalReturnedAmount?: number;
      };
      const grossAmount = Number(expData.amount ?? params.expenseAmount ?? 0);
      const alreadyReturned = Number(expData.totalReturnedAmount ?? 0);
      const remaining = Math.round((grossAmount - alreadyReturned) * 100) / 100;

      if (amount > remaining + 0.0001) {
        throw new Error(
          `Return exceeds remaining returnable amount (${remaining.toFixed(2)}).`,
        );
      }

      totalReturnedAmount = Math.round((alreadyReturned + amount) * 100) / 100;
      returnStatus =
        totalReturnedAmount + 0.0001 >= grossAmount ? "full" : "partial";

      const returnDoc: Omit<ExpenseReturn, "id"> = {
        companyId: cid,
        userId: params.userId,
        expenseId: eid,
        amount,
        returnType: params.returnType,
        receivedDate: params.receivedDate,
        destinationBankAccountId: destId,
        destinationBankAccountName: params.destinationBankAccountName || "",
        currency: params.currency || "USD",
        currencySymbol: params.currencySymbol || "$",
        createdAt: Timestamp.now(),
      };
      if (params.expenseTitle) returnDoc.expenseTitle = params.expenseTitle;
      if (params.notes && params.notes.trim()) returnDoc.notes = params.notes.trim();
      if (params.createdByDisplayName) {
        returnDoc.createdByDisplayName = params.createdByDisplayName;
      }

      transaction.set(returnRef, returnDoc);
      transaction.update(expenseRef, {
        totalReturnedAmount,
        returnStatus,
      });
      transaction.update(bankRef, {
        currentBalance: FieldValue.increment(amount),
      });
    });

    return { returnId: returnRef.id, totalReturnedAmount, returnStatus };
  }

  /**
   * Reverse (delete) a previously received return: debits the destination account back and
   * recomputes the expense's cached totals. Admin/correction path; kept auditable via activity log.
   */
  static async deleteReturn(
    returnRecord: ExpenseReturn,
  ): Promise<{ totalReturnedAmount: number; returnStatus: "none" | "partial" | "full" }> {
    const returnRef = db.collection("expenseReturns").doc(returnRecord.id);
    const expenseRef = db.collection("expenses").doc(returnRecord.expenseId);
    const bankRef = db.collection("bankAccounts").doc(returnRecord.destinationBankAccountId);

    let totalReturnedAmount = 0;
    let returnStatus: "none" | "partial" | "full" = "none";

    await db.runTransaction(async (transaction) => {
      const expenseSnap = await transaction.get(expenseRef);
      const amount = Number(returnRecord.amount ?? 0);

      transaction.delete(returnRef);

      if (returnRecord.destinationBankAccountId) {
        transaction.update(bankRef, {
          currentBalance: FieldValue.increment(-amount),
        });
      }

      if (expenseSnap.exists) {
        const expData = expenseSnap.data() as {
          amount?: number;
          totalReturnedAmount?: number;
        };
        const grossAmount = Number(expData.amount ?? 0);
        const prev = Number(expData.totalReturnedAmount ?? 0);
        totalReturnedAmount = Math.max(0, Math.round((prev - amount) * 100) / 100);
        returnStatus =
          totalReturnedAmount <= 0
            ? "none"
            : totalReturnedAmount + 0.0001 >= grossAmount
              ? "full"
              : "partial";
        transaction.update(expenseRef, {
          totalReturnedAmount,
          returnStatus,
        });
      }
    });

    return { totalReturnedAmount, returnStatus };
  }
}
