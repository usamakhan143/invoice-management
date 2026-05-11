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
  CAMPAIGNS: "campaigns",
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
  DASHBOARD_VIEW_MY_ASSIGNED_LEADS: "dashboard_view_my_assigned_leads",
  /** Master toggle for lead generation analytics block on dashboard */
  DASHBOARD_VIEW_LEAD_GEN_ANALYTICS: "dashboard_view_lead_gen_analytics",
  /** Lead analytics metric: how many leads were added */
  DASHBOARD_VIEW_LEAD_GEN_CREATED: "dashboard_view_lead_gen_created",
  /** Lead analytics metric: how many leads were assigned to an agent */
  DASHBOARD_VIEW_LEAD_GEN_ASSIGNED: "dashboard_view_lead_gen_assigned",
  /** Lead analytics metric: how many leads converted to customer */
  DASHBOARD_VIEW_LEAD_GEN_CONVERTED: "dashboard_view_lead_gen_converted",

  // Invoices Page Permissions
  INVOICES_VIEW: "invoices_view",
  INVOICES_CREATE: "invoices_create",
  INVOICES_VIEW_PDF: "invoices_view_pdf",
  INVOICES_PAYMENT_TRACKING: "invoices_payment_tracking",
  INVOICES_EDIT: "invoices_edit",
  INVOICES_DELETE: "invoices_delete",
  /** Delete multiple invoices from the list (separate from single-row delete) */
  INVOICES_BULK_DELETE: "invoices_bulk_delete",
  INVOICES_VIEW_STATUS: "invoices_view_status",
  /** Set invoice to Paid (and change away from Paid). Affects bank balance — assign to trusted users only. */
  INVOICES_MARK_PAID: "invoices_mark_paid",

  // Customers Page Permissions
  CUSTOMERS_VIEW: "customers_view",
  CUSTOMERS_CREATE: "customers_create",
  CUSTOMERS_EDIT: "customers_edit",
  CUSTOMERS_DELETE: "customers_delete",
  CUSTOMERS_BULK_DELETE: "customers_bulk_delete",
  /** Open customer profile page (#/customers/:id) — list still uses CUSTOMERS_VIEW */
  CUSTOMERS_DETAIL_VIEW: "customers_detail_view",
  /** Edit customer fields from the detail page (modal) */
  CUSTOMERS_DETAIL_EDIT: "customers_detail_edit",
  /** Add / edit businesses on customer detail (delete uses CUSTOMERS_DETAIL_BUSINESSES_DELETE) */
  CUSTOMERS_DETAIL_BUSINESSES: "customers_detail_businesses",
  /** Delete a business from customer detail (separate from add/edit) */
  CUSTOMERS_DETAIL_BUSINESSES_DELETE: "customers_detail_businesses_delete",
  /** Show invoices table on customer detail */
  CUSTOMERS_DETAIL_INVOICES_SECTION: "customers_detail_invoices_section",
  /** Show CRM leads section on customer detail */
  CUSTOMERS_DETAIL_CRM_LEADS: "customers_detail_crm_leads",
  /** Show activity / audit section on customer detail */
  CUSTOMERS_DETAIL_AUDIT_LOG: "customers_detail_audit_log",
  /** Show internal IDs on customer detail (Firestore record ID, company scope, business doc IDs) */
  CUSTOMERS_DETAIL_VIEW_TECHNICAL_IDS: "customers_detail_view_technical_ids",

  // Products Page Permissions
  PRODUCTS_CREATE: "products_create",
  PRODUCTS_EDIT: "products_edit",
  PRODUCTS_DELETE: "products_delete",
  PRODUCTS_BULK_DELETE: "products_bulk_delete",
  /** See company-wide products (including admin catalog) on the Products page and when creating invoices */
  PRODUCTS_USE_COMPANY_CATALOG: "products_use_company_catalog",

  // Bank Accounts Page Permissions
  BANK_ACCOUNTS_CREATE: "bank_accounts_create",
  BANK_ACCOUNTS_EDIT: "bank_accounts_edit",
  BANK_ACCOUNTS_DELETE: "bank_accounts_delete",

  // Expenses Page Permissions
  EXPENSES_VIEW: "expenses_view",
  /** View/edit/delete all company expenses (same scope as owner for expenses module) */
  EXPENSES_COMPANY_MANAGE: "expenses_company_manage",
  EXPENSES_CREATE: "expenses_create",
  EXPENSES_EDIT: "expenses_edit",
  EXPENSES_DELETE: "expenses_delete",
  EXPENSES_BULK_DELETE: "expenses_bulk_delete",
  /** Access the Payees tab (saved payee directory) on the Expenses page */
  EXPENSES_PAYEES_VIEW: "expenses_payees_view",
  /** Add, edit, and delete saved payees (vendor directory). Legacy: also allowed with expense create/edit/delete. */
  EXPENSES_PAYEES_MANAGE: "expenses_payees_manage",
  /** Access the Categories tab on the Expenses page */
  EXPENSES_CATEGORIES_VIEW: "expenses_categories_view",
  /** Add, edit, and delete expense categories (including rename on existing expenses). Legacy: also allowed with expense create/edit/delete. */
  EXPENSES_CATEGORIES_MANAGE: "expenses_categories_manage",

  // Company Activity Section (Admin only)
  COMPANY_ACTIVITY_VIEW: "company_activity_view",
  /** Delete selected activity log entries (company timeline) */
  COMPANY_ACTIVITY_BULK_DELETE: "company_activity_bulk_delete",

  // User Management Page Permissions
  USER_MANAGEMENT_VIEW: "user_management_view",
  USER_MANAGEMENT_CREATE: "user_management_create",
  USER_MANAGEMENT_LOGIN_AS: "user_management_login_as",
  USER_MANAGEMENT_EDIT: "user_management_edit",
  USER_MANAGEMENT_ACTIVATE_DEACTIVATE: "user_management_activate_deactivate",
  /** Open and control user device sessions (view/revoke single/revoke all) */
  USER_MANAGEMENT_SESSIONS_CONTROL: "user_management_sessions_control",
  /** Remove users from company (bulk or single Remove) — separate from edit/deactivate */
  USER_MANAGEMENT_BULK_DELETE: "user_management_bulk_delete",

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
  /** Delete multiple leads from the list (separate from single-row / detail delete) */
  LEADS_BULK_DELETE: "leads_bulk_delete",
  LEADS_ASSIGN: "leads_assign",
  /** Assignment tab on lead detail (history + UI; reassign still needs Leads Assign) */
  LEADS_DETAIL_ASSIGNMENT_TAB: "leads_detail_assignment_tab",
  LEADS_LOG_CALLS: "leads_log_calls",
  /** Delete entries from a lead’s call log history */
  LEADS_DELETE_CALL_LOGS: "leads_delete_call_logs",
  /** Set recording/reference ID and mark call logs as verified (admin QA) */
  LEADS_CALL_LOG_APPROVE: "leads_call_log_approve",
  LEADS_LINK_CUSTOMER: "leads_link_customer",
  /** @deprecated Prefer LEADS_CONVERT_WON_TO_CUSTOMER + INVOICES_CREATE_FROM_LEAD — kept for existing roles */
  LEADS_CONVERT: "leads_convert",
  /** Create a new customer (and optional business) from a Won lead */
  LEADS_CONVERT_WON_TO_CUSTOMER: "leads_convert_won_to_customer",
  /** Open “new invoice” from a lead with the converted customer pre-selected */
  INVOICES_CREATE_FROM_LEAD: "invoices_create_from_lead",
  /** Dedicated page: leads currently assigned to the signed-in user, grouped by assignment date */
  LEADS_MY_ASSIGNED_PAGE: "leads_my_assigned_page",
  /** My assigned workspace: change pipeline status from the quick modal (also allowed if user has leads_edit) */
  LEADS_AGENT_QUICK_STATUS: "leads_agent_quick_status",
  /** My assigned workspace: add/view call logs in modals (also allowed if user has leads_log_calls) */
  LEADS_AGENT_QUICK_CALL: "leads_agent_quick_call",
  /** My assigned workspace: set or clear next follow-up from the quick modal (also allowed if user has leads_edit) */
  LEADS_AGENT_QUICK_FOLLOWUP: "leads_agent_quick_followup",
  /** WhatsApp block on lead detail (Details tab) — hide for users without this permission */
  LEADS_DETAIL_WHATSAPP: "leads_detail_whatsapp",
  /** Link a lead to a campaign and assign campaign tags */
  LEADS_CAMPAIGN_ASSIGN: "leads_campaign_assign",

  // Campaigns module
  /** See the Campaigns sidebar link and browse campaigns (read-only without manage) */
  CAMPAIGNS_VIEW: "campaigns_view",
  /** Create, edit, archive campaigns and manage their tags */
  CAMPAIGNS_MANAGE: "campaigns_manage",
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
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_MY_ASSIGNED_LEADS]:
    "View “My assigned leads” summary (counts & follow-ups) on the dashboard",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_ANALYTICS]:
    "Show Lead Generation Analytics block on dashboard",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_CREATED]:
    "Lead analytics: view “Leads added” metric",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_ASSIGNED]:
    "Lead analytics: view “Assigned to agents” metric",
  [GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_CONVERTED]:
    "Lead analytics: view “Converted” metric",

  // Invoices
  [GRANULAR_PERMISSIONS.INVOICES_VIEW]: "Access invoices page and view invoice list",
  [GRANULAR_PERMISSIONS.INVOICES_CREATE]: "Show 'Create Invoice' button",
  [GRANULAR_PERMISSIONS.INVOICES_VIEW_PDF]: "View PDF of invoices",
  [GRANULAR_PERMISSIONS.INVOICES_PAYMENT_TRACKING]: "Open Payment Tracking popup",
  [GRANULAR_PERMISSIONS.INVOICES_EDIT]: "Edit invoices",
  [GRANULAR_PERMISSIONS.INVOICES_DELETE]: "Delete invoices",
  [GRANULAR_PERMISSIONS.INVOICES_BULK_DELETE]:
    "Delete multiple invoices at once from the invoices list (checkboxes + bulk action)",
  [GRANULAR_PERMISSIONS.INVOICES_VIEW_STATUS]:
    "View status and change draft / sent / overdue (column dropdown). Does not include marking as Paid.",
  [GRANULAR_PERMISSIONS.INVOICES_MARK_PAID]:
    "Mark invoices as Paid and change status away from Paid (verified payment; updates bank balance)",
  [GRANULAR_PERMISSIONS.INVOICES_CREATE_FROM_LEAD]:
    "Start a new invoice from a lead (customer pre-filled after conversion). Still requires “Create invoice” to save.",

  // Customers
  [GRANULAR_PERMISSIONS.CUSTOMERS_VIEW]: "Access customers page and view customer list",
  [GRANULAR_PERMISSIONS.CUSTOMERS_CREATE]: "Show 'Add Customer' button",
  [GRANULAR_PERMISSIONS.CUSTOMERS_EDIT]: "Edit customers",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DELETE]: "Delete customers",
  [GRANULAR_PERMISSIONS.CUSTOMERS_BULK_DELETE]:
    "Delete multiple customers at once from the customers list",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_VIEW]:
    "Open customer detail page (profile) from the customers list — required in addition to list access",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_EDIT]:
    "Edit customer contact fields from the customer detail page (also covered by “Edit customers” if you prefer one toggle)",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_BUSINESSES]:
    "Add and edit businesses on customer detail (also covered by “Edit customers”)",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_BUSINESSES_DELETE]:
    "Delete businesses on customer detail — separate from add/edit (also granted with Edit or Delete customers)",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_INVOICES_SECTION]:
    "Show the invoices section on customer detail (also covered by “Access invoices”)",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_CRM_LEADS]:
    "Show the CRM leads section on customer detail (also covered by lead access permissions)",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_AUDIT_LOG]:
    "Show the activity / audit trail section on customer detail",
  [GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_VIEW_TECHNICAL_IDS]:
    "Customer detail: show internal IDs (customer record ID, company scope, business document IDs) — for admins / support",

  // Products
  [GRANULAR_PERMISSIONS.PRODUCTS_CREATE]: "Show 'Add Product' button",
  [GRANULAR_PERMISSIONS.PRODUCTS_EDIT]: "Edit products",
  [GRANULAR_PERMISSIONS.PRODUCTS_DELETE]: "Delete products",
  [GRANULAR_PERMISSIONS.PRODUCTS_BULK_DELETE]:
    "Delete multiple products at once from the products list",
  [GRANULAR_PERMISSIONS.PRODUCTS_USE_COMPANY_CATALOG]:
    "Use company product catalog — see products added by admins/owner and pick them on invoices (read-only on Products page unless you also have create/edit)",

  // Bank Accounts
  [GRANULAR_PERMISSIONS.BANK_ACCOUNTS_CREATE]: "Access form to add bank accounts",
  [GRANULAR_PERMISSIONS.BANK_ACCOUNTS_EDIT]: "Edit bank accounts",
  [GRANULAR_PERMISSIONS.BANK_ACCOUNTS_DELETE]: "Delete bank accounts",

  // Expenses
  [GRANULAR_PERMISSIONS.EXPENSES_VIEW]: "Access expenses page and view expense list",
  [GRANULAR_PERMISSIONS.EXPENSES_COMPANY_MANAGE]:
    "View and manage all company expenses (any team member’s entries), same as owner for this module",
  [GRANULAR_PERMISSIONS.EXPENSES_CREATE]: "Show 'Add Expense' button",
  [GRANULAR_PERMISSIONS.EXPENSES_EDIT]: "Edit expenses",
  [GRANULAR_PERMISSIONS.EXPENSES_DELETE]: "Delete expenses",
  [GRANULAR_PERMISSIONS.EXPENSES_BULK_DELETE]:
    "Delete multiple expenses at once from the expenses list",
  [GRANULAR_PERMISSIONS.EXPENSES_PAYEES_VIEW]:
    "Access the Payees tab and view the saved payee directory",
  [GRANULAR_PERMISSIONS.EXPENSES_PAYEES_MANAGE]:
    "Add, edit, and delete saved payees (also covered by expense create/edit/delete if those are enabled)",
  [GRANULAR_PERMISSIONS.EXPENSES_CATEGORIES_VIEW]:
    "Access the Categories tab and view expense categories",
  [GRANULAR_PERMISSIONS.EXPENSES_CATEGORIES_MANAGE]:
    "Add, edit, and delete expense categories, including renaming a category on existing expenses (also covered by expense create/edit/delete if those are enabled)",

  // Company Activity
  [GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_VIEW]: "View Company Activity section (Admin only)",
  [GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_BULK_DELETE]:
    "Delete selected entries from the company activity timeline",

  // User Management
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_VIEW]: "Access user management page and view user list",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_CREATE]: "Show 'Create User' button",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_LOGIN_AS]: "Show 'Login As' button",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_EDIT]: "Edit users",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_ACTIVATE_DEACTIVATE]: "Activate/Deactivate users",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_SESSIONS_CONTROL]:
    "Open and manage user sessions (view active devices, revoke one, revoke all)",
  [GRANULAR_PERMISSIONS.USER_MANAGEMENT_BULK_DELETE]:
    "Remove users from the company (bulk or single “Remove”) — does not delete the Firebase Auth account",

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
  [GRANULAR_PERMISSIONS.LEADS_BULK_DELETE]:
    "Delete multiple leads at once from the leads list (bulk action)",
  [GRANULAR_PERMISSIONS.LEADS_ASSIGN]: "Assign or reassign leads to users",
  [GRANULAR_PERMISSIONS.LEADS_DETAIL_ASSIGNMENT_TAB]:
    "Open the Assignment tab on lead detail (reassignment history; changing assignee still requires Leads Assign)",
  [GRANULAR_PERMISSIONS.LEADS_LOG_CALLS]: "Add and view call logs on leads",
  [GRANULAR_PERMISSIONS.LEADS_DELETE_CALL_LOGS]: "Delete call log entries from a lead",
  [GRANULAR_PERMISSIONS.LEADS_CALL_LOG_APPROVE]:
    "Add recording/reference ID to call logs and mark them as verified (quality control)",
  [GRANULAR_PERMISSIONS.LEADS_LINK_CUSTOMER]: "Link leads to existing customers or businesses",
  [GRANULAR_PERMISSIONS.LEADS_CONVERT]:
    "Legacy: full post-win flow (create customer from Won + invoice shortcut). Prefer the two split permissions below for finer control.",
  [GRANULAR_PERMISSIONS.LEADS_CONVERT_WON_TO_CUSTOMER]:
    "Create a new customer record from a Won lead (optional business). Does not open the invoice screen by itself.",
  [GRANULAR_PERMISSIONS.LEADS_MY_ASSIGNED_PAGE]:
    "Access “My assigned leads” page (your assigned leads, grouped by date, with progress stats)",
  [GRANULAR_PERMISSIONS.LEADS_AGENT_QUICK_STATUS]:
    "On “My assigned leads”: open the status modal to update pipeline stage (Won/Lost/etc.)",
  [GRANULAR_PERMISSIONS.LEADS_AGENT_QUICK_CALL]:
    "On “My assigned leads”: open call log modal to log calls and optional follow-up from the call",
  [GRANULAR_PERMISSIONS.LEADS_AGENT_QUICK_FOLLOWUP]:
    "On “My assigned leads”: open follow-up modal to set or clear the next follow-up date",
  [GRANULAR_PERMISSIONS.LEADS_DETAIL_WHATSAPP]:
    "On lead detail: show and edit the WhatsApp fields (checkbox, same/different number). Hidden if unchecked.",
  [GRANULAR_PERMISSIONS.LEADS_CAMPAIGN_ASSIGN]:
    "On lead detail: assign or change the lead's campaign and tags. Also granted when user has Leads Edit.",

  // Campaigns
  [GRANULAR_PERMISSIONS.CAMPAIGNS_VIEW]:
    "Access the Campaigns page and view campaigns (read-only without Campaigns Manage)",
  [GRANULAR_PERMISSIONS.CAMPAIGNS_MANAGE]:
    "Create, edit, archive campaigns and manage their tags",
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
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_MY_ASSIGNED_LEADS,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_ANALYTICS,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_CREATED,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_ASSIGNED,
    GRANULAR_PERMISSIONS.DASHBOARD_VIEW_LEAD_GEN_CONVERTED,
  ],
  [PERMISSION_CATEGORIES.INVOICES]: [
    GRANULAR_PERMISSIONS.INVOICES_VIEW,
    GRANULAR_PERMISSIONS.INVOICES_CREATE,
    GRANULAR_PERMISSIONS.INVOICES_CREATE_FROM_LEAD,
    GRANULAR_PERMISSIONS.INVOICES_VIEW_PDF,
    GRANULAR_PERMISSIONS.INVOICES_PAYMENT_TRACKING,
    GRANULAR_PERMISSIONS.INVOICES_EDIT,
    GRANULAR_PERMISSIONS.INVOICES_DELETE,
    GRANULAR_PERMISSIONS.INVOICES_BULK_DELETE,
    GRANULAR_PERMISSIONS.INVOICES_VIEW_STATUS,
    GRANULAR_PERMISSIONS.INVOICES_MARK_PAID,
  ],
  [PERMISSION_CATEGORIES.CUSTOMERS]: [
    GRANULAR_PERMISSIONS.CUSTOMERS_VIEW,
    GRANULAR_PERMISSIONS.CUSTOMERS_CREATE,
    GRANULAR_PERMISSIONS.CUSTOMERS_EDIT,
    GRANULAR_PERMISSIONS.CUSTOMERS_DELETE,
    GRANULAR_PERMISSIONS.CUSTOMERS_BULK_DELETE,
    GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_VIEW,
    GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_EDIT,
    GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_BUSINESSES,
    GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_BUSINESSES_DELETE,
    GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_INVOICES_SECTION,
    GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_CRM_LEADS,
    GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_AUDIT_LOG,
    GRANULAR_PERMISSIONS.CUSTOMERS_DETAIL_VIEW_TECHNICAL_IDS,
  ],
  [PERMISSION_CATEGORIES.PRODUCTS]: [
    GRANULAR_PERMISSIONS.PRODUCTS_CREATE,
    GRANULAR_PERMISSIONS.PRODUCTS_EDIT,
    GRANULAR_PERMISSIONS.PRODUCTS_DELETE,
    GRANULAR_PERMISSIONS.PRODUCTS_BULK_DELETE,
    GRANULAR_PERMISSIONS.PRODUCTS_USE_COMPANY_CATALOG,
  ],
  [PERMISSION_CATEGORIES.BANK_ACCOUNTS]: [
    GRANULAR_PERMISSIONS.BANK_ACCOUNTS_CREATE,
    GRANULAR_PERMISSIONS.BANK_ACCOUNTS_EDIT,
    GRANULAR_PERMISSIONS.BANK_ACCOUNTS_DELETE,
  ],
  [PERMISSION_CATEGORIES.EXPENSES]: [
    GRANULAR_PERMISSIONS.EXPENSES_VIEW,
    GRANULAR_PERMISSIONS.EXPENSES_COMPANY_MANAGE,
    GRANULAR_PERMISSIONS.EXPENSES_CREATE,
    GRANULAR_PERMISSIONS.EXPENSES_EDIT,
    GRANULAR_PERMISSIONS.EXPENSES_DELETE,
    GRANULAR_PERMISSIONS.EXPENSES_BULK_DELETE,
    GRANULAR_PERMISSIONS.EXPENSES_PAYEES_VIEW,
    GRANULAR_PERMISSIONS.EXPENSES_PAYEES_MANAGE,
    GRANULAR_PERMISSIONS.EXPENSES_CATEGORIES_VIEW,
    GRANULAR_PERMISSIONS.EXPENSES_CATEGORIES_MANAGE,
  ],
  [PERMISSION_CATEGORIES.COMPANY_ACTIVITY]: [
    GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_VIEW,
    GRANULAR_PERMISSIONS.COMPANY_ACTIVITY_BULK_DELETE,
  ],
  [PERMISSION_CATEGORIES.USER_MANAGEMENT]: [
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_VIEW,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_CREATE,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_LOGIN_AS,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_EDIT,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_ACTIVATE_DEACTIVATE,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_SESSIONS_CONTROL,
    GRANULAR_PERMISSIONS.USER_MANAGEMENT_BULK_DELETE,
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
    GRANULAR_PERMISSIONS.LEADS_BULK_DELETE,
    GRANULAR_PERMISSIONS.LEADS_ASSIGN,
    GRANULAR_PERMISSIONS.LEADS_DETAIL_ASSIGNMENT_TAB,
    GRANULAR_PERMISSIONS.LEADS_LOG_CALLS,
    GRANULAR_PERMISSIONS.LEADS_DELETE_CALL_LOGS,
    GRANULAR_PERMISSIONS.LEADS_CALL_LOG_APPROVE,
    GRANULAR_PERMISSIONS.LEADS_LINK_CUSTOMER,
    GRANULAR_PERMISSIONS.LEADS_CONVERT,
    GRANULAR_PERMISSIONS.LEADS_CONVERT_WON_TO_CUSTOMER,
    GRANULAR_PERMISSIONS.LEADS_MY_ASSIGNED_PAGE,
    GRANULAR_PERMISSIONS.LEADS_AGENT_QUICK_STATUS,
    GRANULAR_PERMISSIONS.LEADS_AGENT_QUICK_CALL,
    GRANULAR_PERMISSIONS.LEADS_AGENT_QUICK_FOLLOWUP,
    GRANULAR_PERMISSIONS.LEADS_DETAIL_WHATSAPP,
    GRANULAR_PERMISSIONS.LEADS_CAMPAIGN_ASSIGN,
  ],
  [PERMISSION_CATEGORIES.CAMPAIGNS]: [
    GRANULAR_PERMISSIONS.CAMPAIGNS_VIEW,
    GRANULAR_PERMISSIONS.CAMPAIGNS_MANAGE,
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
  MY_ASSIGNED_LEADS: "my-assigned-leads",
} as const;

// Legacy actions for backward compatibility (to be removed)
export const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  EXPORT: "export",
} as const;
