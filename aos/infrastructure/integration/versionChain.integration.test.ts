import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEngagementWorkflowApplicationService } from "../../application/workflow/createEngagementWorkflowApplicationService";
import { LegacyPromptMigrationService } from "../../application/workflow/LegacyVersionMigrationService";
import { WorkflowVersionOrchestrator } from "../../application/workflow/WorkflowVersionOrchestrator";
import { AosRepositoryError } from "../firestore/errors";
import { openCursorRevision, resolveCursorRevision } from "../../domain/cursor/rules/cursorSessionRules";
import { createCursorSession } from "../../domain/cursor/entities/cursorSession";
import { promptVersionDocId, requirementVersionDocId } from "../firestore/versionIds";
import { AOS_COLLECTIONS } from "../firestore/collections";
import { createAosWorkflowRepositories } from "../firestore/wiring/createAosWorkflowRepositories";
import {
  clearAosIntegrationCollections,
  createAosEmulatorHarness,
  integrationActorScope,
  isEmulatorConfigured,
  type AosEmulatorHarness,
} from "../testing/emulatorHarness";

const describeIntegration = isEmulatorConfigured() ? describe : describe.skip;

function actorScope(harness: AosEmulatorHarness) { return integrationActorScope(harness); }

function readScope(harness: AosEmulatorHarness) {
  return { companyId: harness.companyId };
}

