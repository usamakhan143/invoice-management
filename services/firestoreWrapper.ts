import { db } from './firebase';
import type firebase from 'firebase/compat/app';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeoutMs?: number;
}

// Default retry configuration
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  timeoutMs: 10000
};

// Check if error is retryable
const isRetryableError = (error: any): boolean => {
  const retryableCodes = [
    'unavailable',
    'deadline-exceeded', 
    'resource-exhausted',
    'aborted',
    'cancelled',
    'unknown'
  ];
  
  const retryableMessages = [
    'Failed to fetch',
    'NetworkError',
    'timeout',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED'
  ];
  
  if (error?.code && retryableCodes.includes(error.code)) {
    return true;
  }
  
  if (error?.message) {
    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }
  
  return false;
};

// Add timeout to any promise
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
  );
  
  return Promise.race([promise, timeoutPromise]);
};

// Retry function with exponential backoff
const retryOperation = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await withTimeout(operation(), config.timeoutMs);
      
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`❌ Firestore operation attempt ${attempt} failed:`, error);
      
      if (!isRetryableError(error) || attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelay * Math.pow(2, attempt - 1),
        config.maxDelay
      );
      
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`❌ All Firestore operation attempts failed:`, lastError);
  throw lastError;
};

// Firestore wrapper class
export class FirestoreWrapper {
  
  // Get documents with retry logic
  static async getDocuments(
    collectionPath: string,
    options: RetryOptions = {}
  ): Promise<firebase.firestore.QuerySnapshot> {
    return retryOperation(
      () => db.collection(collectionPath).get(),
      options
    );
  }
  
  // Get document with retry logic
  static async getDocument(
    collectionPath: string,
    docId: string,
    options: RetryOptions = {}
  ): Promise<firebase.firestore.DocumentSnapshot> {
    return retryOperation(
      () => db.collection(collectionPath).doc(docId).get(),
      options
    );
  }
  
  // Query with retry logic
  static async query(
    query: firebase.firestore.Query,
    options: RetryOptions = {}
  ): Promise<firebase.firestore.QuerySnapshot> {
    return retryOperation(
      () => query.get(),
      options
    );
  }
  
  // Add document with retry logic
  static async addDocument(
    collectionPath: string,
    data: any,
    options: RetryOptions = {}
  ): Promise<firebase.firestore.DocumentReference> {
    return retryOperation(
      () => db.collection(collectionPath).add(data),
      options
    );
  }
  
  // Set document with retry logic
  static async setDocument(
    collectionPath: string,
    docId: string,
    data: any,
    mergeOptions?: firebase.firestore.SetOptions,
    retryOptions: RetryOptions = {}
  ): Promise<void> {
    return retryOperation(
      () => db.collection(collectionPath).doc(docId).set(data, mergeOptions),
      retryOptions
    );
  }
  
  // Update document with retry logic
  static async updateDocument(
    collectionPath: string,
    docId: string,
    data: any,
    options: RetryOptions = {}
  ): Promise<void> {
    return retryOperation(
      () => db.collection(collectionPath).doc(docId).update(data),
      options
    );
  }
  
  // Delete document with retry logic
  static async deleteDocument(
    collectionPath: string,
    docId: string,
    options: RetryOptions = {}
  ): Promise<void> {
    return retryOperation(
      () => db.collection(collectionPath).doc(docId).delete(),
      options
    );
  }
  
  // Setup real-time listener with retry logic
  static setupListener(
    query: firebase.firestore.Query,
    onSnapshot: (snapshot: firebase.firestore.QuerySnapshot) => void,
    onError?: (error: Error) => void
  ): () => void {
    let retryCount = 0;
    const maxRetries = 3;
    let unsubscribe: (() => void) | null = null;
    
    const setupListenerWithRetry = () => {
      try {
        unsubscribe = query.onSnapshot(
          (snapshot) => {
            retryCount = 0; // Reset on successful connection
            onSnapshot(snapshot);
          },
          (error) => {
            console.error('📡 Firestore listener error:', error);
            
            if (isRetryableError(error) && retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retrying listener setup (${retryCount}/${maxRetries})`);
              
              setTimeout(() => {
                setupListenerWithRetry();
              }, 2000 * retryCount);
            } else {
              if (onError) {
                onError(error);
              }
            }
          }
        );
      } catch (error) {
        console.error('❌ Failed to setup listener:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    };
    
    setupListenerWithRetry();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }
}

// Export helper functions
export { retryOperation, isRetryableError, withTimeout };
