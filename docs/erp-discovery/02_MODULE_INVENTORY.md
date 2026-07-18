# 02 — Module Inventory

Every module identified from routed pages, sidebar navigation, services, and Firestore usage. Evidence cites actual file paths.

---

## Navigation Map

**Sidebar source:** `components/Sidebar.tsx`  
**BOS nav source:** `bos/config/navigation.ts`  
**Page access mapping:** `hooks/usePermissions.tsx` (lines ~394–436)

### Main Sidebar Items

| Label | Route | Page key |
|-------|-------|----------|
| Dashboard | `/` | `dashboard` |
| Invoices | `/invoices` | `invoices` |
| Customers | `/customers` | `customers` |
| My workspace | `/leads/my-assigned` | `my-assigned-leads` |
| Performance | `/performance` | `performance` |
| Campaigns | `/campaigns` | `campaigns` |
| Products | `/products` | `products` |
| My Activity | `/activity` | `dashboard` |
| Company Activity | `/company-activity` | admin-only |
| User Management | `/users` | `user-management` |
| Data Management | `/data-management` | admin-only |
| Super Admin | `/super-admin` | super-admin-only |

### Nested Groups

**Leads** (inserted after Customers): All leads, Assigned leads hub, Import  
**Finance:** Bank Accounts, Expenses, Loans, Reports  
**Strategy (BOS):** Initiatives, Ventures

### Hidden Routes (not in main nav)

| Route | Access |
|-------|--------|
| `/profile` | Sidebar profile icon |
| `/invoices/new`, `/invoices/edit/:id` | From invoice list |
| `/customers/:id` | From customer list |
| `/leads/:id` | From leads |
| `/bos/initiatives/:initiativeId` | From initiatives list |
| `/bos/milestone-templates` | Routed but not in BOS nav |
| `/bos/decisions`, `/bos/attributions`, `/bos/reports` | Defined in BOS config, **not registered in App.tsx** |
| `/login`, `/signup`, `/auto-login`, `/impersonate` | Auth flows |

---

## Module Catalog

### 1. Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Company KPI hub — revenue, expenses, customers, bank balances, recent invoices, lead analytics, call activity |
| **Screens** | `pages/app/DashboardPage.tsx` (~1,513 lines) |
| **Services** | `invoiceService`, `customerService`, `bankAccountService`, `leadService`, `firebase` |
| **Components** | `InvoiceVerificationSection`, `DashboardCallActivityMonitor`, `DashboardCard` |
| **Permissions** | Granular per widget: `dashboard_view_*`, `dashboard_access_invoice_verification`, lead-gen analytics keys |
| **Firestore** | `invoices`, `customers`, `bankAccounts`, `expenses`, `expenseReturns`, `loans`, `leads`, `users`, `companyUsers` |
| **Capabilities** | Multi-currency stat cards, bank balance auto-hide, assigned leads summary, invoice auth verification, screen PIN gate |
| **Limitations** | Monolithic page; direct Firestore queries mixed with service calls |
| **Future AOS role** | Observe KPI patterns; potentially extend with agency-level dashboards |

---

### 2. Invoices

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Invoice lifecycle — create, edit, PDF, payment tracking, status workflow, mark paid |
| **Screens** | `InvoicesListPage.tsx` (~852 lines), `InvoiceFormPage.tsx` (~1,182 lines) |
| **Services** | `invoiceService`, `customerService`, `bankAccountService`, `productService`, `activityLogger` |
| **Permissions** | `invoices_view/create/edit/delete/bulk_delete/view_pdf/payment_tracking/view_status/mark_paid` |
| **Firestore** | `invoices`, `bankAccounts`, `companies` (counter), `products` |
| **Capabilities** | Real-time list, PDF download, payment tracking modal, bulk delete, create from lead, bank balance impact on paid |
| **Limitations** | No recurring invoices; no multi-entity billing |
| **Future AOS role** | **Consume directly** — client billing is core ERP |

---

### 3. Customers

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Customer directory with detail profile, businesses, linked leads, invoices |
| **Screens** | `CustomersPage.tsx`, `CustomerDetailPage.tsx` (~1,049 lines) |
| **Services** | `customerService`, `businessService`, `invoiceService`, `leadService`, `activityLogger` |
| **Permissions** | `customers_view/create/edit/delete/bulk_delete` + detail sub-perms |
| **Firestore** | `customers`, `businesses`, `invoices`, `leads`, `activities` |
| **Capabilities** | Pagination, search, businesses under customer, CRM lead links, audit log |
| **Limitations** | No formal "account" hierarchy beyond businesses |
| **Future AOS role** | **Consume directly** — client records are ERP-owned |

