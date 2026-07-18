# 04 — Firestore Analysis

Complete catalog of Firestore collections, security patterns, indexes, and reuse potential. Based on `firestore.rules`, `firestore.indexes.json`, and all service/repository files.

---

## Configuration

| File | Purpose |
|------|---------|
| `firebase.json` | Firestore DB `(default)`, location `nam5`, emulator port 8080 |
| `firestore.rules` | 672 lines, rules v2, default deny |
| `firestore.indexes.json` | 28 composite indexes |
| `services/firebase.ts` | Client SDK init (compat) |
| `bos/infrastructure/firestore/collections.ts` | BOS collection name constants |

**No Cloud Functions** in this repo — all access is client-side.

---

## Security Rules Patterns

### Helper Functions

| Helper | Purpose |
|--------|---------|
| `isAuthenticated()` | `request.auth != null` |
| `currentUserCompanyId()` | Reads `users/{auth.uid}.companyId` |
| `isAdmin()` | `isOwner` or `role == 'admin'` |
| `canAccessCompanyData(companyId)` | Owner UID match OR same company OR admin |
| `userGranularPermissions()` | Array from user doc |
| `expenseDataReadOk(data)` | Dual userId + companyId read logic |
| `loanDataReadOk(data)` | Dual userId + companyId read logic |
| `bosCompanyReadOk(data)` / `bosCompanyWriteOk(data)` | BOS tenancy + audit fields |

### Cross-Cutting Themes

1. **Company tenancy** — most data gated by `canAccessCompanyData`
2. **App-layer permissions** — rules allow company members; app checks granular keys
3. **Append-only ledgers** — bankTransfers, bankReconciliations, bankDeposits, loanRepayments, expenseReturns, assigneeAssignmentLog
4. **BOS immutability** — no delete on ventures/initiatives/decisions/attributions/templates; milestones deletable only when `status == 'planned'`
5. **Default deny** — `match /{document=**}` → false

---

## Collection Catalog

### Identity & Tenancy

#### `users`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Global user profiles |
| **Fields** | companyId, role, granularPermissions, isOwner, isActive, screenPinHash, invoiceCounter |
| **Relationships** | Parent of companyUsers; referenced by all createdById fields |
| **Read/Write** | Self-read/write or any authenticated user |
| **Evidence** | `hooks/useAuth.tsx`, `pages/app/ProfilePage.tsx`, `services/permissionService.ts` |

#### `companyUsers`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Team membership rows |
| **Fields** | companyId, uid, email, role, isActive |
| **Relationships** | Links users to companies |
| **Read/Write** | Admin, self, or same company |
| **Evidence** | `pages/app/UserManagementPage.tsx`, `services/realTimePermissionService.ts` |

#### `companies`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Company root metadata, trial/subscription, invoice counter |
| **Relationships** | Parent tenant for all business data |
| **Read/Write** | Company member get; create/update with owner/admin |
| **Evidence** | `services/subscriptionService.ts`, `services/invoiceService.ts` |

#### `companies/{companyId}/backups/{backupId}`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Append-only backup audit log |
| **Evidence** | `components/DataBackupManager.tsx` |

#### `customRoles`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Company-scoped RBAC role definitions with granular permission arrays |
| **Evidence** | `components/RoleManagement.tsx`, `services/permissionService.ts` |

#### `userTokens`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Active session/device tokens per user |
| **Evidence** | `services/tokenService.ts`, `services/userMonitoringService.ts` |

#### `impersonationSessions`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Admin "login as" flow (10-min, one-use tokens) |
| **Rules** | Public read/update; auth create; admin delete |
| **Evidence** | `pages/auth/ImpersonationPage.tsx`, `UserManagementPage.tsx` |

#### `subscriptions`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Company subscription rows |
| **Evidence** | `services/subscriptionService.ts`, `adminAnalyticsService.ts` |

