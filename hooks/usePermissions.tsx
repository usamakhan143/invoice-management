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
  const canViewDebugInfo = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_DEBUG_INFO);

  // Invoice permissions
  const canViewInvoices = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_VIEW);
  const canCreateInvoice = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_CREATE);
  const canViewInvoicePDF = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_VIEW_PDF);
  const canAccessPaymentTracking = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_PAYMENT_TRACKING);
  const canEditInvoice = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_EDIT);
  const canDeleteInvoice = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_DELETE);
  const canViewInvoiceStatus = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_VIEW_STATUS);

  // Customer permissions
  const canViewCustomers = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_VIEW);
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
  const canViewExpenses = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_VIEW);
  const canCreateExpense = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_CREATE);
  const canEditExpense = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_EDIT);
  const canDeleteExpense = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_DELETE);

  // Company activity permissions
  const canViewCompanyActivity = (): boolean => hasPermission(GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_VIEW);

  // User management permissions
  const canViewUserManagement = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_VIEW);
  const canCreateUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_CREATE);
  const canLoginAsUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_LOGIN_AS);
  const canEditUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_EDIT);
  const canActivateDeactivateUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_ACTIVATE_DEACTIVATE);

  // Custom roles permissions
  const canViewCustomRoles = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOM_ROLES_VIEW);
  const canCreateCustomRole = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOM_ROLES_CREATE);
  const canEditCustomRole = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOM_ROLES_EDIT);
  const canDeleteCustomRole = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOM_ROLES_DELETE);

  // Sidebar permissions
  const canEditProfile = (): boolean => hasPermission(GRANULAR_PERMISSIONS.SIDEBAR_EDIT_PROFILE);

  // Data Management permissions
  const canExportBackup = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DATA_BACKUP_EXPORT);
  const canImportBackup = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DATA_BACKUP_IMPORT);
  const canViewBackupHistory = (): boolean => hasPermission(GRANULAR_PERMISSIONS.DATA_BACKUP_VIEW_HISTORY);

  // Leads / CRM (granular only)
  const canViewLeads = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_VIEW);
  const canViewAllLeads = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_VIEW_ALL);
  const canAccessLeadsPage = (): boolean =>
    canViewLeads() || canViewAllLeads();
  const canCreateLead = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_CREATE);
  const canEditLead = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_EDIT);
  const canDeleteLead = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_DELETE);
  const canAssignLeads = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_ASSIGN);
  const canLogLeadCalls = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_LOG_CALLS);
  const canLinkLeadCustomer = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_LINK_CUSTOMER);
  const canConvertLead = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_CONVERT);

  /** List/query scope: all company leads vs assigned-or-created only */
  const leadsListViewAll = (): boolean => canViewAllLeads();

  // Legacy compatibility functions (to be gradually removed)
  const hasPageAccess = (page: string): boolean => {
    // Map legacy page access to new permissions
    switch (page) {
      case "dashboard":
        // Dashboard should always be accessible - individual sections will be hidden based on granular permissions
        return true;
      case "invoices":
        return canViewInvoices();
      case "customers":
        return canViewCustomers();
      case "products":
        return canCreateProduct() || canEditProduct() || canDeleteProduct();
      case "bank-accounts":
      case "bank-accounts-view":
        return canCreateBankAccount() || canEditBankAccount() || canDeleteBankAccount() || canViewDashboardBankAccounts();
      case "expenses":
        return canViewExpenses();
      case "user-management":
        return canViewUserManagement();
      case "leads":
        return canAccessLeadsPage();
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
      case "leads":
        return canCreateLead();
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
      case "leads":
        return canEditLead();
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
        return false; // Remove functionality is disabled
      case "leads":
        return canDeleteLead();
      default:
        return false;
    }
  };

  const canExport = (page: string): boolean => {
    // For now, export permissions follow the same pattern as view
    return hasPageAccess(page);
  };

  const isOwner = userProfile?.isOwner === true;
  const isAdmin = isOwner || canViewCompanyActivity(); // Admin is now determined by company activity access

  // Legacy hasAction function for backward compatibility
  const hasAction = (page: string, action: string): boolean => {
    switch (action) {
      case "view":
        return hasPageAccess(page);
      case "create":
        return canCreate(page);
      case "edit":
        return canEdit(page);
      case "delete":
        return canDelete(page);
      case "export":
        return canExport(page);
      default:
        return hasPageAccess(page);
    }
  };

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
    canViewDebugInfo,

    // Invoice permissions
    canViewInvoices,
    canCreateInvoice,
    canViewInvoicePDF,
    canAccessPaymentTracking,
    canEditInvoice,
    canDeleteInvoice,
    canViewInvoiceStatus,

    // Customer permissions
    canViewCustomers,
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
    canViewExpenses,
    canCreateExpense,
    canEditExpense,
    canDeleteExpense,

    // Company activity permissions
    canViewCompanyActivity,

    // User management permissions
    canViewUserManagement,
    canCreateUser,
    canLoginAsUser,
    canEditUser,
    canActivateDeactivateUser,

    // Custom roles permissions
    canViewCustomRoles,
    canCreateCustomRole,
    canEditCustomRole,
    canDeleteCustomRole,

    // Sidebar permissions
    canEditProfile,

    // Data Management permissions
    canExportBackup,
    canImportBackup,
    canViewBackupHistory,

    // Leads / CRM
    canViewLeads,
    canViewAllLeads,
    canAccessLeadsPage,
    canCreateLead,
    canEditLead,
    canDeleteLead,
    canAssignLeads,
    canLogLeadCalls,
    canLinkLeadCustomer,
    canConvertLead,
    leadsListViewAll,

    // Legacy compatibility
    hasPageAccess,
    hasAction,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,

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
