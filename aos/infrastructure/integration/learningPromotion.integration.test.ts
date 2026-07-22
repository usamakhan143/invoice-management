import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AOS_FEATURE_FLAG } from "../../config/featureFlags";
import { createLearningExtractionApplicationService } from "../../application/learning/createLearningExtractionApplicationService";
import { createLearningGovernanceApplicationService } from "../../application/learning/createLearningGovernanceApplicationService";
import { createLearningPromotionApplicationService } from "../../application/learning/createLearningPromotionApplicationService";
import { createEngagementWorkflowApplicationService } from "../../application/workflow/createEngagementWorkflowApplicationService";
import { buildExtractionRunId } from "../../domain/learning/valueObjects/learningIdentifiers";
import { AOS_COLLECTIONS } from "../firestore/collections";
import { AosRepositoryError } from "../firestore/errors";
import { createAosLearningRepositories } from "../firestore/wiring/createAosLearningRepositories";
import { createAosWorkflowRepositories } from "../firestore/wiring/createAosWorkflowRepositories";
import type { LearningCandidate } from "../../domain/learning/entities/learningCandidate";
import type { KnowledgePatternProposedContent } from "../../domain/learning/valueObjects/proposedContent";
import {
  clearAosIntegrationCollections,
  createAosEmulatorHarness,
  integrationActorScope,
  isEmulatorConfigured,
  OTHER_COMPANY_ID,
  type AosEmulatorHarness,
} from "../testing/emulatorHarness";
import { createActorScopeWithPermissions } from "../../constants/actorScope";

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

