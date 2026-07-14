import { db, Timestamp, FieldValue } from "./firebase";
import type { BankDeposit, BankDepositType } from "../types";
import type firebase from "firebase/compat/app";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Manual bank deposits — money in that is NOT tied to an invoice
 * (owner contributions, cash deposits, external transfers, non-expense refunds).
 *
 * Design (backward compatible & audit-friendly):
 * - Append-only documents in `bankDeposits` plus a credit to the chosen bank account
 *   via `FieldValue.increment(amount)` inside a Firestore transaction.
 * - Reversal creates a compensating deposit with a negative adjustment; the original
 *   row is never edited or deleted.
 */
export class BankDepositService {
  static subscribeForCompany(
    companyId: string,
    onData: (rows: BankDeposit[]) => void,
    onError?: (err: unknown) => void,
  ): () => void {
    const cid = (companyId || "").trim();
    if (!cid) {
      onData([]);
      return () => {};
    }
    return db
      .collection("bankDeposits")
      .where("companyId", "==", cid)
      .onSnapshot(
        (snap) => {
          const rows = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as BankDeposit,
          );
          rows.sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() ?? 0) -
              (a.createdAt?.toMillis?.() ?? 0),
          );
          onData(rows);
        },
        (err) => {
          console.error("[BankDepositService] subscribeForCompany:", err);
          onError?.(err);
        },
      );
  }

  /**
   * Record a manual deposit: appends the deposit document and credits the bank account
   * atomically.
   */
  static async recordDeposit(params: {
    companyId: string;
    userId: string;
    createdByDisplayName?: string;
    bankAccountId: string;
    bankAccountName: string;
    currency: string;
    currencySymbol: string;
    amount: number;
    depositDate: firebase.firestore.Timestamp;
    depositType: BankDepositType;
    referenceNumber?: string;
    notes?: string;
  }): Promise<{ depositId: string }> {
    const cid = (params.companyId || "").trim();
    const bankId = (params.bankAccountId || "").trim();
    const amount = round2(Number(params.amount));

    if (!cid) throw new Error("Missing company id");
    if (!bankId) throw new Error("Select a destination account");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid deposit amount greater than 0");
    }

    const bankRef = db.collection("bankAccounts").doc(bankId);
    const depositRef = db.collection("bankDeposits").doc();

    await db.runTransaction(async (transaction) => {
      const bankSnap = await transaction.get(bankRef);
      if (!bankSnap.exists) {
        throw new Error("Bank account not found");
      }
      const bankData = bankSnap.data() as {
        companyId?: string;
        userId?: string;
      };
      const bankCompany = (bankData.companyId || bankData.userId || "").trim();
      if (bankCompany && bankCompany !== cid) {
        throw new Error("Bank account does not belong to this company");
      }

      const depositDoc: Omit<BankDeposit, "id"> = {
        companyId: cid,
        userId: params.userId,
        bankAccountId: bankId,
        bankAccountName: params.bankAccountName || "",
        currency: params.currency || "USD",
        currencySymbol: params.currencySymbol || "$",
        amount,
        depositDate: params.depositDate,
        depositType: params.depositType,
        status: "posted",
        createdAt: Timestamp.now(),
      };
      if (params.referenceNumber?.trim()) {
        depositDoc.referenceNumber = params.referenceNumber.trim();
      }
      if (params.notes?.trim()) depositDoc.notes = params.notes.trim();
      if (params.createdByDisplayName) {
        depositDoc.createdByDisplayName = params.createdByDisplayName;
      }

      transaction.set(depositRef, depositDoc);
      transaction.update(bankRef, {
        currentBalance: FieldValue.increment(amount),
      });
    });

    return { depositId: depositRef.id };
  }

  /**
   * Reverse a posted deposit by creating a compensating entry with a negative amount
   * and debiting the bank account back.
   */
  static async reverseDeposit(
    original: BankDeposit,
    params: {
      companyId: string;
      userId: string;
      createdByDisplayName?: string;
      notes?: string;
    },
  ): Promise<{ depositId: string }> {
    if (original.status === "reversed") {
      throw new Error("This deposit is already a reversal entry");
    }
    const cid = (params.companyId || "").trim();
    const bankId = (original.bankAccountId || "").trim();
    const amount = round2(Number(original.amount ?? 0));
    if (!cid || !bankId) throw new Error("Invalid deposit record");
    if (!(amount > 0)) throw new Error("Nothing to reverse");

    const existingReversal = await db
      .collection("bankDeposits")
      .where("companyId", "==", cid)
      .where("reversalOfId", "==", original.id)
      .limit(1)
      .get();
    if (!existingReversal.empty) {
      throw new Error("This deposit has already been reversed");
    }

    const bankRef = db.collection("bankAccounts").doc(bankId);
    const depositRef = db.collection("bankDeposits").doc();

    await db.runTransaction(async (transaction) => {
      const bankSnap = await transaction.get(bankRef);
      if (!bankSnap.exists) {
        throw new Error("Bank account not found");
      }

      const depositDoc: Omit<BankDeposit, "id"> = {
        companyId: cid,
        userId: params.userId,
        bankAccountId: bankId,
        bankAccountName: original.bankAccountName || "",
        currency: original.currency || "USD",
        currencySymbol: original.currencySymbol || "$",
        amount: -amount,
        depositDate: original.depositDate,
        depositType: original.depositType,
        notes:
          params.notes?.trim() ||
          `Reversal of deposit ${original.id.slice(0, 8)}…`,
        status: "reversed",
        reversalOfId: original.id,
        createdAt: Timestamp.now(),
      };
      if (params.createdByDisplayName) {
        depositDoc.createdByDisplayName = params.createdByDisplayName;
      }

      transaction.set(depositRef, depositDoc);
      transaction.update(bankRef, {
        currentBalance: FieldValue.increment(-amount),
      });
    });

    return { depositId: depositRef.id };
  }
}
