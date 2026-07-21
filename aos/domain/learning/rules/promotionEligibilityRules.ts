import type { LearningCandidate } from "../entities/learningCandidate";
import { assertNotGateBlockedForReview } from "./learningCandidateLifecycleRules";
import { rejectAiPromotionAttempt } from "./learningApprovalRules";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";

export interface PromotionEligibilityContext {
  actorId: string;
  existingPromotionForCandidate?: boolean;
}

export function assertPromotionEligible(
  candidate: LearningCandidate,
  context: PromotionEligibilityContext,
): LearningResult<void> {
  const aiCheck = rejectAiPromotionAttempt(context.actorId);
  if (!aiCheck.ok) return aiCheck;

  if (context.existingPromotionForCandidate) {
    return learningFailOne(
      "LEARNING_ALREADY_PROMOTED",
      "Duplicate promotion rejected",
    );
  }

  if (candidate.status === "promoted") {
    return learningFailOne(
      "LEARNING_ALREADY_PROMOTED",
      "Candidate already promoted",
    );
  }

  if (candidate.status !== "approved" && candidate.status !== "promotion_failed") {
    return learningFailOne(
      "LEARNING_NOT_APPROVED",
      "Candidate must be approved before promotion",
    );
  }

  if (!candidate.approval) {
    return learningFailOne(
      "LEARNING_HUMAN_APPROVAL_REQUIRED",
      "Human approval metadata required",
    );
  }

  const reviewCheck = assertNotGateBlockedForReview(candidate);
  if (!reviewCheck.ok) return reviewCheck;

  if (!candidate.gateResult?.mayEnterPendingReview && candidate.status !== "promotion_failed") {
    return learningFailOne(
      "LEARNING_NOT_PROMOTION_ELIGIBLE",
      "Quality gates did not permit review",
    );
  }

  if (!candidate.confidence.promotionEligible && candidate.status !== "promotion_failed") {
    return learningFailOne(
      "LEARNING_NOT_PROMOTION_ELIGIBLE",
      "Confidence policy does not permit promotion",
    );
  }

  return learningOk(undefined);
}

/** LF-08: promotion must use new version strategy — never destructive overwrite. */
export function assertNonDestructivePromotionStrategy(
  candidate: LearningCandidate,
): LearningResult<void> {
  const strategy = candidate.promotionTarget.expectedVersionStrategy;
  if (strategy !== "new_version" && strategy !== "supersede" && strategy !== "annotate") {
    return learningFailOne(
      "LEARNING_NOT_PROMOTION_ELIGIBLE",
      "Invalid version strategy",
    );
  }
  return learningOk(undefined);
}

export function isCandidateInReviewQueue(candidate: LearningCandidate): boolean {
  return candidate.status === "pending_review";
}
