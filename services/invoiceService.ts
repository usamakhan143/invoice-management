import { db, Timestamp } from "./firebase";
import { resolveCompanyIdForUser } from "./companyId";
import { FirebaseHealth } from "./firebaseHealth";
import { generateInvoiceAuthCode } from "../utils/invoiceAuthCode";
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
    const effectiveCompanyId = resolveCompanyIdForUser(user, userProfile);
    if (!effectiveCompanyId) {
      throw new Error("Company is still loading. Wait a moment and try again.");
    }
    const creatorIdForCode = user.uid;

    const finalInvoiceData: Record<string, unknown> = {
      ...invoiceData,
      // Add creator and company information
      createdBy:
        userProfile?.displayName || userProfile?.companyName || user.email,
      createdById: user.uid,
      companyId: effectiveCompanyId,
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
      let invoiceNumberForCode =
        (typeof finalInvoiceData.invoiceNumber === "string" &&
          finalInvoiceData.invoiceNumber) ||
        (typeof invoiceData.invoiceNumber === "string" &&
          invoiceData.invoiceNumber) ||
        "";
      let creatorForAuth =
        (finalInvoiceData.createdById as string) || creatorIdForCode;

      const existingSnap = await db.collection("invoices").doc(invoiceId).get();
      if (existingSnap.exists) {
        const ex = existingSnap.data();
        if (!invoiceNumberForCode) {
          invoiceNumberForCode = (ex?.invoiceNumber as string) || "";
        }
        if (ex?.createdById) {
          creatorForAuth = ex.createdById as string;
        }
      }

      if (invoiceNumberForCode) {
        finalInvoiceData.authVerificationCode = generateInvoiceAuthCode(
          invoiceId,
          invoiceNumberForCode,
          effectiveCompanyId,
          creatorForAuth,
        );
      }
      const success = await FirebaseHealth.safeSetDocument(
        "invoices",
        invoiceId,
        finalInvoiceData,
      );
      if (!success) {
        throw new Error("Failed to update invoice");
      }
      return invoiceId;
    }

    if (!finalInvoiceData.invoiceNumber) {
      finalInvoiceData.invoiceNumber = await this.generateInvoiceNumber(
        effectiveCompanyId,
      );
    }

    const docId = await FirebaseHealth.safeAddDocument(
      "invoices",
      finalInvoiceData,
    );
    if (!docId) {
      throw new Error("Failed to create invoice");
    }

    const invNum = String(finalInvoiceData.invoiceNumber);
    await FirebaseHealth.safeSetDocument("invoices", docId, {
      authVerificationCode: generateInvoiceAuthCode(
        docId,
        invNum,
        effectiveCompanyId,
        creatorIdForCode,
      ),
    });

    return docId;
  }

  // Real-time invoices listener with proper Firebase onSnapshot
  static getInvoicesRealTime(
    user: any,
    userProfile: any,
    isOwner: boolean,
    isAdmin: boolean,
    callback: (invoices: Invoice[]) => void,
  ): () => void {
    const companyId = resolveCompanyIdForUser(user, userProfile);

    // Build Firestore query based on user role
    let query;
    if (isOwner || isAdmin) {
      if (!companyId) {
        callback([]);
        return () => {};
      }
      // Admin sees all company invoices
      query = db
        .collection("invoices")
        .where("companyId", "==", companyId)
        .orderBy("issueDate", "desc");
    } else {
      // Regular user sees their own invoices
      query = db
        .collection("invoices")
        .where("createdById", "==", user.uid)
        .orderBy("issueDate", "desc");
    }

    // Set up real-time listener
    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        try {
          const invoicesData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Ensure required fields exist with defaults
              issueDate: data.issueDate || { toDate: () => new Date() },
              createdBy: data.createdBy || "Unknown User",
              companyId: data.companyId || "",
              createdById: data.createdById || "",
              status: data.status || "draft",
              total: data.total || 0,
              customerName: data.customerName || "Unknown Customer",
            } as Invoice;
          });

          callback(invoicesData);
        } catch (error) {
          console.error("Error processing invoices snapshot:", error);
          callback([]);
        }
      },
      (error) => {
        console.error("Error in invoices real-time listener:", error);
        callback([]);
      }
    );

    return unsubscribe;
  }

  // Get invoices based on user role (static method - safer approach)
  static async getInvoices(
    user: any,
    userProfile: any,
    isOwner: boolean,
    isAdmin: boolean,
  ): Promise<Invoice[]> {
    const companyId = resolveCompanyIdForUser(user, userProfile);

    try {
      const isConnected = await FirebaseHealth.isFirebaseReachable();
      if (!isConnected) {
        console.log("🔄 Firebase offline, using cached data for invoices");
      }

      if ((isOwner || isAdmin) && !companyId) {
        return [];
      }

      const query =
        isOwner || isAdmin
          ? db
              .collection("invoices")
              .where("companyId", "==", companyId)
              .orderBy("issueDate", "desc")
          : db
              .collection("invoices")
              .where("createdById", "==", user.uid)
              .orderBy("issueDate", "desc");

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          issueDate: data.issueDate || { toDate: () => new Date() },
          createdBy: data.createdBy || "Unknown User",
          companyId: data.companyId || "",
          createdById: data.createdById || "",
          status: data.status || "draft",
          total: data.total || 0,
          customerName: data.customerName || "Unknown Customer",
        } as Invoice;
      });
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
