import React from "react";
import { useAosFeatureFlags } from "../../hooks/useAosFeatureFlags";
import type { AosFeatureFlag } from "../../config/featureFlags";

export interface FeatureFlagGateProps {
  flag: AosFeatureFlag;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally render children based on AOS feature flag state.
 */
export const FeatureFlagGate: React.FC<FeatureFlagGateProps> = ({
  flag,
  fallback = null,
  children,
}) => {
  const { isEnabled } = useAosFeatureFlags();

  if (!isEnabled(flag)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
