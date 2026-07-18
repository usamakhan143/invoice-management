import React from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAosFeatureFlags } from "../../hooks/useAosFeatureFlags";
import {
  AOS_FEATURE_FLAG,
  getAosRouteById,
  type AosRouteId,
} from "../../config";

export interface AosRouteGateProps {
  routeId: AosRouteId;
  children: React.ReactNode;
}

/**
 * Enforces AOS module flag, area flag, and route permissions.
 */
const AosRouteGate: React.FC<AosRouteGateProps> = ({ routeId, children }) => {
  const { hasPermission } = usePermissions();
  const { isEnabled } = useAosFeatureFlags();
  const route = getAosRouteById(routeId);

  if (!route) {
    return <Navigate to="/" replace />;
  }

  if (!isEnabled(AOS_FEATURE_FLAG.MODULE_ENABLED)) {
    return <Navigate to="/" replace />;
  }

  if (!isEnabled(route.featureFlag)) {
    return <Navigate to="/aos" replace />;
  }

  const allowed = route.requiredPermissions.some((permission) => hasPermission(permission));
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AosRouteGate;
