import { db } from "./firebase";
import type { BankAccount } from "../types";

export class BankAccountService {
  static async updateBankBalanceForPaidInvoice(
    bankAccountId: string,
    amount: number,
    operation: "add" | "subtract" = "add",
  ): Promise<void> {
    try {
      // Get current bank account
      const bankAccountDoc = await db
        .collection("bankAccounts")
        .doc(bankAccountId)
        .get();

      if (!bankAccountDoc.exists) {
        console.error("Bank account not found:", bankAccountId);
        return;
      }

      const bankAccount = bankAccountDoc.data() as BankAccount;
      const currentBalance =
        bankAccount.currentBalance || bankAccount.initialBalance || 0;

      const newBalance =
        operation === "add" ? currentBalance + amount : currentBalance - amount;

      // Update bank account balance
      await db.collection("bankAccounts").doc(bankAccountId).update({
        currentBalance: newBalance,
      });

      console.log(
        `Bank account ${bankAccountId} balance updated: ${currentBalance} -> ${newBalance}`,
      );
    } catch (error) {
      console.error("Error updating bank account balance:", error);
    }
  }

  static async getAllCompanyBankAccounts(
    companyId: string,
  ): Promise<BankAccount[]> {
    try {
      const snapshot = await db
        .collection("bankAccounts")
        .where("userId", "==", companyId)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BankAccount[];
    } catch (error) {
      console.error("Error fetching company bank accounts:", error);
      return [];
    }
  }
}
