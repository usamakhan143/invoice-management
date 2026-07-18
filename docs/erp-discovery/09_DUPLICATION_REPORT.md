# 09 — Duplication Report

Every area where future AOS development could accidentally rebuild functionality that already exists in the ERP. Based on code inspection — not assumptions.

---

## Critical Duplication Risks (High Impact)

### 1. Client / Customer Management

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| Customer CRUD with search, pagination, bulk delete | `CustomersPage.tsx`, `customerService.ts` | AOS "client management" module |
| Customer detail with businesses, invoices, leads | `CustomerDetailPage.tsx` (~1,049 lines) | AOS "client profile" page |
| Business entities under customers | `businessService.ts` | AOS "client accounts" |
| Lead → customer conversion | `leadService.convertWonLead()` | AOS "prospect conversion" |

**Risk:** AOS treats "clients" as a new entity when ERP `customers` + `businesses` already serve this role.

**Prevention:** AOS must consume `customers` and `businesses` collections. Agency-specific metadata should be a sidecar (like BOS attributions), not a new customer system.

---

### 2. Invoicing & Billing

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| Full invoice lifecycle | `invoiceService.ts`, `InvoicesListPage.tsx`, `InvoiceFormPage.tsx` | AOS "client billing" |
| PDF generation | `InvoicePDF.tsx` | AOS "invoice PDF" |
| Payment tracking | `PaymentTrackingModal.tsx` | AOS "payment recording" |
| Mark paid with bank impact | `invoiceService.ts` | AOS "payment reconciliation" |
| Product/service catalog | `productService.ts`, `ProductsPage.tsx` | AOS "service catalog" |
| Invoice counter | `companies.invoiceCounter` | AOS "invoice numbering" |

**Risk:** AOS builds a parallel billing system for agency clients.

**Prevention:** AOS links to ERP invoices via read ports. Agency-specific billing concepts (retainers, SOWs) extend via sidecar, not replacement.

---

### 3. Lead / Pipeline Management

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| Full CRM pipeline | `LeadsPage.tsx` (~2,588 lines) | AOS "sales pipeline" |
| Lead detail with outreach | `LeadDetailPage.tsx` (~2,128 lines) | AOS "prospect detail" |
| Agent workspace | `MyAssignedLeadsPage.tsx` (~1,820 lines) | AOS "team workspace" |
| CSV import wizard | `LeadImportPage.tsx`, `leadImportService.ts` | AOS "data import" |
| Outreach timeline | `outreachService.ts` | AOS "communication log" |
| Campaign tagging | `campaignService.ts` | AOS "campaign tracking" |
| Assignment + audit | `assigneeAssignmentLogService.ts` | AOS "work assignment" |

**Risk:** AOS rebuilds CRM when ERP leads module is comprehensive.

**Prevention:** AOS consumes lead/customer data. Agency-specific pipeline stages extend via metadata, not new collections.

---

### 4. Expense & Cost Tracking

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| Full expense module | `ExpensesPage.tsx` (~3,190 lines) | AOS "project expenses" |
| Vendor/payee directory | `vendorService.ts` | AOS "vendor management" |
| Expense categories | `expenseCategoryService.ts` | AOS "cost categories" |
| Expense returns/refunds | `expenseReturnService.ts` | AOS "expense adjustments" |
| Multi-currency totals | `exchangeRates.ts`, `financeCurrencyDisplay.ts` | AOS "cost reporting" |
| BOS expense attribution | `BosAttributionApplicationService.ts` | AOS "project cost linking" |

**Risk:** AOS creates project expense tracking when ERP expenses + BOS attributions already link costs to initiatives.

**Prevention:** Extend BOS attribution pattern for AOS project cost linking. Never duplicate expense CRUD.

---

### 5. Permissions & Access Control

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| 100+ granular permissions | `config/permissions.ts` (~677 lines) | AOS "permission system" |
| Permission runtime | `usePermissions.tsx` (~695 lines) | AOS "access control hook" |
| Custom roles UI | `RoleManagement.tsx` (~596 lines) | AOS "role management" |
| Real-time permission sync | `realTimePermissionService.ts` | AOS "permission refresh" |
| ProtectedComponent HOC | `ProtectedComponent.tsx` | AOS "access guard" |
| BOS permission keys (30+) | `bos/constants/permissionKeys.ts` | AOS "strategy permissions" |

**Risk:** AOS creates a third permission namespace alongside ERP and BOS.

**Prevention:** Add AOS keys to existing `config/permissions.ts` registry. Extend `usePermissions` helpers. Never create parallel permission system.

---

### 6. User & Team Management

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| User CRUD | `UserManagementPage.tsx` (~1,659 lines) | AOS "team management" |
| Session control | `tokenService.ts` | AOS "session management" |
| Login-as impersonation | Impersonation flow | AOS "admin access" |
| User activation/deactivation | `userMonitoringService.ts` | AOS "team status" |

**Risk:** AOS builds team management when ERP user management is complete.

**Prevention:** Reuse directly. AOS adds team-role metadata via sidecar if needed.

---

## Moderate Duplication Risks

### 7. Financial Reporting

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| 8-tab financial reports | `ReportsPage.tsx` (~1,055 lines) | AOS "financial dashboard" |
| Balance integrity check | `balanceIntegrityService.ts` | AOS "financial audit" |
| CSV export | `csvExport.ts` | AOS "report export" |
| Dashboard stat cards | `DashboardPage.tsx` (~1,513 lines) | AOS "KPI dashboard" |

