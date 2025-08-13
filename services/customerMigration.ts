import { db, Timestamp } from "./firebase";
import { CustomerService } from "./customerService";

export class CustomerMigration {
  /**
   * Migrate customers from user subcollections to centralized collection
   * This migration is needed because customers were originally stored in
   * users/{userId}/customers subcollections, but for company-wide visibility
   * they need to be in a centralized 'customers' collection.
   */

  static async migrateAllCustomers(): Promise<{
    success: boolean;
    totalMigrated: number;
    errors: string[];
  }> {
    const result = await CustomerService.migrateAllCustomers();
    
    if (result.success) {
    } else {
      console.error(`❌ Migration completed with errors. Migrated ${result.totalMigrated} customers`);
      result.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    return result;
  }

  static async migrateUserCustomers(userId: string): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    const result = await CustomerService.migrateUserCustomers(userId);
    
    if (result.success) {
    } else {
      console.error(`❌ Migration for user ${userId} completed with errors. Migrated ${result.migratedCount} customers`);
      result.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    return result;
  }

  /**
   * Verify migration completeness by comparing customer counts
   */
  static async verifyMigration(): Promise<{
    success: boolean;
    subcollectionCount: number;
    centralizedCount: number;
    details: { [userId: string]: { subcollection: number; migrated: number } };
  }> {
    const details: { [userId: string]: { subcollection: number; migrated: number } } = {};
    let totalSubcollectionCount = 0;
    
    try {
      // Get all users
      const usersSnapshot = await db.collection("users").get();
      
      // Count customers in subcollections
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        try {
          const subcollectionSnapshot = await db
            .collection(`users/${userId}/customers`)
            .get();
          
          const subcollectionCount = subcollectionSnapshot.docs.length;
          totalSubcollectionCount += subcollectionCount;
          
          // Count migrated customers for this user
          const centralizedSnapshot = await db
            .collection("customers")
            .where("createdById", "==", userId)
            .get();
          
          const migratedCount = centralizedSnapshot.docs.length;
          
          details[userId] = {
            subcollection: subcollectionCount,
            migrated: migratedCount,
          };
        } catch (error) {
          console.error(`Error checking migration for user ${userId}:`, error);
          details[userId] = { subcollection: 0, migrated: 0 };
        }
      }
      
      // Count total customers in centralized collection
      const centralizedSnapshot = await db.collection("customers").get();
      const centralizedCount = centralizedSnapshot.docs.length;
      
      const success = Object.values(details).every(
        detail => detail.subcollection === 0 || detail.migrated >= detail.subcollection
      );
      
      return {
        success,
        subcollectionCount: totalSubcollectionCount,
        centralizedCount,
        details,
      };
    } catch (error) {
      console.error("Error verifying migration:", error);
      return {
        success: false,
        subcollectionCount: 0,
        centralizedCount: 0,
        details,
      };
    }
  }

  /**
   * Clean up subcollection customers after successful migration
   * WARNING: This will permanently delete data from subcollections
   */
  static async cleanupSubcollections(): Promise<{
    success: boolean;
    deletedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedCount = 0;
    
    try {
      // First verify migration is complete
      const verification = await this.verifyMigration();
      if (!verification.success) {
        const errorMsg = "Migration verification failed. Aborting cleanup.";
        console.error(errorMsg);
        return { success: false, deletedCount: 0, errors: [errorMsg] };
      }
      
      // Get all users
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        try {
          const subcollectionSnapshot = await db
            .collection(`users/${userId}/customers`)
            .get();
          
          // Delete all customers in this subcollection
          const batch = db.batch();
          subcollectionSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
          });
          
          if (subcollectionSnapshot.docs.length > 0) {
            await batch.commit();
          }
        } catch (error) {
          const errorMsg = `Failed to cleanup subcollection for user ${userId}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
      
      return {
        success: errors.length === 0,
        deletedCount,
        errors,
      };
    } catch (error) {
      const errorMsg = `Failed to cleanup subcollections: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        deletedCount,
        errors: [errorMsg],
      };
    }
  }
}

// Export utilities for easy access in console
(window as any).CustomerMigration = CustomerMigration;
