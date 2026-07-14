import { db, Timestamp, FieldValue } from "./firebase";
import type { Loan, LoanRepayment, LoanStatus } from "../types";
import type firebase from "firebase/compat/app";

/**
 * Loans / advances / receivables.
 *
 * Design (backward compatible & audit-friendly):
 * - A loan is money lent out: it debits the chosen source bank account when created,
 *   but it is NOT an expense and never appears in expense reports.
 * - Each received repayment is an append-only document in `loanRepayments` plus a credit
 *   to the destination bank account.
 * - The loan keeps cached `totalRepaidAmount` / `status` for fast UI, but these are always
 *   recomputable from the `loanRepayments` collection (source of truth).
 * - All balance-affecting writes run inside a Firestore transaction.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

function computeStatus(principal: number, repaid: number): LoanStatus {
  const p = round2(principal);
  const r = round2(repaid);
  if (r <= 0) return "outstanding";
  if (r + 0.0001 >= p) return "closed";
  return "partially_repaid";
}

export class LoanService {
  /** Real-time stream of loans for a company scope (company-wide vs own rows). */
  static subscribeLoansForScope(
    params: { companyWide: boolean; companyId: string; userId: string },
    onData: (rows: Loan[]) => void,
    onError?: (err: unknown) => void,
  ): () => void {
    const { companyWide, companyId, userId } = params;
    let query: firebase.firestore.Query;
    if (companyWide && companyId) {
      query = db.collection("loans").where("companyId", "==", companyId);
    } else {
      query = db.collection("loans").where("userId", "==", userId);
    }
    return query.onSnapshot(
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Loan);
        onData(rows);
      },
      (err) => {
        console.error("[LoanService] subscribeLoansForScope:", err);
        onError?.(err);
      },
    );
  }

  /** Real-time stream of repayments for a company scope. */
  static subscribeRepaymentsForScope(
    params: { companyWide: boolean; companyId: string; userId: string },
    onData: (rows: LoanRepayment[]) => void,
    onError?: (err: unknown) => void,
  ): () => void {
    const { companyWide, companyId, userId } = params;
    let query: firebase.firestore.Query;
    if (companyWide && companyId) {
      query = db.collection("loanRepayments").where("companyId", "==", companyId);
    } else {
      query = db.collection("loanRepayments").where("userId", "==", userId);
    }
    return query.onSnapshot(
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as LoanRepayment,
        );
        onData(rows);
      },
      (err) => {
        console.error("[LoanService] subscribeRepaymentsForScope:", err);
        onError?.(err);
      },
    );
  }

  /** Repayments recorded against a single loan (newest first). Equality-only query. */
  static async listRepaymentsForLoan(
    companyId: string,
    loanId: string,
  ): Promise<LoanRepayment[]> {
    const cid = (companyId || "").trim();
    const lid = (loanId || "").trim();
    if (!cid || !lid) return [];
    const snap = await db
      .collection("loanRepayments")
      .where("companyId", "==", cid)
      .where("loanId", "==", lid)
      .get();
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LoanRepayment);
    rows.sort(
      (a, b) =>
        (b.receivedDate?.toMillis?.() ?? 0) - (a.receivedDate?.toMillis?.() ?? 0),
    );
    return rows;
  }

  /**
   * Give a new loan/advance. Creates the loan document and debits the source bank account
   * inside a single transaction.
   */
  static async createLoan(params: {
    companyId: string;
    userId: string;
    createdByDisplayName?: string;
    borrowerName: string;
    principalAmount: number;
    disbursedDate: firebase.firestore.Timestamp;
    sourceBankAccountId: string;
    sourceBankAccountName: string;
    currency: string;
    currencySymbol: string;
    dueDate?: firebase.firestore.Timestamp | null;
    notes?: string;
  }): Promise<{ loanId: string }> {
    const cid = (params.companyId || "").trim();
    const srcId = (params.sourceBankAccountId || "").trim();
    const borrower = (params.borrowerName || "").trim();
    const amount = Number(params.principalAmount);

    if (!cid) throw new Error("Missing company id");
    if (!borrower) throw new Error("Enter the borrower name");
    if (!srcId) throw new Error("Select a source account");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid loan amount greater than 0");
    }

    const loanRef = db.collection("loans").doc();
    const bankRef = db.collection("bankAccounts").doc(srcId);

    await db.runTransaction(async (transaction) => {
      const bankSnap = await transaction.get(bankRef);
      if (!bankSnap.exists) {
        throw new Error("Source bank account not found");
      }

      const loanDoc: Omit<Loan, "id"> = {
        companyId: cid,
        userId: params.userId,
        borrowerName: borrower,
        principalAmount: amount,
        disbursedDate: params.disbursedDate,
        sourceBankAccountId: srcId,
        sourceBankAccountName: params.sourceBankAccountName || "",
        currency: params.currency || "USD",
        currencySymbol: params.currencySymbol || "$",
        status: "outstanding",
        totalRepaidAmount: 0,
        createdAt: Timestamp.now(),
      };
      if (params.dueDate) loanDoc.dueDate = params.dueDate;
      if (params.notes && params.notes.trim()) loanDoc.notes = params.notes.trim();
      if (params.createdByDisplayName) {
        loanDoc.createdByDisplayName = params.createdByDisplayName;
      }

      transaction.set(loanRef, loanDoc);
      transaction.update(bankRef, {
        currentBalance: FieldValue.increment(-amount),
      });
    });

    return { loanId: loanRef.id };
  }

  /** Update non-balance loan metadata (borrower, due date, notes). */
  static async updateLoanMeta(
    loanId: string,
    updates: {
      borrowerName?: string;
      dueDate?: firebase.firestore.Timestamp | null;
      notes?: string | null;
    },
  ): Promise<void> {
    const lid = (loanId || "").trim();
    if (!lid) throw new Error("Missing loan id");
    const payload: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (typeof updates.borrowerName === "string") {
      const b = updates.borrowerName.trim();
      if (!b) throw new Error("Borrower name cannot be empty");
      payload.borrowerName = b;
    }
    if (updates.dueDate !== undefined) {
      payload.dueDate = updates.dueDate ?? null;
    }
    if (updates.notes !== undefined) {
      payload.notes = updates.notes ? updates.notes.trim() : "";
    }
    await db.collection("loans").doc(lid).update(payload);
  }

  /**
   * Record a received repayment against a loan and credit the destination bank account.
   * Validates (inside the transaction) that cumulative repayments never exceed the principal.
   */
  static async receiveRepayment(params: {
    companyId: string;
    userId: string;
    createdByDisplayName?: string;
    loanId: string;
    borrowerName?: string;
    principalAmount: number;
    amount: number;
    receivedDate: firebase.firestore.Timestamp;
    destinationBankAccountId: string;
    destinationBankAccountName: string;
    currency: string;
    currencySymbol: string;
    notes?: string;
  }): Promise<{ repaymentId: string; totalRepaidAmount: number; status: LoanStatus }> {
    const cid = (params.companyId || "").trim();
    const lid = (params.loanId || "").trim();
    const destId = (params.destinationBankAccountId || "").trim();
    const amount = Number(params.amount);

    if (!cid) throw new Error("Missing company id");
    if (!lid) throw new Error("Missing loan id");
    if (!destId) throw new Error("Select a destination account");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid repayment amount greater than 0");
    }

    const loanRef = db.collection("loans").doc(lid);
    const bankRef = db.collection("bankAccounts").doc(destId);
    const repaymentRef = db.collection("loanRepayments").doc();

    let totalRepaidAmount = 0;
    let status: LoanStatus = "partially_repaid";

    await db.runTransaction(async (transaction) => {
      const loanSnap = await transaction.get(loanRef);
      if (!loanSnap.exists) {
        throw new Error("Loan not found");
      }
      const loanData = loanSnap.data() as {
        principalAmount?: number;
        totalRepaidAmount?: number;
      };
      const principal = Number(loanData.principalAmount ?? params.principalAmount ?? 0);
      const alreadyRepaid = Number(loanData.totalRepaidAmount ?? 0);
      const remaining = round2(principal - alreadyRepaid);

      if (amount > remaining + 0.0001) {
        throw new Error(
          `Repayment exceeds outstanding balance (${remaining.toFixed(2)}).`,
        );
      }

      totalRepaidAmount = round2(alreadyRepaid + amount);
      status = computeStatus(principal, totalRepaidAmount);

      const repaymentDoc: Omit<LoanRepayment, "id"> = {
        companyId: cid,
        userId: params.userId,
        loanId: lid,
        amount,
        receivedDate: params.receivedDate,
        destinationBankAccountId: destId,
        destinationBankAccountName: params.destinationBankAccountName || "",
        currency: params.currency || "USD",
        currencySymbol: params.currencySymbol || "$",
        createdAt: Timestamp.now(),
      };
      if (params.borrowerName) repaymentDoc.borrowerName = params.borrowerName;
      if (params.notes && params.notes.trim()) {
        repaymentDoc.notes = params.notes.trim();
      }
      if (params.createdByDisplayName) {
        repaymentDoc.createdByDisplayName = params.createdByDisplayName;
      }

      transaction.set(repaymentRef, repaymentDoc);
      transaction.update(loanRef, { totalRepaidAmount, status });
      transaction.update(bankRef, {
        currentBalance: FieldValue.increment(amount),
      });
    });

    return { repaymentId: repaymentRef.id, totalRepaidAmount, status };
  }

  /**
   * Reverse (delete) a previously received repayment: debits the destination account back and
   * recomputes the loan's cached totals/status. Admin/correction path; kept auditable.
   */
  static async deleteRepayment(
    repayment: LoanRepayment,
  ): Promise<{ totalRepaidAmount: number; status: LoanStatus }> {
    const repaymentRef = db.collection("loanRepayments").doc(repayment.id);
    const loanRef = db.collection("loans").doc(repayment.loanId);
    const bankRef = db
      .collection("bankAccounts")
      .doc(repayment.destinationBankAccountId);

    let totalRepaidAmount = 0;
    let status: LoanStatus = "outstanding";

    await db.runTransaction(async (transaction) => {
      const loanSnap = await transaction.get(loanRef);
      const amount = Number(repayment.amount ?? 0);

      transaction.delete(repaymentRef);

      if (repayment.destinationBankAccountId) {
        transaction.update(bankRef, {
          currentBalance: FieldValue.increment(-amount),
        });
      }

      if (loanSnap.exists) {
        const loanData = loanSnap.data() as {
          principalAmount?: number;
          totalRepaidAmount?: number;
        };
        const principal = Number(loanData.principalAmount ?? 0);
        const prev = Number(loanData.totalRepaidAmount ?? 0);
        totalRepaidAmount = Math.max(0, round2(prev - amount));
        status = computeStatus(principal, totalRepaidAmount);
        transaction.update(loanRef, { totalRepaidAmount, status });
      }
    });

    return { totalRepaidAmount, status };
  }

  /**
   * Mark a loan as written off (deemed unrecoverable) or reopen it.
   * Status-only — never moves money. Disbursement already left the account when the loan
   * was created; a write-off is an accounting acknowledgement that it won't be repaid.
   * Reopening recomputes the proper status from cached repayments.
   */
  static async setWriteOff(
    loanId: string,
    writeOff: boolean,
  ): Promise<{ status: LoanStatus }> {
    const lid = (loanId || "").trim();
    if (!lid) throw new Error("Missing loan id");
    const loanRef = db.collection("loans").doc(lid);
    let status: LoanStatus = "outstanding";

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(loanRef);
      if (!snap.exists) throw new Error("Loan not found");
      const data = snap.data() as {
        principalAmount?: number;
        totalRepaidAmount?: number;
        status?: LoanStatus;
      };
      if (writeOff) {
        status = "written_off";
      } else {
        const principal = Number(data.principalAmount ?? 0);
        const repaid = Number(data.totalRepaidAmount ?? 0);
        status = computeStatus(principal, repaid);
      }
      transaction.update(loanRef, { status, updatedAt: Timestamp.now() });
    });

    return { status };
  }

  /**
   * Delete a loan. Only allowed when it has no repayments. Reverses the original source debit
   * by crediting the source bank account back.
   */
  static async deleteLoan(loan: Loan): Promise<void> {
    const lid = (loan.id || "").trim();
    if (!lid) throw new Error("Missing loan id");

    // Guard: refuse if any repayments exist (caller should also check for UX).
    const repaymentsSnap = await db
      .collection("loanRepayments")
      .where("companyId", "==", loan.companyId)
      .where("loanId", "==", lid)
      .limit(1)
      .get();
    if (!repaymentsSnap.empty) {
      throw new Error(
        "This loan has recorded repayments. Remove the repayments first before deleting the loan.",
      );
    }

    const loanRef = db.collection("loans").doc(lid);
    const bankRef = db.collection("bankAccounts").doc(loan.sourceBankAccountId);

    await db.runTransaction(async (transaction) => {
      const loanSnap = await transaction.get(loanRef);
      if (!loanSnap.exists) return;
      const loanData = loanSnap.data() as {
        principalAmount?: number;
        totalRepaidAmount?: number;
      };
      const repaid = Number(loanData.totalRepaidAmount ?? 0);
      if (repaid > 0) {
        throw new Error(
          "This loan has recorded repayments. Remove the repayments first before deleting the loan.",
        );
      }
      const principal = Number(loanData.principalAmount ?? loan.principalAmount ?? 0);

      transaction.delete(loanRef);
      if (loan.sourceBankAccountId) {
        transaction.update(bankRef, {
          currentBalance: FieldValue.increment(principal),
        });
      }
    });
  }
}
