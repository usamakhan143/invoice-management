import { db } from "./firebase";

/**
 * Firebase Health Checker - provides robust Firebase operations
 */
export class FirebaseHealth {
  private static isConnectionHealthy = true;
  private static healthCheckInterval: NodeJS.Timeout | null = null;

  // Test Firebase connection
  static async checkConnection(): Promise<boolean> {
    try {
      // Try a simple read operation
      await db.collection("_health").limit(1).get();
      this.isConnectionHealthy = true;
      return true;
    } catch (error) {
      console.warn("Firebase connection unhealthy:", error);
      this.isConnectionHealthy = false;
      return false;
    }
  }

  // Safe collection reader with retry logic
  static async safeGetCollection(
    collectionPath: string,
    retries = 3,
  ): Promise<any[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const snapshot = await db.collection(collectionPath).get();
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error(
          `Attempt ${attempt} failed for ${collectionPath}:`,
          error,
        );

        if (attempt === retries) {
          console.error(`All ${retries} attempts failed for ${collectionPath}`);
          return [];
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
    return [];
  }

  // Safe document reader
  static async safeGetDocument(
    collectionPath: string,
    docId: string,
  ): Promise<any | null> {
    try {
      const doc = await db.collection(collectionPath).doc(docId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error(
        `Error getting document ${docId} from ${collectionPath}:`,
        error,
      );
      return null;
    }
  }

  // Safe document writer
  static async safeSetDocument(
    collectionPath: string,
    docId: string,
    data: any,
  ): Promise<boolean> {
    try {
      await db.collection(collectionPath).doc(docId).set(data, { merge: true });
      return true;
    } catch (error) {
      console.error(
        `Error setting document ${docId} in ${collectionPath}:`,
        error,
      );
      return false;
    }
  }

  // Safe collection adder
  static async safeAddDocument(
    collectionPath: string,
    data: any,
  ): Promise<string | null> {
    try {
      const docRef = await db.collection(collectionPath).add(data);
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionPath}:`, error);
      return null;
    }
  }

  // Start health monitoring
  static startHealthMonitoring(intervalMs = 30000) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.checkConnection();
    }, intervalMs);
  }

  // Stop health monitoring
  static stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Get current health status
  static isHealthy(): boolean {
    return this.isConnectionHealthy;
  }
}

// Start monitoring when module loads
if (typeof window !== "undefined") {
  FirebaseHealth.startHealthMonitoring();
}
