import { db, Timestamp } from "./firebase";
import { FirebaseHealth } from "./firebaseHealth";
import type { Invoice } from "../types";

export class InvoiceService {
  // Generate company-wide invoice number
  static async generateInvoiceNumber(companyId: string): Promise<string> {
    const companyDocRef = db.collection("companies").doc(companyId);

    try {
      return await db.runTransaction(async (transaction) => {
        const companyDoc = await transaction.get(companyDocRef);

        let currentCounter = 1;
        if (companyDoc.exists) {
          currentCounter = (companyDoc.data()?.invoiceCounter || 0) + 1;
          transaction.update(companyDocRef, { invoiceCounter: currentCounter });
        } else {
          // Create company document with counter
          transaction.set(companyDocRef, {
            invoiceCounter: currentCounter,
            createdAt: Timestamp.now(),
          });
        }

        return `INV-${String(currentCounter).padStart(3, "0")}`;
      });
    } catch (error) {
      console.error("Error generating invoice number:", error);
      // Fallback to timestamp-based number if transaction fails
      return `INV-${Date.now().toString().slice(-6)}`;
    }
  }

  // Save invoice to centralized collection
  static async saveInvoice(
    invoiceData: Partial<Invoice>,
    user: any,
    userProfile: any,
    invoiceId?: string,
  ): Promise<string> {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    const finalInvoiceData = {
      ...invoiceData,
      // Add creator and company information
      createdBy:
        userProfile?.displayName || userProfile?.companyName || user.email,
      createdById: user.uid,
      companyId: companyId || user.uid,
      ...(invoiceId
        ? {
            updatedBy:
              userProfile?.displayName ||
              userProfile?.companyName ||
              user.email,
            updatedById: user.uid,
            updatedAt: Timestamp.now(),
          }
        : {
            createdAt: Timestamp.now(),
          }),
    };

    if (invoiceId) {
      // Update existing invoice
      const success = await FirebaseHealth.safeSetDocument(
        "invoices",
        invoiceId,
        finalInvoiceData,
      );
      if (!success) {
        throw new Error("Failed to update invoice");
      }
      return invoiceId;
    } else {
      // Create new invoice with company-wide numbering
      if (!finalInvoiceData.invoiceNumber) {
        finalInvoiceData.invoiceNumber = await this.generateInvoiceNumber(
          companyId || user.uid,
        );
      }

      const docId = await FirebaseHealth.safeAddDocument(
        "invoices",
        finalInvoiceData,
      );
      if (!docId) {
        throw new Error("Failed to create invoice");
      }
      return docId;
    }
  }

  // Get invoices based on user role with safer polling approach
  static getInvoicesRealTime(
    user: any,
    userProfile: any,
    isOwner: boolean,
    isAdmin: boolean,
    callback: (invoices: Invoice[]) => void,
  ): () => void {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;
    let isActive = true;

    // Function to fetch invoices safely
    const fetchInvoices = async () => {
      if (!isActive) return;

      try {
        const invoicesData = await this.getInvoices(
          user,
          userProfile,
          isOwner,
          isAdmin,
        );
        if (isActive) {
          callback(invoicesData);
        }
      } catch (error) {
        console.error("Error fetching invoices:", error);
        if (isActive) {
          callback([]);
        }
      }
    };

    // Initial fetch
    fetchInvoices();

    // Set up polling every 5 seconds for updates (safer than real-time listeners)
    const intervalId = setInterval(fetchInvoices, 5000);

    // Return cleanup function
    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }

