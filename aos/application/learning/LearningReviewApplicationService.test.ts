import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/learningEngineConfig", () => ({
  isLearningEngineEnabled: vi.fn(() => true),
}));

import type { LearningCandidateRepository } from "../../contracts/learning/LearningRepositories";
import type { LearningExtractionRunRepository } from "../../contracts/learning/LearningRepositories";
import type { DeliveryApplicationService } from "../delivery/DeliveryApplicationService";
import type { KnowledgeRepository } from "../../contracts/KnowledgeRepository";
import type { ModuleRegistryRepository } from "../../contracts/ModuleRegistryRepository";
import type { PlaybookRepository } from "../../contracts/PlaybookRepository";
import { LearningReviewApplicationService } from "./LearningReviewApplicationService";
import type { LearningCandidate } from "../../domain/learning/entities/learningCandidate";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";

import { createOwnerActorScope, createActorScopeWithPermissions } from "../../constants/actorScope";

function candidateFixture(overrides: Partial<LearningCandidate> = {}): LearningCandidate {
  return {
    candidateId: "cand-1",
    companyId: "co1",
    engagementId: "eng-1",
    retrospectiveId: "retro-1",
    extractionRunId: "run-1",
    candidateType: "knowledge_pattern",
    title: "Reuse auth middleware",
    summary: "Extract shared auth checks into middleware.",
    status: "pending_review",
    version: 1,
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T01:00:00.000Z",
    proposedContent: {
      kind: "knowledge_pattern",
      title: "Reuse auth middleware",
      body: "Use shared middleware for session validation.",
      tags: ["auth"],
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
      targetId: undefined,
      expectedVersionStrategy: "new_version",
    },
    gateResult: null,
    ...overrides,
  };
}

describe("LearningReviewApplicationService", () => {
  const scope = createOwnerActorScope("co1", "user-1");
  let candidates: LearningCandidateRepository;
  let extractionRuns: LearningExtractionRunRepository;
  let delivery: DeliveryApplicationService;

  beforeEach(() => {
    candidates = {
      listByStatus: vi.fn(),
      getById: vi.fn(),
      listByEngagement: vi.fn(),
    } as unknown as LearningCandidateRepository;
    extractionRuns = {
      getByRetrospective: vi.fn(),
    } as unknown as LearningExtractionRunRepository;
    delivery = {
      getEngagement: vi.fn().mockResolvedValue({
        title: "Portal rebuild",
        clientLabel: "Acme Corp",
      }),
    } as unknown as DeliveryApplicationService;
  });

  function createService() {
    return new LearningReviewApplicationService({
      candidates,
      extractionRuns,
      delivery,
      knowledge: {} as KnowledgeRepository,
      registry: {} as ModuleRegistryRepository,
      playbook: {} as PlaybookRepository,
    });
  }

  it("prioritizes pending review items in listReviewQueue", async () => {
    vi.mocked(candidates.listByStatus).mockImplementation(async (_companyId, status) => {
      if (status === "pending_review") return [candidateFixture()];
      if (status === "approved") {
        return [
          candidateFixture({
            candidateId: "cand-2",
            status: "approved",
            title: "Approved item",
          }),
        ];
      }
      return [];
    });

    const service = createService();
    const result = await service.listReviewQueue(scope, { status: "all" });

    expect(result.items[0]?.status).toBe("pending_review");
    expect(result.pendingReviewCount).toBe(1);
  });

  it("filters by search across engagement and lesson text", async () => {
    vi.mocked(candidates.listByStatus).mockImplementation(async (_companyId, status) => {
      if (status === "pending_review") {
        return [
          candidateFixture({ title: "Auth lesson" }),
          candidateFixture({
            candidateId: "cand-2",
            title: "Billing flow",
            summary: "Invoice reconciliation patterns.",
          }),
        ];
      }
      return [];
    });

    const service = createService();
    const result = await service.listReviewQueue(scope, { search: "auth", status: "all" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Auth lesson");
  });

  it("returns zero summary when learning engine disabled", async () => {
    const { isLearningEngineEnabled } = await import("../../config/learningEngineConfig");
    vi.mocked(isLearningEngineEnabled).mockReturnValueOnce(false);

    const service = createService();
    const summary = await service.getEngagementLearningSummary(scope, "eng-1", "retro-1", true);

    expect(summary.candidateCount).toBe(0);
    expect(summary.reviewQueueHref).toBe("/aos/learning");
  });

  it("denies listReviewQueue without LEARNING_VIEW permission", async () => {
    vi.mocked(candidates.listByStatus).mockResolvedValue([]);
    const service = createService();
    const deniedScope = createActorScopeWithPermissions("co1", "user-1", []);

    await expect(service.listReviewQueue(deniedScope, {})).rejects.toThrow(AosRepositoryError);
  });
});