---

### 4. Leads (CRM)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Full lead pipeline — creation, assignment, outreach, conversion, import |
| **Screens** | `LeadsPage.tsx` (~2,588), `LeadDetailPage.tsx` (~2,128), `LeadImportPage.tsx` (~1,397), `MyAssignedLeadsPage.tsx` (~1,820), `AssignedLeadsHubPage.tsx` (~942) |
| **Services** | `leadService`, `leadImportService`, `outreachService`, `campaignService`, `customerService`, `businessService`, `assigneeAssignmentLogService` |
| **Permissions** | 20+ keys: view, create, import, assign, convert, call logging, campaign assign, etc. |
| **Firestore** | `leads`, `leads/{id}/callLogs`, `leads/{id}/assignmentEvents`, `outreachEvents`, `campaigns`, `campaignTags`, `customers`, `businesses`, `assigneeAssignmentLog` |
| **Capabilities** | Pipeline statuses (New→Won/Lost), duplicate detection, international phone, outreach timeline, Won→customer conversion, CSV import wizard, agent workspace |
| **Limitations** | Legacy callLogs subcollection coexists with outreachEvents; very large page files |
| **Future AOS role** | **Consume for sales pipeline**; AOS should not rebuild lead management |

---

### 5. Campaigns

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Marketing campaign registry with tags for lead attribution |
| **Screens** | `CampaignsPage.tsx` |
| **Services** | `campaignService`, `activityLogger` |
| **Permissions** | `campaigns_view`, `campaigns_manage` |
| **Firestore** | `campaigns`, `campaignTags` |
| **Capabilities** | Campaign CRUD (draft/active/archived), per-campaign tags with colors |
| **Limitations** | No campaign performance analytics beyond lead tagging |
| **Future AOS role** | **Observe** — BOS explicitly forbids initiative = campaign |

---

### 6. Performance

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Sales performance — assignment reports, agent performance, call activity |
| **Screens** | `PerformancePage.tsx` + dashboard components |
| **Services** | `leadService`, `firebase` |
| **Permissions** | `performance_hub_access`, `my_call_activity_view`, assignment report perms |
| **Firestore** | `leads`, `outreachEvents`, `users`, `companyUsers` |
| **Capabilities** | Self vs team tabs, business-day call metrics, agent performance |
| **Limitations** | Tied to call-activity workday config; not general KPI platform |
| **Future AOS role** | **Extend** for agency team performance overlays |

---

### 7. Products

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Product/service catalog for invoice line items |
| **Screens** | `ProductsPage.tsx` |
| **Services** | `productService`, `activityLogger` |
| **Permissions** | Access if create/edit/delete or `products_use_company_catalog` (no standalone view perm) |
| **Firestore** | `products` |
| **Capabilities** | Personal vs company catalog, bulk delete |
| **Limitations** | No inventory tracking; no service packages |
| **Future AOS role** | **Consume** for billing line items |

---

### 8. Bank Accounts (Finance)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Cash management — accounts, transfers, reconciliations, deposits |
| **Screens** | `BankAccountsPage.tsx` (~2,361 lines) |
| **Services** | `bankAccountService`, `bankReconciliationService`, `bankDepositService`, `expenseCategoryService` |
| **Permissions** | `bank_accounts_*`, `bank_reconciliation_*`, `bank_deposit_*` |
| **Firestore** | `bankAccounts`, `bankTransfers`, `bankReconciliations`, `bankDeposits` |
| **Capabilities** | Multi-currency (USD/PKR/EUR), inter-account transfers, reconciliation, manual deposits |
| **Limitations** | No bank feed integration; manual reconciliation only |
| **Future AOS role** | **Consume directly** — financial truth source |

---

