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
    app = firebase.initializeApp(firebaseConfig);
} catch (error) {
    throw error;
}

export const auth = app.auth()
export const db = app.firestore()

// Configure Firestore settings for better performance and offline support
db.settings({
    experimentalForceLongPolling: false, // Disable if you want to use websockets
    merge: true,
});

// Check if we should force offline mode for development
if (import.meta.env.VITE_FIREBASE_OFFLINE_MODE === 'true') {
    console.log('🔄 Firebase forced offline mode enabled');
    db.disableNetwork();
}

// Enable offline persistence (will be called from health checker)
export const enableOfflineSupport = async () => {
    try {
        await db.enablePersistence({
            synchronizeTabs: true,
            experimentalTabSynchronization: true
        });
        return true;
    } catch (err: any) {
        return false;
    }
};

export const FieldValue = firebase.firestore.FieldValue
export const Timestamp = firebase.firestore.Timestamp

export default app
