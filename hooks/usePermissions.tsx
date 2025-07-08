import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { ROLE_PERMISSIONS, PAGES, ACTIONS } from "../config/permissions";
import type { Permission } from "../types";

export const usePermissions = () => {
  const { userProfile } = useAuth();

  const permissions = useMemo(() => {
    if (!userProfile) return [];

    // Owner has all permissions
    if (userProfile.isOwner || userProfile.role === "owner") {
      return ROLE_PERMISSIONS.owner;
    }

    // Use custom permissions if available, otherwise use role-based defaults
    if (userProfile.permissions && userProfile.permissions.length > 0) {
      return userProfile.permissions;
    }

    // Fall back to role-based permissions
    const role = userProfile.role || "viewer";
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
  }, [userProfile]);

  const hasPageAccess = (page: string): boolean => {
    const pagePermission = permissions.find((p) => p.page === page);
    return pagePermission?.actions.view === true;
  };

  const hasAction = (
    page: string,
    action: keyof Permission["actions"],
  ): boolean => {
    const pagePermission = permissions.find((p) => p.page === page);
    return pagePermission?.actions[action] === true;
  };

  const canView = (page: string): boolean => hasAction(page, "view");
  const canCreate = (page: string): boolean => hasAction(page, "create");
  const canEdit = (page: string): boolean => hasAction(page, "edit");
  const canDelete = (page: string): boolean => hasAction(page, "delete");
  const canExport = (page: string): boolean => hasAction(page, "export");

  const isOwner =
    userProfile?.isOwner === true || userProfile?.role === "owner";
  const isAdmin = userProfile?.role === "admin" || isOwner;
  const isManager = userProfile?.role === "manager" || isAdmin;

  return {
    permissions,
    hasPageAccess,
    hasAction,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    isOwner,
    isAdmin,
    isManager,
    userRole: userProfile?.role || "viewer",
  };
};

// Higher-order component for protecting components based on permissions
export const withPermissions = (
  WrappedComponent: React.ComponentType<any>,
  requiredPage: string,
  requiredAction: keyof Permission["actions"] = "view",
) => {
  return (props: any) => {
    const { hasAction } = usePermissions();

    if (!hasAction(requiredPage, requiredAction)) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              You don't have permission to {requiredAction} this page.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};