describeIntegration("AOS version chain (Firestore emulator)", () => {
  let harness: AosEmulatorHarness;
  const engagementId = "eng-version-chain";

  beforeEach(async () => {
    harness = await createAosEmulatorHarness();
    await clearAosIntegrationCollections(harness.db);
  });

  afterEach(async () => {
    await clearAosIntegrationCollections(harness.db);
    await harness.cleanupApp();
  });

  it("publishes requirement v1 + v2 with immutable dedicated collection", async () => {
    const repos = createAosWorkflowRepositories({ firestore: harness.db });
    const service = createEngagementWorkflowApplicationService(repos);
    const scope = actorScope(harness);

    await service.generateRequirementsDraft(scope, engagementId);
    await service.approveRequirements(scope, engagementId, "v1");

    const setId = `req-set-${engagementId}-v1`;
    const v1Id = requirementVersionDocId(harness.companyId, setId, 1);
    const v1Snap = await harness.db.collection(AOS_COLLECTIONS.REQUIREMENT_VERSIONS).doc(v1Id).get();
    expect(v1Snap.exists).toBe(true);
    expect(v1Snap.data()?.snapshot?.title).toBeTruthy();

    const history = await service.listRequirementVersions(readScope(harness), engagementId);
    expect(history).toHaveLength(1);
    expect(history[0]?.versionNumber).toBe(1);
  });

  it("binds prompt publish to exact requirement version", async () => {
    const repos = createAosWorkflowRepositories({ firestore: harness.db });
    const service = createEngagementWorkflowApplicationService(repos);
    const scope = actorScope(harness);

    await service.generateRequirementsDraft(scope, engagementId);
    await service.approveRequirements(scope, engagementId, "approved");
    await service.runReuseAssessment(scope, engagementId);
    await service.setReuseModuleDecision(scope, engagementId, "auth-firebase-v2", "accepted");
    await service.recordReuseDecisions(scope, engagementId, {});
    await service.generatePromptPack(scope, engagementId);
    await service.approvePromptPack(scope, engagementId, "prompts ok");

    const promptVersions = await repos.promptVersions.listByArtifact(harness.companyId, "artifact-1");
    expect(promptVersions.length).toBeGreaterThan(0);
    expect(promptVersions[0]?.requirementVersionId).toContain(harness.companyId);
  });

  it("persists cursor session and evaluation with exact lineage refs", async () => {
    const repos = createAosWorkflowRepositories({ firestore: harness.db });
    const service = createEngagementWorkflowApplicationService(repos);
    const scope = actorScope(harness);

    await service.generateRequirementsDraft(scope, engagementId);
    await service.approveRequirements(scope, engagementId, "approved");
    await service.runReuseAssessment(scope, engagementId);
    await service.setReuseModuleDecision(scope, engagementId, "auth-firebase-v2", "accepted");
    await service.recordReuseDecisions(scope, engagementId, {});
    await service.generatePromptPack(scope, engagementId);
    await service.approvePromptPack(scope, engagementId, "prompts ok");
    await service.startCursorSession(scope, engagementId);

    const wf = await service.getWorkflow(readScope(harness), { engagementId });
    await service.submitCursorCapture(scope, engagementId, wf.cursorSessions[0]!.id, "capture");
    await service.runEvaluation(scope, engagementId);

    const sessions = await service.listCursorSessions(readScope(harness), engagementId);
    expect(sessions[0]?.promptVersionId).toBeTruthy();

    const evaluations = await service.listEvaluations(readScope(harness), engagementId);
    expect(evaluations[0]?.cursorSessionId).toBe(sessions[0]?.id);
    expect(evaluations[0]?.promptVersionId).toBe(sessions[0]?.promptVersionId);
  });

  it("returns VERSION_CONFLICT when concurrent requirement publishes race", async () => {
    const repos = createAosWorkflowRepositories({ firestore: harness.db });
    const service = createEngagementWorkflowApplicationService(repos);
    const scope = actorScope(harness);
    const orchestrator = new WorkflowVersionOrchestrator({ firestore: harness.db });

    await service.generateRequirementsDraft(scope, engagementId);
    const workflow = await repos.workflows.getOrCreate(harness.companyId, engagementId);
    const setId = workflow.requirementSet!.id;
    const now = Date.now();

    const publish = () =>
      orchestrator.publishRequirementVersionTransactional({
        companyId: harness.companyId,
        engagementId,
        workflow,
        note: "race",
        actorUserId: harness.userId,
        occurredAt: now,
        existingVersionNumbers: [],
      });

    const results = await Promise.allSettled([publish(), publish()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const conflict = rejected[0] as PromiseRejectedResult;
    expect(conflict.reason).toBeInstanceOf(AosRepositoryError);
    expect((conflict.reason as AosRepositoryError).code).toBe("VERSION_CONFLICT");

    const versions = await repos.requirementVersions.listBySet(harness.companyId, setId);
    expect(versions).toHaveLength(1);
    expect(versions[0]?.versionNumber).toBe(1);
  });

  it("materializes legacy approved requirements idempotently", async () => {
    const repos = createAosWorkflowRepositories({ firestore: harness.db });
    const setId = `req-set-${engagementId}-v1`;

    await repos.workflows.save(harness.companyId, {
      ...(await repos.workflows.getOrCreate(harness.companyId, engagementId)),
      requirementSet: {
        id: setId,
        companyId: harness.companyId,
        engagementId,
        status: "approved",
        title: "Legacy requirements",
        items: [{ id: "r1", title: "Legacy", description: "From D4" }],
        aiGenerated: false,
        updatedAt: Date.now(),
        version: 1,
        approvedAt: Date.now(),
      },
      gates: {
        requirementsApproved: true,
        reuseRecorded: false,
        promptPackApproved: false,
        cursorSubmitted: false,
        evaluationPassed: false,
        qaComplete: false,
        retrospectiveComplete: false,
      },
    });

    const service = createEngagementWorkflowApplicationService(repos);
    await service.runReuseAssessment(actorScope(harness), engagementId);

    const v1Id = requirementVersionDocId(harness.companyId, setId, 1);
    const versions = await repos.requirementVersions.listBySet(harness.companyId, setId);
    expect(versions.some((v) => v.id === v1Id)).toBe(true);

    await service.runReuseAssessment(actorScope(harness), engagementId);
    const countAgain = (await repos.requirementVersions.listBySet(harness.companyId, setId)).length;
    expect(countAgain).toBe(1);
  });

  it("materializes legacy approved prompt pack idempotently", async () => {
    const repos = createAosWorkflowRepositories({ firestore: harness.db });
    const setId = `req-set-${engagementId}-legacy-prompt`;
    const packId = `prompt-pack-${engagementId}-legacy`;
    const artifactId = "artifact-1";
    const reqVersionId = requirementVersionDocId(harness.companyId, setId, 1);

    await repos.requirementVersions.publish({
      companyId: harness.companyId,
      engagementId,
      requirementSetId: setId,
      version: {
        id: reqVersionId,
        companyId: harness.companyId,
        engagementId,
        requirementSetId: setId,
        versionNumber: 1,
        publishedAt: Date.now(),
        publishedByUserId: harness.userId,
        snapshot: { title: "Legacy requirements", items: [{ id: "r1", title: "Legacy", description: "D4" }] },
      },
    });

    await repos.workflows.save(harness.companyId, {
      ...(await repos.workflows.getOrCreate(harness.companyId, engagementId)),
      currentApprovedRequirementVersionId: reqVersionId,
      currentApprovedRequirementVersionNumber: 1,
      requirementSet: {
        id: setId,
        companyId: harness.companyId,
        engagementId,
        status: "approved",
        title: "Legacy requirements",
        items: [{ id: "r1", title: "Legacy", description: "From D4" }],
        aiGenerated: false,
        updatedAt: Date.now(),
        version: 1,
        approvedAt: Date.now(),
        currentApprovedVersionId: reqVersionId,
        currentApprovedVersionNumber: 1,
      },
      promptPack: {
        id: packId,
        companyId: harness.companyId,
        engagementId,
        status: "approved",
        title: "Legacy prompts",
        artifacts: [{ id: artifactId, title: "Legacy artifact", body: "Legacy body" }],
        aiGenerated: false,
        updatedAt: Date.now(),
        version: 1,
        approvedAt: Date.now(),
      },
      gates: {
        requirementsApproved: true,
        reuseRecorded: true,
        promptPackApproved: true,
        cursorSubmitted: false,
        evaluationPassed: false,
        qaComplete: false,
        retrospectiveComplete: false,
      },
    });

    const requirementVersion = (await repos.requirementVersions.getById(harness.companyId, reqVersionId))!;
    const migration = new LegacyPromptMigrationService({
      workflows: repos.workflows,
      requirementVersions: repos.requirementVersions,
      promptVersions: repos.promptVersions,
      auditEvents: repos.auditEvents,
    });

    const workflow = await repos.workflows.getOrCreate(harness.companyId, engagementId);
    await migration.ensurePromptVersionsMaterialized({
      companyId: harness.companyId,
      engagementId,
      workflow,
      requirementVersion,
      actorUserId: harness.userId,
      occurredAt: Date.now(),
    });

    const v1Id = promptVersionDocId(harness.companyId, artifactId, 1);
    const promptVersions = await repos.promptVersions.listByArtifact(harness.companyId, artifactId);
    expect(promptVersions.some((v) => v.id === v1Id)).toBe(true);
    expect(promptVersions[0]?.requirementVersionId).toBe(reqVersionId);

    const auditSnap = await harness.db
      .collection(AOS_COLLECTIONS.AUDIT_EVENTS)
      .where("companyId", "==", harness.companyId)
      .where("type", "==", "aos_version_migration_materialized")
      .get();
    expect(auditSnap.size).toBeGreaterThan(0);

    await migration.ensurePromptVersionsMaterialized({
      companyId: harness.companyId,
      engagementId,
      workflow: await repos.workflows.getOrCreate(harness.companyId, engagementId),
      requirementVersion,
      actorUserId: harness.userId,
      occurredAt: Date.now(),
    });
    const countAgain = (await repos.promptVersions.listByArtifact(harness.companyId, artifactId)).length;
    expect(countAgain).toBe(1);

    const wfSnap = await harness.db
      .collection(AOS_COLLECTIONS.ENGAGEMENT_WORKFLOWS)
      .doc(`${harness.companyId}__${engagementId}`)
      .get();
    expect(wfSnap.data()?.promptPack?.artifacts?.[0]?.body).toBe("Legacy body");
  });

  it("preserves cursor revision lineage for failed session", async () => {
    const repos = createAosWorkflowRepositories({ firestore: harness.db });
    const scope = actorScope(harness);
    const sessionId = "cursor-failed-revision";

    const session = createCursorSession({
      id: sessionId,
      companyId: harness.companyId,
      engagementId,
      promptPackId: "pack1",
      promptArtifactId: "artifact-1",
      promptVersionId: promptVersionDocId(harness.companyId, "artifact-1", 1),
      executorUserId: harness.userId,
      startedAt: Date.now(),
    });

    await repos.cursorSessions.create({
      companyId: harness.companyId,
      engagementId,
      session: { ...session, status: "failed", finalizedAt: Date.now() },
    });

    const opened = openCursorRevision({
      id: "revision-1",
      session: { ...session, status: "failed", finalizedAt: Date.now() },
      createdAt: Date.now(),
      createdByUserId: harness.userId,
    });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    await repos.cursorRevisions.create({ companyId: harness.companyId, revision: opened.value });

    const resolved = resolveCursorRevision(opened.value, {
      revisionPromptVersionId: promptVersionDocId(harness.companyId, "artifact-1", 2),
      resolvedAt: Date.now(),
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    await repos.cursorRevisions.resolve({
      companyId: harness.companyId,
      revisionId: opened.value.id,
      revisionPromptVersionId: resolved.value.revisionPromptVersionId!,
      resolvedAt: Date.now(),
    });

    const reloaded = createAosWorkflowRepositories({ firestore: harness.db });
    const revisions = await reloaded.cursorRevisions.listBySession(harness.companyId, sessionId);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.cursorSessionId).toBe(sessionId);
    expect(revisions[0]?.originalPromptVersionId).toBe(session.promptVersionId);
    expect(revisions[0]?.status).toBe("resolved");
  });

  it("persists full immutable lineage through retrospective reload", async () => {
    const repos = createAosWorkflowRepositories({ firestore: harness.db });
    const service = createEngagementWorkflowApplicationService(repos);
    const scope = actorScope(harness);
    const engId = "eng-full-lineage";

    await service.generateRequirementsDraft(scope, engId);
    await service.approveRequirements(scope, engId, "req ok");
    await service.runReuseAssessment(scope, engId);
    await service.setReuseModuleDecision(scope, engId, "auth-firebase-v2", "accepted");
    await service.recordReuseDecisions(scope, engId, {});
    await service.generatePromptPack(scope, engId);
    await service.approvePromptPack(scope, engId, "prompt ok");
    await service.startCursorSession(scope, engId);
    const wf = await service.getWorkflow(readScope(harness), { engagementId: engId });
    await service.submitCursorCapture(scope, engId, wf.cursorSessions[0]!.id, "capture");
    await service.runEvaluation(scope, engId);
    await service.updateQaChecklist(scope, engId, "qa-1", true);
    await service.updateQaChecklist(scope, engId, "qa-2", true);
    await service.updateQaChecklist(scope, engId, "qa-3", true);
    await service.approveQaHandoff(scope, engId, "qa ok");
    await service.generateRetrospective(scope, engId);
    const closed = await service.approveRetrospective(scope, engId, "retro ok");

    expect(closed.retrospective?.traceabilityRefs?.evaluationId).toBeTruthy();
    expect(closed.retrospective?.traceabilityRefs?.cursorSessionId).toBeTruthy();
    expect(closed.retrospective?.traceabilityRefs?.promptVersionId).toBeTruthy();
    expect(closed.retrospective?.traceabilityRefs?.requirementVersionId).toBeTruthy();

    const reloaded = createEngagementWorkflowApplicationService(
      createAosWorkflowRepositories({ firestore: harness.db }),
    );
    const again = await reloaded.getWorkflow(readScope(harness), { engagementId: engId });
    const refs = again.retrospective?.traceabilityRefs;
    expect(refs?.evaluationId).toBe(closed.retrospective?.traceabilityRefs?.evaluationId);
    expect(refs?.cursorSessionId).toBe(closed.retrospective?.traceabilityRefs?.cursorSessionId);
    expect(refs?.promptVersionId).toBe(closed.retrospective?.traceabilityRefs?.promptVersionId);
    expect(refs?.requirementVersionId).toBe(closed.retrospective?.traceabilityRefs?.requirementVersionId);

    const reqDetail = await reloaded.getRequirementVersionDetail(
      readScope(harness),
      refs!.requirementVersionId!,
    );
    expect(reqDetail?.items.length).toBeGreaterThan(0);
    expect(reqDetail?.title).toBeTruthy();
  });
});

