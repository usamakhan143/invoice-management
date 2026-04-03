interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_FIREBASE_AUTH_DOMAIN: string
    readonly VITE_FIREBASE_PROJECT_ID: string
    readonly VITE_FIREBASE_STORAGE_BUCKET: string
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
    readonly VITE_FIREBASE_APP_ID: string
    /** "true" enables Super Admin Firestore writes (e.g. subscription plan CRUD). Default: off. */
    readonly VITE_SUPER_ADMIN_FIRESTORE_WRITES?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
