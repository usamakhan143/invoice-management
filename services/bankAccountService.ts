import { db } from "./firebase";
import { resolveCompanyIdForUser } from "./companyId";
import type { BankAccount } from "../types";
import type firebase from "firebase/compat/app";

function sortBankAccounts(a: BankAccount, b: BankAccount): number {
  const aT = a.createdAt?.toMillis?.() ?? 0;
  const bT = b.createdAt?.toMillis?.() ?? 0;
  return bT - aT;
}

function mergeSnapshots(
  docsA: firebase.firestore.QueryDocumentSnapshot[],
  docsB: firebase.firestore.QueryDocumentSnapshot[],
): BankAccount[] {
  const merged = new Map<string, BankAccount>();
  for (const d of [...docsA, ...docsB]) {
    merged.set(d.id, { id: d.id, ...d.data() } as BankAccount);
  }
  return Array.from(merged.values()).sort(sortBankAccounts);
}

export class BankAccountService {
  /** Same company root as invoices/customers (owner uid for team members). */
  static resolveBankCompanyId(
    user: firebase.User,
    userProfile: { isOwner?: boolean; companyId?: string } | null | undefined,
  ): string {
    return resolveCompanyIdForUser(user, userProfile);
  }

  /**
   * Company-visible bank accounts: `companyId` field + legacy rows where `userId` was the owner uid.
   */
  static async getBankAccountsForCompany(
    user: firebase.User,
    userProfile: { isOwner?: boolean; companyId?: string } | null | undefined,
  ): Promise<BankAccount[]> {
    const cid = this.resolveBankCompanyId(user, userProfile);
    if (!cid) return [];
    try {
      const [r1, r2] = await Promise.allSettled([
        db.collection("bankAccounts").where("companyId", "==", cid).get(),
        db.collection("bankAccounts").where("userId", "==", cid).get(),
      ]);
      const docsA = r1.status === "fulfilled" ? r1.value.docs : [];
      const docsB = r2.status === "fulfilled" ? r2.value.docs : [];
      if (r1.status === "rejected" && import.meta.env.DEV) {
        console.warn("[BankAccountService] companyId query:", r1.reason);
      }
      if (r2.status === "rejected" && import.meta.env.DEV) {
        console.warn("[BankAccountService] legacy userId query:", r2.reason);
      }
      if (r1.status === "rejected" && r2.status === "rejected") {
        console.error("[BankAccountService] getBankAccountsForCompany: both queries failed");
        return [];
      }
      return mergeSnapshots(docsA, docsB);
    } catch (error) {
      console.error("[BankAccountService] getBankAccountsForCompany:", error);
      return [];
    }
  }

  /** Real-time merged list for dashboard / expenses / invoices list. */
  static subscribeBankAccountsForCompany(
    user: firebase.User,
    userProfile: { isOwner?: boolean; companyId?: string } | null | undefined,
    callback: (rows: BankAccount[]) => void,
  ): () => void {
    const cid = this.resolveBankCompanyId(user, userProfile);
    if (!cid) {
      callback([]);
      return () => {};
    }

    let docsA: firebase.firestore.QueryDocumentSnapshot[] = [];
    let docsB: firebase.firestore.QueryDocumentSnapshot[] = [];

    const emit = () => {
      callback(mergeSnapshots(docsA, docsB));
    };

    const u1 = db
      .collection("bankAccounts")
      .where("companyId", "==", cid)
      .onSnapshot(
        (snap) => {
          docsA = snap.docs;
          emit();
        },
        (err) => {
          if (import.meta.env.DEV) {
            console.warn("[BankAccountService] subscribe companyId:", err);
          }
          docsA = [];
          emit();
        },
      );

    const u2 = db
      .collection("bankAccounts")
      .where("userId", "==", cid)
      .onSnapshot(
        (snap) => {
          docsB = snap.docs;
          emit();
        },
        (err) => {
          if (import.meta.env.DEV) {
            console.warn("[BankAccountService] subscribe legacy userId:", err);
          }
          docsB = [];
          emit();
        },
      );

    return () => {
      u1();
      u2();
    };
  }

  static async updateBankBalanceForPaidInvoice(
    bankAccountId: string,
    amount: number,
    operation: "add" | "subtract" = "add",
  ): Promise<void> {
    try {
      const bankAccountDoc = await db.collection("bankAccounts").doc(bankAccountId).get();

      if (!bankAccountDoc.exists) {
        console.error("Bank account not found:", bankAccountId);
        return;
      }

      const bankAccount = bankAccountDoc.data() as BankAccount;
      const currentBalance =
        bankAccount.currentBalance || bankAccount.initialBalance || 0;

      const newBalance =
        operation === "add" ? currentBalance + amount : currentBalance - amount;

      await db.collection("bankAccounts").doc(bankAccountId).update({
        currentBalance: newBalance,
      });
    } catch (error) {
      console.error("Error updating bank account balance:", error);
    }
  }

  static async getAllCompanyBankAccounts(companyId: string): Promise<BankAccount[]> {
    if (!companyId) return [];
    try {
      const [r1, r2] = await Promise.allSettled([
        db.collection("bankAccounts").where("companyId", "==", companyId).get(),
        db.collection("bankAccounts").where("userId", "==", companyId).get(),
      ]);
      const docsA = r1.status === "fulfilled" ? r1.value.docs : [];
      const docsB = r2.status === "fulfilled" ? r2.value.docs : [];
      if (r1.status === "rejected" && r2.status === "rejected") {
        console.error("Error fetching company bank accounts: both queries failed");
        return [];
      }
      return mergeSnapshots(docsA, docsB);
    } catch (error) {
      console.error("Error fetching company bank accounts:", error);
      return [];
    }
  }
}
