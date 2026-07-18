# 10 — Technical Debt

Architecture inconsistencies, code smells, and risks identified from source code inspection. These could become blockers for AOS if not addressed.

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| 🔴 Critical | Could block AOS or cause data/security issues |
| 🟠 High | Will slow AOS development significantly |
| 🟡 Medium | Should address during AOS Phase 0 |
| 🟢 Low | Track but not blocking |

---

## Architecture Inconsistencies

### 🔴 Dual Data-Access Patterns

**Issue:** ERP modules use service classes, but 5+ large pages bypass services and call `db.collection()` directly.

| Page | Lines | Direct Firestore calls |
|------|-------|----------------------|
| `ExpensesPage.tsx` | ~3,190 | expenses, vendors, categories, bankAccounts |
| `BankAccountsPage.tsx` | ~2,361 | bankAccounts, transfers, expenses |
| `ReportsPage.tsx` | ~1,055 | 9 collections via dynamic `byCompany()` |
| `DashboardPage.tsx` | ~1,513 | loans, expenses, users, companyUsers |
| `UserManagementPage.tsx` | ~1,659 | users, companyUsers, customRoles |

**Impact on AOS:** Cannot cleanly consume business logic from these pages — logic is embedded in UI components.

**Evidence:** Subagent Firestore analysis confirmed service bypass pattern.

---

### 🔴 BOS Architecture Not Followed by ERP

**Issue:** BOS uses domain-driven design (entities → application services → repositories → ports). ERP uses monolithic pages with inline Firestore calls.

**Impact on AOS:** Two architectural styles coexist. AOS must choose one (BOS pattern recommended) but ERP modules won't conform without refactoring.

---

### 🟠 BOS UI Bypasses Application Layer

**Issue:** `initiativeMilestoneEngine.ts` (in UI folder) directly imports `firestoreErpInvoiceReadAdapter`, skipping application services.

**File:** `pages/app/bos/initiativeDetail/initiativeMilestoneEngine.ts`

**Impact:** Breaks the intended layering. AOS must enforce layer boundaries from day one.

---

### 🟠 Feature Flags Defined But Never Enforced

**Issue:** `bos/config/featureFlags.ts` defines 10+ flags with defaults mostly `false`. Function `isBosFeatureEnabled()` exists but has **zero callers** in pages or services.

**Impact:** BOS integration runs unconditionally. AOS cannot rely on feature flags for gradual rollout without fixing this pattern first.

---

## Large Files (Maintainability Risk)

| File | Lines | Concern |
|------|-------|---------|
| `ExpensesPage.tsx` | ~3,190 | UI + business logic + Firestore + state |
| `LeadsPage.tsx` | ~2,588 | Same |
| `BankAccountsPage.tsx` | ~2,361 | Same |
| `LeadDetailPage.tsx` | ~2,128 | Same |
| `MyAssignedLeadsPage.tsx` | ~1,820 | Same |
| `UserManagementPage.tsx` | ~1,659 | Same |
| `DashboardPage.tsx` | ~1,513 | Same |
| `LoansPage.tsx` | ~1,461 | Same |
| `LeadImportPage.tsx` | ~1,397 | Same |
| `InvoiceFormPage.tsx` | ~1,182 | Same |
| `BosInitiativeDetailPage.tsx` | ~1,151 | Better structured but still large |
| `AgentWorkspaceModals.tsx` | ~1,096 | Modal mega-component |
| `config/permissions.ts` | ~677 | Large but acceptable for registry |
| `hooks/usePermissions.tsx` | ~695 | Large but acceptable for runtime |
| `leadImportService.ts` | ~895 | Acceptable — pure service |
| `leadService.ts` | ~893 | Acceptable — pure service |

**Pattern:** Pages over 1,000 lines contain mixed concerns. No page uses extraction into hooks or sub-components consistently.

---

## Code Smells

### 🟠 No Shared DataTable Component

