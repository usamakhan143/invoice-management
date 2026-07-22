import type { LearningCandidateRepository } from "../../contracts/learning/LearningRepositories";
import type { LearningExtractionRunRepository } from "../../contracts/learning/LearningRepositories";
import type { DeliveryApplicationService } from "../delivery/DeliveryApplicationService";
import type { KnowledgeRepository } from "../../contracts/KnowledgeRepository";
import type { ModuleRegistryRepository } from "../../contracts/ModuleRegistryRepository";
import type { PlaybookRepository } from "../../contracts/PlaybookRepository";
import type { AosActorScope, AosReadScope } from "../types";
import {
  assertAosPermission,
  LEARNING_VIEW_PERMISSION,
} from "../authorization/aosAuthorization";
import type {
  LearningCandidate,
  LearningCandidateStatus,
} from "../../domain/learning/entities/learningCandidate";
import { assertPromotionEligible } from "../../domain/learning/rules/promotionEligibilityRules";
import { isLearningEngineEnabled } from "../../config/learningEngineConfig";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";
import type {
  EngagementLearningSummaryDto,
  LearningCandidateDetailDto,
  LearningCandidateListItemDto,
  LearningReviewListDto,
  ListLearningReviewQuery,
} from "./dto/LearningReviewDto";

const REVIEW_STATUSES: readonly LearningCandidateStatus[] = [
  "pending_review",
  "approved",
  "gate_deferred",
  "rejected",
  "promoted",
  "promotion_failed",
] as const;

export interface LearningReviewApplicationServiceDeps {
  candidates: LearningCandidateRepository;
  extractionRuns: LearningExtractionRunRepository;
  delivery: DeliveryApplicationService;
  knowledge: KnowledgeRepository;
  registry: ModuleRegistryRepository;
  playbook: PlaybookRepository;
}

function matchesSearch(item: LearningCandidateListItemDto, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return (
    item.title.toLowerCase().includes(needle) ||
    item.summary.toLowerCase().includes(needle) ||
    item.engagementTitle.toLowerCase().includes(needle) ||
    item.clientLabel.toLowerCase().includes(needle) ||
    item.candidateType.replace(/_/g, " ").toLowerCase().includes(needle)
  );
}

export class LearningReviewApplicationService {
  constructor(private readonly deps: LearningReviewApplicationServiceDeps) {}

  private assertLearningEngineEnabled(): void {
    if (!isLearningEngineEnabled()) {
      throw new AosRepositoryError("Learning Engine is not enabled", "AOS_NOT_FOUND");
    }
  }

  async listReviewQueue(
    scope: AosActorScope,
    query: ListLearningReviewQuery = {},
  ): Promise<LearningReviewListDto> {
    assertAosPermission(scope, LEARNING_VIEW_PERMISSION);
    this.assertLearningEngineEnabled();

    const batches = await Promise.all(
      REVIEW_STATUSES.map((status) =>
        this.deps.candidates.listByStatus(scope.companyId, status),
      ),
    );
    const merged = batches.flat();
    const engagementCache = new Map<string, { title: string; clientLabel: string }>();

    const items: LearningCandidateListItemDto[] = [];
    for (const candidate of merged) {
      const context = await this.resolveEngagementContext(scope, candidate, engagementCache);
      items.push(this.toListItem(candidate, context));
    }

    const filtered = items
      .filter((item) => {
        if (query.status && query.status !== "all" && item.status !== query.status) {
          return false;
        }
        if (
          query.candidateType &&
          query.candidateType !== "all" &&
          item.candidateType !== query.candidateType
        ) {
          return false;
        }
        if (query.confidence === "promotion_eligible" && !item.confidence.promotionEligible) {
          return false;
        }
        if (query.confidence === "not_eligible" && item.confidence.promotionEligible) {
          return false;
        }
        if (
          query.targetKind &&
          query.targetKind !== "all" &&
          item.promotionTarget.targetKind !== query.targetKind
        ) {
          return false;
        }
        return matchesSearch(item, query.search ?? "");
      })
      .sort((a, b) => {
        const statusOrder = (status: LearningCandidateStatus) => {
          switch (status) {
            case "pending_review":
              return 0;
            case "promotion_failed":
              return 1;
            case "approved":
              return 2;
            case "gate_deferred":
              return 3;
            case "promoted":
              return 4;
            case "rejected":
              return 5;
            default:
              return 6;
          }
        };
        const diff = statusOrder(a.status) - statusOrder(b.status);
        if (diff !== 0) return diff;
        return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
      });

    return {
      items: filtered,
      totalCount: filtered.length,
      pendingReviewCount: filtered.filter((item) => item.status === "pending_review").length,
    };
  }

