import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { AOS_COLLECTIONS } from "../firestore/collections";
import { isEmulatorConfigured, OTHER_COMPANY_ID, TEST_COMPANY_ID } from "../testing/emulatorHarness";

const describeSecurity = isEmulatorConfigured() ? describe : describe.skip;

const RULES_PATH = resolve(process.cwd(), "firestore.rules");

describeSecurity("AOS Firestore security rules (emulator)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "aos-integration-test",
      firestore: {
        rules: readFileSync(RULES_PATH, "utf8"),
        host: "127.0.0.1",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  async function seedCompanyWorkflow(companyId: string, docId: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(AOS_COLLECTIONS.ENGAGEMENT_WORKFLOWS).doc(docId).set({
        companyId,
        engagementId: "eng-1",
        gates: {},
        cursorSessions: [],
        updatedAt: new Date(),
      });
    });
  }

  async function seedAuditEvent(companyId: string, docId: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(AOS_COLLECTIONS.AUDIT_EVENTS).doc(docId).set({
        companyId,
        engagementId: "eng-1",
        type: "requirements.approved",
        title: "Approved",
        actorUserId: companyId,
        occurredAt: new Date(),
      });
    });
  }

  it("allows same-company read on workflow documents", async () => {
    const docId = `${TEST_COMPANY_ID}__eng-1`;
    await seedCompanyWorkflow(TEST_COMPANY_ID, docId);
    const db = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertSucceeds(db.collection(AOS_COLLECTIONS.ENGAGEMENT_WORKFLOWS).doc(docId).get());
  });

  it("allows same-company create on workflow documents", async () => {
    const docId = `${TEST_COMPANY_ID}__eng-create`;
    const db = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertSucceeds(
      db.collection(AOS_COLLECTIONS.ENGAGEMENT_WORKFLOWS).doc(docId).set({
        companyId: TEST_COMPANY_ID,
        engagementId: "eng-create",
        gates: {
          requirementsApproved: false,
          reuseRecorded: false,
          promptPackApproved: false,
          cursorSubmitted: false,
          evaluationPassed: false,
          qaComplete: false,
          retrospectiveComplete: false,
        },
        cursorSessions: [],
        updatedAt: new Date(),
      }),
    );
  });

  it("rejects cross-company read on workflow documents", async () => {
    const docId = `${TEST_COMPANY_ID}__eng-1`;
    await seedCompanyWorkflow(TEST_COMPANY_ID, docId);
    const db = testEnv.authenticatedContext(OTHER_COMPANY_ID).firestore();
    await assertFails(db.collection(AOS_COLLECTIONS.ENGAGEMENT_WORKFLOWS).doc(docId).get());
  });

  it("rejects cross-company write on workflow documents", async () => {
    const docId = `${TEST_COMPANY_ID}__eng-write`;
    const db = testEnv.authenticatedContext(OTHER_COMPANY_ID).firestore();
    await assertFails(
      db.collection(AOS_COLLECTIONS.ENGAGEMENT_WORKFLOWS).doc(docId).set({
        companyId: TEST_COMPANY_ID,
        engagementId: "eng-write",
        gates: {},
        cursorSessions: [],
        updatedAt: new Date(),
      }),
    );
  });

  it("allows audit event creation for same company", async () => {
    const docId = "audit-create-1";
    const db = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertSucceeds(
      db.collection(AOS_COLLECTIONS.AUDIT_EVENTS).doc(docId).set({
        companyId: TEST_COMPANY_ID,
        engagementId: "eng-1",
        type: "requirements.approved",
        title: "Approved",
        actorUserId: TEST_COMPANY_ID,
        occurredAt: new Date(),
      }),
    );
  });

  it("rejects audit event update and delete", async () => {
    const docId = "audit-immutable-1";
    await seedAuditEvent(TEST_COMPANY_ID, docId);
    const db = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertFails(
      db.collection(AOS_COLLECTIONS.AUDIT_EVENTS).doc(docId).update({ title: "Tampered" }),
    );
    await assertFails(db.collection(AOS_COLLECTIONS.AUDIT_EVENTS).doc(docId).delete());
  });

  it("rejects cross-company read on audit events", async () => {
    const docId = "audit-read-1";
    await seedAuditEvent(TEST_COMPANY_ID, docId);
    const db = testEnv.authenticatedContext(OTHER_COMPANY_ID).firestore();
    await assertFails(db.collection(AOS_COLLECTIONS.AUDIT_EVENTS).doc(docId).get());
  });

  it("enforces tenant isolation on module registry catalog", async () => {
    const docId = `${TEST_COMPANY_ID}__auth-firebase-v2`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(AOS_COLLECTIONS.MODULE_REGISTRY).doc(docId).set({
        companyId: TEST_COMPANY_ID,
        moduleId: "auth-firebase-v2",
        moduleName: "Auth",
      });
    });
    const foreignDb = testEnv.authenticatedContext(OTHER_COMPANY_ID).firestore();
    await assertFails(foreignDb.collection(AOS_COLLECTIONS.MODULE_REGISTRY).doc(docId).get());
    const ownerDb = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertSucceeds(ownerDb.collection(AOS_COLLECTIONS.MODULE_REGISTRY).doc(docId).get());
  });

  it("denies published requirement version update and delete", async () => {
    const versionId = `${TEST_COMPANY_ID}__set1__v1`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(AOS_COLLECTIONS.REQUIREMENT_VERSIONS).doc(versionId).set({
        companyId: TEST_COMPANY_ID,
        engagementId: "eng-1",
        requirementSetId: "set1",
        versionNumber: 1,
        publishedAt: new Date(),
        publishedByUserId: TEST_COMPANY_ID,
        snapshot: { title: "Req", items: [] },
      });
    });
    const db = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertFails(
      db.collection(AOS_COLLECTIONS.REQUIREMENT_VERSIONS).doc(versionId).update({ versionNumber: 2 }),
    );
    await assertFails(db.collection(AOS_COLLECTIONS.REQUIREMENT_VERSIONS).doc(versionId).delete());
  });

  it("denies cross-company read on requirement versions", async () => {
    const versionId = `${TEST_COMPANY_ID}__set1__v1`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(AOS_COLLECTIONS.REQUIREMENT_VERSIONS).doc(versionId).set({
        companyId: TEST_COMPANY_ID,
        engagementId: "eng-1",
        requirementSetId: "set1",
        versionNumber: 1,
        publishedAt: new Date(),
        publishedByUserId: TEST_COMPANY_ID,
        snapshot: { title: "Req", items: [] },
      });
    });
    const db = testEnv.authenticatedContext(OTHER_COMPANY_ID).firestore();
    await assertFails(db.collection(AOS_COLLECTIONS.REQUIREMENT_VERSIONS).doc(versionId).get());
  });

  it("denies finalized cursor session mutation", async () => {
    const sessionId = "cursor-finalized";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(AOS_COLLECTIONS.CURSOR_SESSIONS).doc(sessionId).set({
        companyId: TEST_COMPANY_ID,
        engagementId: "eng-1",
        promptPackId: "pack1",
        promptArtifactId: "art1",
        promptVersionId: "pv1",
        executorUserId: TEST_COMPANY_ID,
        status: "submitted",
        startedAt: new Date(),
        finalizedAt: new Date(),
      });
    });
    const db = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertFails(
      db.collection(AOS_COLLECTIONS.CURSOR_SESSIONS).doc(sessionId).update({ captureSummary: "hack" }),
    );
    await assertFails(db.collection(AOS_COLLECTIONS.CURSOR_SESSIONS).doc(sessionId).delete());
  });

  it("denies cursor revision delete and cross-company read", async () => {
    const revisionId = "revision-1";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(AOS_COLLECTIONS.CURSOR_REVISIONS).doc(revisionId).set({
        companyId: TEST_COMPANY_ID,
        engagementId: "eng-1",
        cursorSessionId: "s1",
        originalPromptVersionId: "pv1",
        status: "open",
        createdAt: new Date(),
        createdByUserId: TEST_COMPANY_ID,
      });
    });
    const ownerDb = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertFails(ownerDb.collection(AOS_COLLECTIONS.CURSOR_REVISIONS).doc(revisionId).delete());
    const foreignDb = testEnv.authenticatedContext(OTHER_COMPANY_ID).firestore();
    await assertFails(foreignDb.collection(AOS_COLLECTIONS.CURSOR_REVISIONS).doc(revisionId).get());
  });

  it("denies confirmed evaluation mutation", async () => {
    const evalId = "eval-confirmed";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(AOS_COLLECTIONS.EVALUATIONS).doc(evalId).set({
        companyId: TEST_COMPANY_ID,
        engagementId: "eng-1",
        cursorSessionId: "s1",
        promptVersionId: "pv1",
        requirementVersionId: "rv1",
        rubricVersionId: "rub1",
        rubricSnapshot: { rubricVersionId: "rub1", name: "R", criteriaLabels: [] },
        status: "confirmed",
        scorePercent: 90,
        passed: true,
        criteria: [],
        createdAt: new Date(),
        confirmedAt: new Date(),
        confirmedByUserId: TEST_COMPANY_ID,
      });
    });
    const db = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertFails(
      db.collection(AOS_COLLECTIONS.EVALUATIONS).doc(evalId).update({ scorePercent: 50 }),
    );
    await assertFails(db.collection(AOS_COLLECTIONS.EVALUATIONS).doc(evalId).delete());
  });

  it("denies learning promotion updates and cross-company candidate read", async () => {
    const candidateId = "candidate-1";
    const promotionId = "promotion-1";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection(AOS_COLLECTIONS.LEARNING_CANDIDATES).doc(candidateId).set({
        companyId: TEST_COMPANY_ID,
        candidateId,
        engagementId: "eng-1",
        retrospectiveId: "retro-1",
        extractionRunId: "run-1",
        candidateType: "knowledge_pattern",
        title: "T",
        summary: "S",
        proposedContent: { patternName: "P", category: "c", description: "d", applicabilityTags: [], generalizationNotes: "g" },
        status: "pending_review",
        confidence: { evidenceConfidence: "single_engagement", organizationalConfidence: "proposed", promotionEligible: true },
        promotionTarget: { targetKind: "knowledge_pattern", expectedVersionStrategy: "new_version" },
        provenance: {
          requirementVersionId: "rv1",
          promptVersionId: "pv1",
          cursorSessionId: "cs1",
          evaluationId: "ev1",
          retrospectiveId: "retro-1",
          sourceAuditEventIds: ["a1"],
        },
        gateResult: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: "system",
        sourceFingerprint: "fp1",
        version: 1,
      });
      await context.firestore().collection(AOS_COLLECTIONS.LEARNING_PROMOTIONS).doc(promotionId).set({
        companyId: TEST_COMPANY_ID,
        promotionId,
        candidateId,
        extractionRunId: "run-1",
        promotedAssetKind: "knowledge_pattern",
        promotedAssetId: "pat-1",
        promotedVersion: "1",
        promotedAt: "2026-01-01T00:00:00.000Z",
        promotedBy: TEST_COMPANY_ID,
        sourceProvenance: {
          requirementVersionId: "rv1",
          promptVersionId: "pv1",
          cursorSessionId: "cs1",
          evaluationId: "ev1",
          retrospectiveId: "retro-1",
          sourceAuditEventIds: ["a1"],
        },
        learningSourceRef: {
          candidateId,
          extractionRunId: "run-1",
          engagementId: "eng-1",
          retrospectiveId: "retro-1",
          requirementVersionId: "rv1",
          promptVersionId: "pv1",
          cursorSessionId: "cs1",
          evaluationId: "ev1",
          promotedAt: "2026-01-01T00:00:00.000Z",
          promotedBy: TEST_COMPANY_ID,
        },
        createdAt: new Date(),
      });
    });

    const ownerDb = testEnv.authenticatedContext(TEST_COMPANY_ID).firestore();
    await assertFails(
      ownerDb.collection(AOS_COLLECTIONS.LEARNING_PROMOTIONS).doc(promotionId).update({ promotedVersion: "2" }),
    );
    await assertFails(ownerDb.collection(AOS_COLLECTIONS.LEARNING_CANDIDATES).doc(candidateId).delete());

    const foreignDb = testEnv.authenticatedContext(OTHER_COMPANY_ID).firestore();
    await assertFails(foreignDb.collection(AOS_COLLECTIONS.LEARNING_CANDIDATES).doc(candidateId).get());
  });
});
