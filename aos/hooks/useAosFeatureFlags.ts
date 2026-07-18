import { useMemo } from "react";
import {
  AOS_FEATURE_FLAG,
  PHASE_1A_FEATURE_DEFAULTS,
  isAosFeatureEnabled,
  type AosFeatureFlag,
} from "../config/featureFlags";

/**
 * Runtime AOS feature flag accessor — wired at nav and route gates (Stage A).
 * Override map can be injected in later stages (company settings, env).
 */
export function useAosFeatureFlags(overrides?: Partial<Record<AosFeatureFlag, boolean>>): {
  flags: Record<AosFeatureFlag, boolean>;
  isEnabled: (flag: AosFeatureFlag) => boolean;
} {
  return useMemo(() => {
    const flags = { ...PHASE_1A_FEATURE_DEFAULTS, ...overrides };
    return {
      flags,
      isEnabled: (flag: AosFeatureFlag) => isAosFeatureEnabled(overrides ?? {}, flag),
    };
  }, [overrides]);
}

export { AOS_FEATURE_FLAG };