  async getCandidateDetail(
    scope: AosActorScope,
    candidateId: string,
  ): Promise<LearningCandidateDetailDto> {
    assertAosPermission(scope, LEARNING_VIEW_PERMISSION);
    this.assertLearningEngineEnabled();

    const candidate = await this.deps.candidates.getById(scope.companyId, candidateId);
    if (!candidate) {
      throw new AosRepositoryError(`Candidate ${candidateId} not found`, "AOS_NOT_FOUND");
    }

    const context = await this.resolveEngagementContext(scope, candidate, new Map());
    const listItem = this.toListItem(candidate, context);

    const eligibility = assertPromotionEligible(candidate, { actorId: scope.actorUserId });
    const existingTargetLabel = await this.resolveExistingTargetLabel(scope, candidate);

    return {
      ...listItem,
      proposedContent: candidate.proposedContent,
      provenance: candidate.provenance,
      gateResult: candidate.gateResult,
      extractionRunId: candidate.extractionRunId,
      retrospectiveId: candidate.retrospectiveId,
      aiRecommendation: candidate.aiRecommendation,
      promotion: candidate.promotion,
      approval: candidate.approval,
      rejection: candidate.rejection,
      defer: candidate.defer,
      canPromote: eligibility.ok,
      promoteBlockReason: eligibility.ok ? undefined : eligibility.errors[0]?.message,
      existingTargetLabel,
    };
  }

  async getEngagementLearningSummary(
    scope: AosReadScope,
    engagementId: string,
    retrospectiveId: string,
    retrospectiveApproved: boolean,
  ): Promise<EngagementLearningSummaryDto> {
    if (!isLearningEngineEnabled()) {
      return {
        engagementId,
        retrospectiveApproved,
        candidateCount: 0,
        pendingReviewCount: 0,
        reviewQueueHref: "/aos/learning",
      };
    }

    const candidates = await this.deps.candidates.listByEngagement(scope.companyId, engagementId);
    const run = await this.deps.extractionRuns.getByRetrospective(scope.companyId, retrospectiveId);

    return {
      engagementId,
      retrospectiveApproved,
      extractionRunId: run?.extractionRunId,
      extractionStatus: run?.status,
      candidateCount: candidates.length,
      pendingReviewCount: candidates.filter((c) => c.status === "pending_review").length,
      reviewQueueHref: `/aos/learning?engagement=${encodeURIComponent(engagementId)}`,
    };
  }

  async countPendingReview(scope: AosReadScope): Promise<number> {
    if (!isLearningEngineEnabled()) return 0;
    const pending = await this.deps.candidates.listByStatus(
      scope.companyId,
      "pending_review",
    );
    return pending.length;
  }

  private toListItem(
    candidate: LearningCandidate,
    context: { title: string; clientLabel: string },
  ): LearningCandidateListItemDto {
    return {
      candidateId: candidate.candidateId,
      companyId: candidate.companyId,
      engagementId: candidate.engagementId,
      engagementTitle: context.title,
      clientLabel: context.clientLabel,
      candidateType: candidate.candidateType,
      title: candidate.title,
      summary: candidate.summary,
      status: candidate.status,
      confidence: candidate.confidence,
      promotionTarget: candidate.promotionTarget,
      version: candidate.version,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  }

  private async resolveEngagementContext(
    scope: AosReadScope,
    candidate: LearningCandidate,
    cache: Map<string, { title: string; clientLabel: string }>,
  ): Promise<{ title: string; clientLabel: string }> {
    const cached = cache.get(candidate.engagementId);
    if (cached) return cached;

    try {
      const engagement = await this.deps.delivery.getEngagement(scope, candidate.engagementId);
      const context = {
        title: engagement.title,
        clientLabel: engagement.clientLabel,
      };
      cache.set(candidate.engagementId, context);
      return context;
    } catch {
      const fallback = {
        title: candidate.engagementId,
        clientLabel: "Unknown client",
      };
      cache.set(candidate.engagementId, fallback);
      return fallback;
    }
  }

  private async resolveExistingTargetLabel(
    scope: AosReadScope,
    candidate: LearningCandidate,
  ): Promise<string | undefined> {
    const targetId = candidate.promotionTarget.targetId;
    if (!targetId) return undefined;

    switch (candidate.candidateType) {
      case "knowledge_pattern": {
        const pattern = await this.deps.knowledge.findById(scope, targetId);
        return pattern?.title;
      }
      case "module": {
        const module = await this.deps.registry.findById(scope, targetId);
        return module?.moduleName;
      }
      default: {
        const entry = await this.deps.playbook.findById(scope, targetId);
        return entry?.title;
      }
    }
  }
}
