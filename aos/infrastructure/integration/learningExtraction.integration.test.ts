import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AOS_FEATURE_FLAG } from "../../config/featureFlags";
import { createLearningExtractionApplicationService } from "../../application/learning/createLearningExtractionApplicationService";
import { createEngagementWorkflowApplicationService } from "../../application/workflow/createEngagementWorkflowApplicationService";
import { buildExtractionRunId } from "../../domain/learning/valueObjects/learningIdentifiers";
import { AosRepositoryError } from "../firestore/errors";
import { createAosLearningRepositories } from "../firestore/wiring/createAosLearningRepositories";
import { createAosWorkflowRepositories } from "../firestore/wiring/createAosWorkflowRepositories";
import type { LearningExtractionAiPort } from "../../contracts/learning/LearningExtractionAiPort";
import {
  clearAosIntegrationCollections,
  createAosEmulatorHarness,
  integrationActorScope,
  isEmulatorConfigured,
  OTHER_COMPANY_ID,
  seedErpBosReadFixtures,
  type AosEmulatorHarness,
} from "../testing/emulatorHarness";

const describeIntegration = isEmulatorConfigured() ? describe : describe.skip;

function actorScope(harness: AosEmulatorHarness) {
  return integrationActorScope(harness);
}

function readScope(harness: AosEmulatorHarness) {
  return { companyId: harness.companyId };
}

async function closeEngagementForRetro(
  harness: AosEmulatorHarness,
  service: ReturnType<typeof createEngagementWorkflowApplicationService>,
  scope: ReturnType<typeof actorScope>,
  engagementId: string,
) {
  await service.generateRequirementsDraft(scope, engagementId);
  await service.approveRequirements(scope, engagementId, "req ok");
  await service.runReuseAssessment(scope, engagementId);
  await service.setReuseModuleDecision(scope, engagementId, "auth-firebase-v2", "accepted");
  await service.recordReuseDecisions(scope, engagementId, {});
  await service.generatePromptPack(scope, engagementId);
  await service.approvePromptPack(scope, engagementId, "prompt ok");
  await service.startCursorSession(scope, engagementId);
  const wf = await service.getWorkflow(readScope(harness), { engagementId });
  await service.submitCursorCapture(scope, engagementId, wf.cursorSessions[0]!.id, "capture");
  await service.runEvaluation(scope, engagementId);
  await service.updateQaChecklist(scope, engagementId, "qa-1", true);
  await service.updateQaChecklist(scope, engagementId, "qa-2", true);
  await service.updateQaChecklist(scope, engagementId, "qa-3", true);
  await service.approveQaHandoff(scope, engagementId, "qa ok");
  await service.generateRetrospective(scope, engagementId);
}

