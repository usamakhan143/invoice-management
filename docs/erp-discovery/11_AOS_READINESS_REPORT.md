# 11 — AOS Readiness Report

Final assessment: how ready is the existing ERP to serve as the foundation for Agency Operating System (AOS)?

---

## Overall Readiness Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Platform foundation** (auth, tenancy, permissions) | **85%** | Mature, reusable with extensions |
| **CRM data** (leads, customers) | **90%** | Comprehensive, AOS should consume |
| **Finance data** (invoices, expenses, banking) | **90%** | Comprehensive, AOS should consume |
| **UI component library** | **45%** | Atomic components good; no composites |
| **Business logic layer** | **50%** | Services exist but pages bypass them |
| **Architecture consistency** | **35%** | BOS is clean; ERP is monolithic |
| **BOS strategic layer** | **60%** | Phase 1 complete; ports ready for extension |
| **Infrastructure** (server-side, storage, notifications) | **10%** | Almost nothing exists |
| **Testing** | **20%** | BOS tested; ERP untested |
| **Data management** (backup, migration) | **55%** | ERP backup works; BOS/AOS excluded |

### **Composite readiness: ~55%**

The ERP is a strong **data and platform foundation** but a weak **architecture and infrastructure foundation** for a next-generation system. AOS can reuse ~55% of existing capabilities directly or with minor extension. The remaining ~45% must be built new or requires abstraction work first.

---

## Reuse Percentage Breakdown

| Category | Reuse % | Action |
|----------|---------|--------|
| Authentication & sessions | 95% | Reuse directly |
| Company tenancy | 95% | Reuse directly |
| Permission system | 80% | Extend with AOS keys |
| User/team management | 90% | Reuse directly |
| Customer/client data | 90% | Consume, don't rebuild |
| Lead/pipeline data | 90% | Consume, don't rebuild |
| Invoice/billing data | 85% | Consume; extend for agency billing models |
| Expense/cost data | 85% | Consume; extend attribution |
| Bank/finance data | 90% | Consume directly |
| Activity/audit logging | 70% | Extend with AOS event types |
| Dashboard widgets | 40% | Extend; build AOS-specific KPIs |
| Reports | 40% | Extend tabs; may need server-side |
| CSV import/export | 85% | Reuse utilities |
| UI atomic components | 70% | Reuse inputs, modals, cards |
| UI composite components | 15% | Must build DataTable, form wizards |
| BOS domain architecture | 75% | Extend as AOS foundation |
| BOS ERP integration (ports) | 70% | Extend adapters for more ERP reads |
| Server-side logic | 0% | Must build |
| File storage | 0% | Must build |
| Notifications | 0% | Must build |
| Project/task management | 0% | Must build (core AOS) |
| Time tracking | 0% | Must build (core AOS) |
| Client portal | 0% | Must build (core AOS) |

---

## Modules That Should NEVER Be Rewritten

These are mature, data-rich, and deeply integrated. AOS must consume them.

| Module | Why |
|--------|-----|
| **Authentication** | Signup, login, impersonation, sessions — battle-tested |
| **User management** | Team CRUD, activation, login-as, session control |
| **Customer directory** | CRUD, businesses, lead links, detail page |
| **Invoice system** | Full lifecycle, PDF, payments, bank impact |
| **Expense tracking** | Categories, vendors, returns, multi-currency |
| **Bank accounts** | Transfers, deposits, reconciliation, balance integrity |
| **Lead CRM** | Pipeline, assignment, outreach, conversion, import |
| **Company tenancy** | `companyId` model works for agencies |

**Rule:** AOS reads these modules via service calls or read ports. Never creates parallel collections.

---

## Modules That Should ONLY Be Extended

Add AOS-specific capabilities on top of existing modules without replacing them.

| Module | Extension |
|--------|-----------|
| **Permissions** | Add AOS permission keys to `config/permissions.ts` |
| **Roles** | AOS permissions appear in RoleManagement UI |
| **Activity logging** | Add AOS event types to ActivityLogger |
| **Dashboard** | Add AOS KPI sections alongside ERP widgets |
| **Reports** | Add AOS report tabs to ReportsPage |
| **BOS initiatives** | Evolve into AOS projects/strategies |
| **BOS milestones** | Evolve into AOS task/milestone tracking |
| **BOS attributions** | Extend for AOS project cost/revenue linking |
| **BOS decisions** | Extend for AOS decision logging |
| **Data backup** | Include AOS collections in export/import |
| **Performance hub** | Add agency team performance metrics |
| **Sidebar navigation** | Add AOS nav group |
| **Product catalog** | Add agency service packages |

---

## Modules AOS Should Simply Consume

Read-only or service-call access. No UI duplication.

| Module | Consumption method |
|--------|-------------------|
| Customers + businesses | Direct service calls or read port |
| Invoices | Read port (extend BOS invoice adapter) |
| Expenses | Read port (BOS expense adapter — already works) |
| Leads + outreach | Read port (extend BOS lead adapter) |
| Bank accounts + balances | Service calls for financial context |
| Campaigns + tags | Service calls for attribution context |
| Products | Service calls for billing context |
| Company settings | Service calls for workday/config |
| Exchange rates | Utility functions for currency conversion |

---

## Architectural Risks to Solve BEFORE AOS Starts

### Must Solve (Blockers)

