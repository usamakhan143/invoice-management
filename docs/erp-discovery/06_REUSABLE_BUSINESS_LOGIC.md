# 06 — Reusable Business Logic

Inventory of existing business logic, services, and utilities that AOS could reuse. All references verified against source code.

---

## Service Layer Overview

34 service modules under `services/`. Pattern: static class methods calling `db.collection()` directly.

| Service | Path | Domain |
|---------|------|--------|
| `InvoiceService` | `services/invoiceService.ts` | Invoice CRUD, counter, payment |
| `CustomerService` | `services/customerService.ts` | Customer CRUD, lead cleanup on delete |
| `ProductService` | `services/productService.ts` | Product catalog |
| `LeadService` | `services/leadService.ts` (~893 lines) | Lead CRUD, assignment, conversion |
| `LeadImportService` | `services/leadImportService.ts` (~895 lines) | CSV import pipeline |
| `OutreachService` | `services/outreachService.ts` | Outreach event timeline |
| `CampaignService` | `services/campaignService.ts` | Campaign + tag management |
| `BusinessService` | `services/businessService.ts` | Business entities under customers |
| `BankAccountService` | `services/bankAccountService.ts` | Bank account CRUD + balance |
| `BankDepositService` | `services/bankDepositService.ts` | Manual deposits |
| `BankReconciliationService` | `services/bankReconciliationService.ts` | Reconciliation snapshots |
| `ExpenseReturnService` | `services/expenseReturnService.ts` | Expense refunds |
| `VendorService` | `services/vendorService.ts` | Payee directory |
| `ExpenseCategoryService` | `services/expenseCategoryService.ts` | Category management + seed |
| `LoanService` | `services/loanService.ts` | Loan lifecycle + repayments |
| `BalanceIntegrityService` | `services/balanceIntegrityService.ts` | Financial balance verification |
| `ActivityLogger` | `services/activityLogger.ts` | Audit trail logging |
| `PermissionService` | `services/permissionService.ts` | Permission hydration |
| `RealTimePermissionService` | `services/realTimePermissionService.ts` | Live permission sync |
| `TokenService` | `services/tokenService.ts` | Session token management |
| `UserMonitoringService` | `services/userMonitoringService.ts` | Force logout on deactivation |
| `SubscriptionService` | `services/subscriptionService.ts` | Company subscriptions |
| `AdminAnalyticsService` | `services/adminAnalyticsService.ts` | Platform analytics |
| `DatabaseMigrationService` | `services/databaseMigrationService.ts` (~826 lines) | Backup export/import |
| `CompanyAppSettingsService` | `services/companyAppSettingsService.ts` | Company preferences |
| `AssigneeAssignmentLogService` | `services/assigneeAssignmentLogService.ts` | Assignment audit |
| `FirebaseHealth` | `services/firebaseHealth.ts` | Retry/caching wrapper |

---

## Authentication & Authorization

### Auth Flow
| Logic | Path | Reuse |
|-------|------|-------|
| Auth provider + profile hydration | `hooks/useAuth.tsx` | **Reuse directly** |
| Session token create/validate/revoke | `services/tokenService.ts` | **Reuse directly** |
| Permission hydration from roles | `services/permissionService.ts` | **Extend** with AOS keys |
| Real-time permission refresh | `services/realTimePermissionService.ts` | **Reuse directly** |
| Force logout on deactivation | `services/userMonitoringService.ts` | **Reuse directly** |
| Impersonation session flow | `pages/auth/ImpersonationPage.tsx` | **Reuse directly** |
| Screen PIN hash/verify | `utils/screenPin.ts` | **Reuse directly** |
| Company ID resolution | `services/companyId.ts` | **Reuse directly** |

### Permission Runtime
| Logic | Path | Reuse |
|-------|------|-------|
| Permission registry (100+ keys) | `config/permissions.ts` (~677 lines) | **Extend** |
| Permission check helpers | `hooks/usePermissions.tsx` (~695 lines) | **Extend** |
| Page access mapping | `usePermissions.hasPageAccess()` | **Extend** |
| Owner bypass | `usePermissions` line 15–17 | **Reuse directly** |
| ProtectedComponent HOC | `components/ProtectedComponent.tsx` | **Reuse directly** |

---

## CRM Business Logic