describeIntegration("AOS learning promotion (Firestore emulator)", () => {
  let harness: AosEmulatorHarness;

  beforeEach(async () => {
    harness = await createAosEmulatorHarness();
    await clearAosIntegrationCollections(harness.db);
  });

  afterEach(async () => {
    await clearAosIntegrationCollections(harness.db);
    await harness.cleanupApp();
  });

  function createServices() {
    const workflowRepos = createAosWorkflowRepositories({ firestore: harness.db });
    const learningRepos = createAosLearningRepositories({ firestore: harness.db });
    const learningExtraction = createLearningExtractionApplicationService({
      learningRepos,
      workflowRepos,
      featureFlags: { [AOS_FEATURE_FLAG.LEARNING_ENGINE]: true },
    });
    const governance = createLearningGovernanceApplicationService(learningRepos, workflowRepos);
    const promotion = createLearningPromotionApplicationService(learningRepos, workflowRepos);
    const workflow = createEngagementWorkflowApplicationService(workflowRepos);
    return { workflowRepos, learningRepos, learningExtraction, governance, promotion, workflow };
  }

  async function extractPendingKnowledgeCandidate(engagementId: string) {
    const { learningExtraction, workflow, learningRepos } = createServices();
    const scope = actorScope(harness);
    const retrospectiveId = `retro-${engagementId}`;

    await closeEngagementForRetro(harness, workflow, scope, engagementId);
    await workflow.approveRetrospective(scope, engagementId, "retro ok");
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
    const pending = candidates.find(
      (c) => c.candidateType === "knowledge_pattern" && c.status === "pending_review",
    );
    if (!pending) throw new Error("No pending knowledge candidate");
    return {
      pending,
      learningRepos,
      governance: createLearningGovernanceApplicationService(
        learningRepos,
        createAosWorkflowRepositories({ firestore: harness.db }),
      ),
      workflowRepos: createAosWorkflowRepositories({ firestore: harness.db }),
    };
  }

  async function approveCandidate(candidate: LearningCandidate) {
    const workflowRepos = createAosWorkflowRepositories({ firestore: harness.db });
    const learningRepos = createAosLearningRepositories({ firestore: harness.db });
    const governance = createLearningGovernanceApplicationService(learningRepos, workflowRepos);
    const promotion = createLearningPromotionApplicationService(learningRepos, workflowRepos);
    const scope = actorScope(harness);
    const result = await governance.approveCandidate(scope, {
      candidateId: candidate.candidateId,
      expectedVersion: candidate.version,
    });
    const reloaded = await learningRepos.candidates.getById(
      harness.companyId,
      candidate.candidateId,
    );
    return {
      approved: reloaded!,
      dto: result,
      governance,
      promotion,
      learningRepos,
      workflowRepos,
    };
  }

  it("A: pending candidate cannot promote", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-pending");
    const { promotion } = createServices();
    const scope = actorScope(harness);

    await expect(
      promotion.promoteCandidate(scope, {
        candidateId: pending.candidateId,
        expectedVersion: pending.version,
      }),
    ).rejects.toBeInstanceOf(AosRepositoryError);
  });

  it("B: approved candidate promotes to canonical knowledge pattern", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-approved");
    const { approved, promotion, learningRepos, workflowRepos } = await approveCandidate(pending);
    const scope = actorScope(harness);

    const result = await promotion.promoteCandidate(scope, {
      candidateId: approved.candidateId,
      expectedVersion: approved.version,
    });

    expect(result.promotedAssetKind).toBe("knowledge_pattern");
    expect(result.candidateStatus).toBe("promoted");

    const pattern = await workflowRepos.knowledge.findById(
      readScope(harness),
      result.promotedAssetId,
    );
    expect(pattern).not.toBeNull();
    expect(pattern?.learningSource?.candidateId).toBe(approved.candidateId);

    const record = await learningRepos.promotions.getByCandidateId(
      harness.companyId,
      approved.candidateId,
    );
    expect(record?.promotionId).toBe(result.promotionId);
  });

  it("C: AI cannot approve or promote", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-ai");
    const { governance, promotion } = createServices();
    const aiScope = { companyId: harness.companyId, actorUserId: "ai" as const, permissions: [] };

    await expect(
      governance.approveCandidate(aiScope, {
        candidateId: pending.candidateId,
        expectedVersion: pending.version,
      }),
    ).rejects.toBeInstanceOf(AosRepositoryError);

    const { approved } = await approveCandidate(pending);
    await expect(
      promotion.promoteCandidate(aiScope, {
        candidateId: approved.candidateId,
        expectedVersion: approved.version,
      }),
    ).rejects.toBeInstanceOf(AosRepositoryError);
  });

  it("D: rejected candidate cannot promote", async () => {
    const { pending, governance } = await extractPendingKnowledgeCandidate("eng-promo-reject");
    const scope = actorScope(harness);
    const rejected = await governance.rejectCandidate(scope, {
      candidateId: pending.candidateId,
      expectedVersion: pending.version,
      rejectionReason: "Not reusable",
    });
    expect(rejected.candidate.status).toBe("rejected");

    const { promotion } = createServices();
    await expect(
      promotion.promoteCandidate(scope, {
        candidateId: pending.candidateId,
        expectedVersion: rejected.candidate.version,
      }),
    ).rejects.toBeInstanceOf(AosRepositoryError);
  });

  it("E: deferred candidate cannot promote", async () => {
    const { pending, governance } = await extractPendingKnowledgeCandidate("eng-promo-defer");
    const scope = actorScope(harness);
    const deferred = await governance.deferCandidate(scope, {
      candidateId: pending.candidateId,
      expectedVersion: pending.version,
      deferReason: "Need more evidence",
    });
    expect(deferred.candidate.status).toBe("gate_deferred");

    const { promotion } = createServices();
    await expect(
      promotion.promoteCandidate(scope, {
        candidateId: pending.candidateId,
        expectedVersion: deferred.candidate.version,
      }),
    ).rejects.toBeInstanceOf(AosRepositoryError);
  });

  it("F: universal gate failure blocks promotion", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-uni-gate");
    const learningRepos = createAosLearningRepositories({ firestore: harness.db });
    const { governance } = createServices();
    const scope = actorScope(harness);
    const approvedDto = await governance.approveCandidate(scope, {
      candidateId: pending.candidateId,
      expectedVersion: pending.version,
    });
    const approved = await learningRepos.candidates.getById(
      harness.companyId,
      pending.candidateId,
    );
    if (!approved) throw new Error("missing approved");

    const tampered: LearningCandidate = {
      ...approved,
      proposedContent: {
        ...(approved.proposedContent as object),
        description: "contact bad@example.com",
      } as LearningCandidate["proposedContent"],
    };
    await learningRepos.candidates.saveCandidate({
      companyId: harness.companyId,
      candidate: tampered,
      expectedVersion: approved.version,
    });

    const { promotion } = createServices();
    await expect(
      promotion.promoteCandidate(scope, {
        candidateId: pending.candidateId,
        expectedVersion: approvedDto.candidate.version + 1,
      }),
    ).rejects.toBeInstanceOf(AosRepositoryError);
  });

  it("G: target-specific gate failure blocks promotion", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-target-gate");
    const learningRepos = createAosLearningRepositories({ firestore: harness.db });
    const { governance } = createServices();
    const scope = actorScope(harness);
    await governance.approveCandidate(scope, {
      candidateId: pending.candidateId,
      expectedVersion: pending.version,
    });
    const approved = await learningRepos.candidates.getById(
      harness.companyId,
      pending.candidateId,
    );
    if (!approved) throw new Error("missing approved");

    const tampered: LearningCandidate = {
      ...approved,
      title: "Auth gate sequencing",
      proposedContent: {
        ...(approved.proposedContent as KnowledgePatternProposedContent),
        patternName: "Auth gate sequencing",
      },
      promotionTarget: {
        targetKind: "knowledge_pattern",
        expectedVersionStrategy: "new_version",
      },
    };
    await learningRepos.candidates.saveCandidate({
      companyId: harness.companyId,
      candidate: tampered,
      expectedVersion: approved.version,
    });

    const { promotion } = createServices();
    await expect(
      promotion.promoteCandidate(scope, {
        candidateId: pending.candidateId,
        expectedVersion: approved.version + 1,
      }),
    ).rejects.toBeInstanceOf(AosRepositoryError);
  });

  it("H: successful promotion creates exactly one LearningPromotionRecord", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-one-record");
    const { approved, promotion, learningRepos } = await approveCandidate(pending);
    const scope = actorScope(harness);

    await promotion.promoteCandidate(scope, {
      candidateId: approved.candidateId,
      expectedVersion: approved.version,
    });

    const snap = await harness.db
      .collection(AOS_COLLECTIONS.LEARNING_PROMOTIONS)
      .where("companyId", "==", harness.companyId)
      .where("candidateId", "==", approved.candidateId)
      .get();
    expect(snap.size).toBe(1);

    const record = await learningRepos.promotions.getByCandidateId(
      harness.companyId,
      approved.candidateId,
    );
    expect(record).not.toBeNull();
  });

  it("I/J: retry and concurrent promotion are idempotent", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-idempotent");
    const { approved, promotion, workflowRepos } = await approveCandidate(pending);
    const scope = actorScope(harness);

    const cmd = {
      candidateId: approved.candidateId,
      expectedVersion: approved.version,
    };
    const first = await promotion.promoteCandidate(scope, cmd);
    const second = await promotion.promoteCandidate(scope, cmd);
    expect(second.promotionId).toBe(first.promotionId);

    const patternAfterRetry = await workflowRepos.knowledge.findById(
      readScope(harness),
      first.promotedAssetId,
    );
    expect(patternAfterRetry?.patternVersion).toBe(1);

    const { promotion: promotion2, learningRepos } = createServices();
    const reloaded = await learningRepos.candidates.getById(
      harness.companyId,
      approved.candidateId,
    );
    const concurrent = await Promise.allSettled([
      promotion2.promoteCandidate(scope, {
        candidateId: approved.candidateId,
        expectedVersion: reloaded!.version,
      }),
      promotion2.promoteCandidate(scope, {
        candidateId: approved.candidateId,
        expectedVersion: reloaded!.version,
      }),
    ]);
    const fulfilled = concurrent.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const snap = await harness.db
      .collection(AOS_COLLECTIONS.LEARNING_PROMOTIONS)
      .where("companyId", "==", harness.companyId)
      .where("candidateId", "==", approved.candidateId)
      .get();
    expect(snap.size).toBe(1);
  });

  it("K: cross-company promotion is rejected", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-tenant");
    const { approved, promotion } = await approveCandidate(pending);

    await expect(
      promotion.promoteCandidate(
        createActorScopeWithPermissions(OTHER_COMPANY_ID, OTHER_COMPANY_ID, []),
        {
          candidateId: approved.candidateId,
          expectedVersion: approved.version,
        },
      ),
    ).rejects.toBeInstanceOf(AosRepositoryError);
  });

  it("L: promotion record cannot be updated or deleted", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-immutable");
    const { approved, promotion } = await approveCandidate(pending);
    const scope = actorScope(harness);
    const result = await promotion.promoteCandidate(scope, {
      candidateId: approved.candidateId,
      expectedVersion: approved.version,
    });

    const ref = harness.db.collection(AOS_COLLECTIONS.LEARNING_PROMOTIONS).doc(result.promotionId);
    await expect(ref.update({ promotedVersion: "999" })).rejects.toThrow();
    await expect(ref.delete()).rejects.toThrow();
  });

  it("M: historical target version remains after supersession", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-supersede");
    const { approved, promotion, workflowRepos, learningRepos, governance } =
      await approveCandidate(pending);
    const scope = actorScope(harness);

    const first = await promotion.promoteCandidate(scope, {
      candidateId: approved.candidateId,
      expectedVersion: approved.version,
    });
    const firstPattern = await workflowRepos.knowledge.findById(
      readScope(harness),
      first.promotedAssetId,
    );
    expect(firstPattern).not.toBeNull();

    const runId = buildExtractionRunId(
      harness.companyId,
      pending.engagementId,
      pending.retrospectiveId,
    );
    const siblings = await learningRepos.candidates.listByExtractionRun(harness.companyId, runId);
    const donor = siblings.find((c) => c.candidateId !== pending.candidateId);
    if (!donor) throw new Error("no sibling candidate");

    const supersedeReady: LearningCandidate = {
      ...donor,
      candidateType: "knowledge_pattern",
      title: "Superseding pattern",
      summary: "Version 2 lesson",
      proposedContent: {
        patternName: "Superseding pattern",
        category: "delivery",
        description: "Updated organizational lesson",
        applicabilityTags: ["supersede"],
        generalizationNotes: "Generalized update",
      },
      promotionTarget: {
        targetKind: "knowledge_pattern",
        targetId: first.promotedAssetId,
        expectedVersionStrategy: "supersede",
      },
    };
    await learningRepos.candidates.saveCandidate({
      companyId: harness.companyId,
      candidate: supersedeReady,
      expectedVersion: donor.version,
    });

    const approvedSecond = await governance.approveCandidate(scope, {
      candidateId: donor.candidateId,
      expectedVersion: donor.version,
    });
    const second = await promotion.promoteCandidate(scope, {
      candidateId: donor.candidateId,
      expectedVersion: approvedSecond.candidate.version,
    });
    expect(second.promotedAssetId).not.toBe(first.promotedAssetId);

    const historical = await workflowRepos.knowledge.findById(
      readScope(harness),
      first.promotedAssetId,
    );
    expect(historical).not.toBeNull();
    expect(historical?.promotionStatus).toBe("pattern_stale");
  });

  it("N: complete provenance chain survives Firestore reload", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-provenance");
    const { approved, promotion, learningRepos } = await approveCandidate(pending);
    const scope = actorScope(harness);
    const result = await promotion.promoteCandidate(scope, {
      candidateId: approved.candidateId,
      expectedVersion: approved.version,
    });

    const record = await learningRepos.promotions.getByCandidateId(
      harness.companyId,
      approved.candidateId,
    );
    expect(record?.learningSourceRef.retrospectiveId).toBe(pending.retrospectiveId);
    expect(record?.learningSourceRef.extractionRunId).toBe(pending.extractionRunId);
    expect(record?.sourceProvenance.evaluationId).toBeTruthy();
    expect(result.promotionId).toBe(`promo-${approved.candidateId}`);
  });

  it("O: candidate reaches promoted only after successful target write", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-o");
    const { approved, promotion, learningRepos, workflowRepos } = await approveCandidate(pending);
    const scope = actorScope(harness);

    await promotion.promoteCandidate(scope, {
      candidateId: approved.candidateId,
      expectedVersion: approved.version,
    });

    const reloaded = await learningRepos.candidates.getById(
      harness.companyId,
      approved.candidateId,
    );
    expect(reloaded?.status).toBe("promoted");
    expect(reloaded?.promotion?.promotedAssetId).toBeTruthy();

    const pattern = await workflowRepos.knowledge.findById(
      readScope(harness),
      reloaded!.promotion!.promotedAssetId,
    );
    expect(pattern).not.toBeNull();
  });

  it("P: failed promotion does not falsely mark candidate promoted", async () => {
    const { pending } = await extractPendingKnowledgeCandidate("eng-promo-fail");
    const { approved, learningRepos } = await approveCandidate(pending);
    const scope = actorScope(harness);

    await expect(
      createServices().promotion.promoteCandidate(scope, {
        candidateId: approved.candidateId,
        expectedVersion: approved.version + 99,
      }),
    ).rejects.toBeInstanceOf(AosRepositoryError);

    const reloaded = await learningRepos.candidates.getById(
      harness.companyId,
      approved.candidateId,
    );
    expect(reloaded?.status).not.toBe("promoted");
  });

  it("Q: audit chain exists for approval and promotion", async () => {
    const { pending, workflowRepos } = await extractPendingKnowledgeCandidate("eng-promo-audit");
    const { approved, promotion } = await approveCandidate(pending);
    const scope = actorScope(harness);
    await promotion.promoteCandidate(scope, {
      candidateId: approved.candidateId,
      expectedVersion: approved.version,
    });

    const audits = await workflowRepos.auditEvents.listByEngagement(
      harness.companyId,
      pending.engagementId,
    );
    const types = audits.map((a) => a.type);
    expect(types).toContain("aos_learning_candidate_approved");
    expect(types).toContain("aos_learning_candidate_promoted");
  });
});
