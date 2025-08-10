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
        console.log('🔄 Using existing Firebase app instance');
    } catch (noAppError) {
        // No app exists, create new one
        console.log('🚀 Initializing new Firebase app...');
        app = firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized successfully');
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

console.log('🔧 Configuring Firebase for environment:', {
    isDevelopment,
    isLocalhost,
    hostname: window.location.hostname,
    protocol: window.location.protocol
});

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
    console.log('✅ Firebase settings configured successfully');
} catch (settingsError) {
    console.warn('⚠️ Firebase settings configuration warning:', settingsError);
}

// Check if we should force offline mode for development
if (import.meta.env.VITE_FIREBASE_OFFLINE_MODE === 'true') {
    console.log('🔄 Firebase forced offline mode enabled');
    db.disableNetwork();
}

// Network connectivity checker
export const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
        // Quick network test with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        await fetch('https://www.google.com/favicon.ico', {
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        console.warn('🌐 Network connectivity issue detected:', error);
        return false;
    }
};

// Enhanced Firebase connection with better debugging
export const connectToFirebase = async (retries = 3): Promise<boolean> => {
    console.log('🔥 FIREBASE CONNECTION DIAGNOSTICS');
    console.log('================================');

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
    console.log('✅ Firebase configuration validated');

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`🔄 Firebase connection attempt ${attempt}/${retries}`);
            console.log(`   Project ID: ${config.projectId}`);
            console.log(`   Auth Domain: ${config.authDomain}`);

            // Test basic network first
            console.log('🌐 Testing basic network...');
            const hasNetwork = await checkNetworkConnectivity();
            if (!hasNetwork) {
                console.warn(`❌ Network test failed on attempt ${attempt}`);
                if (attempt === retries) {
                    console.error('❌ No network connectivity available after all retries');
                    return false;
                }
                continue;
            }
            console.log('✅ Network connectivity confirmed');

            // Test Firebase Firestore directly
            console.log('🔥 Testing Firebase Firestore connection...');
            const testPromise = db.collection('_connection_test').limit(1).get();
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Firebase connection timeout after 8 seconds')), 8000)
            );

            const result = await Promise.race([testPromise, timeoutPromise]);
            console.log('✅ Firebase Firestore responded successfully');
            console.log(`   Response metadata:`, result.metadata);
            console.log('================================');
            return true;

        } catch (error: any) {
            console.error(`❌ Firebase connection attempt ${attempt} failed:`);
            console.error(`   Error type: ${error.constructor.name}`);
            console.error(`   Error code: ${error.code || 'unknown'}`);
            console.error(`   Error message: ${error.message}`);
            console.error(`   Full error:`, error);

            if (attempt < retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                console.log(`⏳ Retrying in ${delay}ms...`);
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
    console.log('================================');
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
        console.log('✅ Firebase offline persistence enabled successfully');
        return true;
    } catch (err: any) {
        console.warn('⚠️ Firebase persistence setup issue:');
        console.warn(`   Error code: ${err.code}`);
        console.warn(`   Error message: ${err.message}`);

        if (err.code === 'failed-precondition') {
            console.warn('   → Multiple tabs may be open, or already initialized');
        } else if (err.code === 'unimplemented') {
            console.warn('   → Browser does not support offline persistence');
        } else if (err.code === 'invalid-state') {
            console.warn('   → Firestore has already been started');
        } else {
            console.warn('   → Unknown persistence error');
        }

        console.log('📱 Continuing without offline persistence...');
        return false;
    }
};

export const FieldValue = firebase.firestore.FieldValue
export const Timestamp = firebase.firestore.Timestamp

export default app
