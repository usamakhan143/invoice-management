import { db, Timestamp } from "./firebase";
import { FirebaseHealth } from "./firebaseHealth";
import type { Customer } from "../types";

export class CustomerService {
  // Save customer to centralized collection (same pattern as InvoiceService)
  static async saveCustomer(
    customerData: Partial<Customer>,
    user: any,
    userProfile: any,
    customerId?: string,
  ): Promise<string> {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    const finalCustomerData = {
      ...customerData,
      // Add creator and company information (same as invoices)
      createdBy:
        userProfile?.displayName || userProfile?.companyName || user.email,
      createdById: user.uid,
      companyId: companyId || user.uid,
      ...(customerId
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

    if (customerId) {
      // Update existing customer
      const success = await FirebaseHealth.safeSetDocument(
        "customers",
        customerId,
        finalCustomerData,
      );
      if (!success) {
        throw new Error("Failed to update customer");
      }
      return customerId;
    } else {
      // Create new customer
      const docId = await FirebaseHealth.safeAddDocument(
        "customers",
        finalCustomerData,
      );
      if (!docId) {
        throw new Error("Failed to create customer");
      }
      return docId;
    }
  }

  // Get customers based on user role (same logic as InvoiceService)
  static async getCustomers(
    user: any,
    userProfile: any,
    isOwner: boolean,
    isAdmin: boolean,
  ): Promise<Customer[]> {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    try {
      // Check connection before fetching
      const isConnected = await FirebaseHealth.isFirebaseReachable();
      if (!isConnected) {
        console.log("🔄 Firebase offline, using cached data for customers");
      }

      const query =
        isOwner || isAdmin
          ? db
              .collection("customers")
              .where("companyId", "==", companyId || user.uid)
              .orderBy("createdAt", "desc")
          : db
              .collection("customers")
              .where("createdById", "==", user.uid)
              .orderBy("createdAt", "desc");

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.name || "Unknown Customer",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          createdBy: data.createdBy || "Unknown User",
          companyId: data.companyId || "",
          createdById: data.createdById || "",
          createdAt: data.createdAt || Timestamp.now(),
        } as Customer;
      });
    } catch (error) {
      console.error("Error loading customers:", error);
      // Return empty array instead of throwing
      return [];
    }
  }

  // Real-time customers listener with proper Firebase onSnapshot
  static getCustomersRealTime(
    user: any,
    userProfile: any,
    isOwner: boolean,
    isAdmin: boolean,
    callback: (customers: Customer[]) => void,
  ): () => void {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    // Build Firestore query based on user role
    let query;
    if (isOwner || isAdmin) {
      // Admin sees all company customers
      query = db
        .collection("customers")
        .where("companyId", "==", companyId || user.uid)
        .orderBy("createdAt", "desc");
    } else {
      // Regular user sees their own customers
      query = db
        .collection("customers")
        .where("createdById", "==", user.uid)
        .orderBy("createdAt", "desc");
    }

    // Set up real-time listener
    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        try {
          const customersData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Ensure required fields exist with defaults
              name: data.name || "Unknown Customer",
              email: data.email || "",
              phone: data.phone || "",
              address: data.address || "",
              createdBy: data.createdBy || "Unknown User",
              companyId: data.companyId || "",
              createdById: data.createdById || "",
              createdAt: data.createdAt || Timestamp.now(),
            } as Customer;
          });

          callback(customersData);
        } catch (error) {
          console.error("Error processing customers snapshot:", error);
          callback([]);
        }
      },
      (error) => {
        console.error("Error in customers real-time listener:", error);
        callback([]);
      }
    );

    return unsubscribe;
  }

  // Delete customer from centralized collection
  static async deleteCustomer(customerId: string): Promise<void> {
    try {
      await db.collection("customers").doc(customerId).delete();
    } catch (error) {
      console.error("Error deleting customer:", error);
      throw error;
    }
  }

  // Get customer by ID from centralized collection
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const doc = await db.collection("customers").doc(customerId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() } as Customer;
      }
      return null;
    } catch (error) {
      console.error("Error getting customer:", error);
      return null;
    }
  }

  // Migration utility: Move customers from user subcollections to centralized collection
  static async migrateUserCustomers(userId: string): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migratedCount = 0;

    try {
      // Get all customers from user subcollection
      const userCustomersSnapshot = await db
        .collection(`users/${userId}/customers`)
        .get();

      // Get user data for creator info
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      const userName =
        userData?.displayName ||
        userData?.companyName ||
        userData?.email ||
        "Unknown User";
      const companyId = userData?.isOwner
        ? userId
        : userData?.companyId || userId;

      // Migrate each customer
      for (const customerDoc of userCustomersSnapshot.docs) {
        try {
          const customerData = customerDoc.data();

          // Prepare data for centralized collection
          const centralizedCustomerData = {
            ...customerData,
            // Preserve original creation info or add if missing
            createdBy: customerData.createdBy || userName,
            createdById: customerData.createdById || userId,
            companyId: customerData.companyId || companyId,
            createdAt: customerData.createdAt || Timestamp.now(),
            // Migration metadata
            migratedAt: Timestamp.now(),
            migratedFrom: `users/${userId}/customers/${customerDoc.id}`,
          };

          // Add to centralized collection
          await db
            .collection("customers")
            .doc(customerDoc.id)
            .set(centralizedCustomerData);

          migratedCount++;
        } catch (error) {
          const errorMsg = `Failed to migrate customer ${customerDoc.id}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        migratedCount,
        errors,
      };
    } catch (error) {
      const errorMsg = `Failed to migrate customers for user ${userId}: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        migratedCount,
        errors: [errorMsg],
      };
    }
  }

  // Migration utility: Migrate all customers from all users
  static async migrateAllCustomers(): Promise<{
    success: boolean;
    totalMigrated: number;
    errors: string[];
  }> {
    const allErrors: string[] = [];
    let totalMigrated = 0;

    try {
      // Get all users
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        try {
          const result = await this.migrateUserCustomers(userDoc.id);
          totalMigrated += result.migratedCount;
          allErrors.push(...result.errors);

          console.log(
            `Migrated ${result.migratedCount} customers for user ${userDoc.id}`,
          );
        } catch (error) {
          const errorMsg = `Failed to process user ${userDoc.id}: ${error}`;
          console.error(errorMsg);
          allErrors.push(errorMsg);
        }
      }

      return {
        success: allErrors.length === 0,
        totalMigrated,
        errors: allErrors,
      };
    } catch (error) {
      const errorMsg = `Failed to migrate all customers: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        totalMigrated,
        errors: [errorMsg],
      };
    }
  }
}