**Issue:** Every list page builds its own table with similar but duplicated patterns (sort, filter, bulk select, pagination, row actions).

**Impact:** AOS will either duplicate table code again or must extract a shared component first.

---

### 🟠 Activity Type Strings Not Centralized

**Issue:** Activity types are string literals scattered across 20+ files. No enum or registry.

**File:** `services/activityLogger.ts` accepts any string type.

**Impact:** AOS event types will add to the sprawl unless centralized first.

---

### 🟡 Legacy Dual-Scope on Finance Collections

**Issue:** `expenses`, `loans`, `bankAccounts` support both `userId` (personal) and `companyId` (company) scopes with complex rule helpers (`expenseDataReadOk`, `loanDataReadOk`).

**Impact:** AOS project expenses need clear scope rules. Current dual-scope adds complexity.

---

### 🟡 Legacy Call Logs vs Outreach Events

**Issue:** Two call logging systems coexist:
- Legacy: `leads/{id}/callLogs` subcollection
- Current: `outreachEvents` top-level collection

**Evidence:** `MyAssignedLeadsPage.tsx` has legacy fallback reads.

**Impact:** AOS communication features must use `outreachEvents` only.

---

### 🟡 Legacy Activity Collection

**Issue:** Two activity collections: `activities` (primary) and `activity` (legacy). Admin analytics reads legacy `activity`.

**Impact:** Minor — AOS should write to `activities` only.

---

### 🟡 Legacy User Subcollections

**Issue:** Pre-centralization paths still referenced:
- `users/{uid}/customers`
- `users/{uid}/invoices`
- `users/{uid}/products`

**Files:** `customerMigration.ts`, `invoiceMigration.ts`, `productService.ts`

**Impact:** Migration services only — not active runtime. Safe to ignore for AOS.

---

## Security Debt

### 🔴 Missing Firestore Rules

| Collection | Used by | Rules |
|------------|---------|-------|
| `subscriptionPlans` | SuperAdmin, subscriptionService | **None (default deny)** |
| `oneTimeLoginTokens` | AutoLoginPage | **None (default deny)** |

**Impact:** These features may only work via admin SDK or deployed rules differ from repo. AOS must not repeat this pattern.

---

### 🟠 Permissions Enforced in App Only

**Issue:** Firestore rules allow any company member to read/write most collections. Granular permissions (`expenses_company_manage`, `invoices_delete`, etc.) are checked only in React code.

**Impact:** Direct Firestore API access bypasses permissions. Acceptable for current SPA-only model but risky if AOS adds API endpoints.

---

### 🟡 Impersonation Sessions Are Public

**Issue:** `impersonationSessions` collection has public read/update rules (by design for token-based flow).

**Impact:** Acceptable for current design but AOS must understand this security model.

---

## Dead Code

| Item | Path | Evidence |
|------|------|----------|
| `FirestoreWrapper` | `services/firestoreWrapper.ts` | Zero imports found |
| BOS feature flag checks | `bos/config/featureFlags.ts` | `isBosFeatureEnabled()` never called |
| BOS KPI repository | `bos/contracts/BosKpiRepository.ts` | Interface only, no implementation |
| BOS future routes | `bos/config/routes.ts` | 5 routes defined, not in App.tsx |
| 30+ unwired BOS permissions | `bos/constants/permissionKeys.ts` | Not in RoleManagement UI |
| Legacy `Permission` interface | `types.ts` | Comment says "backward compatibility during migration" |
| `dashboard_view_my_call_activity` | `config/permissions.ts` | Marked `@deprecated` |

---

## Hardcoded Values

| Value | Location | Concern |
|-------|----------|---------|
| Super admin company name gate | `Sidebar.tsx`, `SuperAdminDashboard.tsx` | `'it veins'` string match |
| Default expense categories | `expenseCategoryService.ts` | Hardcoded seed list |
| Lead pipeline statuses | `LeadsPage.tsx` | Hardcoded enum |
| Currency list (USD/PKR/EUR) | Multiple pages | Not configurable |
| Activity log limit (100) | `ActivityPage.tsx` | Hardcoded cap |
| Impersonation timeout (10 min) | Impersonation flow | Hardcoded |
| Backup format version (5) | `databaseMigrationService.ts` | Hardcoded |
| BOS default deny | `bos/config/permissions.ts` | `BOS_DEFAULT_DENY = true` |

