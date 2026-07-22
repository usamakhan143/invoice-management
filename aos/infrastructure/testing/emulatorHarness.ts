import { connectAuthEmulator, getAuth, signInWithCustomToken } from "firebase/auth";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import admin from "firebase-admin";
import { AOS_COLLECTIONS } from "../firestore/collections";
import { ERP_READ_COLLECTIONS, BOS_READ_COLLECTIONS } from "../adapters/collections";
import { createOwnerActorScope } from "../../constants/actorScope";
import type { AosActorScope } from "../../application/types";

const PROJECT_ID = "aos-integration-test";
const EMULATOR_FIREBASE_CONFIG = {
  projectId: PROJECT_ID,
  apiKey: "fake-api-key-for-emulator",
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
};
const FIRESTORE_PORT = 8080;
const AUTH_PORT = 9099;
const HOST = "127.0.0.1";

export const TEST_COMPANY_ID = "aos-test-company";
export const TEST_USER_ID = TEST_COMPANY_ID;

export const TEST_CUSTOMER_ID = "aos-test-customer";
export const TEST_LEAD_ID = "aos-test-lead";
export const TEST_INITIATIVE_ID = "aos-test-initiative";
export const OTHER_COMPANY_ID = "aos-other-company";

let adminInitialized = false;

export function isEmulatorConfigured(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

export interface AosEmulatorHarness {
  db: firebase.firestore.Firestore;
  companyId: string;
  userId: string;
  customerId: string;
  leadId: string;
  initiativeId: string;
  cleanupApp: () => Promise<void>;
}

export function integrationActorScope(harness: AosEmulatorHarness): AosActorScope {
  return createOwnerActorScope(harness.companyId, harness.userId);
}

export async function createAosEmulatorHarness(): Promise<AosEmulatorHarness> {
  if (!isEmulatorConfigured()) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Run tests via: npm run test:aos:integration",
    );
  }

  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= `${HOST}:${AUTH_PORT}`;

  if (!adminInitialized) {
    admin.initializeApp({ projectId: PROJECT_ID });
    adminInitialized = true;
  }

  const appName = `aos-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const app = firebase.initializeApp(EMULATOR_FIREBASE_CONFIG, appName);
  firebase.firestore(app).useEmulator(HOST, FIRESTORE_PORT);

  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${HOST}:${AUTH_PORT}`, { disableWarnings: true });

  const token = await admin.auth().createCustomToken(TEST_USER_ID);
  await signInWithCustomToken(auth, token);

  const db = firebase.firestore(app);

  return {
    db,
    companyId: TEST_COMPANY_ID,
    userId: TEST_USER_ID,
    customerId: TEST_CUSTOMER_ID,
    leadId: TEST_LEAD_ID,
    initiativeId: TEST_INITIATIVE_ID,
    cleanupApp: async () => {
      await firebase.app(appName).delete();
    },
  };
}

export async function clearAosIntegrationCollections(
  _db?: firebase.firestore.Firestore,
): Promise<void> {
  const adminDb = admin.firestore();
  const collectionNames = [
    AOS_COLLECTIONS.DELIVERY_ENGAGEMENTS,
    AOS_COLLECTIONS.DELIVERY_TEMPLATES,
    AOS_COLLECTIONS.DELIVERY_QUALITY_REPORTS,
    AOS_COLLECTIONS.ENGAGEMENT_WORKFLOWS,
    AOS_COLLECTIONS.AUDIT_EVENTS,
    AOS_COLLECTIONS.MODULE_REGISTRY,
    AOS_COLLECTIONS.KNOWLEDGE_PATTERNS,
    AOS_COLLECTIONS.PLAYBOOK_ENTRIES,
    AOS_COLLECTIONS.REQUIREMENT_VERSIONS,
    AOS_COLLECTIONS.PROMPT_VERSIONS,
    AOS_COLLECTIONS.CURSOR_SESSIONS,
    AOS_COLLECTIONS.CURSOR_REVISIONS,
    AOS_COLLECTIONS.EVALUATIONS,
    AOS_COLLECTIONS.LEARNING_EXTRACTION_RUNS,
    AOS_COLLECTIONS.LEARNING_CANDIDATES,
    AOS_COLLECTIONS.LEARNING_PROMOTIONS,
    ERP_READ_COLLECTIONS.CUSTOMERS,
    ERP_READ_COLLECTIONS.LEADS,
    ERP_READ_COLLECTIONS.USERS,
    ERP_READ_COLLECTIONS.COMPANY_USERS,
    BOS_READ_COLLECTIONS.INITIATIVES,
  ];

  for (const name of collectionNames) {
    const snap = await adminDb.collection(name).get();
    if (snap.empty) continue;
    const batch = adminDb.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function seedErpBosReadFixtures(
  _db: firebase.firestore.Firestore,
  companyId: string,
  options: {
    customerId: string;
    leadId: string;
    initiativeId: string;
    userId: string;
  },
): Promise<void> {
  const adminDb = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  await adminDb.collection(ERP_READ_COLLECTIONS.CUSTOMERS).doc(options.customerId).set({
    companyId,
    name: "Integration Customer",
    email: "customer@integration.test",
    createdAt: now,
  });

  await adminDb.collection(ERP_READ_COLLECTIONS.LEADS).doc(options.leadId).set({
    companyId,
    name: "Integration Lead",
    status: "new",
    createdAt: now,
  });

  await adminDb.collection(ERP_READ_COLLECTIONS.USERS).doc(companyId).set({
    displayName: "Integration Owner",
    email: "owner@integration.test",
    isOwner: true,
    createdAt: now,
  });

  if (options.userId !== companyId) {
    await adminDb.collection(ERP_READ_COLLECTIONS.USERS).doc(options.userId).set({
      companyId,
      displayName: "Integration Member",
      email: "member@integration.test",
      createdAt: now,
    });
  }

  await adminDb.collection(BOS_READ_COLLECTIONS.INITIATIVES).doc(options.initiativeId).set({
    companyId,
    name: "Integration Initiative",
    status: "draft",
    ventureId: "aos-test-venture",
    createdAt: now,
    updatedAt: now,
  });

  await adminDb.collection(ERP_READ_COLLECTIONS.CUSTOMERS).doc("other-company-customer").set({
    companyId: OTHER_COMPANY_ID,
    name: "Foreign Customer",
    createdAt: now,
  });
}
