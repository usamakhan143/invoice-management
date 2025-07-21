import { db, Timestamp } from "./firebase";
import type { Invoice } from "../types";

/**
 * Migration utility to move invoices from user collections to centralized collection
 * This should be run once to migrate existing data
 */
export class InvoiceMigration {
  static async migrateAllInvoices(): Promise<void> {
    console.log("Starting invoice migration...");

    try {
      // Get all users
      const usersSnapshot = await db.collection("users").get();
      let totalMigrated = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        console.log(`Migrating invoices for user: ${userId}`);

        // Get user's invoices
        const userInvoicesSnapshot = await db
          .collection(`users/${userId}/invoices`)
          .get();

        const batch = db.batch();
        let batchCount = 0;

        for (const invoiceDoc of userInvoicesSnapshot.docs) {
          const invoiceData = invoiceDoc.data() as Invoice;

          // Check if already migrated
          const existsInCentral = await db
            .collection("invoices")
            .doc(invoiceDoc.id)
            .get();

          if (!existsInCentral.exists) {
            // Add missing fields for centralization
            const migratedData = {
              ...invoiceData,
              id: invoiceDoc.id,
              createdBy:
                userData.displayName ||
                userData.companyName ||
                userData.email ||
                "Legacy User",
              createdById: userId,
              companyId: userData.isOwner
                ? userId
                : userData.companyId || userId,
              createdAt: invoiceData.createdAt || Timestamp.now(),
            };

            // Add to centralized collection
            const centralRef = db.collection("invoices").doc(invoiceDoc.id);
            batch.set(centralRef, migratedData);
            batchCount++;
            totalMigrated++;

            // Commit batch if it gets too large
            if (batchCount >= 500) {
              await batch.commit();
              console.log(`Committed batch of ${batchCount} invoices`);
              batchCount = 0;
            }
          }
        }

        // Commit remaining items in batch
        if (batchCount > 0) {
          await batch.commit();
          console.log(
            `Committed final batch of ${batchCount} invoices for user ${userId}`,
          );
        }
      }

      console.log(
        `Migration completed! Total invoices migrated: ${totalMigrated}`,
      );
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  }

  static async migrateUserInvoices(userId: string): Promise<void> {
    console.log(`Migrating invoices for user: ${userId}`);

    try {
      // Get user data
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
      }

      const userData = userDoc.data();

      // Get user's invoices
      const userInvoicesSnapshot = await db
        .collection(`users/${userId}/invoices`)
        .get();

      const batch = db.batch();
      let migratedCount = 0;

      for (const invoiceDoc of userInvoicesSnapshot.docs) {
        const invoiceData = invoiceDoc.data() as Invoice;

        // Check if already migrated
        const existsInCentral = await db
          .collection("invoices")
          .doc(invoiceDoc.id)
          .get();

        if (!existsInCentral.exists) {
          // Add missing fields for centralization
          const migratedData = {
            ...invoiceData,
            id: invoiceDoc.id,
            createdBy:
              userData?.displayName ||
              userData?.companyName ||
              userData?.email ||
              "Legacy User",
            createdById: userId,
            companyId: userData?.isOwner
              ? userId
              : userData?.companyId || userId,
            createdAt: invoiceData.createdAt || Timestamp.now(),
          };

          // Add to centralized collection
          const centralRef = db.collection("invoices").doc(invoiceDoc.id);
          batch.set(centralRef, migratedData);
          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        await batch.commit();
        console.log(`Migrated ${migratedCount} invoices for user ${userId}`);
      } else {
        console.log(`No invoices to migrate for user ${userId}`);
      }
    } catch (error) {
      console.error(`Migration failed for user ${userId}:`, error);
      throw error;
    }
  }

  static async verifyMigration(): Promise<void> {
    console.log("Verifying migration...");

    try {
      // Count invoices in centralized collection
      const centralInvoicesSnapshot = await db.collection("invoices").get();
      const centralCount = centralInvoicesSnapshot.size;

      // Count invoices in user collections
      const usersSnapshot = await db.collection("users").get();
      let userCollectionCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userInvoicesSnapshot = await db
          .collection(`users/${userDoc.id}/invoices`)
          .get();
        userCollectionCount += userInvoicesSnapshot.size;
      }

      console.log(`Central collection invoices: ${centralCount}`);
      console.log(`User collections invoices: ${userCollectionCount}`);

      if (centralCount >= userCollectionCount) {
        console.log("✅ Migration verification successful!");
      } else {
        console.log("⚠️ Migration may be incomplete");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      throw error;
    }
  }
}

// Usage examples (to be run in browser console):
// await InvoiceMigration.migrateAllInvoices();
// await InvoiceMigration.migrateUserInvoices('specific-user-id');
// await InvoiceMigration.verifyMigration();
