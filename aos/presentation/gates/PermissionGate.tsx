import React from "react";
import { usePermissions } from "../../../hooks/usePermissions";

export type PermissionGateMode = "any" | "all";

export interface PermissionGateProps {
  permissions: string | string[];
  mode?: PermissionGateMode;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally render children based on ERP permission key(s).
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permissions,
  mode = "any",
  fallback = null,
  children,
}) => {
  const { hasPermission } = usePermissions();
  const keys = Array.isArray(permissions) ? permissions : [permissions];

  const allowed =
    mode === "all"
      ? keys.every((key) => hasPermission(key))
      : keys.some((key) => hasPermission(key));

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