| # | Risk | Why it blocks AOS |
|---|------|-------------------|
| 1 | **No shared architecture standard** | AOS will inherit ERP monolith pattern OR diverge from BOS clean pattern — must pick one and document it |
| 2 | **No server-side infrastructure** | AOS needs background jobs, notifications, webhooks — Cloud Functions or equivalent must be planned |
| 3 | **BOS not in backup flow** | AOS strategic data would also be excluded from disaster recovery |
| 4 | **Dual permission namespaces** | Adding AOS permissions to a third location creates admin confusion |
| 5 | **No shared DataTable/composite components** | AOS will duplicate table/list patterns from 3,000-line pages |

### Should Solve (High Impact)

| # | Risk | Why it matters |
|---|------|---------------|
| 6 | **Feature flags not enforced** | AOS gradual rollout requires working feature flags |
| 7 | **Client-side report aggregation** | Won't scale for agency analytics |
| 8 | **Page-level Firestore bypass** | AOS can't consume business logic embedded in pages |
| 9 | **No file storage** | AOS document management needs Firebase Storage or equivalent |
| 10 | **Zero ERP test coverage** | AOS built on untested foundation carries regression risk |
| 11 | **Activity types not centralized** | AOS events will add to string literal sprawl |
| 12 | **BOS UI bypasses application layer** | Layer violation pattern could spread to AOS |

### Can Defer (Track)

| # | Risk | Notes |
|---|------|-------|
| 13 | Firebase compat SDK | Works; migrate to modular v9 later |
| 14 | Legacy call logs / activity collections | Not active runtime; ignore |
| 15 | Legacy user subcollections | Migration-only; ignore |
| 16 | Missing Firestore rules for subscriptionPlans/oneTimeLoginTokens | Pre-existing; fix independently |
| 17 | Hardcoded super admin gate | Platform concern, not AOS |
| 18 | No charting library | Add when AOS dashboard needs visuals |

---

## Recommended AOS Architecture Direction

Based on this audit, the strongest path for AOS is:

### Build AOS as BOS 2.0 (Evolution, Not Replacement)

```
Existing ERP (data truth)
  ├── CRM: leads, customers, campaigns
  ├── Finance: invoices, expenses, banking
  └── Team: users, roles, permissions
       │
       │ (read ports — sidecar law)
       ▼
BOS layer (strategic execution — extend)
  ├── Initiatives → AOS Projects
  ├── Milestones → AOS Tasks/Deliverables
  ├── Decisions → AOS Decision Log
  ├── Attributions → AOS Cost/Revenue Linking
  └── Templates → AOS Project Templates
       │
       │ (new AOS-only domain)
       ▼
AOS layer (net-new capabilities)
  ├── Time tracking
  ├── Resource allocation
  ├── Client portal
  ├── Agency billing (retainers, SOWs)
  ├── Notifications & workflows
  └── Agency analytics dashboard
```

### Architecture Rules for AOS

1. **Follow BOS layering:** UI → Application Service → Repository/Port → Firestore
2. **Sidecar law:** AOS never writes ERP collections
3. **Single permission registry:** All keys in `config/permissions.ts`
4. **Feature flags must work:** Wire `isBosFeatureEnabled()` pattern for AOS flags
5. **Include in backup:** AOS collections in `DatabaseMigrationService`
6. **Extract before building:** Shared DataTable, form wizard, filter bar before AOS pages
7. **Test AOS domain:** Follow BOS testing pattern (vitest unit + emulator integration)
8. **Plan server-side early:** Cloud Functions for notifications, aggregation, webhooks

---

## What AOS Inherits vs Builds

### Inherits (Reuse)

- Auth, sessions, impersonation
- Company tenancy model
- Permission system + role management
- All CRM data and services
- All finance data and services
- BOS domain architecture pattern
- BOS ERP read ports (expense, invoice, lead, report)
- UI atomic components (inputs, modals, cards, buttons)
- Formatting utilities (date, money, phone, CSV)
- Activity logging infrastructure
- Data backup infrastructure (extended)

### Builds New (Core AOS Value)

- Project management (evolve from BOS initiatives)
- Task tracking (evolve from BOS milestones)
- Time tracking (net-new)
- Resource/capacity planning (net-new)
- Client portal (net-new)
- Agency billing models — retainers, SOWs, milestones (net-new sidecar)
- Notification system (net-new infrastructure)
- Document management (net-new infrastructure)
- Agency analytics dashboard (net-new, may need server-side)
- Workflow automation (net-new)
- Server-side business logic (net-new infrastructure)

---

## Final Assessment

The ERP is **ready to be the data and platform foundation** for AOS but **not ready to be copied as an architectural pattern**. 

**Strengths:**
- Comprehensive CRM, finance, and team management
- Working multi-tenant model with granular permissions
- BOS proves the sidecar integration pattern
- BOS domain-driven architecture is the right model for AOS

**Weaknesses:**
- Monolithic page files with embedded business logic
- No server-side infrastructure
- No shared composite UI components
- Inconsistent architecture between ERP and BOS
- Missing infrastructure for documents, notifications, search

**Recommendation:** Proceed to AOS architecture design with BOS as the structural template, ERP as the data foundation, and explicit rules to prevent duplication of CRM, finance, auth, and team modules.

---

## Document Index

| # | Document | Purpose |
|---|----------|---------|
| 01 | System Overview | Architecture, tech stack, routing |
| 02 | Module Inventory | Every module with capabilities |
| 03 | Data Flow | Entity relationships and flows |
| 04 | Firestore Analysis | Collections, rules, indexes |
| 05 | Reusable Components | UI component inventory |
| 06 | Reusable Business Logic | Services and utilities |
| 07 | BOS Integration | Current BOS ↔ ERP state |
| 08 | AOS Integration Points | Reuse classification |
| 09 | Duplication Report | What not to rebuild |
| 10 | Technical Debt | Risks and code smells |
| 11 | AOS Readiness Report | This document |
