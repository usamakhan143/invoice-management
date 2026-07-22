import type {
  CandidatePromotionMetadata,
  LearningCandidate,
} from "../entities/learningCandidate";
import { applyCandidateStatusTransition } from "./learningCandidateLifecycleRules";
import { learningOk, type LearningResult } from "../learningResult";

export function applyCandidatePromotedTransition(
  candidate: LearningCandidate,
  promotion: CandidatePromotionMetadata,
  updatedAt: string,
): LearningResult<LearningCandidate> {
  const transitioned = applyCandidateStatusTransition(candidate, "promoted", updatedAt);
  if (!transitioned.ok) return transitioned;

  return learningOk({
    ...transitioned.value,
    promotion,
  });
}

export function applyCandidatePromotionFailedTransition(
  candidate: LearningCandidate,
  updatedAt: string,
): LearningResult<LearningCandidate> {
  return applyCandidateStatusTransition(candidate, "promotion_failed", updatedAt);
}
