import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import * as admin from "firebase-admin";

const PROJECT_ID = "bos-integration-test";
const FIRESTORE_PORT = 8080;
const AUTH_PORT = 9099;
const HOST = "127.0.0.1";

export const TEST_COMPANY_ID = "bos-test-company";
export const TEST_USER_ID = TEST_COMPANY_ID;

let adminInitialized = false;

export function isEmulatorConfigured(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

export interface EmulatorHarness {
  db: firebase.firestore.Firestore;
  companyId: string;
  userId: string;
  cleanupApp: () => Promise<void>;
}

export async function createEmulatorHarness(): Promise<EmulatorHarness> {
  if (!isEmulatorConfigured()) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run tests via: npm run test:bos:integration",
    );
  }

  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= `${HOST}:${AUTH_PORT}`;

  if (!adminInitialized) {
    admin.initializeApp({ projectId: PROJECT_ID });
    adminInitialized = true;
  }

  const appName = `bos-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const app = firebase.initializeApp({ projectId: PROJECT_ID }, appName);
  firebase.auth(app).useEmulator(`http://${HOST}:${AUTH_PORT}`);
  firebase.firestore(app).useEmulator(HOST, FIRESTORE_PORT);

  const token = await admin.auth().createCustomToken(TEST_USER_ID);
  await firebase.auth(app).signInWithCustomToken(token);

  const db = firebase.firestore(app);

  return {
    db,
    companyId: TEST_COMPANY_ID,
    userId: TEST_USER_ID,
    cleanupApp: async () => {
      await firebase.app(appName).delete();
    },
  };
}

export async function clearBosCollections(db: firebase.firestore.Firestore): Promise<void> {
  for (const name of ["bosVentures", "bosInitiatives", "bosDecisions"]) {
    const snap = await db.collection(name).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
