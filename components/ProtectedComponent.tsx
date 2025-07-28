import React from "react";
import { usePermissions } from "../hooks/usePermissions";
import type { Permission } from "../types";

interface ProtectedComponentProps {
  children: React.ReactNode;
  page: string;
  action?: keyof Permission["actions"];
  fallback?: React.ReactNode;
  className?: string;
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  page,
  action = "view",
  fallback = null,
  className,
}) => {
  const { hasPageAccess, canCreate, canEdit, canDelete, canView } = usePermissions();

  // Map action to appropriate permission function
  let hasPermission = false;
  switch (action) {
    case "view":
      hasPermission = hasPageAccess(page) || canView(page);
      break;
    case "create":
      hasPermission = canCreate(page);
      break;
    case "edit":
      hasPermission = canEdit(page);
      break;
    case "delete":
      hasPermission = canDelete(page);
      break;
    default:
      hasPermission = hasPageAccess(page);
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <div className={className}>{children}</div>;
};

// Higher-order component version
export const withPageProtection = (
  WrappedComponent: React.ComponentType<any>,
  requiredPage: string,
) => {
  return (props: any) => {
    const { hasPageAccess } = usePermissions();

    if (!hasPageAccess(requiredPage)) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

export default ProtectedComponent;
