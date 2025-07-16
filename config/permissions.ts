import type { UserRole, Permission } from "../types";

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
} as const;

export const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
  EXPORT: "export",
} as const;

// Default role permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    {
      page: PAGES.DASHBOARD,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.INVOICES,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.CUSTOMERS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.PRODUCTS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.BANK_ACCOUNTS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.BANK_ACCOUNTS_VIEW,
      actions: {
        view: true,
      },
    },
    {
      page: PAGES.EXPENSES,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.USER_MANAGEMENT,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.REPORTS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
  ],

  admin: [
    {
      page: PAGES.DASHBOARD,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.INVOICES,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.CUSTOMERS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.PRODUCTS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      },
    },
    {
      page: PAGES.BANK_ACCOUNTS,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: true,
      },
    },
    {
      page: PAGES.BANK_ACCOUNTS_VIEW,
      actions: {
        view: true,
      },
    },
    {
      page: PAGES.EXPENSES,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: true,
      },
    },
    {
      page: PAGES.USER_MANAGEMENT,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.REPORTS,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: true,
      },
    },
  ],

  manager: [
    {
      page: PAGES.DASHBOARD,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: true,
      },
    },
    {
      page: PAGES.INVOICES,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: true,
      },
    },
    {
      page: PAGES.CUSTOMERS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: true,
      },
    },
    {
      page: PAGES.PRODUCTS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: true,
      },
    },
    {
      page: PAGES.BANK_ACCOUNTS,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.BANK_ACCOUNTS_VIEW,
      actions: {
        view: true,
      },
    },
    {
      page: PAGES.EXPENSES,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: true,
      },
    },
    {
      page: PAGES.REPORTS,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: true,
      },
    },
  ],

  editor: [
    {
      page: PAGES.DASHBOARD,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.INVOICES,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.CUSTOMERS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.PRODUCTS,
      actions: {
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.BANK_ACCOUNTS_VIEW,
      actions: {
        view: false,
      },
    },
    {
      page: PAGES.EXPENSES,
      actions: {
        view: true,
        create: true,
        edit: false,
        delete: false,
        export: false,
      },
    },
  ],

  viewer: [
    {
      page: PAGES.DASHBOARD,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.INVOICES,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.CUSTOMERS,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.PRODUCTS,
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: false,
      },
    },
    {
      page: PAGES.BANK_ACCOUNTS_VIEW,
      actions: {
        view: false,
      },
    },
  ],
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner:
    "Full access to all features and settings. Can manage company and all users.",
  admin:
    "Manage invoices, customers, products, and users. Limited bank account access.",
  manager:
    "Manage invoices, customers, and products. View reports and expenses.",
  editor:
    "Create and edit invoices, customers, and products. No delete permissions.",
  viewer:
    "View-only access to main business data. Cannot create or modify anything.",
};
