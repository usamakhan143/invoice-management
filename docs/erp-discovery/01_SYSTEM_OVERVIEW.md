# 01 — System Overview

**Audit date:** July 2026  
**Scope:** Read-only inspection of `invoice-management` repository  
**Purpose:** Baseline understanding before Agency Operating System (AOS) architecture work

---

## Executive Summary

This application is a **multi-tenant business ERP** built as a single-page React application backed by **Firebase Auth + Firestore**. It serves invoicing, CRM (leads/customers), finance (bank accounts, expenses, loans), reporting, team management, and a strategic execution layer called **BOS** (Business Operating System).

The codebase uses a **flat root layout** (no `src/` directory). Most ERP modules follow a **page + service class + direct Firestore** pattern. BOS is the only module with a formal **domain-driven architecture** (entities, application services, repository contracts, Firestore implementations, ERP read ports).

---

## Technology Stack

| Layer | Technology | Evidence |
|-------|------------|----------|
| UI | React 19.1 | `package.json` |
| Routing | React Router DOM 7.6 (`HashRouter`) | `App.tsx` |
| Build | Vite 6.2 | `vite.config.ts`, `package.json` |
| Styling | Tailwind CSS 4.3 | `vite.config.ts` |
| Backend | Firebase 11.9 (compat SDK) | `services/firebase.ts` |
| Database | Cloud Firestore | `firestore.rules`, all services |
| Auth | Firebase Auth (email/password) | `hooks/useAuth.tsx`, auth pages |
| PDF | `@react-pdf/renderer` | `components/InvoicePDF.tsx` |
| Phone | `libphonenumber-js` | `utils/internationalPhone.ts` |
| Dates | Luxon | used in call-activity utilities |
| Testing | Vitest 4.1 | `package.json`, BOS unit tests |

