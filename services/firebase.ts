import firebase from 'firebase/compat/app'
import 'firebase/compat/auth'
import 'firebase/compat/firestore'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Validate configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
    console.error('❌ Missing Firebase configuration keys:', missingKeys);
    console.error('Please check your .env file and ensure all VITE_FIREBASE_* variables are set');
}

let app: firebase.app.App;

try {
    // Check if Firebase app already exists (avoid re-initialization)
    try {
        app = firebase.app(); // Get default app if it exists
    } catch (noAppError) {
        // No app exists, create new one
        app = firebase.initializeApp(firebaseConfig);
    }
} catch (error: any) {
    console.error('❌ Firebase app initialization failed:', error);
    console.error('   Error details:', {
        code: error.code,
        message: error.message,
        name: error.name
    });
    throw error;
}

export const auth = app.auth()
export const db = app.firestore()

// Configure Firestore settings optimized for development environment
const isDevelopment = import.meta.env.DEV;
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';


try {
    db.settings({
        // Use long polling in development to avoid websocket issues
        experimentalForceLongPolling: isDevelopment,
        merge: true,
        ssl: window.location.protocol === 'https:',
        host: 'firestore.googleapis.com',
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        // Ignore undefined properties to avoid errors
        ignoreUndefinedProperties: true,
    });
} catch (settingsError) {
}

// Check if we should force offline mode for development
if (import.meta.env.VITE_FIREBASE_OFFLINE_MODE === 'true') {

    db.disableNetwork();
}

// Network connectivity checker
export const checkNetworkConnectivity = async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
        return true;
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        await fetch('https://www.google.com/favicon.ico', {
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return true;
    } catch {
        return false;
    }
};

// Enhanced Firebase connection with better debugging
export const connectToFirebase = async (
    retries = import.meta.env.PROD ? 1 : 3,
): Promise<boolean> => {

    // First, validate Firebase configuration
    const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const missingKeys = Object.entries(config).filter(([key, value]) => !value || value === 'undefined');
    if (missingKeys.length > 0) {
        console.error('❌ Missing Firebase config keys:', missingKeys.map(([key]) => key));
        return false;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {

            // Test basic network first
            const hasNetwork = await checkNetworkConnectivity();
            if (!hasNetwork) {
                if (attempt === retries) {
                    console.error('❌ No network connectivity available after all retries');
                    return false;
                }
                continue;
            }

            // Test Firestore using a rules-safe probe.
            // `_connection_test` can be blocked by rules and cause false "DB issues" toasts.
            const currentUser = auth.currentUser;
            const testPromise = currentUser
                ? db.collection('users').doc(currentUser.uid).get()
                : Promise.resolve(true);
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Firebase connection timeout after 8 seconds')), 8000)
            );

            const result = await Promise.race([testPromise, timeoutPromise]);
            return true;

        } catch (error: any) {
            console.error(`❌ Firebase connection attempt ${attempt} failed:`);
            console.error(`   Error type: ${error.constructor.name}`);
            console.error(`   Error code: ${error.code || 'unknown'}`);
            console.error(`   Error message: ${error.message}`);
            console.error(`   Full error:`, error);

            if (attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error('❌ ALL FIREBASE CONNECTION ATTEMPTS FAILED');
    console.error('   This could be due to:');
    console.error('   1. Network restrictions in development environment');
    console.error('   2. Firebase project configuration issues');
    console.error('   3. Firestore security rules blocking access');
    console.error('   4. Firebase service outage');
    return false;
};

// Enable offline persistence with comprehensive error handling
export const enableOfflineSupport = async () => {
    console.log('💾 Attempting to enable Firebase offline persistence...');

    try {
        // Check if persistence is already enabled
        const settings = db._settings;
        if (settings && settings.persistence) {
            console.log('✅ Firebase persistence already enabled');
            return true;
        }

        await db.enablePersistence({
            synchronizeTabs: true,
            experimentalTabSynchronization: true
        });
        return true;
    } catch (err: any) {

        if (err.code === 'failed-precondition') {
        } else if (err.code === 'unimplemented') {
        } else if (err.code === 'invalid-state') {
        } else {
        }

        return false;
    }
};

export const FieldValue = firebase.firestore.FieldValue
export const Timestamp = firebase.firestore.Timestamp
export const FieldPath = firebase.firestore.FieldPath

export default app
