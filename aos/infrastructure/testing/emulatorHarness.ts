import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import * as admin from "firebase-admin";
import { AOS_COLLECTIONS } from "../firestore/collections";
import { ERP_READ_COLLECTIONS, BOS_READ_COLLECTIONS } from "../adapters/collections";

const PROJECT_ID = "aos-integration-test";
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
    customerId: TEST_CUSTOMER_ID,
    leadId: TEST_LEAD_ID,
    initiativeId: TEST_INITIATIVE_ID,
    cleanupApp: async () => {
      await firebase.app(appName).delete();
    },
  };
}

export async function clearAosIntegrationCollections(
  db: firebase.firestore.Firestore,
): Promise<void> {
  const collectionNames = [
    AOS_COLLECTIONS.DELIVERY_ENGAGEMENTS,
    AOS_COLLECTIONS.DELIVERY_TEMPLATES,
    AOS_COLLECTIONS.DELIVERY_QUALITY_REPORTS,
    ERP_READ_COLLECTIONS.CUSTOMERS,
    ERP_READ_COLLECTIONS.LEADS,
    ERP_READ_COLLECTIONS.USERS,
    ERP_READ_COLLECTIONS.COMPANY_USERS,
    BOS_READ_COLLECTIONS.INITIATIVES,
  ];

  for (const name of collectionNames) {
    const snap = await db.collection(name).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function seedErpBosReadFixtures(
  db: firebase.firestore.Firestore,
  companyId: string,
  options: {
    customerId: string;
    leadId: string;
    initiativeId: string;
    userId: string;
  },
): Promise<void> {
  const now = firebase.firestore.Timestamp.now();

  await db.collection(ERP_READ_COLLECTIONS.CUSTOMERS).doc(options.customerId).set({
    companyId,
    name: "Integration Customer",
    email: "customer@integration.test",
    createdAt: now,
  });

  await db.collection(ERP_READ_COLLECTIONS.LEADS).doc(options.leadId).set({
    companyId,
    name: "Integration Lead",
    status: "new",
    createdAt: now,
  });

  await db.collection(ERP_READ_COLLECTIONS.USERS).doc(companyId).set({
    displayName: "Integration Owner",
    email: "owner@integration.test",
    isOwner: true,
    createdAt: now,
  });

  if (options.userId !== companyId) {
    await db.collection(ERP_READ_COLLECTIONS.USERS).doc(options.userId).set({
      companyId,
      displayName: "Integration Member",
      email: "member@integration.test",
      createdAt: now,
    });
  }

  await db.collection(BOS_READ_COLLECTIONS.INITIATIVES).doc(options.initiativeId).set({
    companyId,
    name: "Integration Initiative",
    status: "draft",
    ventureId: "aos-test-venture",
    createdAt: now,
    updatedAt: now,
  });

  await db.collection(ERP_READ_COLLECTIONS.CUSTOMERS).doc("other-company-customer").set({
    companyId: OTHER_COMPANY_ID,
    name: "Foreign Customer",
    createdAt: now,
  });
}