### 9. Expenses (Finance)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Expense tracking with payees, categories, returns, bank debits |
| **Screens** | `ExpensesPage.tsx` (~3,190 lines — largest file in repo) |
| **Services** | `expenseReturnService`, `vendorService`, `expenseCategoryService`, `bankAccountService` |
| **Permissions** | `expenses_view/company_manage/create/edit/delete`, payees, categories, returns |
| **Firestore** | `expenses`, `expenseReturns`, `vendors`, `expenseCategories`, `bankAccounts` |
| **Capabilities** | Tabs (Expenses/Payees/Categories), expected-return flag, multi-currency USD totals, company vs personal scope |
| **Limitations** | Monolithic page; BOS already reads expenses via sidecar |
| **Future AOS role** | **Consume directly** — cost attribution source for BOS/AOS |

---

### 10. Loans (Finance)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Loans/advances — disbursement, repayments, status tracking |
| **Screens** | `LoansPage.tsx` (~1,461 lines) |
| **Services** | `loanService`, `bankAccountService` |
| **Permissions** | `loans_view/company_manage/create/edit/delete/receive_repayment` |
| **Firestore** | `loans`, `loanRepayments`, `bankAccounts` |
| **Capabilities** | Statuses (outstanding/partially_repaid/closed/written_off), repayment history |
| **Limitations** | BOS has loan attribution type defined but not wired |
| **Future AOS role** | **Consume** for financial attribution |

---

### 11. Reports (Finance)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Financial reporting, CSV export, balance integrity |
| **Screens** | `ReportsPage.tsx` (~1,055 lines) |
| **Services** | `balanceIntegrityService`, direct Firestore reads |
| **Permissions** | `reports_view`, `reports_export` |
| **Firestore** | 9 collections: expenses, returns, loans, repayments, deposits, reconciliations, transfers, bankAccounts, invoices |
| **Capabilities** | 8 report tabs, date presets, balance integrity check |
| **Limitations** | No BOS enrichment (port exists but unused); client-side aggregation |
| **Future AOS role** | **Extend** with agency/strategic overlays |

---

### 12. BOS (Business Operating System)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Strategic execution — ventures, initiatives, milestones, decisions, expense attributions |
| **Screens** | `BosVenturesPage`, `BosInitiativesPage`, `BosInitiativeDetailPage` (~1,151), `BosMilestoneTemplatesPage` + `initiativeDetail/*` components |
| **Services** | 6 application services under `bos/application/` |
| **Repositories** | 6 Firestore repos under `bos/infrastructure/firestore/repositories/` |
| **Permissions** | 12 wired keys: ventures/initiatives/decisions/attributions/milestones/templates view+manage |
| **Firestore** | `bosVentures`, `bosInitiatives`, `bosDecisions`, `bosAttributions`, `bosMilestones`, `bosMilestoneTemplates` |
| **ERP reads** | Expenses (full), invoices (partial ROI), leads/reports (ports only) |
| **Capabilities** | Initiative lifecycle, milestone engine, decision timeline, expense attribution, investment summary |
| **Limitations** | Feature flags defined but not enforced; future routes not wired; KPI repos undefined |
| **Future AOS role** | **Extend** — precursor to AOS strategic layer |

---

### 13. Authentication

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Login, signup, auto-login, impersonation |
| **Screens** | `LoginPage`, `SignUpPage`, `AutoLoginPage`, `ImpersonationPage` |
| **Services** | `firebase`, `tokenService`, `permissionService`, `userMonitoringService` |
| **Firestore** | `users`, `companyUsers`, `userTokens`, `oneTimeLoginTokens`, `impersonationSessions` |
| **Capabilities** | Email/password, owner self-signup, session tokens, login-as, one-time magic link |
| **Limitations** | `oneTimeLoginTokens` has no Firestore security rules (default deny) |
| **Future AOS role** | **Reuse directly** — auth is platform-level |

---

### 14. User Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Team admin — create users, roles, activate/deactivate, login-as, sessions |
| **Screens** | `UserManagementPage.tsx` (~1,659 lines) |
| **Services** | `tokenService`, `permissionService`, `realTimePermissionService`, `userMonitoringService` |
| **Permissions** | `user_management_view/create/edit/activate_deactivate/login_as/sessions_control/bulk_delete` |
| **Firestore** | `users`, `companyUsers`, `customRoles`, `userTokens`, `impersonationSessions` |
| **Capabilities** | Active/deactivated tabs, create with temp password, session revoke, real-time permission sync |
| **Limitations** | No SSO; no team hierarchy beyond owner/admin/member |
| **Future AOS role** | **Reuse directly** — team management is platform-level |

