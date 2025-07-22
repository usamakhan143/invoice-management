import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { GRANULAR_PERMISSIONS } from "../config/permissions";

export const usePermissions = () => {
  const { userProfile } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!userProfile) {
      return false;
    }

    // Owner has all permissions
    if (userProfile.isOwner) {
      return true;
    }

    // Check granular permissions array
    if (userProfile.granularPermissions && userProfile.granularPermissions.length > 0) {
      return userProfile.granularPermissions.includes(permission);
    }

    return false;
  };

  // Dashboard permissions
  const canViewTotalRevenue = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_TOTAL_REVENUE);
  const canViewOutstandingRevenue = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_OUTSTANDING_REVENUE);
  const canViewMonthlyExpenses = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_MONTHLY_EXPENSES);
  const canViewTotalCustomers = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_TOTAL_CUSTOMERS);
  const canViewDashboardBankAccounts = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_BANK_ACCOUNTS);
  const canViewRecentInvoices = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_RECENT_INVOICES);
  const canAccessInvoiceVerification = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_ACCESS_INVOICE_VERIFICATION);

  // Invoice permissions
  const canCreateInvoice = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_CREATE);
  const canViewInvoicePDF = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_VIEW_PDF);
  const canAccessPaymentTracking = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_PAYMENT_TRACKING);
  const canEditInvoice = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_EDIT);
  const canDeleteInvoice = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_DELETE);

  // Customer permissions
  const canCreateCustomer = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_CREATE);
  const canEditCustomer = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_EDIT);
  const canDeleteCustomer = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DELETE);

  // Product permissions
  const canCreateProduct = (): boolean => hasPermission(GRANULAR_PERMISSIONS.PRODUCTS_CREATE);
  const canEditProduct = (): boolean => hasPermission(GRANULAR_PERMISSIONS.PRODUCTS_EDIT);
  const canDeleteProduct = (): boolean => hasPermission(GRANULAR_PERMISSIONS.PRODUCTS_DELETE);

  // Bank account permissions
  const canCreateBankAccount = (): boolean => hasPermission(GRANULAR_PERMISSIONS.BANK_ACCOUNTS_CREATE);
  const canEditBankAccount = (): boolean => hasPermission(GRANULAR_PERMISSIONS.BANK_ACCOUNTS_EDIT);
  const canDeleteBankAccount = (): boolean => hasPermission(GRANULAR_PERMISSIONS.BANK_ACCOUNTS_DELETE);

  // Expense permissions
  const canCreateExpense = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_CREATE);
  const canEditExpense = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_EDIT);
  const canDeleteExpense = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_DELETE);

  // Company activity permissions
  const canViewCompanyActivity = (): boolean => hasPermission(GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_VIEW);

  // User management permissions
  const canCreateUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_CREATE);
  const canLoginAsUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_LOGIN_AS);
  const canEditUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_EDIT);
  const canActivateDeactivateUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_ACTIVATE_DEACTIVATE);
  const canRemoveUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_REMOVE);

  // Custom roles permissions
  const canCreateCustomRole = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOM_ROLES_CREATE);
  const canEditCustomRole = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOM_ROLES_EDIT);
  const canDeleteCustomRole = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOM_ROLES_DELETE);

  // Sidebar permissions
  const canEditProfile = (): boolean => hasPermission(GRANULAR_PERMISSIONS.SIDEBAR_EDIT_PROFILE);

  // Legacy compatibility functions (to be gradually removed)
  const hasPageAccess = (page: string): boolean => {
    // Map legacy page access to new permissions
    switch (page) {
      case "dashboard":
        // Dashboard should always be accessible - individual sections will be hidden based on granular permissions
        return true;
      case "invoices":
        return canCreateInvoice() || canEditInvoice() || canDeleteInvoice() || canViewInvoicePDF();
      case "customers":
        return canCreateCustomer() || canEditCustomer() || canDeleteCustomer();
      case "products":
        return canCreateProduct() || canEditProduct() || canDeleteProduct();
      case "bank-accounts":
      case "bank-accounts-view":
        return canCreateBankAccount() || canEditBankAccount() || canDeleteBankAccount() || canViewDashboardBankAccounts();
      case "expenses":
        return canCreateExpense() || canEditExpense() || canDeleteExpense();
      case "user-management":
        return canCreateUser() || canEditUser() || canRemoveUser();
      default:
        return false;
    }
  };

  const canView = (page: string): boolean => hasPageAccess(page);
  const canCreate = (page: string): boolean => {
    switch (page) {
      case "invoices":
        return canCreateInvoice();
      case "customers":
        return canCreateCustomer();
      case "products":
        return canCreateProduct();
      case "bank-accounts":
        return canCreateBankAccount();
      case "expenses":
        return canCreateExpense();
      case "user-management":
        return canCreateUser();
      default:
        return false;
    }
  };

  const canEdit = (page: string): boolean => {
    switch (page) {
      case "invoices":
        return canEditInvoice();
      case "customers":
        return canEditCustomer();
      case "products":
        return canEditProduct();
      case "bank-accounts":
        return canEditBankAccount();
      case "expenses":
        return canEditExpense();
      case "user-management":
        return canEditUser();
      default:
        return false;
    }
  };

  const canDelete = (page: string): boolean => {
    switch (page) {
      case "invoices":
        return canDeleteInvoice();
      case "customers":
        return canDeleteCustomer();
      case "products":
        return canDeleteProduct();
      case "bank-accounts":
        return canDeleteBankAccount();
      case "expenses":
        return canDeleteExpense();
      case "user-management":
        return canRemoveUser();
      default:
        return false;
    }
  };

  const isOwner = userProfile?.isOwner === true;
  const isAdmin = isOwner || canViewCompanyActivity(); // Admin is now determined by company activity access

  return {
    // Core permission checker
    hasPermission,

    // Dashboard permissions
    canViewTotalRevenue,
    canViewOutstandingRevenue,
    canViewMonthlyExpenses,
    canViewTotalCustomers,
    canViewDashboardBankAccounts,
    canViewRecentInvoices,
    canAccessInvoiceVerification,

    // Invoice permissions
    canCreateInvoice,
    canViewInvoicePDF,
    canAccessPaymentTracking,
    canEditInvoice,
    canDeleteInvoice,

    // Customer permissions
    canCreateCustomer,
    canEditCustomer,
    canDeleteCustomer,

    // Product permissions
    canCreateProduct,
    canEditProduct,
    canDeleteProduct,

    // Bank account permissions
    canCreateBankAccount,
    canEditBankAccount,
    canDeleteBankAccount,

    // Expense permissions
    canCreateExpense,
    canEditExpense,
    canDeleteExpense,

    // Company activity permissions
    canViewCompanyActivity,

    // User management permissions
    canCreateUser,
    canLoginAsUser,
    canEditUser,
    canActivateDeactivateUser,
    canRemoveUser,

    // Custom roles permissions
    canCreateCustomRole,
    canEditCustomRole,
    canDeleteCustomRole,

    // Sidebar permissions
    canEditProfile,

    // Legacy compatibility
    hasPageAccess,
    canView,
    canCreate,
    canEdit,
    canDelete,

    // User role info
    isOwner,
    isAdmin,
    userRole: userProfile?.role || "custom",
  };
};

// Higher-order component for protecting components based on granular permissions
export const withGranularPermissions = (
  WrappedComponent: React.ComponentType<any>,
  requiredPermission: string,
) => {
  return (props: any) => {
    const { hasPermission } = usePermissions();

    if (!hasPermission(requiredPermission)) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Access Denied
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              You don't have permission to access this feature.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

// Legacy HOC for backward compatibility during migration
export const withPermissions = (
  WrappedComponent: React.ComponentType<any>,
  requiredPage: string,
  requiredAction: string = "view",
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
              You don't have permission to {requiredAction} this page.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};