**Not present:** Redux, Zustand, React Query, Next.js, Cloud Functions in this repo (all Firestore access is client-side).

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA, HashRouter)                            │
├─────────────────────────────────────────────────────────────┤
│  Pages (pages/app/*, pages/auth/*, pages/admin/*)           │
│  Components (components/*)                                  │
│  Hooks (hooks/*) + Contexts (contexts/*)                    │
├─────────────────────────────────────────────────────────────┤
│  ERP Service Layer (services/*.ts)                          │
│    → direct db.collection() calls                           │
├─────────────────────────────────────────────────────────────┤
│  BOS Module (bos/*)                                         │
│    UI → Application Services → Repositories → Firestore     │
│    ERP reads → Integration Ports → Adapters                 │
├─────────────────────────────────────────────────────────────┤
│  Firebase Compat SDK (services/firebase.ts)                 │
│    Auth | Firestore | Offline persistence (prod)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

| Path | Role |
|------|------|
| `App.tsx` | Root component, route definitions, auth guard |
| `index.tsx` | React mount, provider chain |
| `types.ts` | Shared TypeScript interfaces (UserProfile, Invoice, Lead, etc.) |
| `constants.tsx` | Shared icon constants |
| `pages/app/` | Main ERP pages (20+ route components) |
| `pages/app/bos/` | BOS UI (ventures, initiatives, templates, detail) |
| `pages/auth/` | Login, signup, auto-login, impersonation |
| `pages/admin/` | Super-admin platform dashboard |
| `components/` | 37 reusable UI components |
| `components/dashboard/` | Dashboard widgets |
| `components/leads/` | Lead workspace modals and controls |
| `components/admin/` | Super-admin widgets |
| `services/` | 34 Firestore-backed service modules |
| `hooks/` | Auth, permissions, BOS scope, page title |
| `contexts/` | `ScreenLockContext` (PIN lock) |
| `config/` | Permissions registry, brand, super-admin config |
| `layouts/` | `AppLayout`, `AuthLayout` |
| `utils/` | 19 pure helper modules |
| `bos/` | ~139 files — domain-driven BOS module |
| `firestore.rules` | Security rules (672 lines) |
| `firestore.indexes.json` | 28 composite indexes |
| `docs/` | Existing business/BOS documentation |

### BOS Internal Layout

```
bos/
├── application/          # Application services (orchestration)
├── config/               # routes, navigation, permissions, featureFlags
├── constants/            # Status enums, permission keys
├── contracts/            # Repository interfaces
├── domain/             # entities, rules, lifecycle, guards
├── infrastructure/
│   └── firestore/      # collections, models, repositories
├── integration/        # ERP read ports + Firestore adapters
└── types/
```

---

## React Architecture

### Entry Point

`index.tsx` wraps the app in:

1. `AuthProvider` (`hooks/useAuth.tsx`)
2. `ScreenLockProvider` (`contexts/ScreenLockContext.tsx`)
3. `App` (`App.tsx`)

### Routing

- **Router type:** `HashRouter` — URLs are `#/path`
- **Single route file:** `App.tsx` (no separate router module)
- **Lazy loading:** All page components use `React.lazy()` with `Suspense` + `Spinner`
- **Auth gate:** `ProtectedRoute` — requires Firebase user OR active impersonation session

### Layout Hierarchy

```
ProtectedRoute
└── AppLayout (Sidebar + footer + impersonation banner)
    └── [protected pages]

AuthLayout
└── /login, /signup, /auto-login

/impersonate (standalone, no layout)
```

### State Management

| Mechanism | Usage |
|-----------|-------|
| React Context | Auth (`useAuth`), screen lock (`ScreenLockContext`) |
| Custom hooks | Permissions, BOS scope, company user options |
| Component `useState` | Forms, modals, local UI state |
| Firestore `onSnapshot` | Real-time profile, permissions, lists |
| Service classes | CRUD and business operations |

**No global state library** (Redux/Zustand/etc.) is used.

---

## Firebase Architecture

### Initialization

**File:** `services/firebase.ts`

- Uses Firebase **compat** API (`firebase/compat/app`, `auth`, `firestore`)
- Config from `VITE_FIREBASE_*` environment variables
- Exports: `auth`, `db`, `FieldValue`, `Timestamp`, `FieldPath`
- Firestore settings: long polling in dev, unlimited cache, `ignoreUndefinedProperties`
- Optional offline mode via `VITE_FIREBASE_OFFLINE_MODE`
- `connectToFirebase()` — connectivity probe
- `enableOfflineSupport()` — IndexedDB persistence (production only)

### App Bootstrap (`App.tsx`)

On mount: network check → offline support → Firebase connection probe. Emergency offline mode available via `services/offlineMode.ts`.

### Data Access Patterns

1. **ERP (dominant):** Pages and services call `db.collection(...)` directly via service classes
2. **BOS:** Repository pattern → application services → UI
3. **BOS → ERP reads:** Port/adapter pattern (read-only sidecar)
4. **Partial abstraction:** `FirebaseHealth` wraps retry/caching for some services
5. **Unused:** `FirestoreWrapper` (`services/firestoreWrapper.ts`) — no imports found

### Security

- Client-side Firestore rules in `firestore.rules`
- Company tenancy via `canAccessCompanyData(companyId)`
- Granular permissions enforced in app layer (rules allow company members; app checks specific keys)
- Default deny: `match /{document=**}` → false

---

## Routing Structure

All routes defined in `App.tsx`:

| Path | Page |
|------|------|
| `/` | Dashboard |
| `/invoices`, `/invoices/new`, `/invoices/edit/:id` | Invoices |
| `/customers`, `/customers/:id` | Customers |
| `/leads`, `/leads/:id`, `/leads/import`, `/leads/assigned`, `/leads/my-assigned` | Leads |
| `/performance` | Performance |
| `/campaigns` | Campaigns |
| `/products` | Products |
| `/bank-accounts` | Bank Accounts |
| `/expenses` | Expenses |
| `/loans` | Loans |
| `/reports` | Reports |
| `/bos` → redirect `/bos/initiatives` | BOS |
| `/bos/ventures`, `/bos/initiatives`, `/bos/initiatives/:id`, `/bos/milestone-templates` | BOS |
| `/users` | User Management |
| `/activity`, `/company-activity` | Activity logs |
| `/profile` | Profile/Settings |
| `/data-management` | Backup/Import |
| `/super-admin` | Platform admin |
| `/login`, `/signup`, `/auto-login` | Auth |
| `/impersonate` | Admin impersonation |

**Planned but not wired:** `/bos/decisions`, `/bos/attributions`, `/bos/reports` (defined in `bos/config/routes.ts` only).

---

## Permissions System

**Registry:** `config/permissions.ts` — 100+ granular permission strings grouped by category.

**Runtime:** `hooks/usePermissions.tsx` — helper functions (`canViewInvoices`, `hasPageAccess`, HOCs).

**Model:**
- Company owner (`isOwner: true`) → all permissions
- Other users → `granularPermissions[]` from assigned custom role or inline profile
- Custom roles stored in `customRoles` collection
- Real-time refresh via `services/realTimePermissionService.ts`

**UI gating:** Sidebar (`components/Sidebar.tsx`), `ProtectedComponent`, page-level redirects.

---

## Shared Utilities

| Utility | Path | Purpose |
|---------|------|---------|
| `bosFormat.ts` | `utils/` | Date/money formatting, field CSS class |
| `exchangeRates.ts` | `utils/` | Multi-currency conversion |
| `expenseCompanyScope.ts` | `utils/` | Company vs personal expense scoping |
| `csvExport.ts` / `csvStream.ts` | `utils/` | CSV export for reports/import |
| `screenPin.ts` | `utils/` | 4-digit PIN hashing |
| `internationalPhone.ts` | `utils/` | Phone normalization/validation |
| `leadScoringFields.ts` | `utils/` | Lead scoring helpers |
| `bankAccountAccess.ts` | `utils/` | Bank account picker filtering by role |
| `balanceIntegrityService.ts` | `services/` | Financial balance verification |
| `companyId.ts` | `services/` | Owner UID vs companyId resolution |

---

## Reusable Components (Summary)

37 components under `components/`. Key categories:

- **Layout/Shell:** `Sidebar`, `DashboardSection`, `DashboardCard`, `Spinner`
- **Forms/Inputs:** `SearchableListSelect`, `SearchableLeadOptionSelect`, `InternationalPhoneInput`, `FieldInfoTip`, `FloatingFieldTooltip`
- **Finance:** `PaymentTrackingModal`, `InvoicePDF`, `PDFDownloadWrapper`, `InvoiceVerificationSection`
- **CRM:** `CampaignTagPill`, `DuplicateContactTip`, `LeadPitchReadyIcon`, lead modals
- **Admin:** `RoleManagement`, `DataBackupManager`, super-admin tables
- **Security:** `ProtectedComponent`, `ImpersonationBanner`, `ConnectionStatus`

See `05_REUSABLE_COMPONENTS.md` for full inventory.

---

## Key Architectural Observations

1. **Monolithic page files** — Several pages exceed 2,000 lines (`ExpensesPage.tsx` ~3,190 lines). Business logic, UI, and Firestore calls coexist in single files.
2. **Dual data-access style** — Services exist for most domains, but large pages also call `db.collection()` directly.
3. **BOS is architecturally distinct** — Clean layering with tests; ERP modules do not follow the same pattern.
4. **Hash routing** — Deployment-friendly but affects deep linking and impersonation flows.
5. **Firebase compat SDK** — Not modular v9 tree-shaken SDK; entire compat bundle loaded.
6. **Multi-tab impersonation** — First-class auth concern with admin-tab protection.
7. **Company tenancy** — `companyId` on documents; owner UID often equals companyId for self-signup companies.
8. **Legacy migration paths** — `users/{uid}/customers|invoices|products` subcollections still referenced in migration services.

---

## Document Index

| Doc | Topic |
|-----|-------|
| 02 | Module inventory |
| 03 | Data flow |
| 04 | Firestore analysis |
| 05 | Reusable components |
| 06 | Reusable business logic |
| 07 | BOS integration |
| 08 | AOS integration points |
| 09 | Duplication report |
| 10 | Technical debt |
| 11 | AOS readiness report |