describeIntegration("AOS learning extraction (Firestore emulator)", () => {
  let harness: AosEmulatorHarness;

  beforeEach(async () => {
    harness = await createAosEmulatorHarness();
    await clearAosIntegrationCollections(harness.db);
  });

  afterEach(async () => {
    await clearAosIntegrationCollections(harness.db);
    await harness.cleanupApp();
  });

  function createServices(options?: { aiPort?: LearningExtractionAiPort; withHook?: boolean }) {
    const workflowRepos = createAosWorkflowRepositories({ firestore: harness.db });
    const learningRepos = createAosLearningRepositories({ firestore: harness.db });
    const learningExtraction = createLearningExtractionApplicationService({
      learningRepos,
      workflowRepos,
      aiPort: options?.aiPort,
      featureFlags: { [AOS_FEATURE_FLAG.LEARNING_ENGINE]: true },
    });

    const service = createEngagementWorkflowApplicationService(workflowRepos, {
      onRetrospectiveApproved: options?.withHook
        ? (scope, engagementId, retrospectiveId) => {
            void learningExtraction.runExtraction({
              companyId: scope.companyId,
              engagementId,
              retrospectiveId,
            });
          }
        : undefined,
    });

    return { workflowRepos, learningRepos, learningExtraction, service };
  }

  it("A: persists extraction run and candidates after retrospective approval", async () => {
    const { learningRepos, learningExtraction, service } = createServices();
    const scope = actorScope(harness);
    const engagementId = "eng-learning-1";
    const retrospectiveId = `retro-${engagementId}`;

    await closeEngagementForRetro(harness, service, scope, engagementId);
    const closed = await service.approveRetrospective(scope, engagementId, "retro ok");
    expect(closed.retrospective?.status).toBe("approved");

    await learningExtraction.runExtraction({
      companyId: harness.companyId,
      engagementId,
      retrospectiveId,
    });

    const runId = buildExtractionRunId(harness.companyId, engagementId, retrospectiveId);
    const run = await learningRepos.extractionRuns.getById(harness.companyId, runId);
    expect(run?.status).toBe("completed");
    expect(run?.candidateIds.length).toBeGreaterThan(0);

    const candidates = await learningRepos.candidates.listByExtractionRun(
      harness.companyId,
      runId,
    );
    expect(candidates.length).toBe(2);
    expect(candidates.some((c) => c.status === "pending_review")).toBe(true);
    expect(candidates[0]?.provenance.requirementVersionId).toBeTruthy();
  });

  it("D: duplicate extraction is idempotent", async () => {
    const { learningRepos, learningExtraction, service } = createServices();
    const scope = actorScope(harness);
    const engagementId = "eng-learning-idempotent";
    const retrospectiveId = `retro-${engagementId}`;

    await closeEngagementForRetro(harness, service, scope, engagementId);
    await service.approveRetrospective(scope, engagementId, "retro ok");

    const input = {
      companyId: harness.companyId,
      engagementId,
      retrospectiveId,
    };
    await learningExtraction.runExtraction(input);
    await learningExtraction.runExtraction(input);

    const runId = buildExtractionRunId(harness.companyId, engagementId, retrospectiveId);
    const candidates = await learningRepos.candidates.listByExtractionRun(
      harness.companyId,
      runId,
    );
    expect(candidates).toHaveLength(2);
  });

  it("E: rejects cross-company candidate reads", async () => {
    const { learningRepos, learningExtraction, service } = createServices();
    const scope = actorScope(harness);
    const engagementId = "eng-learning-tenant";
    const retrospectiveId = `retro-${engagementId}`;

    await closeEngagementForRetro(harness, service, scope, engagementId);
    await service.approveRetrospective(scope, engagementId, "retro ok");
    await learningExtraction.runExtraction({
      companyId: harness.companyId,
      engagementId,
      retrospectiveId,
    });

    const candidates = await learningRepos.candidates.listByEngagement(
      harness.companyId,
      engagementId,
    );
    const foreign = await learningRepos.candidates
      .getById(OTHER_COMPANY_ID, candidates[0]!.candidateId)
      .catch((error) => error);
    expect(foreign).toBeInstanceOf(AosRepositoryError);
  });

  it("F: null AI port produces deterministic candidates only", async () => {
    const { learningRepos, learningExtraction, service } = createServices();
    const scope = actorScope(harness);
    const engagementId = "eng-learning-null-ai";
    const retrospectiveId = `retro-${engagementId}`;

    await closeEngagementForRetro(harness, service, scope, engagementId);
    await service.approveRetrospective(scope, engagementId, "retro ok");
    await learningExtraction.runExtraction({
      companyId: harness.companyId,
      engagementId,
      retrospectiveId,
    });

    const runId = buildExtractionRunId(harness.companyId, engagementId, retrospectiveId);
    const candidates = await learningRepos.candidates.listByExtractionRun(
      harness.companyId,
      runId,
    );
    expect(candidates.every((c) => !c.aiRecommendation)).toBe(true);
    expect(candidates.length).toBe(2);
  });

  it("G: gate-blocked AI candidates do not enter pending review", async () => {
    const badAiPort: LearningExtractionAiPort = {
      proposeCandidates: async () => ({
        proposals: [
          {
            candidateType: "knowledge_pattern",
            title: "AI proposal",
            summary: "From AI",
            proposedContent: {
              patternName: "AI",
              category: "delivery",
              description: "desc",
              applicabilityTags: [],
              generalizationNotes: "notes",
            },
          },
        ],
        modelMetadata: { provider: "", modelId: "", promptVersion: "" },
        rawResponseHash: "bad",
      }),
    };

    const { learningRepos, learningExtraction, service } = createServices({ aiPort: badAiPort });
    const scope = actorScope(harness);
    const engagementId = "eng-learning-gate-block";
    const retrospectiveId = `retro-${engagementId}`;

    await closeEngagementForRetro(harness, service, scope, engagementId);
    await service.approveRetrospective(scope, engagementId, "retro ok");
    await learningExtraction.runExtraction({
      companyId: harness.companyId,
      engagementId,
      retrospectiveId,
    });

    const runId = buildExtractionRunId(harness.companyId, engagementId, retrospectiveId);
    const candidates = await learningRepos.candidates.listByExtractionRun(
      harness.companyId,
      runId,
    );
    const aiCandidates = candidates.filter((c) => c.aiRecommendation);
    expect(aiCandidates.every((c) => c.status === "gate_blocked")).toBe(true);
    expect(aiCandidates.every((c) => c.status !== "pending_review")).toBe(true);
  });

  it("H: retrospective approval persists even when extraction completes independently", async () => {
    const { learningExtraction, service, workflowRepos } = createServices();
    const scope = actorScope(harness);
    const engagementId = "eng-learning-fail-safe";
    const retrospectiveId = `retro-${engagementId}`;

    await closeEngagementForRetro(harness, service, scope, engagementId);
    const closed = await service.approveRetrospective(scope, engagementId, "retro ok");
    expect(closed.retrospective?.status).toBe("approved");

    const afterApprove = await workflowRepos.workflows.get(harness.companyId, engagementId);
    expect(afterApprove?.retrospective?.status).toBe("approved");

    await learningExtraction.runExtraction({
      companyId: harness.companyId,
      engagementId,
      retrospectiveId,
    });

    const afterExtraction = await workflowRepos.workflows.get(harness.companyId, engagementId);
    expect(afterExtraction?.retrospective?.status).toBe("approved");
  });

  it("I: appends learning audit events", async () => {
    const { learningExtraction, service, workflowRepos } = createServices();
    const scope = actorScope(harness);
    const engagementId = "eng-learning-audit";
    const retrospectiveId = `retro-${engagementId}`;

    await closeEngagementForRetro(harness, service, scope, engagementId);
    await service.approveRetrospective(scope, engagementId, "retro ok");
    await learningExtraction.runExtraction({
      companyId: harness.companyId,
      engagementId,
      retrospectiveId,
    });

    const events = await workflowRepos.auditEvents.listByEngagement(
      harness.companyId,
      engagementId,
      200,
    );
    const learningEvents = events.filter((e) => e.type.startsWith("aos_learning_"));
    expect(learningEvents.some((e) => e.type === "aos_learning_extraction_started")).toBe(true);
    expect(learningEvents.some((e) => e.type === "aos_learning_extraction_completed")).toBe(true);
    expect(learningEvents.some((e) => e.type === "aos_learning_candidate_created")).toBe(true);
  });

  it("J: enforces optimistic version conflict on candidate update", async () => {
    const { learningRepos, learningExtraction, service } = createServices();
    const scope = actorScope(harness);
    const engagementId = "eng-learning-version";
    const retrospectiveId = `retro-${engagementId}`;

    await closeEngagementForRetro(harness, service, scope, engagementId);
    await service.approveRetrospective(scope, engagementId, "retro ok");
    await learningExtraction.runExtraction({
      companyId: harness.companyId,
      engagementId,
      retrospectiveId,
    });

    const candidates = await learningRepos.candidates.listByEngagement(
      harness.companyId,
      engagementId,
    );
    const candidate = candidates[0]!;

    await expect(
      learningRepos.candidates.updateStatus({
        companyId: harness.companyId,
        candidateId: candidate.candidateId,
        expectedVersion: candidate.version + 99,
        status: "approved",
        updatedAt: new Date().toISOString(),
      }),
    ).rejects.toBeInstanceOf(AosRepositoryError);
  });
});

