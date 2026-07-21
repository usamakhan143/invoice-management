import {
  AOS_FEATURE_FLAG,
  isAosFeatureEnabled,
  type AosFeatureFlag,
} from "./featureFlags";

/** When true, dedicated version collections are authoritative for immutable history. */
export function isVersionChainsEnabled(
  flags: Partial<Record<AosFeatureFlag, boolean>> = {},
): boolean {
  return isAosFeatureEnabled(flags, AOS_FEATURE_FLAG.VERSION_CHAINS);
}
