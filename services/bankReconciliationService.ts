import { db, Timestamp, FieldValue } from "./firebase";
import type { BankReconciliation, BankReconciliationReason } from "../types";
import type firebase from "firebase/compat/app";

const round2 = (n: number) => Math.round(n * 100) / 100;

function storedBalance(data: {
  currentBalance?: number;
  initialBalance?: number;
}): number {
  return Number(data.currentBalance ?? data.initialBalance ?? 0);
}

/**
 * Bank balance reconciliations — book vs actual (statement) balance.
 *
 * Design (backward compatible & audit-friendly):
 * - Never silently overwrites `bankAccounts.currentBalance`; each reconcile is an
 *   append-only document in `bankReconciliations` plus a signed adjustment via
 *   `FieldValue.increment(adjustmentAmount)` inside a Firestore transaction.
 * - `adjustmentAmount = statedActualBalance − ledgerBalanceBefore`.
 * - Reversal creates a compensating reconciliation with negative adjustment.
 */
export class BankReconciliationService {
  static subscribeForCompany(
    companyId: string,
    onData: (rows: BankReconciliation[]) => void,
    onError?: (err: unknown) => void,
  ): () => void {
    const cid = (companyId || "").trim();
    if (!cid) {
      onData([]);
      return () => {};
    }
    return db
      .collection("bankReconciliations")
      .where("companyId", "==", cid)
      .onSnapshot(
        (snap) => {
          const rows = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as BankReconciliation,
          );
          rows.sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() ?? 0) -
              (a.createdAt?.toMillis?.() ?? 0),
          );
          onData(rows);
        },
        (err) => {
          console.error("[BankReconciliationService] subscribeForCompany:", err);
          onError?.(err);
        },
      );
  }

  /**
   * Post a reconciliation: records the session and adjusts `currentBalance` atomically.
   * If adjustment is zero, still records `confirmed_match` when reason is confirmed_match.
   */
  static async postReconciliation(params: {
    companyId: string;
    userId: string;
    createdByDisplayName?: string;
    bankAccountId: string;
    bankAccountName: string;
    currency: string;
    currencySymbol: string;
    asOfDate: firebase.firestore.Timestamp;
    statedActualBalance: number;
    reasonCode: BankReconciliationReason;
    notes?: string;
  }): Promise<{ reconciliationId: string; adjustmentAmount: number; ledgerBalanceAfter: number }> {
    const cid = (params.companyId || "").trim();
    const bankId = (params.bankAccountId || "").trim();
    const stated = round2(Number(params.statedActualBalance));

    if (!cid) throw new Error("Missing company id");
    if (!bankId) throw new Error("Missing bank account");
    if (!Number.isFinite(stated)) {
      throw new Error("Enter a valid actual balance");
    }
    if (params.reasonCode === "other" && !(params.notes || "").trim()) {
      throw new Error("Notes are required when reason is Other");
    }

    const bankRef = db.collection("bankAccounts").doc(bankId);
    const reconRef = db.collection("bankReconciliations").doc();

    let adjustmentAmount = 0;
    let ledgerBalanceAfter = 0;

    await db.runTransaction(async (transaction) => {
      const bankSnap = await transaction.get(bankRef);
      if (!bankSnap.exists) {
        throw new Error("Bank account not found");
      }
      const bankData = bankSnap.data() as {
        companyId?: string;
        userId?: string;
        currentBalance?: number;
        initialBalance?: number;
      };
      const bankCompany = (bankData.companyId || bankData.userId || "").trim();
      if (bankCompany && bankCompany !== cid) {
        throw new Error("Bank account does not belong to this company");
      }

      const ledgerBefore = round2(storedBalance(bankData));
      adjustmentAmount = round2(stated - ledgerBefore);
      ledgerBalanceAfter = round2(ledgerBefore + adjustmentAmount);

      const reasonCode =
        Math.abs(adjustmentAmount) < 0.0001 && params.reasonCode !== "confirmed_match"
          ? "confirmed_match"
          : params.reasonCode;

      const reconDoc: Omit<BankReconciliation, "id"> = {
        companyId: cid,
        userId: params.userId,
        bankAccountId: bankId,
        bankAccountName: params.bankAccountName || "",
        currency: params.currency || "USD",
        currencySymbol: params.currencySymbol || "$",
        asOfDate: params.asOfDate,
        ledgerBalanceBefore: ledgerBefore,
        statedActualBalance: stated,
        adjustmentAmount,
        ledgerBalanceAfter,
        reasonCode,
        status: "posted",
        createdAt: Timestamp.now(),
      };
      if (params.notes?.trim()) reconDoc.notes = params.notes.trim();
      if (params.createdByDisplayName) {
        reconDoc.createdByDisplayName = params.createdByDisplayName;
      }

      transaction.set(reconRef, reconDoc);

      if (Math.abs(adjustmentAmount) >= 0.0001) {
        transaction.update(bankRef, {
          currentBalance: FieldValue.increment(adjustmentAmount),
        });
      }

      transaction.update(bankRef, {
        lastReconciledAt: Timestamp.now(),
        lastReconciledStatedBalance: stated,
      });
    });

    return {
      reconciliationId: reconRef.id,
      adjustmentAmount,
      ledgerBalanceAfter,
    };
  }

  /**
   * Reverse a posted reconciliation by creating a compensating entry with
   * adjustmentAmount = −original.adjustmentAmount.
   */
  static async reverseReconciliation(
    original: BankReconciliation,
    params: {
      companyId: string;
      userId: string;
      createdByDisplayName?: string;
      notes?: string;
    },
  ): Promise<{ reconciliationId: string }> {
    if (original.status === "reversed") {
      throw new Error("This reconciliation was already reversed");
    }
    if (Math.abs(original.adjustmentAmount ?? 0) < 0.0001) {
      throw new Error("Nothing to reverse — this was a confirmed match with zero adjustment");
    }

    const cid = (params.companyId || "").trim();
    const bankId = (original.bankAccountId || "").trim();
    if (!cid || !bankId) throw new Error("Invalid reconciliation record");

    const existingReversal = await db
      .collection("bankReconciliations")
      .where("companyId", "==", cid)
      .where("reversalOfId", "==", original.id)
      .limit(1)
      .get();
    if (!existingReversal.empty) {
      throw new Error("This reconciliation has already been reversed");
    }

    const bankRef = db.collection("bankAccounts").doc(bankId);
    const reconRef = db.collection("bankReconciliations").doc();
    const reverseAdjustment = round2(-(original.adjustmentAmount ?? 0));

    await db.runTransaction(async (transaction) => {
      const bankSnap = await transaction.get(bankRef);
      if (!bankSnap.exists) {
        throw new Error("Bank account not found");
      }
      const bankData = bankSnap.data() as {
        currentBalance?: number;
        initialBalance?: number;
      };
      const ledgerBefore = round2(storedBalance(bankData));
      const ledgerAfter = round2(ledgerBefore + reverseAdjustment);

      const reconDoc: Omit<BankReconciliation, "id"> = {
        companyId: cid,
        userId: params.userId,
        bankAccountId: bankId,
        bankAccountName: original.bankAccountName || "",
        currency: original.currency || "USD",
        currencySymbol: original.currencySymbol || "$",
        asOfDate: original.asOfDate,
        ledgerBalanceBefore: ledgerBefore,
        statedActualBalance: round2(ledgerBefore),
        adjustmentAmount: reverseAdjustment,
        ledgerBalanceAfter: ledgerAfter,
        reasonCode: "manual_adjustment",
        notes:
          params.notes?.trim() ||
          `Reversal of reconciliation ${original.id.slice(0, 8)}…`,
        status: "reversed",
        reversalOfId: original.id,
        createdAt: Timestamp.now(),
      };
      if (params.createdByDisplayName) {
        reconDoc.createdByDisplayName = params.createdByDisplayName;
      }

      transaction.set(reconRef, reconDoc);
      transaction.update(bankRef, {
        currentBalance: FieldValue.increment(reverseAdjustment),
      });
    });

    return { reconciliationId: reconRef.id };
  }
}