  // Get invoices based on user role (static method - safer approach)
  static async getInvoices(
    user: any,
    userProfile: any,
    isOwner: boolean,
    isAdmin: boolean,
  ): Promise<Invoice[]> {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    try {
      // Check connection before fetching
      const isConnected = await FirebaseHealth.isFirebaseReachable();
      if (!isConnected) {
        console.log("🔄 Firebase offline, using cached data for invoices");
      }

      // Use FirebaseHealth for robust data fetching
      const invoicesRaw = await FirebaseHealth.safeGetCollection("invoices");

      let invoicesData = invoicesRaw.map((data) => ({
        ...data,
        // Ensure required fields exist with defaults
        issueDate: data.issueDate || { toDate: () => new Date() },
        createdBy: data.createdBy || "Unknown User",
        companyId: data.companyId || "",
        createdById: data.createdById || "",
        status: data.status || "draft",
        total: data.total || 0,
        customerName: data.customerName || "Unknown Customer",
      })) as Invoice[];

      // Filter based on user role
      if (isOwner || isAdmin) {
        // Admin sees all company invoices
        invoicesData = invoicesData.filter(
          (invoice) => invoice.companyId === (companyId || user.uid),
        );
      } else {
        // Regular user sees their own invoices
        invoicesData = invoicesData.filter(
          (invoice) => invoice.createdById === user.uid,
        );
      }

      // Sort manually by issue date (newest first)
      invoicesData.sort((a, b) => {
        const dateA = a.issueDate?.toDate?.() || new Date(0);
        const dateB = b.issueDate?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      return invoicesData;
    } catch (error) {
      console.error("Error loading invoices:", error);
      // Return empty array instead of throwing
      return [];
    }
  }

  // Delete invoice from centralized collection
  static async deleteInvoice(invoiceId: string): Promise<void> {
    try {
      await db.collection("invoices").doc(invoiceId).delete();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      throw error;
    }
  }

  // Update invoice status and handle bank balance updates
  static async updateInvoiceStatus(
    invoiceId: string,
    newStatus: string,
    invoice: Invoice,
  ): Promise<void> {
    try {
      const invoiceRef = db.collection("invoices").doc(invoiceId);

      // If marking as paid and has bank account, update the balance
      if (
        newStatus === "paid" &&
        invoice.status !== "paid" &&
        invoice.bankAccountId
      ) {
        await db.runTransaction(async (transaction) => {
          // Get bank account data
          const bankAccountRef = db
            .collection("bankAccounts")
            .doc(invoice.bankAccountId!);
          const bankAccountDoc = await transaction.get(bankAccountRef);

          // Update invoice status
          transaction.update(invoiceRef, { status: newStatus });

          // Update bank account balance
          if (bankAccountDoc.exists) {
            const currentBalance =
              bankAccountDoc.data()?.currentBalance ||
              bankAccountDoc.data()?.initialBalance ||
              0;
            transaction.update(bankAccountRef, {
              currentBalance: currentBalance + invoice.total,
            });
          }
        });
      } else if (
        newStatus !== "paid" &&
        invoice.status === "paid" &&
        invoice.bankAccountId
      ) {
        // If changing from paid to unpaid, subtract from bank balance
        await db.runTransaction(async (transaction) => {
          const bankAccountRef = db
            .collection("bankAccounts")
            .doc(invoice.bankAccountId!);
          const bankAccountDoc = await transaction.get(bankAccountRef);

          // Update invoice status
          transaction.update(invoiceRef, { status: newStatus });

          // Update bank account balance
          if (bankAccountDoc.exists) {
            const currentBalance =
              bankAccountDoc.data()?.currentBalance ||
              bankAccountDoc.data()?.initialBalance ||
              0;
            transaction.update(bankAccountRef, {
              currentBalance: currentBalance - invoice.total,
            });
          }
        });
      } else {
        // Just update the status
        await invoiceRef.update({ status: newStatus });
      }
    } catch (error) {
      console.error("Error updating invoice status:", error);
      throw error;
    }
  }

  // Update payment for invoice
  static async updateInvoicePayment(
    invoiceId: string,
    updatedInvoiceData: Partial<Invoice>,
  ): Promise<void> {
    try {
      await db
        .collection("invoices")
        .doc(invoiceId)
        .set(updatedInvoiceData, { merge: true });
    } catch (error) {
      console.error("Error updating invoice payment:", error);
      throw error;
    }
  }
}