---

### 15. Roles (Custom Roles)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Granular permission templates — embedded in User Management |
| **Screens** | `components/RoleManagement.tsx` (tab in UserManagementPage) |
| **Services** | `permissionService`, `realTimePermissionService` |
| **Permissions** | `custom_roles_view/create/edit/delete` |
| **Firestore** | `customRoles` |
| **Capabilities** | Permission groups by category (dashboard, invoices, leads, BOS, etc.) |
| **Limitations** | Two BOS permission registries (ERP config vs BOS canonical keys) |
| **Future AOS role** | **Extend** with AOS permission keys |

---

### 16. Profile / Settings

| Attribute | Detail |
|-----------|--------|
| **Purpose** | User profile, password, screen PIN, sessions, company workday settings |
| **Screens** | `ProfilePage.tsx` (~970 lines) |
| **Services** | `companyAppSettingsService`, `tokenService` |
| **Firestore** | `users`, `companyAppSettings`, `userTokens` |
| **Capabilities** | 4-digit screen PIN, company workday config for call metrics, session management |
| **Limitations** | No company branding settings beyond profile |
| **Future AOS role** | **Extend** with agency preferences |

---

### 17. Activity (My Activity)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Personal audit trail |
| **Screens** | `ActivityPage.tsx` |
| **Services** | `activityLogger` |
| **Firestore** | `activities` |
| **Capabilities** | Filter by type/date, real-time listener, 100-entry limit |
| **Future AOS role** | **Consume** for audit patterns |

---

### 18. Company Activity

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Company-wide audit log for admins |
| **Screens** | `CompanyActivityPage.tsx` |
| **Services** | `activityLogger` |
| **Permissions** | `company_activity_view`, `company_activity_bulk_delete` |
| **Firestore** | `activities`, `users`, `companyUsers` |
| **Capabilities** | Filter by user/type/date, bulk delete |
| **Future AOS role** | **Extend** with AOS event types |

---

### 19. Data Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Company backup export/import for disaster recovery |
| **Screens** | `DataManagementPage.tsx`, `DataBackupManager.tsx` (~575 lines) |
| **Services** | `databaseMigrationService` |
| **Permissions** | `data_backup_export/import/view_history` |
| **Firestore** | 29 collections on export; `companies/{id}/backups` for history |
| **Capabilities** | Format v5 JSON backup, batched import, record counts |
| **Limitations** | BOS collections **not included** in backup flow |
| **Future AOS role** | **Extend** to include AOS/BOS data |

---

### 20. Super Admin (Platform)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Cross-company platform operator console |
| **Screens** | `SuperAdminDashboard.tsx` |
| **Services** | `adminAnalyticsService`, `subscriptionService`, `databaseMigrationService` |
| **Access** | Owner + company name includes "it veins" |
| **Firestore** | `companies`, `users`, `invoices`, `subscriptions`, `subscriptionPlans`, `activity` |
| **Capabilities** | Platform overview, company analytics, subscription plans, billing |
| **Limitations** | Hardcoded company name gate; `subscriptionPlans` lacks security rules |
| **Future AOS role** | **Observe** — platform ops, not agency ops |

---

## Cross-Module Infrastructure

| Component | Path | Role |
|-----------|------|------|
| Firebase core | `services/firebase.ts` | Auth, Firestore, offline |
| Permissions | `hooks/usePermissions.tsx` (~695 lines) | All granular checks |
| Auth | `hooks/useAuth.tsx` | Profile, impersonation |
| Activity logging | `services/activityLogger.ts` | Mutation audit trail |
| Company scope | `services/companyId.ts` | Owner UID vs companyId |
| Layout | `layouts/AppLayout.tsx`, `components/Sidebar.tsx` | Shell + navigation |
| Screen lock | `contexts/ScreenLockContext.tsx` | PIN lock |

---

## Permission System Notes

1. Owner bypass: `isOwner === true` → all permissions
2. No legacy role names — only `customRoles` + `granularPermissions[]`
3. Admin heuristic: `isOwner || canViewCompanyActivity()`
4. Products page quirk: no `products_view` — requires create/edit/delete or catalog perm
5. BOS dual namespace: ERP keys in `config/permissions.ts`; extended keys in `bos/constants/permissionKeys.ts`