**Risk:** AOS rebuilds financial reporting instead of extending ERP reports with agency-specific tabs.

---

### 8. Activity & Audit Logging

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| Activity logger | `activityLogger.ts` | AOS "event logging" |
| Personal activity page | `ActivityPage.tsx` | AOS "my activity" |
| Company activity page | `CompanyActivityPage.tsx` | AOS "team activity" |

**Risk:** AOS creates separate audit trail instead of extending ActivityLogger with AOS event types.

---

### 9. Bank & Cash Management

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| Bank accounts | `BankAccountsPage.tsx` (~2,361 lines) | AOS "agency accounts" |
| Transfers, deposits, reconciliation | Bank services | AOS "cash management" |
| Loan tracking | `LoansPage.tsx` (~1,461 lines) | AOS "advances tracking" |

**Risk:** AOS duplicates financial infrastructure.

**Prevention:** Financial truth stays in ERP. AOS reads via ports.

---

### 10. Data Import / Export

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| Lead CSV import (full wizard) | `leadImportService.ts` (~895 lines) | AOS "bulk import" |
| Report CSV export | `csvExport.ts`, `csvStream.ts` | AOS "data export" |
| Company backup/restore | `databaseMigrationService.ts` (~826 lines) | AOS "data backup" |

**Risk:** AOS rebuilds import/export pipelines.

**Prevention:** Reuse CSV utilities. Extend backup service for AOS collections.

---

### 11. Authentication

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| Full auth flow | `useAuth.tsx`, auth pages | AOS "login system" |
| Session tokens | `tokenService.ts` | AOS "session management" |
| Screen PIN | `screenPin.ts`, `ScreenLockContext.tsx` | AOS "security PIN" |

**Risk:** Low — auth is clearly platform-level. But AOS SSO needs would be new, not duplicate.

---

### 12. BOS Strategic Layer

| What exists | Where | Duplication risk |
|-------------|-------|-----------------|
| Initiative lifecycle | BOS application services | AOS "project lifecycle" |
| Milestone engine | BOS milestone services + UI | AOS "task/milestone tracking" |
| Decision timeline | `BosDecisionTimeline.tsx` | AOS "decision log" |
| Expense attribution | `BosAttributionApplicationService.ts` | AOS "cost attribution" |
| Investment summary / ROI | `initiativeMilestoneEngine.ts` | AOS "project ROI" |
| Business timeline | `BosInitiativeBusinessTimeline.tsx` | AOS "project history" |
| Template system | `BosMilestoneTemplateApplicationService.ts` | AOS "project templates" |

**Risk:** AOS rebuilds BOS instead of extending it. BOS initiatives may map directly to AOS projects/strategies.

**Prevention:** AOS should evolve from BOS, not replace it. Shared domain patterns, extended entities.

---

## Low Duplication Risks (But Watch)

| Area | Existing | Watch for |
|------|----------|-----------|
| Dashboard widgets | 5 dashboard components | AOS rebuilding stat cards |
| Modal patterns | BosModal, PaymentTrackingModal | AOS rebuilding dialog shells |
| Form field patterns | BOS_FIELD_CLASS, BosFormFieldLabel | AOS rebuilding form styling |
| Phone input | InternationalPhoneInput | AOS rebuilding phone validation |
| Tag pills | CampaignTagPill | AOS rebuilding tag UI |
| Searchable selects | SearchableListSelect | AOS rebuilding entity pickers |
| Performance metrics | PerformancePage + components | AOS rebuilding team metrics |

---

## Duplication Prevention Rules for AOS

1. **Before building any AOS feature, check this ERP inventory first**
2. **If ERP has it → consume via read port or direct service call**
3. **If BOS has it → extend BOS domain, don't fork**
4. **If ERP has partial → extend via sidecar, not replacement**
5. **Only build net-new when capability genuinely doesn't exist** (projects, tasks, time tracking, client portal, notifications)
6. **Never create parallel collections for entities ERP already owns** (customers, invoices, expenses, leads, users)
7. **Never create a third permission namespace** — extend existing registry
8. **Never duplicate formatting utilities** — use `bosFormat.ts`, `exchangeRates.ts`, etc.

---

## Entity Ownership Map

| Entity | Owner | AOS relationship |
|--------|-------|-----------------|
| users, companyUsers | ERP | Consume |
| customers, businesses | ERP | Consume |
| leads, outreachEvents | ERP | Consume |
| invoices, products | ERP | Consume |
| expenses, vendors, categories | ERP | Consume |
| bankAccounts, loans, transfers | ERP | Consume |
| campaigns, campaignTags | ERP | Consume |
| activities | ERP | Extend (add AOS types) |
| customRoles, permissions | ERP | Extend (add AOS keys) |
| bosVentures, bosInitiatives | BOS | Extend → AOS |
| bosMilestones, bosDecisions | BOS | Extend → AOS |
| bosAttributions | BOS | Extend → AOS |
| **AOS projects** | **AOS (new)** | Build |
| **AOS tasks** | **AOS (new)** | Build |
| **AOS time entries** | **AOS (new)** | Build |
| **AOS client portal** | **AOS (new)** | Build |
