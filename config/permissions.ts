import type { Permission } from "../types";

// Remove old role-based system completely
// Now only use granular permissions

export const PERMISSION_CATEGORIES = {
  DASHBOARD: "dashboard",
  INVOICES: "invoices",
  CUSTOMERS: "customers",
  PRODUCTS: "products",
  BANK_ACCOUNTS: "bank-accounts",
  EXPENSES: "expenses",
  USER_MANAGEMENT: "user-management",
  CUSTOM_ROLES: "custom-roles",
  COMPANY_ACTIVITY: "company-activity",
  DATA_MANAGEMENT: "data-management",
  SIDEBAR: "sidebar",
  LEADS: "leads",
} as const;

// New granular permissions for each section/UI element
export const GRANULAR_PERMISSIONS = {
  // Dashboard Page Permissions
  DASHBOARD_VIEW_TOTAL_REVENUE: "dashboard_view_total_revenue",
  DASHBOARD_VIEW_OUTSTANDING_REVENUE: "dashboard_view_outstanding_revenue",
  DASHBOARD_VIEW_MONTHLY_EXPENSES: "dashboard_view_monthly_expenses",
  DASHBOARD_VIEW_TOTAL_CUSTOMERS: "dashboard_view_total_customers",
  DASHBOARD_VIEW_BANK_ACCOUNTS: "dashboard_view_bank_accounts",
  DASHBOARD_VIEW_RECENT_INVOICES: "dashboard_view_recent_invoices",
  DASHBOARD_ACCESS_INVOICE_VERIFICATION: "dashboard_access_invoice_verification",
  DASHBOARD_VIEW_DEBUG_INFO: "dashboard_view_debug_info",

  // Invoices Page Permissions
  INVOICES_VIEW: "invoices_view",
  INVOICES_CREATE: "invoices_create",
  INVOICES_VIEW_PDF: "invoices_view_pdf",
  INVOICES_PAYMENT_TRACKING: "invoices_payment_tracking",
  INVOICES_EDIT: "invoices_edit",
  INVOICES_DELETE: "invoices_delete",
  INVOICES_VIEW_STATUS: "invoices_view_status",

  // Customers Page Permissions
  CUSTOMERS_VIEW: "customers_view",
  CUSTOMERS_CREATE: "customers_create",
  CUSTOMERS_EDIT: "customers_edit",
  CUSTOMERS_DELETE: "customers_delete",

  // Products Page Permissions
  PRODUCTS_CREATE: "products_create",
  PRODUCTS_EDIT: "products_edit",
  PRODUCTS_DELETE: "products_delete",

  // Bank Accounts Page Permissions
  BANK_ACCOUNTS_CREATE: "bank_accounts_create",
  BANK_ACCOUNTS_EDIT: "bank_accounts_edit",
  BANK_ACCOUNTS_DELETE: "bank_accounts_delete",

  // Expenses Page Permissions
  EXPENSES_VIEW: "expenses_view",
  EXPENSES_CREATE: "expenses_create",
  EXPENSES_EDIT: "expenses_edit",
  EXPENSES_DELETE: "expenses_delete",

  // Company Activity Section (Admin only)
  COMPANY_ACTIVITY_VIEW: "company_activity_view",

  // User Management Page Permissions
  USER_MANAGEMENT_VIEW: "user_management_view",
  USER_MANAGEMENT_CREATE: "user_management_create",
  USER_MANAGEMENT_LOGIN_AS: "user_management_login_as",
  USER_MANAGEMENT_EDIT: "user_management_edit",
  USER_MANAGEMENT_ACTIVATE_DEACTIVATE: "user_management_activate_deactivate",

  // Custom Roles Page Permissions
  CUSTOM_ROLES_VIEW: "custom_roles_view",
  CUSTOM_ROLES_CREATE: "custom_roles_create",
  CUSTOM_ROLES_EDIT: "custom_roles_edit",
  CUSTOM_ROLES_DELETE: "custom_roles_delete",

  // Sidebar Permissions
  SIDEBAR_EDIT_PROFILE: "sidebar_edit_profile",

  // Data Management Permissions
  DATA_BACKUP_EXPORT: "data_backup_export",
  DATA_BACKUP_IMPORT: "data_backup_import",
  DATA_BACKUP_VIEW_HISTORY: "data_backup_view_history",

  // Leads / CRM (granular only — no role names in app logic)
  LEADS_VIEW: "leads_view",
  LEADS_VIEW_ALL: "leads_view_all",
  LEADS_CREATE: "leads_create",
  LEADS_EDIT: "leads_edit",
  LEADS_DELETE: "leads_delete",
  LEADS_ASSIGN: "leads_assign",
  LEADS_LOG_CALLS: "leads_log_calls",
  LEADS_LINK_CUSTOMER: "leads_link_customer",
  LEADS_CONVERT: "leads_convert",
} as const;

