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
  const canViewDashboardMyAssignedLeads = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_MY_ASSIGNED_LEADS);
  /** Dashboard + Performance “Your call activity” (new perm or legacy dashboard toggle). */
  const canViewMyCallActivity = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.MY_CALL_ACTIVITY_VIEW) ||
    hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_MY_CALL_ACTIVITY);
  const canViewDashboardMyCallActivity = (): boolean => canViewMyCallActivity();
  const canViewLeadGenAnalytics = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_ANALYTICS);
  const canViewLeadGenCreated = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_CREATED);
  const canViewLeadGenAssigned = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_ASSIGNED);
  const canViewLeadGenConverted = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_CONVERTED);

  // Invoice permissions
  const canViewInvoices = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_VIEW);
  const canCreateInvoice = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_CREATE);
  const canViewInvoicePDF = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_VIEW_PDF);
  const canAccessPaymentTracking = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_PAYMENT_TRACKING);
  const canEditInvoice = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_EDIT);
  const canDeleteInvoice = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_DELETE);
  const canBulkDeleteInvoices = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.INVOICES_BULK_DELETE);
  const canViewInvoiceStatus = (): boolean => hasPermission(GRANULAR_PERMISSIONS.INVOICES_VIEW_STATUS);
  /** Set or clear Paid status (bank balance). Owner always allowed via hasPermission. */
  const canMarkInvoicePaid = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.INVOICES_MARK_PAID);

  // Customer permissions
  const canViewCustomers = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_VIEW);
  const canCreateCustomer = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_CREATE);
  const canEditCustomer = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_EDIT);
  const canDeleteCustomer = (): boolean => hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DELETE);
  const canBulkDeleteCustomers = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_BULK_DELETE);

  /**
   * Customer profile page #/customers/:id.
   * Requires list access plus either `customers_detail_view` or global `customers_edit` (so existing “edit” roles keep access).
   */
  const canAccessCustomerDetailPage = (): boolean =>
    userProfile?.isOwner === true ||
    (hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_VIEW) &&
      (hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_VIEW) ||
        hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_EDIT)));

  /** Detail page: edit contact modal (global “customers_edit” still grants this) */
  const canEditCustomerOnDetailPage = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_EDIT) ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_EDIT);

  const canManageCustomerDetailBusinesses = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_BUSINESSES) ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_EDIT);

  /** Remove a business line on customer detail — granular delete; global edit/delete still allow (legacy) */
  const canDeleteCustomerDetailBusinesses = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_BUSINESSES_DELETE) ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DELETE) ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_EDIT);

  const canViewCustomerDetailInvoicesSection = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_INVOICES_SECTION) ||
    hasPermission(GRANULAR_PERMISSIONS.INVOICES_VIEW);

  const canViewCustomerDetailCrmLeads = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_CRM_LEADS) ||
    hasPermission(GRANULAR_PERMISSIONS.LEADS_VIEW) ||
    hasPermission(GRANULAR_PERMISSIONS.LEADS_VIEW_ALL);

  const canViewCustomerDetailAuditLog = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_AUDIT_LOG);

  /** Customer detail: internal IDs (record id, company scope, business doc ids) */
  const canViewCustomerDetailTechnicalIds = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_VIEW_TECHNICAL_IDS);

  /** Lead detail: WhatsApp block on Details tab */
  const canViewLeadDetailWhatsApp = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.LEADS_DETAIL_WHATSAPP);

  /** Lead detail: assign campaign + tags. Also true when user can edit the lead. */
  const canAssignLeadCampaign = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.LEADS_CAMPAIGN_ASSIGN) ||
    hasPermission(GRANULAR_PERMISSIONS.LEADS_EDIT);

  /** Campaigns page: view */
  const canViewCampaigns = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.CAMPAIGNS_VIEW) ||
    hasPermission(GRANULAR_PERMISSIONS.CAMPAIGNS_MANAGE);

  /** Campaigns page: create / edit / archive + tag management */
  const canManageCampaigns = (): boolean =>
    userProfile?.isOwner === true ||
    hasPermission(GRANULAR_PERMISSIONS.CAMPAIGNS_MANAGE);

  // Product permissions
  const canCreateProduct = (): boolean => hasPermission(GRANULAR_PERMISSIONS.PRODUCTS_CREATE);
  const canEditProduct = (): boolean => hasPermission(GRANULAR_PERMISSIONS.PRODUCTS_EDIT);
  const canDeleteProduct = (): boolean => hasPermission(GRANULAR_PERMISSIONS.PRODUCTS_DELETE);
  const canBulkDeleteProducts = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.PRODUCTS_BULK_DELETE);
  /** Company-wide catalog (admin products) for list + invoice line items */
  const canUseCompanyProductCatalog = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.PRODUCTS_USE_COMPANY_CATALOG);

  // Bank account permissions
  const canCreateBankAccount = (): boolean => hasPermission(GRANULAR_PERMISSIONS.BANK_ACCOUNTS_CREATE);
  const canEditBankAccount = (): boolean => hasPermission(GRANULAR_PERMISSIONS.BANK_ACCOUNTS_EDIT);
  const canDeleteBankAccount = (): boolean => hasPermission(GRANULAR_PERMISSIONS.BANK_ACCOUNTS_DELETE);
  const canViewBankReconciliations = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.BANK_RECONCILIATIONS_VIEW);
  const canPostBankReconciliation = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.BANK_RECONCILIATION_POST) ||
    canEditBankAccount();
  const canReverseBankReconciliation = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.BANK_RECONCILIATION_REVERSE) ||
    canEditBankAccount();

  // Expense permissions
  const canViewExpenses = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_VIEW);
  /** List/query/edit/delete any team member’s expenses (owner always true). */
  const canManageCompanyExpenses = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_COMPANY_MANAGE);
  const canCreateExpense = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_CREATE);
  const canEditExpense = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_EDIT);
  const canDeleteExpense = (): boolean => hasPermission(GRANULAR_PERMISSIONS.EXPENSES_DELETE);
  const canBulkDeleteExpenses = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_BULK_DELETE);

  /** Payees tab: new perms or anyone who could mutate expenses (legacy). */
  const canViewExpensePayeesTab = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_PAYEES_VIEW) ||
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_PAYEES_MANAGE) ||
    (canViewExpenses() &&
      (canCreateExpense() || canEditExpense() || canDeleteExpense()));

  const canCreateExpensePayee = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_PAYEES_MANAGE) ||
    canCreateExpense();
  const canEditExpensePayee = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_PAYEES_MANAGE) ||
    canEditExpense();
  const canDeleteExpensePayee = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_PAYEES_MANAGE) ||
    canDeleteExpense();

  const canViewExpenseCategoriesTab = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_CATEGORIES_VIEW) ||
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_CATEGORIES_MANAGE) ||
    (canViewExpenses() &&
      (canCreateExpense() || canEditExpense() || canDeleteExpense()));

  const canCreateExpenseCategory = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_CATEGORIES_MANAGE) ||
    canCreateExpense();
  const canEditExpenseCategory = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_CATEGORIES_MANAGE) ||
    canEditExpense();
  const canDeleteExpenseCategory = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_CATEGORIES_MANAGE) ||
    canDeleteExpense();

  /** View returns/refunds against expenses (legacy expense viewers keep visibility). */
  const canViewExpenseReturns = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_RETURNS_VIEW) ||
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_RETURNS_RECEIVE) ||
    canViewExpenses();

  /** Record a received return/refund/cashback (new perm or anyone who can create expenses). */
  const canReceiveExpenseReturns = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.EXPENSES_RETURNS_RECEIVE) ||
    canCreateExpense();

  // Loans / advances / receivables permissions
  const canViewLoans = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LOANS_VIEW);
  /** View/manage any team member’s loans (owner always true). */
  const canManageCompanyLoans = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LOANS_COMPANY_MANAGE);
  const canCreateLoan = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LOANS_CREATE);
  const canEditLoan = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LOANS_EDIT);
  const canDeleteLoan = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LOANS_DELETE);
  const canReceiveLoanRepayment = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LOANS_RECEIVE_REPAYMENT) || canCreateLoan();

  // Company activity permissions
  const canViewCompanyActivity = (): boolean => hasPermission(GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_VIEW);
  const canBulkDeleteCompanyActivity = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_BULK_DELETE);

  // User management permissions
  const canViewUserManagement = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_VIEW);
  const canCreateUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_CREATE);
  const canLoginAsUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_LOGIN_AS);
  const canEditUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_EDIT);
  const canActivateDeactivateUser = (): boolean => hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_ACTIVATE_DEACTIVATE);
  const canManageUserSessions = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_SESSIONS_CONTROL);
  const canBulkDeleteCompanyUsers = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.USER_MANAGEMENT_BULK_DELETE);

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
  /** Bulk CSV import wizard — needs lead-create as well (the wizard reuses the standard create path). */
  const canImportLeads = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_IMPORT) && canCreateLead();
  const canEditLead = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_EDIT);
  const canDeleteLead = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_DELETE);
  const canBulkDeleteLeads = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_BULK_DELETE);
  const canAssignLeads = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_ASSIGN);
  const canAccessLeadDetailAssignmentTab = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_DETAIL_ASSIGNMENT_TAB);
  const canLogLeadCalls = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_LOG_CALLS);
  const canDeleteLeadCallLogs = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_DELETE_CALL_LOGS);
  /** Recording ref + verify call log (admin QA) */
  const canApproveCallLogs = (): boolean => hasPermission(GRANULAR_PERMISSIONS.LEADS_CALL_LOG_APPROVE);
  const canLinkLeadCustomer = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_LINK_CUSTOMER);

  /** Legacy single permission — grants both post-win actions */
  const hasLegacyLeadConvertBundle = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_CONVERT);

  /** Create customer (+ optional business) from a Won lead */
  const canConvertWonLeadToCustomer = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_CONVERT_WON_TO_CUSTOMER) || hasLegacyLeadConvertBundle();

  /** Open new invoice from lead context (prefilled customer). Invoice form still requires INVOICES_CREATE. */
  const canCreateInvoiceFromLead = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.INVOICES_CREATE_FROM_LEAD) || hasLegacyLeadConvertBundle();

  /** Conversion tab / hub: any path that uses this area */
  const canAccessLeadConversionHub = (): boolean =>
    canLinkLeadCustomer() || canConvertWonLeadToCustomer() || canCreateInvoiceFromLead();

  /** @deprecated Use canAccessLeadConversionHub / canConvertWonLeadToCustomer / canCreateInvoiceFromLead */
  const canConvertLead = (): boolean => canAccessLeadConversionHub();
  const canAccessMyAssignedLeadsPage = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_MY_ASSIGNED_PAGE);

  /** Company “Assigned leads” hub (`#/leads/assigned`) and sidebar entry — requires hub toggle plus leads + view-all scope. */
  const canAccessAssignedLeadsHubPage = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_ASSIGNED_HUB_PAGE) &&
    canAccessLeadsPage() &&
    canViewAllLeads();

  /** “My assigned” workspace modals — also covered by broader lead edit/call perms for backward compatibility */
  const canAgentQuickUpdateStatus = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_AGENT_QUICK_STATUS) || canEditLead();
  const canAgentQuickLogCall = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_AGENT_QUICK_CALL) || canLogLeadCalls();
  const canAgentQuickSetFollowup = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.LEADS_AGENT_QUICK_FOLLOWUP) || canEditLead();

  /** List/query scope: all company leads vs assigned-or-created only */
  const leadsListViewAll = (): boolean => canViewAllLeads();

  /** Performance hub: assignment report for self — only this toggle (plus owner bypass). */
  const canViewPerformanceAssignmentReportMy = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.PERFORMANCE_ASSIGNMENT_REPORT_MY);

  /** Performance hub: team assignment report — only this toggle (plus owner bypass). Still needs leads scope to load data (see PerformancePage). */
  const canViewPerformanceAssignmentReportTeam = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.PERFORMANCE_ASSIGNMENT_REPORT_TEAM);

  /** Sidebar + /performance. Required: when off, the Performance menu and route are hidden (assignment/call toggles alone do not open Performance). */
  const canAccessPerformancePage = (): boolean =>
    hasPermission(GRANULAR_PERMISSIONS.PERFORMANCE_HUB_ACCESS);

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
        return (
          canCreateProduct() ||
          canEditProduct() ||
          canDeleteProduct() ||
          canUseCompanyProductCatalog()
        );
      case "bank-accounts":
      case "bank-accounts-view":
        return canCreateBankAccount() || canEditBankAccount() || canDeleteBankAccount() || canViewDashboardBankAccounts();
      case "expenses":
        return canViewExpenses();
      case "loans":
        return canViewLoans() || canManageCompanyLoans() || canCreateLoan();
      case "user-management":
        return canViewUserManagement();
      case "leads":
        return canAccessLeadsPage();
      case "leads-assigned-hub":
        return canAccessAssignedLeadsHubPage();
      case "my-assigned-leads":
        return canAccessMyAssignedLeadsPage();
      case "campaigns":
        return canViewCampaigns();
      case "performance":
        return canAccessPerformancePage();
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
      case "loans":
        return canCreateLoan();
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
      case "loans":
        return canEditLoan();
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
      case "loans":
        return canDeleteLoan();
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
    canViewDashboardMyAssignedLeads,
    canViewMyCallActivity,
    canViewDashboardMyCallActivity,
    canViewLeadGenAnalytics,
    canViewLeadGenCreated,
    canViewLeadGenAssigned,
    canViewLeadGenConverted,

    // Invoice permissions
    canViewInvoices,
    canCreateInvoice,
    canViewInvoicePDF,
    canAccessPaymentTracking,
    canEditInvoice,
    canDeleteInvoice,
    canBulkDeleteInvoices,
    canViewInvoiceStatus,
    canMarkInvoicePaid,

    // Customer permissions
    canViewCustomers,
    canCreateCustomer,
    canEditCustomer,
    canDeleteCustomer,
    canBulkDeleteCustomers,
    canAccessCustomerDetailPage,
    canEditCustomerOnDetailPage,
    canManageCustomerDetailBusinesses,
    canDeleteCustomerDetailBusinesses,
    canViewCustomerDetailInvoicesSection,
    canViewCustomerDetailCrmLeads,
    canViewCustomerDetailAuditLog,
    canViewCustomerDetailTechnicalIds,
    canViewLeadDetailWhatsApp,

    // Product permissions
    canCreateProduct,
    canEditProduct,
    canDeleteProduct,
    canBulkDeleteProducts,
    canUseCompanyProductCatalog,

    // Bank account permissions
    canCreateBankAccount,
    canEditBankAccount,
    canDeleteBankAccount,
    canViewBankReconciliations,
    canPostBankReconciliation,
    canReverseBankReconciliation,

    // Expense permissions
    canViewExpenses,
    canManageCompanyExpenses,
    canCreateExpense,
    canEditExpense,
    canDeleteExpense,
    canBulkDeleteExpenses,
    canViewExpensePayeesTab,
    canCreateExpensePayee,
    canEditExpensePayee,
    canDeleteExpensePayee,
    canViewExpenseCategoriesTab,
    canCreateExpenseCategory,
    canEditExpenseCategory,
    canDeleteExpenseCategory,
    canViewExpenseReturns,
    canReceiveExpenseReturns,
    canViewLoans,
    canManageCompanyLoans,
    canCreateLoan,
    canEditLoan,
    canDeleteLoan,
    canReceiveLoanRepayment,

    // Company activity permissions
    canViewCompanyActivity,
    canBulkDeleteCompanyActivity,

    // User management permissions
    canViewUserManagement,
    canCreateUser,
    canLoginAsUser,
    canEditUser,
    canActivateDeactivateUser,
    canManageUserSessions,
    canBulkDeleteCompanyUsers,

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
    canImportLeads,
    canEditLead,
    canDeleteLead,
    canBulkDeleteLeads,
    canAssignLeads,
    canAccessLeadDetailAssignmentTab,
    canLogLeadCalls,
    canDeleteLeadCallLogs,
    canApproveCallLogs,
    canLinkLeadCustomer,
    canConvertLead,
    canConvertWonLeadToCustomer,
    canCreateInvoiceFromLead,
    canAccessLeadConversionHub,
    canAccessMyAssignedLeadsPage,
    canAccessAssignedLeadsHubPage,
    canAgentQuickUpdateStatus,
    canAgentQuickLogCall,
    canAgentQuickSetFollowup,
    leadsListViewAll,

    // Campaigns
    canViewCampaigns,
    canManageCampaigns,
    canAssignLeadCampaign,

    canViewPerformanceAssignmentReportMy,
    canViewPerformanceAssignmentReportTeam,
    canAccessPerformancePage,

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