### Lead Management
| Logic | Path | Key functions |
|-------|------|---------------|
| Lead CRUD + queries | `services/leadService.ts` | `createLead`, `updateLead`, `deleteLead`, `getLeadsForCompany` |
| Lead assignment | `services/leadService.ts` | Assignment with `assignmentEvents` subcollection |
| Won → Customer conversion | `services/leadService.ts` | `convertWonLead()` — creates customer + business, updates lead |
| Lead search by phone | `utils/leadSearchPhone.ts` | Phone normalization for dedupe/search |
| Lead scoring fields | `utils/leadScoringFields.ts` | Scoring field definitions |
| Lead website validation | `utils/leadWebsite.ts` | URL normalization |
| Duplicate contact detection | Used in LeadsPage, LeadImportPage | Phone/email dedupe |

### Lead Import Pipeline
| Logic | Path | Key functions |
|-------|------|---------------|
| CSV field mapping | `services/leadImportService.ts` | `LEAD_IMPORT_FIELDS`, `autoGuessMapping()` |
| Row validation | `services/leadImportService.ts` | `validateRow()` |
| Dedupe logic | `services/leadImportService.ts` | `applyDedupe()`, `normalizePhoneForDedupe()` |
| Error report generation | `services/leadImportService.ts` | `buildErrorReportCsv()` |
| Batched commit | `services/leadImportService.ts` | Chunked Firestore writes |

### Outreach
| Logic | Path | Key functions |
|-------|------|---------------|
| Outreach event CRUD | `services/outreachService.ts` | Unified timeline (calls, emails, WhatsApp) |
| Call activity business day | `utils/myCallActivityBusinessDay.ts` | Workday boundary calculation |
| Assignment daily log | `services/assigneeAssignmentLogService.ts` | Daily audit for dashboards |

### Campaign Management
| Logic | Path | Key functions |
|-------|------|---------------|
| Campaign CRUD | `services/campaignService.ts` | Draft/active/archived lifecycle |
| Tag management | `services/campaignService.ts` | Per-campaign colored tags |

---

## Finance Business Logic

### Invoicing
| Logic | Path | Key functions |
|-------|------|---------------|
| Invoice CRUD | `services/invoiceService.ts` | Create, update, delete, list |
| Invoice counter | `services/invoiceService.ts` | Atomic increment on `companies` doc |
| Mark paid + bank impact | `services/invoiceService.ts` | Updates bankAccounts balance |
| PDF generation | `components/InvoicePDF.tsx` | React-PDF document builder |
| Auth verification code | `utils/invoiceAuthCode.ts` | Invoice authentication codes |
| Bank account filtering | `utils/bankAccountAccess.ts` | Role-based account picker filter |

### Expenses
| Logic | Path | Key functions |
|-------|------|---------------|
| Expense CRUD | Inline in `ExpensesPage.tsx` | Direct Firestore (no dedicated service) |
| Expense returns | `services/expenseReturnService.ts` | Refund recording, bank credit |
| Vendor management | `services/vendorService.ts` | Payee CRUD with subscription |
| Category seed | `services/expenseCategoryService.ts` | `DEFAULT_EXPENSE_CATEGORY_NAMES`, one-time init |
| Company vs personal scope | `utils/expenseCompanyScope.ts` | Scope resolution for dual userId/companyId |
| Multi-currency display | `utils/financeCurrencyDisplay.ts` | Currency formatting helpers |

### Banking
| Logic | Path | Key functions |
|-------|------|---------------|
| Bank account CRUD | `services/bankAccountService.ts` | Account management + balance tracking |
| Internal transfers | Inline in `BankAccountsPage.tsx` | Debit source, credit destination |
| Reconciliation | `services/bankReconciliationService.ts` | Snapshot with reason codes |
| Manual deposits | `services/bankDepositService.ts` | Owner contribution, cash, external |
| Balance integrity | `services/balanceIntegrityService.ts` | `computeExpectedBalance()`, `runBalanceIntegrityCheck()` |
| Bank account display | `utils/bankAccountDisplay.ts` | Formatting helpers |

### Loans
| Logic | Path | Key functions |
|-------|------|---------------|
| Loan lifecycle | `services/loanService.ts` | Create, repay, close, write-off |
| Repayment recording | `services/loanService.ts` | Credits bank account |

### Reporting
| Logic | Path | Key functions |
|-------|------|---------------|
| Multi-tab reports | Inline in `ReportsPage.tsx` | Client-side aggregation across 9 collections |
| CSV export | `utils/csvExport.ts`, `utils/csvStream.ts` | Streaming CSV generation |
| Exchange rates | `utils/exchangeRates.ts` | Multi-currency conversion for totals |

---

## Customer & Business Logic

| Logic | Path | Key functions |
|-------|------|---------------|
| Customer CRUD | `services/customerService.ts` | Create, update, delete with lead cleanup |
| Business CRUD | `services/businessService.ts` | Businesses under customers |
| Customer migration | `services/customerMigration.ts` | Legacy subcollection → central collection |
| Invoice migration | `services/invoiceMigration.ts` | Legacy subcollection → central collection |

