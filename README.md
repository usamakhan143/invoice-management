# Invoicer Pro

**Invoicer Pro** is a **multi-tenant invoicing web app**: companies manage invoices, customers, products, bank accounts, and expenses, and generate **PDF invoices** in the browser. Data is stored in **Firebase** (Authentication + Firestore). The UI is built with **React 19**, **TypeScript**, and **Vite**, with **React Router** (HashRouter) and **granular permissions** per user.

---

## Table of contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [How the app works](#how-the-app-works)
- [Routes](#routes)
- [Features](#features)
- [Permissions](#permissions)
- [Data backup & import](#data-backup--import)
- [Super Admin](#super-admin)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Security notes](#security-notes)
- [Technologies](#technologies)
- [Contributing & license](#contributing)

---

## Quick start

1. Clone the repo and enter the project folder.
2. Copy environment template to `.env`:
   - macOS / Linux: `cp .env.example .env`
   - Windows (PowerShell): `Copy-Item .env.example .env`
3. Fill in all `VITE_FIREBASE_*` values from your Firebase project (see [Environment variables](#environment-variables)).
4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the URL shown in the terminal (Vite defaults to **http://localhost:5173**). The app uses **hash routing** (`/#/login`, `/#/`, etc.).

**Do not commit** `.env`, `service-account-key.json`, or other secrets.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase web app config (required) |
| `VITE_FIREBASE_OFFLINE_MODE` | Optional; see `services/firebase.ts` |
| `VITE_SUPER_ADMIN_FIRESTORE_WRITES` | Set to `true` only when you intentionally allow Super Admin **writes** to the `subscriptionPlans` collection (default: off). See `config/superAdmin.ts` |
| `GEMINI_API_KEY` | Optional; only if you use related integrations |
| `VITE_PUBLIC_BUILDER_KEY` | Optional; Builder.io if used |

See `.env.example` for comments and examples.

---

## How the app works

1. **Authentication** — Firebase Auth. User profile, company linkage, and permissions are loaded from Firestore (`users` and related documents).
2. **Routing** — `App.tsx` uses `HashRouter`. Authenticated areas are behind `ProtectedRoute` (logged-in user **or** active impersonation session). Layout: `AppLayout` (sidebar + main + footer) vs `AuthLayout` for login/signup.
3. **Multi-tenancy** — Business data is scoped by **`companyId`** (and owner `userId` where applicable) on **root-level** Firestore collections. The intended layout is documented in `services/databaseMigrationService.ts` (companies, invoices, customers, products, etc.).
4. **Permissions** — `config/permissions.ts` lists **granular** keys. `usePermissions` (and Firestore role documents) decide sidebar visibility and page actions—not only a single “admin” flag.
5. **PDFs** — `@react-pdf/renderer` builds invoice PDFs in the browser (lazy-loaded chunk; Open Sans bundled).
6. **Network / offline** — Firebase persistence, connectivity checks, and optional emergency offline behavior (`services/offlineMode.ts`, `NetworkStatus`, `ConnectionStatus`, `OfflineModeIndicator`).

---

## Routes

| Path | Description |
|------|-------------|
| `/login`, `/signup` | Sign in / register |
| `/auto-login` | Automated login flow when configured |
| `/impersonate` | Impersonation entry (outside main auth layout) |
| `/` | Dashboard |
| `/invoices` | Invoice list |
| `/invoices/new` | Create invoice |
| `/invoices/edit/:id` | Edit invoice |
| `/customers` | Customers |
| `/products` | Products / services |
| `/bank-accounts` | Bank accounts |
| `/expenses` | Expenses |
| `/users` | Team user management |
| `/activity` | Activity log (user-scoped where applicable) |
| `/company-activity` | Company-wide activity (permission-gated) |
| `/profile` | Profile |
| `/leads` | Leads list / CRM |
| `/leads/:id` | Lead detail (tabs by permission) |
| `/my-assigned-leads` | Agent workspace for assigned leads |
| `/data-management` | Data overview, backup export/import, history |
| `/super-admin` | Platform operator dashboard (restricted; see below) |

---

## Features

### Dashboard (`/`)

Summary metrics (revenue, outstanding, expenses, customers, bank snapshot, recent invoices) depend on **granular dashboard permissions**. Optional invoice verification entry points may appear when enabled.

### Invoices

- **List** — Browse, filter, open PDF, edit/delete per permissions.
- **Form** — Line items, totals, customer/product links, status and payment fields (`services/invoiceService.ts`, `pages/app/InvoiceFormPage.tsx`).
- **PDF** — Client-side generation for download/print.

### Customers & products

CRUD scoped to the company; used when composing invoices.

Customer detail (`/customers/:id`) includes permission-gated sections:
- profile edit
- businesses add/edit
- businesses delete (separate granular permission)
- invoices section
- CRM leads section
- audit/activity section
- technical IDs visibility

### Bank accounts & expenses

Track accounts and expenses per company, per respective pages and services.

### User management (`/users`)

Invite and manage team members, roles, activation, and optional **login-as** (impersonation), gated by `USER_MANAGEMENT_*` permissions.

Also includes enterprise session control:
- open active sessions for a specific user
- revoke a single session
- revoke all sessions for that user
- dedicated permission: `USER_MANAGEMENT_SESSIONS_CONTROL`

### Activity (`/activity`, `/company-activity`)

Audit-style logs where the app writes to the activity collection (subject to Firestore rules and what each action logs).

### Profile (`/profile`)

User/company profile; editable where rules and permissions allow.

Includes self-service security sessions:
- view active sessions/devices
- revoke one session
- logout other devices
- relative last-active display and current-device indicator

### Leads / CRM

- Leads list with permission-gated actions and bulk delete.
- Lead detail supports permission-gated tabs such as:
  - call logs tab (`LEADS_LOG_CALLS`)
  - conversion & billing hub (link/convert/invoice permissions)
  - assignment tab (`LEADS_DETAIL_ASSIGNMENT_TAB`)
- My Assigned Leads workspace with quick actions (status, call, follow-up) via dedicated permissions.

### Bulk actions

Bulk delete is available with dedicated permissions for:
- invoices
- customers
- products
- expenses
- leads
- company activity
- user removal from company (team members)

---

## Permissions

- **Source of truth** — `config/permissions.ts` (`PERMISSION_CATEGORIES`, `GRANULAR_PERMISSIONS`).
- **Runtime** — Custom roles and assignments in Firestore; `hooks/usePermissions.tsx` resolves access for navigation and UI actions.
- **Super Admin** — The sidebar item uses a separate `superAdminOnly` flag in `components/Sidebar.tsx`, not the general permission map.
- Recent granular additions include:
  - `USER_MANAGEMENT_SESSIONS_CONTROL`
  - `LEADS_DETAIL_ASSIGNMENT_TAB`
  - `CUSTOMERS_DETAIL_BUSINESSES_DELETE`
  - all `*_BULK_DELETE` permissions for key modules

---

## Data backup & import

- **Location** — `pages/app/DataManagementPage.tsx` + `components/DataBackupManager.tsx`.
- **Export** — `DatabaseMigrationService.exportCompanyData` produces a **JSON** backup (flat format with a version field). Includes company-scoped collections as implemented in the service.
- **Import** — `DatabaseMigrationService.importCompanyData` uses Firestore **`set(..., { merge: true })`**. It **does not delete** documents that are missing from the file; it merges fields for documents that **are** in the backup. Use only **trusted** exports from your own organization.
- **History** — Export/import events can be recorded under `companies/{companyId}/backups`.
- **Access** — Typically company **owner/admin** plus backup-related permissions.

Serialization helpers: `utils/backupFirestore.ts`.

---

## Super Admin

- **Who can access** — Restricted to **company owner** whose company name matches the IT Veins check in `Sidebar.tsx` and `pages/admin/SuperAdminDashboard.tsx` (change in code if your operator tenant differs).
- **What it does**
  - **Overview / companies** — Read-only analytics: `services/adminAnalyticsService.ts` aggregates Firestore data (companies, users, invoices, subscriptions, activity). **No writes** to tenant invoice/customer data from this service.
  - **Subscription plans** — UI for `subscriptionPlans` CRUD. **Writes are disabled by default.** Set `VITE_SUPER_ADMIN_FIRESTORE_WRITES=true` in `.env` and rebuild to allow create/update/delete/activate. See `config/superAdmin.ts`.
  - **Billing** — Mix of real aggregated metrics and **mock/simulated** billing rows in `components/admin/BillingOverview.tsx` (not a full payment processor).
- **Child UI** — `components/admin/*` (metrics cards, company table, billing, plans manager).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` / `npm start` | Vite development server |
| `npm run build` | Production build |
| `npm run preview` | Serve production build locally |
| `npm run cleanup-db` | Database cleanup script (**destructive**; requires `--confirm`) |
| `npm run migrate-products` | One-off products migration (**requires `--confirm`**) |

---

## Project structure

| Path | Role |
|------|------|
| `pages/app/` | Main authenticated features (dashboard, invoices, CRM, etc.) |
| `pages/auth/` | Login, signup, auto-login |
| `pages/admin/` | Super Admin dashboard |
| `components/` | Shared UI (sidebar, backup manager, PDF, modals, …) |
| `services/` | Firebase, invoices, customers, permissions, migration, analytics |
| `hooks/` | `useAuth`, `usePermissions`, `usePageTitle`, … |
| `config/` | Permissions, Super Admin flags |
| `layouts/` | `AppLayout`, `AuthLayout` |
| `types/` | Shared TypeScript types |
| `firestore.rules` / `firestore.indexes.json` | Firestore security and indexes (deploy with Firebase CLI) |
| `App.tsx` | Routes, auth gate, Firebase init orchestration |

---

## Security notes

- **Firestore security rules** enforce access on the server; client-side checks are for UX only.
- **Backup import** can overwrite/merge fields on existing documents—treat exports like sensitive credentials.
- **Super Admin** can affect **platform** catalog data when writes are enabled; keep `VITE_SUPER_ADMIN_FIRESTORE_WRITES` unset/false in production unless you are deliberately maintaining `subscriptionPlans`.
- Never commit `.env` or service account JSON.

---

## Technologies

- React 19, TypeScript, Vite 6  
- Firebase 11 (Auth, Firestore)  
- React Router 7 (HashRouter)  
- @react-pdf/renderer  
- Tailwind-style utility classes in JSX (see project config)

---

## Contributing

Issues and pull requests are welcome. Please avoid committing secrets and run `npm run build` before submitting larger changes.

## License

MIT License.

## Acknowledgments

Thanks to contributors and the open-source projects this app builds on.
