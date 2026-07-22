/** Learning review UI constants — safe for presentation/hooks imports. */
export {
  LEARNING_CANDIDATE_TYPES,
  type LearningCandidateStatus,
  type LearningCandidateType,
} from "../domain/learning/entities/learningCandidate";

export type { PromotionTargetKind } from "../domain/learning/valueObjects/promotionTargetRef";

export type { PromotedAssetKind } from "../domain/learning/entities/learningPromotionRecord";

export const LEARNING_REVIEW_STATUS_FILTERS = [
  "pending_review",
  "approved",
  "gate_deferred",
  "promotion_failed",
  "promoted",
  "rejected",
  "all",
] as const;

export type LearningReviewStatusFilter =
  (typeof LEARNING_REVIEW_STATUS_FILTERS)[number];