---

## Activity & Audit

| Logic | Path | Key functions |
|-------|------|---------------|
| Activity logging | `services/activityLogger.ts` | `log()` — writes to `activities` with type, user, metadata |
| Activity types | Defined inline in logger + pages | 30+ activity type strings |

**Gap:** No centralized activity type registry. Types are string literals scattered across pages.

---

## Data Management

| Logic | Path | Key functions |
|-------|------|---------------|
| Backup export | `services/databaseMigrationService.ts` | 29 collections → JSON v5 |
| Backup import | `services/databaseMigrationService.ts` | Batched writes with validation |
| Backup history | `components/DataBackupManager.tsx` | `companies/{id}/backups` subcollection |
| Firestore backup utility | `utils/backupFirestore.ts` | Additional backup helpers |

---

## BOS Business Logic (Reusable Patterns)

BOS is the most architecturally mature module. Its patterns are reusable for AOS:

| Logic | Path | Pattern |
|-------|------|---------|
| Application services | `bos/application/*.ts` | Orchestration layer |
| Domain entities | `bos/domain/entities/*.ts` | Typed entity definitions |
| Domain rules | `bos/domain/rules/*.ts` | Validation rules |
| Repository contracts | `bos/contracts/*.ts` | Interface definitions |
| Firestore repos | `bos/infrastructure/firestore/repositories/*.ts` | Persistence implementations |
| ERP read ports | `bos/integration/ports/*.ts` | Read-only cross-module boundary |
| ERP read adapters | `bos/integration/adapters/*.ts` | Firestore implementations of ports |
| Sidecar law | `bos/constants/index.ts` | ERP collections are read-only from BOS |
| Milestone completion form | `bos/application/milestoneCompletionForm.ts` | Complex form validation + tests |
| Milestone situation engine | `bos/application/milestoneSituation.ts` | Situation computation from facts |
| Initiative business facts | `pages/app/bos/initiativeDetail/initiativeMilestoneEngine.ts` | ROI, investment, timeline |
| Format utilities | `utils/bosFormat.ts` | Date/money formatting shared with BOS UI |
| Milestone display | `utils/bosMilestoneDisplay.ts` | Status badge/label helpers |

---

## Utility Functions (Pure, No Side Effects)

| Utility | Path | Purpose |
|---------|------|---------|
| `localDayKey.ts` | `utils/` | Business day key generation |
| `emailValidation.ts` | `utils/` | Email format validation |
| `internationalPhone.ts` | `utils/` | Phone parsing/formatting (libphonenumber-js) |
| `screenPin.ts` | `utils/` | SHA-256 PIN hashing |
| `exchangeRates.ts` | `utils/` | Currency conversion rates |
| `csvExport.ts` | `utils/` | CSV string generation |
| `csvStream.ts` | `utils/` | Streaming CSV for large datasets |

---

## Reuse Classification for AOS

| Logic area | Classification | Rationale |
|------------|---------------|-----------|
| Auth + sessions | **Reuse directly** | Platform-level, mature |
| Permissions | **Extend** | Add AOS permission keys to existing registry |
| Company tenancy | **Reuse directly** | `companyId` model works for agencies |
| Customer/lead CRM | **Consume** | AOS reads, doesn't rebuild |
| Invoice generation | **Consume** | Billing stays in ERP |
| Expense tracking | **Consume** | Cost data stays in ERP |
| Bank/finance | **Consume** | Financial truth in ERP |
| Activity logging | **Extend** | Add AOS event types |
| CSV import/export | **Reuse directly** | Generic pipeline |
| BOS domain patterns | **Extend** | Application service + repository + port pattern |
| BOS sidecar law | **Reuse directly** | AOS should read ERP, not write it |
| Reports aggregation | **Observe** | Client-side pattern; may need server-side for AOS scale |
| Data backup | **Extend** | Include AOS collections |

---

## Logic NOT Available (Gaps)

| Capability | Status |
|------------|--------|
| Recurring invoices/subscriptions (client billing) | Not implemented |
| Project/task management | Not implemented |
| Time tracking | Not implemented |
| Document/file storage (cloud) | Not implemented |
| Email sending | Not implemented |
| Webhook/API integrations | Not implemented |
| Server-side business logic (Cloud Functions) | Not in repo |
| Workflow engine | Not implemented (BOS milestones are closest) |
| Notification system | Not implemented |
| Search engine (full-text) | Client-side filter only |

These gaps represent areas where AOS **must build new logic** rather than reuse existing ERP capabilities.