// Permission descriptions for the role management UI
export const PERMISSION_DESCRIPTIONS = {
  // Dashboard
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_TOTAL_REVENUE]: "View Total Revenue (Paid) card on dashboard",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_OUTSTANDING_REVENUE]: "View Outstanding Revenue card on dashboard",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_MONTHLY_EXPENSES]: "View This Month Expenses card on dashboard",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_TOTAL_CUSTOMERS]: "View Total Customers card on dashboard",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_BANK_ACCOUNTS]: "View Bank Accounts section on dashboard",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_RECENT_INVOICES]: "View Recent Invoices section on dashboard",
  [GRANULAR_PERMISSIONS.DASHBOARD_ACCESS_INVOICE_VERIFICATION]: "Access Invoice Authentication Verification section",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_DEBUG_INFO]: "View Debug Info (Real-time) section on dashboard",

  // Invoices
  [GRANULAR_PERMISSIONS.INVOICES_VIEW]: "Access invoices page and view invoice list",
  [GRANULAR_PERMISSIONS.INVOICES_CREATE]: "Show 'Create Invoice' button",
  [GRANULAR_PERMISSIONS.INVOICES_VIEW_PDF]: "View PDF of invoices",
  [GRANULAR_PERMISSIONS.INVOICES_PAYMENT_TRACKING]: "Open Payment Tracking popup",
  [GRANULAR_PERMISSIONS.INVOICES_EDIT]: "Edit invoices",
  [GRANULAR_PERMISSIONS.INVOICES_DELETE]: "Delete invoices",
  [GRANULAR_PERMISSIONS.INVOICES_VIEW_STATUS]: "View and modify invoice status column",

  // Customers
  [GRANULAR_PERMISSIONS.CUSTOMERS_VIEW]: "Access customers page and view customer list",
  [GRANULAR_PERMISSIONS.CUSTOMERS_CREATE]: "Show 'Add Customer' button",
  [GRANULAR_PERMISSIONS.CUSTOMERS_EDIT]: "Edit customers",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DELETE]: "Delete customers",

  // Products
  [GRANULAR_PERMISSIONS.PRODUCTS_CREATE]: "Show 'Add Product' button",
  [GRANULAR_PERMISSIONS.PRODUCTS_EDIT]: "Edit products",
  [GRANULAR_PERMISSIONS.PRODUCTS_DELETE]: "Delete products",

  // Bank Accounts
  [GRANULAR_PERMISSIONS.BANK_ACCOUNTS_CREATE]: "Access form to add bank accounts",
  [GRANULAR_PERMISSIONS.BANK_ACCOUNTS_EDIT]: "Edit bank accounts",
  [GRANULAR_PERMISSIONS.BANK_ACCOUNTS_DELETE]: "Delete bank accounts",

  // Expenses
  [GRANULAR_PERMISSIONS.EXPENSES_VIEW]: "Access expenses page and view expense list",
  [GRANULAR_PERMISSIONS.EXPENSES_CREATE]: "Show 'Add Expense' button",
  [GRANULAR_PERMISSIONS.EXPENSES_EDIT]: "Edit expenses",
  [GRANULAR_PERMISSIONS.EXPENSES_DELETE]: "Delete expenses",

  // Company Activity
  [GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_VIEW]: "View Company Activity section (Admin only)",

  // User Management
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_VIEW]: "Access user management page and view user list",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_CREATE]: "Show 'Create User' button",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_LOGIN_AS]: "Show 'Login As' button",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_EDIT]: "Edit users",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_ACTIVATE_DEACTIVATE]: "Activate/Deactivate users",

  // Custom Roles
  [GRANULAR_PERMISSIONS.CUSTOM_ROLES_VIEW]: "Access custom roles section and view roles list",
  [GRANULAR_PERMISSIONS.CUSTOM_ROLES_CREATE]: "Show 'Create Custom Role' button",
  [GRANULAR_PERMISSIONS.CUSTOM_ROLES_EDIT]: "Edit custom roles",
  [GRANULAR_PERMISSIONS.CUSTOM_ROLES_DELETE]: "Delete custom roles",

  // Sidebar
  [GRANULAR_PERMISSIONS.SIDEBAR_EDIT_PROFILE]: "Show/Edit profile icon in sidebar",

  // Data Management
  [GRANULAR_PERMISSIONS.DATA_BACKUP_EXPORT]: "Export company data for backup",
  [GRANULAR_PERMISSIONS.DATA_BACKUP_IMPORT]: "Import company data from backup",
  [GRANULAR_PERMISSIONS.DATA_BACKUP_VIEW_HISTORY]: "View backup history and logs",

  // Leads
  [GRANULAR_PERMISSIONS.LEADS_VIEW]: "Access leads and view leads assigned to you or created by you",
  [GRANULAR_PERMISSIONS.LEADS_VIEW_ALL]: "View all leads in the company (monitoring)",
  [GRANULAR_PERMISSIONS.LEADS_CREATE]: "Create new leads",
  [GRANULAR_PERMISSIONS.LEADS_EDIT]: "Edit lead fields, status, and follow-up date",
  [GRANULAR_PERMISSIONS.LEADS_DELETE]: "Delete leads",
  [GRANULAR_PERMISSIONS.LEADS_ASSIGN]: "Assign or reassign leads to users",
  [GRANULAR_PERMISSIONS.LEADS_LOG_CALLS]: "Add and view call logs on leads",
  [GRANULAR_PERMISSIONS.LEADS_LINK_CUSTOMER]: "Link leads to existing customers or businesses",
  [GRANULAR_PERMISSIONS.LEADS_CONVERT]: "Convert won leads to customers and start invoices",
};

