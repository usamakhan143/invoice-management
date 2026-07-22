import type {
  LearningCandidateStatus,
  LearningCandidateType,
  PromotionTargetKind,
} from "../../constants/learningReview";

export interface LearningReviewFilters {
  search: string;
  status: LearningCandidateStatus | "all";
  candidateType: LearningCandidateType | "all";
  confidence: "all" | "promotion_eligible" | "not_eligible";
  targetKind: PromotionTargetKind | "all";
  candidateId?: string;
}

export const DEFAULT_LEARNING_REVIEW_FILTERS: LearningReviewFilters = {
  search: "",
  status: "pending_review",
  candidateType: "all",
  confidence: "all",
  targetKind: "all",
};

export function learningReviewFiltersToQueryKey(filters: LearningReviewFilters): Record<string, string> {
  return {
    search: filters.search,
    status: filters.status,
    candidateType: filters.candidateType,
    confidence: filters.confidence,
    targetKind: filters.targetKind,
    candidateId: filters.candidateId ?? "",
  };
}
