import type { LearningCandidateStatus, LearningCandidateType } from "../../../domain/learning/entities/learningCandidate";
import type { ConfidenceSnapshot } from "../../../domain/learning/valueObjects/confidenceSnapshot";
import type { GateResult } from "../../../domain/learning/valueObjects/gateResult";
import type { LearningProvenance } from "../../../domain/learning/valueObjects/learningProvenance";
import type { PromotionTargetRef } from "../../../domain/learning/valueObjects/promotionTargetRef";
import type { LearningProposedContent } from "../../../domain/learning/valueObjects/proposedContent";
import type { AiRecommendationMetadata, CandidatePromotionMetadata } from "../../../domain/learning/entities/learningCandidate";
import type { DeliveryEngagementId } from "../../../domain/delivery/valueObjects";
import type { CompanyId } from "../../../types";

export interface LearningCandidateListItemDto {
  candidateId: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  engagementTitle: string;
  clientLabel: string;
  candidateType: LearningCandidateType;
  title: string;
  summary: string;
  status: LearningCandidateStatus;
  confidence: ConfidenceSnapshot;
  promotionTarget: PromotionTargetRef;
  version: number;
  createdAt: string;
  updatedAt?: string;
}

export interface LearningCandidateDetailDto extends LearningCandidateListItemDto {
  proposedContent: LearningProposedContent;
  provenance: LearningProvenance;
  gateResult: GateResult | null;
  extractionRunId: string;
  retrospectiveId: string;
  aiRecommendation?: AiRecommendationMetadata;
  promotion?: CandidatePromotionMetadata;
  approval?: import("../../../domain/learning/entities/learningCandidate").CandidateApprovalMetadata;
  rejection?: import("../../../domain/learning/entities/learningCandidate").CandidateRejectionMetadata;
  defer?: import("../../../domain/learning/entities/learningCandidate").CandidateDeferMetadata;
  canPromote: boolean;
  promoteBlockReason?: string;
  existingTargetLabel?: string;
}

export interface LearningReviewListDto {
  items: readonly LearningCandidateListItemDto[];
  totalCount: number;
  pendingReviewCount: number;
}

export interface ListLearningReviewQuery {
  search?: string;
  status?: LearningCandidateStatus | "all";
  candidateType?: LearningCandidateType | "all";
  confidence?: "all" | "promotion_eligible" | "not_eligible";
  targetKind?: PromotionTargetRef["targetKind"] | "all";
}

export interface EngagementLearningSummaryDto {
  engagementId: DeliveryEngagementId;
  retrospectiveApproved: boolean;
  extractionRunId?: string;
  extractionStatus?: "pending" | "running" | "completed" | "partial" | "failed";
  candidateCount: number;
  pendingReviewCount: number;
  reviewQueueHref: string;
}