// Group permissions by category for better organization in UI
export const PERMISSION_GROUPS = {
  [PERMISSION_CATEGORIES.DASHBOARD]: [
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_TOTAL_REVENUE,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_OUTSTANDING_REVENUE,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_MONTHLY_EXPENSES,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_TOTAL_CUSTOMERS,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_BANK_ACCOUNTS,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_RECENT_INVOICES,
    GRANULAR_PERMISSIONS.DASHBOARD_ACCESS_INVOICE_VERIFICATION,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_DEBUG_INFO,
  ],
  [PERMISSION_CATEGORIES.INVOICES]: [
    GRANULAR_PERMISSIONS.INVOICES_VIEW,
    GRANULAR_PERMISSIONS.INVOICES_CREATE,
    GRANULAR_PERMISSIONS.INVOICES_VIEW_PDF,
    GRANULAR_PERMISSIONS.INVOICES_PAYMENT_TRACKING,
    GRANULAR_PERMISSIONS.INVOICES_EDIT,
    GRANULAR_PERMISSIONS.INVOICES_DELETE,
    GRANULAR_PERMISSIONS.INVOICES_VIEW_STATUS,
  ],
  [PERMISSION_CATEGORIES.CUSTOMERS]: [
    GRANULAR_PERMISSIONS.CUSTOMERS_VIEW,
    GRANULAR_PERMISSIONS.CUSTOMERS_CREATE,
    GRANULAR_PERMISSIONS.CUSTOMERS_EDIT,
    GRANULAR_PERMISSIONS.CUSTOMERS_DELETE,
  ],
  [PERMISSION_CATEGORIES.PRODUCTS]: [
    GRANULAR_PERMISSIONS.PRODUCTS_CREATE,
    GRANULAR_PERMISSIONS.PRODUCTS_EDIT,
    GRANULAR_PERMISSIONS.PRODUCTS_DELETE,
  ],
  [PERMISSION_CATEGORIES.BANK_ACCOUNTS]: [
    GRANULAR_PERMISSIONS.BANK_ACCOUNTS_CREATE,
    GRANULAR_PERMISSIONS.BANK_ACCOUNTS_EDIT,
    GRANULAR_PERMISSIONS.BANK_ACCOUNTS_DELETE,
  ],
  [PERMISSION_CATEGORIES.EXPENSES]: [
    GRANULAR_PERMISSIONS.EXPENSES_VIEW,
    GRANULAR_PERMISSIONS.EXPENSES_CREATE,
    GRANULAR_PERMISSIONS.EXPENSES_EDIT,
    GRANULAR_PERMISSIONS.EXPENSES_DELETE,
  ],
  [PERMISSION_CATEGORIES.COMPANY_ACTIVITY]: [
    GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_VIEW,
  ],
  [PERMISSION_CATEGORIES.USER_MANAGEMENT]: [
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_VIEW,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_CREATE,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_LOGIN_AS,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_EDIT,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_ACTIVATE_DEACTIVATE,
  ],
  [PERMISSION_CATEGORIES.CUSTOM_ROLES]: [
    GRANULAR_PERMISSIONS.CUSTOM_ROLES_VIEW,
    GRANULAR_PERMISSIONS.CUSTOM_ROLES_CREATE,
    GRANULAR_PERMISSIONS.CUSTOM_ROLES_EDIT,
    GRANULAR_PERMISSIONS.CUSTOM_ROLES_DELETE,
  ],
  [PERMISSION_CATEGORIES.DATA_MANAGEMENT]: [
    GRANULAR_PERMISSIONS.DATA_BACKUP_EXPORT,
    GRANULAR_PERMISSIONS.DATA_BACKUP_IMPORT,
    GRANULAR_PERMISSIONS.DATA_BACKUP_VIEW_HISTORY,
  ],
  [PERMISSION_CATEGORIES.SIDEBAR]: [
    GRANULAR_PERMISSIONS.SIDEBAR_EDIT_PROFILE,
  ],
  [PERMISSION_CATEGORIES.LEADS]: [
    GRANULAR_PERMISSIONS.LEADS_VIEW,
    GRANULAR_PERMISSIONS.LEADS_VIEW_ALL,
    GRANULAR_PERMISSIONS.LEADS_CREATE,
    GRANULAR_PERMISSIONS.LEADS_EDIT,
    GRANULAR_PERMISSIONS.LEADS_DELETE,
    GRANULAR_PERMISSIONS.LEADS_ASSIGN,
    GRANULAR_PERMISSIONS.LEADS_LOG_CALLS,
    GRANULAR_PERMISSIONS.LEADS_LINK_CUSTOMER,
    GRANULAR_PERMISSIONS.LEADS_CONVERT,
  ],
};

// Helper function to get all permissions as an array
export const getAllPermissions = (): string[] => {
  return Object.values(GRANULAR_PERMISSIONS);
};

// Helper function to get permission group names
export const getPermissionGroupNames = (): string[] => {
  return Object.keys(PERMISSION_GROUPS);
};

// Legacy page constants for backward compatibility (to be removed)
export const PAGES = {
  DASHBOARD: "dashboard",
  INVOICES: "invoices",
  CUSTOMERS: "customers",
  PRODUCTS: "products",
  BANK_ACCOUNTS: "bank-accounts",
  BANK_ACCOUNTS_VIEW: "bank-accounts-view",
  EXPENSES: "expenses",
  USER_MANAGEMENT: "user-management",
  REPORTS: "reports",
  LEADS: "leads",
} as const;

// Legacy actions for backward compatibility (to be removed)
export const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  EXPORT: "export",
} as const;
