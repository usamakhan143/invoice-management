import { db, Timestamp } from "./firebase";
import { FirebaseHealth } from "./firebaseHealth";
import type { Product } from "../types";

export class ProductService {
  // Save product to centralized collection (same pattern as CustomerService)
  static async saveProduct(
    productData: Partial<Product>,
    user: any,
    userProfile: any,
    productId?: string,
  ): Promise<string> {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    const finalProductData = {
      ...productData,
      // Add creator and company information (same as customers)
      createdBy:
        userProfile?.displayName || userProfile?.companyName || user.email,
      createdById: user.uid,
      companyId: companyId || user.uid,
      ...(productId
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

    if (productId) {
      // Update existing product
      const success = await FirebaseHealth.safeSetDocument(
        "products",
        productId,
        finalProductData,
      );
      if (!success) {
        throw new Error("Failed to update product");
      }
      return productId;
    } else {
      // Create new product
      const docId = await FirebaseHealth.safeAddDocument(
        "products",
        finalProductData,
      );
      if (!docId) {
        throw new Error("Failed to create product");
      }
      return docId;
    }
  }

  // Get products based on user role (same logic as CustomerService)
  static async getProducts(
    user: any,
    userProfile: any,
    isOwner: boolean,
    isAdmin: boolean,
  ): Promise<Product[]> {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    try {
      // Check connection before fetching
      const isConnected = await FirebaseHealth.isFirebaseReachable();
      if (!isConnected) {
        console.log("🔄 Firebase offline, using cached data for products");
      }

      const query =
        isOwner || isAdmin
          ? db
              .collection("products")
              .where("companyId", "==", companyId || user.uid)
              .orderBy("createdAt", "desc")
          : db
              .collection("products")
              .where("createdById", "==", user.uid)
              .orderBy("createdAt", "desc");

      const snapshot = await query.get();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.name || "Unknown Product",
          description: data.description || "",
          price: data.price || 0,
          createdBy: data.createdBy || "Unknown User",
          companyId: data.companyId || "",
          createdById: data.createdById || "",
          createdAt: data.createdAt || Timestamp.now(),
        } as Product;
      });
    } catch (error) {
      console.error("Error loading products:", error);
      // Return empty array instead of throwing
      return [];
    }
  }

  // Real-time products listener with proper Firebase onSnapshot
  static getProductsRealTime(
    user: any,
    userProfile: any,
    isOwner: boolean,
    isAdmin: boolean,
    callback: (products: Product[]) => void,
  ): () => void {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    // Build Firestore query based on user role
    let query;
    if (isOwner || isAdmin) {
      // Admin sees all company products
      query = db
        .collection("products")
        .where("companyId", "==", companyId || user.uid)
        .orderBy("createdAt", "desc");
    } else {
      // Regular user sees their own products
      query = db
        .collection("products")
        .where("createdById", "==", user.uid)
        .orderBy("createdAt", "desc");
    }

    // Set up real-time listener
    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        try {
          const productsData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Ensure required fields exist with defaults
              name: data.name || "Unknown Product",
              description: data.description || "",
              price: data.price || 0,
              createdBy: data.createdBy || "Unknown User",
              companyId: data.companyId || "",
              createdById: data.createdById || "",
              createdAt: data.createdAt || Timestamp.now(),
            } as Product;
          });

          callback(productsData);
        } catch (error) {
          console.error("Error processing products snapshot:", error);
          callback([]);
        }
      },
      (error) => {
        console.error("Error in products real-time listener:", error);
        callback([]);
      }
    );

    return unsubscribe;
  }

  // Delete product from centralized collection
  static async deleteProduct(productId: string): Promise<void> {
    try {
      await db.collection("products").doc(productId).delete();
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  // Get product by ID from centralized collection
  static async getProductById(productId: string): Promise<Product | null> {
    try {
      const doc = await db.collection("products").doc(productId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() } as Product;
      }
      return null;
    } catch (error) {
      console.error("Error getting product:", error);
      return null;
    }
  }

  // Migration utility: Move products from user subcollections to centralized collection
  static async migrateUserProducts(userId: string): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migratedCount = 0;

    try {
      // Get all products from user subcollection
      const userProductsSnapshot = await db
        .collection(`users/${userId}/products`)
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

      // Migrate each product
      for (const productDoc of userProductsSnapshot.docs) {
        try {
          const productData = productDoc.data();

          // Prepare data for centralized collection
          const centralizedProductData = {
            ...productData,
            // Preserve original creation info or add if missing
            createdBy: productData.createdBy || userName,
            createdById: productData.createdById || userId,
            companyId: productData.companyId || companyId,
            createdAt: productData.createdAt || Timestamp.now(),
            // Migration metadata
            migratedAt: Timestamp.now(),
            migratedFrom: `users/${userId}/products/${productDoc.id}`,
          };

          // Add to centralized collection
          await db
            .collection("products")
            .doc(productDoc.id)
            .set(centralizedProductData);

          migratedCount++;
        } catch (error) {
          const errorMsg = `Failed to migrate product ${productDoc.id}: ${error}`;
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
      const errorMsg = `Failed to migrate products for user ${userId}: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        migratedCount,
        errors: [errorMsg],
      };
    }
  }

  // Migration utility: Migrate all products from all users
  static async migrateAllProducts(): Promise<{
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
          const result = await this.migrateUserProducts(userDoc.id);
          totalMigrated += result.migratedCount;
          allErrors.push(...result.errors);

          console.log(
            `Migrated ${result.migratedCount} products for user ${userDoc.id}`,
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
      const errorMsg = `Failed to migrate all products: ${error}`;
      console.error(errorMsg);
      return {
        success: false,
        totalMigrated,
        errors: allErrors,
      };
    }
  }

  // Get products for invoice creation (for both admin and regular users)
  static async getProductsForInvoice(
    user: any,
    userProfile: any,
    isOwner: boolean,
    isAdmin: boolean,
  ): Promise<Product[]> {
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    try {
      let productsData: Product[] = [];

      if (isOwner || isAdmin) {
        // Admin sees all company products
        const snapshot = await db
          .collection("products")
          .where("companyId", "==", companyId || user.uid)
          .get();

        productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
      } else {
        // Regular user sees their own products
        const snapshot = await db
          .collection("products")
          .where("createdById", "==", user.uid)
          .get();

        productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
      }

      return productsData;
    } catch (error) {
      console.error("Error loading products for invoice:", error);
      return [];
    }
  }
}
