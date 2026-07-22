import {
  AOS_FEATURE_FLAG,
  isAosFeatureEnabled,
  type AosFeatureFlag,
} from "./featureFlags";

/** When true, post-commit learning extraction runs after retrospective approval. */
export function isLearningEngineEnabled(
  flags: Partial<Record<AosFeatureFlag, boolean>> = {},
): boolean {
  return isAosFeatureEnabled(flags, AOS_FEATURE_FLAG.LEARNING_ENGINE);
}