#### `subscriptionPlans` ⚠️
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Platform subscription plan catalog |
| **Security** | **No rules defined — default deny blocks client access** |
| **Evidence** | `components/admin/SubscriptionPlansManager.tsx` |

#### `oneTimeLoginTokens` ⚠️
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Magic-link auto-login tokens |
| **Security** | **No rules defined — default deny** |
| **Evidence** | `pages/auth/AutoLoginPage.tsx` |

---

### Core ERP / Finance

#### `invoices`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Invoice documents |
| **Relationships** | companyId, customerId, bankAccountId, createdById |
| **Indexes** | companyId+issueDate↓, +createdById, +authVerificationCode |
| **R/W pattern** | Service (`invoiceService`) + direct page queries |
| **BOS reuse** | Read via `FirestoreErpInvoiceReadAdapter` |
| **Extension** | AOS client billing attribution |

#### `customers`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Customer directory |
| **Relationships** | businesses.customerId, leads.convertedCustomerId, invoices.customerId |
| **Indexes** | companyId+createdAt↓, +createdById |
| **Extension** | AOS client entity (consume, don't duplicate) |

#### `products`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Product/service catalog |
| **R/W** | `productService.ts` |
| **Extension** | AOS service catalog (consume) |

#### `bankAccounts`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Company bank accounts with running balance |
| **Relationships** | Hub for expenses, invoices, loans, transfers, deposits, reconciliations |
| **Rules** | Dual companyId/userId read paths |
| **Extension** | Financial truth — never duplicate |

#### `bankTransfers`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Internal transfers (append-only) |
| **Index** | companyId + createdAt↓ |

#### `bankReconciliations`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Reconciliation snapshots (append-only) |

#### `bankDeposits`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Manual deposits (append-only) |

#### `expenses`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Expense ledger |
| **Rules** | `expenseDataReadOk` dual scope |
| **Index** | companyId + category |
| **BOS reuse** | Primary ERP read target via `FirestoreErpExpenseReadAdapter` |
| **Extension** | AOS cost attribution source |

#### `expenseReturns`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Refunds against expenses (append-only) |

#### `vendors`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Payee directory for expenses |

#### `expenseCategories` / `expenseCategoryInit`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Category directory; init marker for default seed |

#### `loans` / `loanRepayments`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Loans and repayments |
| **Rules** | `loanDataReadOk`; repayments append-only |
| **BOS** | Attribution type `loan` defined but not wired |

---

### CRM / Sales

#### `leads`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | CRM leads |
| **Relationships** | campaignId, assignedUserId, linkedCustomerId, convertedCustomerId, linkedBusinessId, convertedBusinessId |
| **Indexes** | 5 composite indexes (companyId+createdAt, +assignedUserId, +convertedCustomerId, etc.) |
| **BOS reuse** | Read port exists (`FirestoreErpLeadReadAdapter`) but not consumed at runtime |

#### `leads/{leadId}/callLogs` (subcollection)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Legacy per-lead call logs |
| **Status** | Being replaced by `outreachEvents` |

#### `leads/{leadId}/assignmentEvents` (subcollection)
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Lead assignment history |
| **Index** | collectionGroup: toUserId + createdAt↓ |

#### `outreachEvents`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Unified outreach timeline (top-level for scale) |
| **Indexes** | 3 composite indexes |
| **Evidence** | `services/outreachService.ts` |

#### `businesses`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Businesses under a customer |
| **Index** | companyId + customerId |
| **BOS** | Listed in sidecar law; no read port |

#### `campaigns` / `campaignTags`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Marketing campaigns and tags |
| **BOS** | Sidecar law only; initiative ≠ campaign |

#### `assigneeAssignmentLog`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Daily assignment audit (append-only) |
| **Indexes** | companyId+dayKey; companyId+assigneeUserId+dayKey |

---

### Activity & Settings

#### `activities` / `activity`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Activity logs (`activities` primary; `activity` legacy) |
| **Evidence** | `services/activityLogger.ts` |

#### `companyAppSettings`
| Attribute | Detail |
|-----------|--------|
| **Purpose** | Per-company UI prefs (call-activity workday) |
| **Evidence** | `services/companyAppSettingsService.ts` |

---

### BOS Collections

Defined in `bos/infrastructure/firestore/collections.ts`:

| Collection | Purpose | FK Relationships | Indexes |
|------------|---------|------------------|---------|
| `bosVentures` | Top-level ventures | ownerUserId, companyId | companyId+updatedAt↓, +status |
| `bosInitiatives` | Initiatives | ventureId, companyId | companyId+updatedAt↓, +ventureId, +status |
| `bosDecisions` | Decision log | initiativeId, ventureId | companyId+createdAt↓, +initiativeId, +ventureId, +status |
| `bosAttributions` | Expense→initiative sidecar | initiativeId, sourceType, sourceId | companyId+initiativeId+createdAt↓, +sourceType+sourceId+status |
| `bosMilestones` | Initiative milestones | initiativeId, sequence | companyId+initiativeId+sequence↑ |
| `bosMilestoneTemplates` | Reusable templates | companyId, steps[] | companyId+createdAt↓ |

**Repositories:** 6 implementations under `bos/infrastructure/firestore/repositories/`

**Rules:** BOS-specific helpers; immutability constraints; milestone delete only when planned.

---

### Legacy / Migration Paths

| Path | Status |
|------|--------|
| `users/{uid}/customers` | Pre-centralization; migration services only |
| `users/{uid}/invoices` | Pre-centralization; migration services only |
| `users/{uid}/products` | Pre-centralization; migration services only |
| `companies/{id}/profile/main` | Planned nested structure (not active) |
| `platform/subscriptionPlans/plans/{id}` | Planned platform nesting (not active) |

**Active runtime uses flat top-level collections.**

---

## Index Coverage Gaps

Collections **without composite indexes** (rely on single-field auto-index or client-side sort):

`users`, `companyUsers`, `products`, `bankAccounts`, `vendors`, `expenseCategories`, `loans`, `loanRepayments`, `bankReconciliations`, `bankDeposits`, `expenseReturns`, `activities`, `activity`, `subscriptions`, `customRoles`, `userTokens`, `companyAppSettings`

These may cause performance issues at scale but work for current tenant sizes.

---

## Read/Write Pattern Summary

| Pattern | Used by | Count |
|---------|---------|-------|
| Service class → direct `db.collection()` | ERP modules | ~31 services |
| Page → direct `db.collection()` (bypass service) | ExpensesPage, BankAccountsPage, ReportsPage, DashboardPage, UserManagementPage | 5+ large pages |
| Repository → Application Service → UI | BOS module | 6 repos, 6 app services |
| Port → Adapter (read-only) | BOS → ERP | 4 adapters |
| Unused wrapper | `firestoreWrapper.ts` | 0 consumers |

---

## Reuse & Extension Matrix for AOS

| Collection | Reuse directly | Extend | Observe only |
|------------|---------------|--------|--------------|
| users, companyUsers, customRoles | Auth, permissions, team | AOS permission keys | — |
| customers, businesses | Client records | Agency client metadata | — |
| invoices, products | Billing | Agency billing overlays | — |
| leads, outreachEvents | Sales pipeline | — | Pipeline patterns |
| expenses, vendors | Cost tracking | Project cost attribution | — |
| bankAccounts, loans | Financial truth | — | — |
| activities | Audit trail | AOS event types | — |
| bos* collections | Strategic layer | AOS evolution | BOS architecture patterns |
| campaigns | — | — | Tagging patterns |

---

## Known Security Gaps

1. **`subscriptionPlans`** — no rules (default deny)
2. **`oneTimeLoginTokens`** — no rules (default deny)
3. **`impersonationSessions`** — public read/update (by design for token flow)
4. **Granular permissions not in rules** — enforced only in app layer
5. **BOS not in backup flow** — data loss risk on company export/import
