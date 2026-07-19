import React from "react";
import { usePermissions } from "../../../hooks/usePermissions";
import { AOS_PERMISSION_KEY } from "../../constants/permissionKeys";
import { AosProviders } from "./AosProviders";

export interface AosShellProvidersProps {
  children: React.ReactNode;
}

/** Wraps app chrome with AOS providers when the user can access AOS (nav badges + shared query client). */
export const AosShellProviders: React.FC<AosShellProvidersProps> = ({ children }) => {
  const { hasPermission } = usePermissions();
  const canAccessAos =
    hasPermission(AOS_PERMISSION_KEY.ADMIN) ||
    hasPermission(AOS_PERMISSION_KEY.DASHBOARD_VIEW) ||
    hasPermission(AOS_PERMISSION_KEY.ENGAGEMENTS_VIEW) ||
    hasPermission(AOS_PERMISSION_KEY.REQUIREMENTS_VIEW) ||
    hasPermission(AOS_PERMISSION_KEY.PROMPTS_VIEW) ||
    hasPermission(AOS_PERMISSION_KEY.CURSOR_VIEW) ||
    hasPermission(AOS_PERMISSION_KEY.EVALUATION_VIEW);

  if (!canAccessAos) {
    return <>{children}</>;
  }

  return <AosProviders>{children}</AosProviders>;
};