---

## Weak Abstractions

### 🟠 No Server-Side Logic

**Issue:** Zero Cloud Functions. All business logic runs client-side.

**Impact:** AOS features requiring background processing (notifications, scheduled tasks, webhooks, heavy aggregation) have no infrastructure.

---

### 🟠 Client-Side Report Aggregation

**Issue:** `ReportsPage.tsx` reads entire collections and aggregates in browser.

**Impact:** Will not scale for agencies with large data volumes. AOS reporting needs different approach.

---

### 🟡 No Cloud File Storage

**Issue:** Firebase Storage not used. BOS milestone evidence upload is client-side only.

**Impact:** AOS document management requires new infrastructure.

---

### 🟡 No Notification System

**Issue:** No in-app notifications, email sending, or push notifications.

**Impact:** AOS workflow features (task assignments, deadline reminders) need new infrastructure.

---

### 🟡 No Full-Text Search

**Issue:** All search is client-side string matching on loaded data.

**Impact:** AOS with large datasets needs Firestore composite queries or external search.

---

## BOS-Specific Debt

| Issue | Severity | Detail |
|-------|----------|--------|
| BOS not in backup flow | 🔴 | `databaseMigrationService.ts` excludes all bos* collections |
| Dual permission registries | 🟠 | ERP `config/permissions.ts` vs BOS `bos/constants/permissionKeys.ts` |
| Invoice adapter bypass | 🟠 | UI calls adapter directly, not via application service |
| KPI domain without persistence | 🟡 | Entity defined, no repository |
| Phase routes not wired | 🟡 | 5 BOS routes defined but not in App.tsx |
| `undefined` Firestore fields | 🟡 | Fixed in milestone repo (`omitUndefinedFields`) — pattern not applied everywhere |

---

## Testing Debt

| Area | Coverage | Evidence |
|------|----------|----------|
| BOS domain/application | Good | `vitest` tests in `bos/` (~16+ completion tests) |
| BOS Firestore repos | Integration tests | `bosRepositories.integration.test.ts` (emulator) |
| ERP services | **None** | No test files for `services/*.ts` |
| ERP pages | **None** | No component tests |
| ERP utils | **None** | No test files for `utils/*.ts` |
| Permissions | **None** | No tests for permission logic |
| Auth flow | **None** | No tests |

**Impact:** AOS development on top of untested ERP code carries regression risk.

---

## Dependency Observations

| Observation | Detail |
|-------------|--------|
| Firebase compat SDK | Full compat bundle loaded; not tree-shaken modular v9 |
| No state management library | Context + hooks only; may limit AOS complex state |
| No charting library | All metrics are text/tables |
| No form library | All forms are manual useState + validation |
| No UI component library | Custom Tailwind components only |
| React 19 | Latest; good for AOS start |
| No SSR/SSG | Pure SPA; client portal would need separate approach |

---

## Recommended Pre-AOS Actions (Documentation Only — Not Implementation)

These are observations for the AOS architecture phase, not refactoring tasks:

1. **Establish layer enforcement** — AOS must follow BOS pattern strictly; document layer rules
2. **Centralize permission registry** — Single file for ERP + BOS + AOS keys
3. **Extract shared DataTable** — Before AOS builds more list pages
4. **Wire or remove feature flags** — Don't carry dead flag pattern into AOS
5. **Include BOS/AOS in backup flow** — Before production AOS data exists
6. **Centralize activity types** — Enum/registry before AOS adds more
7. **Add Firestore rules** for unprotected collections
8. **Plan server-side strategy** — Cloud Functions or similar for AOS background needs
