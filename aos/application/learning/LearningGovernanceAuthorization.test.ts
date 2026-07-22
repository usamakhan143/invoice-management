import { beforeEach, describe, expect, it, vi } from "vitest";
import { AOS_PERMISSION_KEY } from "../../constants/permissionKeys";
import { createActorScopeWithPermissions, createOwnerActorScope } from "../../constants/actorScope";
import type { LearningCandidateRepository } from "../../contracts/learning/LearningRepositories";
import type { AuditEventRepository } from "../../contracts/EngagementWorkflowRepository";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";
import type { LearningCandidate } from "../../domain/learning/entities/learningCandidate";
import { LearningGovernanceApplicationService } from "./LearningGovernanceApplicationService";
import { LearningPromotionApplicationService } from "./LearningPromotionApplicationService";

function candidateFixture(): LearningCandidate {
  return {
    candidateId: "cand-1",
    companyId: "co1",
    engagementId: "eng-1",
    retrospectiveId: "retro-1",
    extractionRunId: "run-1",
    candidateType: "knowledge_pattern",
    title: "Lesson",
    summary: "Summary",
    status: "pending_review",
    version: 1,
    createdAt: "2026-07-21T00:00:00.000Z",
    proposedContent: {
      kind: "knowledge_pattern",
      title: "Lesson",
      body: "Body",
      tags: [],
    },
    provenance: {
      requirementVersionId: "rv-1",
      promptVersionId: "pv-1",
      cursorSessionId: "cs-1",
      evaluationId: "ev-1",
      retrospectiveId: "retro-1",
      auditEventIds: [],
    },
    confidence: {
      evidenceConfidence: "single_engagement",
      organizationalConfidence: "medium",
      aiConfidence: 0,
      promotionEligible: true,
    },
    promotionTarget: {
      targetKind: "knowledge_pattern",
      expectedVersionStrategy: "new_version",
    },
    gateResult: null,
  };
}

describe("Learning governance authorization", () => {
  let candidates: LearningCandidateRepository;
  let auditEvents: AuditEventRepository;

  beforeEach(() => {
    candidates = {
      getById: vi.fn().mockResolvedValue(candidateFixture()),
      saveCandidate: vi.fn().mockImplementation(async ({ candidate }) => candidate),
    } as unknown as LearningCandidateRepository;
    auditEvents = {
      append: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuditEventRepository;
  });

  it("denies approve without LEARNING_REVIEW permission", async () => {
    const governance = new LearningGovernanceApplicationService({ candidates, auditEvents });
    const scope = createActorScopeWithPermissions("co1", "user-1", [AOS_PERMISSION_KEY.LEARNING_VIEW]);

    await expect(
      governance.approveCandidate(scope, {
        candidateId: "cand-1",
        expectedVersion: 1,
      }),
    ).rejects.toThrow(AosRepositoryError);
    expect(candidates.saveCandidate).not.toHaveBeenCalled();
  });

  it("allows approve with LEARNING_REVIEW permission", async () => {
    const governance = new LearningGovernanceApplicationService({ candidates, auditEvents });
    const scope = createActorScopeWithPermissions("co1", "user-1", [
      AOS_PERMISSION_KEY.LEARNING_REVIEW,
    ]);

    const result = await governance.approveCandidate(scope, {
      candidateId: "cand-1",
      expectedVersion: 1,
    });
    expect(result.candidate.status).toBe("approved");
  });

  it("denies promote without LEARNING_PROMOTE permission", async () => {
    const promotion = new LearningPromotionApplicationService({
      firestore: {} as never,
      candidates,
      promotions: {} as never,
      auditEvents,
      knowledge: {} as never,
      registry: {} as never,
      playbook: {} as never,
    });
    const scope = createActorScopeWithPermissions("co1", "user-1", [
      AOS_PERMISSION_KEY.LEARNING_REVIEW,
    ]);

    await expect(
      promotion.promoteCandidate(scope, { candidateId: "cand-1", expectedVersion: 1 }),
    ).rejects.toThrow(AosRepositoryError);
  });

  it("allows owner actor for governance mutations", async () => {
    const governance = new LearningGovernanceApplicationService({ candidates, auditEvents });
    const scope = createOwnerActorScope("co1", "owner-1");

    const result = await governance.rejectCandidate(scope, {
      candidateId: "cand-1",
      expectedVersion: 1,
      rejectionReason: "Not suitable",
    });
    expect(result.candidate.status).toBe("rejected");
  });
});
