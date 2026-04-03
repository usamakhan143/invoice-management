import { db, auth } from "./firebase";
import { shouldUseOfflineData, sampleInvoices, sampleCustomers, sampleProducts, sampleBankAccounts } from "./offlineData";

export class FirebaseHealth {
  private static cache = new Map<string, { data: any[], timestamp: number }>();
  /** Shorter TTL in production so lists stay fresher; dev keeps longer cache for fewer reads while testing. */
  private static getCacheDurationMs(): number {
    return import.meta.env.PROD ? 90 * 1000 : 5 * 60 * 1000;
  }
  /** Avoid caching entire huge collections in memory. */
  private static readonly MAX_CACHE_DOCUMENTS = 400;

  /**
   * Safely get a collection with retry logic, caching, and timeout handling
   */
  static async safeGetCollection(collectionName: string, timeout = 30000): Promise<any[]> {
    // Check cache first
    const cached = this.getCachedData(collectionName);
    if (cached) {
      return cached;
    }

    // Try to fetch with retry logic
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {

        const promise = db.collection(collectionName).get();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout: ${collectionName} collection fetch (attempt ${attempt})`)), timeout)
        );

        const snapshot = await Promise.race([promise, timeoutPromise]);
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        if (data.length <= this.MAX_CACHE_DOCUMENTS) {
          this.setCachedData(collectionName, data);
        }

        return data;
      } catch (error) {

        if (attempt === 3) {
          // Final attempt failed, check for offline data or sample data
          const offlineData = await this.getOfflineData(collectionName);
          if (offlineData.length > 0) {
            console.log(`📱 Using offline data for ${collectionName} (${offlineData.length} items)`);
            return offlineData;
          }

          // Use sample data if in development/offline mode
          if (shouldUseOfflineData()) {
            const sampleData = this.getSampleData(collectionName);
            if (sampleData.length > 0) {
              console.log(`🎭 Using sample data for ${collectionName} (${sampleData.length} items)`);
              return sampleData;
            }
          }

          console.error(`❌ All attempts failed for ${collectionName}, returning empty array`);
          return [];
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return [];
  }

  /**
   * Get cached data if available and not expired
   */
  private static getCachedData(collectionName: string): any[] | null {
    const cached = this.cache.get(collectionName);
    const ttl = this.getCacheDurationMs();
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cache data with timestamp
   */
  private static setCachedData(collectionName: string, data: any[]): void {
    if (data.length > this.MAX_CACHE_DOCUMENTS) {
      return;
    }
    this.cache.set(collectionName, {
      data: [...data], // Clone to prevent mutations
      timestamp: Date.now()
    });
  }

  /**
   * Try to get offline data from Firestore cache
   */
  private static async getOfflineData(collectionName: string): Promise<any[]> {
    try {
      // Try to get from offline cache
      const snapshot = await db.collection(collectionName)
        .get({ source: 'cache' });
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.log(`No offline data available for ${collectionName}`);
      return [];
    }
  }

  /**
   * Safely add a document with error handling
   */
  static async safeAddDocument(collectionName: string, data: any): Promise<string | null> {
    try {
      const docRef = await db.collection(collectionName).add(data);
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Safely set a document with error handling
   */
  static async safeSetDocument(collectionName: string, docId: string, data: any): Promise<boolean> {
    try {
      await db.collection(collectionName).doc(docId).set(data, { merge: true });
      return true;
    } catch (error) {
      console.error(`Error setting document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Safely delete a document with error handling
   */
  static async safeDeleteDocument(collectionName: string, docId: string): Promise<boolean> {
    try {
      await db.collection(collectionName).doc(docId).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Check if Firebase is currently reachable
   */
  static async isFirebaseReachable(): Promise<boolean> {
    try {
      if (!navigator.onLine) {
        return false;
      }

      // Production: avoid extra RTT before every query; Firestore calls fail fast if unreachable.
      if (import.meta.env.PROD) {
        return true;
      }

      const testPromise = db.collection('_connection_test').limit(1).get();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection test timeout')), 2500)
      );

      await Promise.race([testPromise, timeoutPromise]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get sample data for development/offline mode
   */
  private static getSampleData(collectionName: string): any[] {
    switch (collectionName) {
      case 'invoices':
        return sampleInvoices;
      case 'customers':
        return sampleCustomers;
      case 'products':
        return sampleProducts;
      case 'bankAccounts':
        return sampleBankAccounts;
      default:
        return [];
    }
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Firebase cache cleared');
  }

  /**
   * Setup real-time listener with error handling and fallback
   */
  static setupRealtimeListener(
    collectionName: string,
    callback: (data: any[]) => void,
    errorCallback?: (error: any) => void
  ): () => void {
    let retryCount = 0;
    const maxRetries = 3;

    const setupListener = (): (() => void) => {
      try {
        const unsubscribe = db.collection(collectionName).onSnapshot(
          (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`🔄 Real-time update for ${collectionName}: ${data.length} items`);

            // Cache the data
            this.setCachedData(collectionName, data);
            callback(data);

            // Reset retry count on successful connection
            retryCount = 0;
          },
          (error) => {
            console.error(`❌ Real-time listener error for ${collectionName}:`, error);

            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retrying real-time listener for ${collectionName} (${retryCount}/${maxRetries})`);

              // Try to get cached/offline data as fallback
              const fallbackData = this.getCachedData(collectionName);
              if (fallbackData) {
                console.log(`📄 Using cached data as fallback for ${collectionName}`);
                callback(fallbackData);
              }

              // Retry after delay
              setTimeout(() => {
                setupListener();
              }, 2000 * retryCount);
            } else {
              console.error(`❌ Max retries reached for ${collectionName} listener`);
              if (errorCallback) errorCallback(error);

              // Final fallback to cached data
              const fallbackData = this.getCachedData(collectionName);
              if (fallbackData) {
                callback(fallbackData);
              }
            }
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error(`❌ Failed to setup listener for ${collectionName}:`, error);
        if (errorCallback) errorCallback(error);
        return () => {}; // Return empty unsubscribe function
      }
    };

    return setupListener();
  }
}

export class FirebaseHealthChecker {
  /**
   * Check if Firebase is properly configured and connected
   */
  static async checkConnection(): Promise<{
    isConnected: boolean;
    error?: string;
    details: {
      configValid: boolean;
      authReady: boolean;
      firestoreReady: boolean;
    };
  }> {
    const details = {
      configValid: false,
      authReady: false,
      firestoreReady: false,
    };

    try {
      // Check configuration
      const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      details.configValid = Object.values(config).every(value => value && value !== 'undefined' && value.trim() !== '');

      if (!details.configValid) {
        return {
          isConnected: false,
          error: "Firebase configuration is incomplete. Check your .env file.",
          details,
        };
      }

      // Check Auth
      try {
        // Check if auth is initialized and ready
        const currentUser = auth.currentUser;
        details.authReady = true;
        // Auth ready
      } catch (authError) {
        // Auth check failed
      }

      // Check Firestore with timeout and network detection
      try {
        // First check if we have network connectivity
        if (!navigator.onLine) {
          details.firestoreReady = false;
        } else {
          // Try a simple connectivity test first
          try {
            await fetch('https://www.google.com/favicon.ico', {
              mode: 'no-cors',
              cache: 'no-cache',
              signal: AbortSignal.timeout(3000)
            });
          } catch (networkError) {
            console.log("🌐 Network connectivity issue detected");
            details.firestoreReady = false;
          }

          // Only try Firestore if we have network
          if (details.firestoreReady !== false) {
            const testQuery = await Promise.race([
              db.collection("_health_check").limit(1).get(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Firestore timeout")), 3000)
              )
            ]);
            details.firestoreReady = true;
            console.log("✅ Firestore connection confirmed");
          }
        }
      } catch (firestoreError) {
        console.log("🔄 Firestore not reachable, enabling offline mode");
        details.firestoreReady = false;

        // Try to enable offline persistence as fallback
        try {
          await db.enablePersistence({ synchronizeTabs: true });
          console.log("✅ Offline persistence enabled");
        } catch (persistenceError) {
          console.warn("⚠️ Could not enable offline persistence:", persistenceError);
        }
      }

      const isConnected = details.configValid && details.authReady && details.firestoreReady;

      return {
        isConnected,
        error: isConnected ? undefined : "Firebase connection issues detected",
        details,
      };
    } catch (error) {
      return {
        isConnected: false,
        error: `Firebase health check failed: ${error}`,
        details,
      };
    }
  }

  /**
   * Setup Firebase with improved error handling and offline support
   */
  static async setupFirebaseWithFallbacks() {
    try {
      // Enable offline persistence
      await db.enablePersistence({ synchronizeTabs: true });
      console.log("Firebase offline persistence enabled");
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
      } else if (err.code === 'unimplemented') {
        console.warn("The current browser doesn't support offline persistence");
      } else {
        console.error("Error enabling offline persistence:", err);
      }
    }

    // Setup connection state monitoring
    db.onSnapshot(
      db.collection('_connection_test').limit(1),
      () => {
        console.log("✅ Firestore connection active");
      },
      (error) => {
        console.warn("🔄 Firestore connection issue:", error.message);
      }
    );

    return true;
  }

  /**
   * Debug Firebase configuration
   */
  static debugConfig() {
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '��� Set' : '❌ Missing',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing',
      appId: import.meta.env.VITE_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing',
    };



    return {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      isConfigComplete: Object.values(config).every(status => status === '✅ Set'),
    };
  }
}
