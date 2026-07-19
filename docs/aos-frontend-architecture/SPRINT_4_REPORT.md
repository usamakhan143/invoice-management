# Sprint 4 Report — M13 Global Queues (ST-12 → ST-15)

**Stage D2 — Sprint 4**  
**Date:** July 19, 2026  
**Status:** Complete  
**Next:** M14 (ST-16–17 Registry) — **not started**  
**Explicitly deferred:** Knowledge, Dashboard (M15–M16)

---

## Executive Summary

Sprint 4 implements **M13 — ST-12 through ST-15 Global Queues**: four cross-engagement queue screens sharing `QueueScreenTemplate`, backed by a new `QueueProjectionApplicationService` that projects pending workflow items from the in-memory workflow store plus the delivery list. Sidebar navigation shows **badge counts** from a dedicated query. Rows navigate to the correct engagement tab — no inline approve actions on queue screens.

| Verification | Result |
|--------------|--------|
| `npm run build` | PASS |
| `npm run test:aos` | PASS — 17 files, 50 tests |
| `npm run aos:validate` | PASS — 7 converter checks |

---

## 1. Milestone & Governing Documents

| Item | Value |
|------|-------|
| **Milestone** | M13 — ST-12–ST-15 Global Queues |
| **Implementation sequence** | [37_IMPLEMENTATION_SEQUENCE.md](./37_IMPLEMENTATION_SEQUENCE.md) § Milestone 13 |
| **Implementation contract** | [29_IMPLEMENTATION_CONTRACT.md](../aos-design-freeze/29_IMPLEMENTATION_CONTRACT.md) |
| **Screen templates** | [21_SCREEN_TEMPLATES.md](./21_SCREEN_TEMPLATES.md) — ST-12, ST-13, ST-14, ST-15 |
| **Component architecture** | [31_COMPONENT_ARCHITECTURE.md](./31_COMPONENT_ARCHITECTURE.md) — C-076 NotificationBadge, DataTable, TableToolbar |
| **Search & discovery** | [26_SEARCH_AND_DISCOVERY.md](./26_SEARCH_AND_DISCOVERY.md) — URL `q` + optional `status` filters |

---

## 2. Acceptance Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| UI-Review ST-12–15 PASS | PASS | Shared template; per-screen columns and filters |
| Row → engagement tab navigation | PASS | `tabHref` → `/aos/delivery/:id/{requirements\|prompts\|cursor\|evaluation}` |
| No inline approve | PASS | Action column uses "Review" `LinkButton` only |
| Nav badge counts from query | PASS | `useQueueBadgeCountsQuery` + C-076 on queue nav items |

---

## 3. Screens Implemented

| ST | Screen | Route | Navigates to |
|----|--------|-------|--------------|
| ST-12 | `RequirementsQueueScreen` | `/aos/requirements` | `/aos/delivery/:id/requirements` |
| ST-13 | `PromptsQueueScreen` | `/aos/prompts` | `/aos/delivery/:id/prompts` |
| ST-14 | `CursorQueueScreen` | `/aos/cursor` | `/aos/delivery/:id/cursor` |
| ST-15 | `EvaluationQueueScreen` | `/aos/evaluation` | `/aos/delivery/:id/evaluation` |

### Shared layout

| Artifact | Role |
|----------|------|
| `QueueScreenTemplate` | PageHeader + TableToolbar + SearchInput + loading/error/empty states |
| `useQueueScreenState` | Syncs URL `q` and optional `status` filter with React Router search params |

### Per-screen filters

| Screen | URL filter | UI control |
|--------|------------|------------|
| ST-12, ST-13 | `q` only | SearchInput |
| ST-14 | `q`, `status` | SearchInput + Select (session status) |
| ST-15 | `q`, `status` | SearchInput + Select (evaluation status) |

---

## 4. Application Layer

### `QueueProjectionApplicationService`

Cross-engagement projections joining:

- `DeliveryApplicationService.listCompanyDeliveries()` — engagement title, client label  
- `EngagementWorkflowStore.listByCompany()` — workflow gates and artifacts  

| Queue | Inclusion rule |
|-------|----------------|
| Requirements | `!requirementsApproved` + requirement set in `draft` / `in_review` |
| Prompts | requirements approved + `!promptPackApproved` + prompt pack `draft` / `in_review` |
| Cursor | prompt pack approved + `!cursorSubmitted` + active/awaiting session (or `not_started` when approved pack, no session) |
| Evaluation | cursor submitted + `!evaluationPassed` + evaluation failed or not passed |

`getBadgeCounts()` returns `{ requirements, prompts, cursor, evaluation }` totals for sidebar badges.

### Store extension

| Method | Purpose |
|--------|---------|
| `EngagementWorkflowStore.get()` | Single workflow lookup |
| `EngagementWorkflowStore.listByCompany()` | Cross-engagement queue source |

---

## 5. Hooks & Wiring

| Hook | Query key segment |
|------|-------------------|
| `useRequirementsQueueQuery` | `["aos","queues","requirements", filters]` |
| `usePromptsQueueQuery` | `["aos","queues","prompts", filters]` |
| `useCursorQueueQuery` | `["aos","queues","cursor", filters]` |
| `useEvaluationQueueQuery` | `["aos","queues","evaluation", filters]` |
| `useQueueBadgeCountsQuery` | `["aos","queues","badge-counts"]` |

Workflow mutations invalidate `[...aosQueryKeys.all, "queues"]` so badge counts refresh after hub actions.

### Wiring changes

- `createAosPresentationServices` — registers `queues: QueueProjectionApplicationService`
- `defaultPresentationServices` singleton — shared store between shell badges and route providers
- `AosShellProviders` in `AppLayout` — enables badge queries outside `/aos` route layout

---

## 6. Navigation Integration

| Change | File |
|--------|------|
| `AosSidebarNavLinks` | Renders queue nav items with C-076 badge counts |
| `Sidebar.tsx` | Delegates AOS sub-nav to `AosSidebarNavLinks` |
| `AosShellProviders` | Wraps app shell with AOS providers for badge queries |

---

## 7. Pages Updated

| Page | Before | After |
|------|--------|-------|
| `AosRequirementsPage` | Placeholder | ST-12 screen |
| `AosPromptsPage` | Placeholder | ST-13 screen |
| `AosCursorPage` | Placeholder | ST-14 screen |
| `AosEvaluationPage` | Placeholder | ST-15 screen |

---

## 8. Tests Added / Updated

| Test file | Coverage |
|-----------|----------|
| `QueueProjectionApplicationService.test.ts` | Requirements queue listing; badge counts |
| `useQueueQueries.test.ts` | Queue query key serialization |
| `createAosPresentationServices.test.ts` | Queues service wired |
| `EngagementWorkflowMemoryStore` (via service tests) | `listByCompany` used by projections |

---

## 9. Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Screens call hooks; UI components remain dumb | PASS | |
| No Firestore in presentation | PASS | |
| No domain entity changes | PASS | Queue DTOs in application layer |
| No new architecture documents | PASS | Sprint report only (established D2 pattern) |
| Frozen queue screen order ST-12→15 | PASS | |
| No inline approve on queues | PASS | Review navigation only |
| Import boundaries | PASS | Fixed relative paths in nested queue screens |

**Explicit Sprint 4 boundary:** Queue projections read the same Phase 1A in-memory workflow store as Sprint 3. No Firestore queue repositories or domain changes.

---

## 10. Technical Debt (Inherited + New)

| Item | Severity | Description |
|------|----------|-------------|
| In-memory workflow store | **High** | Queue contents reset on refresh |
| Delivery list cap (200) | Medium | Large companies may miss engagements in queue projections |
| No queue-specific E2E | Medium | Service + hook unit tests only |
| Singleton presentation services | Low | Mitigates duplicate stores; double QueryClient possible in nested providers |

---

## 11. Remaining Milestones (Not Started)

| Milestone | Scope | Status |
|-----------|-------|--------|
| M14 | ST-16–17 Registry | **Deferred per Sprint 4 stop rule** |
| M15 | ST-18 Knowledge | **Deferred per Sprint 4 stop rule** |
| M16 | ST-01 Dashboard + ST-19 Playbook | **Deferred per Sprint 4 stop rule** |

---

## 12. Verification Log

```
npm run build          → PASS (27.8s)
npm run test:aos       → PASS — 17 files, 50 tests (18.8s)
npm run aos:validate   → PASS — 7 converter checks
```

### Fixes applied during verification

- Corrected import paths in nested queue screen files (`../../../../config`, `../../../ui`)
- Removed duplicate/incorrect `deliveryListFiltersToQueryKey` test from `useQueueQueries.test.ts`
- Restored `AosSidebarNavLinks` import in `Sidebar.tsx`

---

## 13. Sign-off

| Milestone | Screens | Status |
|-----------|---------|--------|
| M13 | ST-12 Requirements Queue | Complete |
| M13 | ST-13 Prompts Queue | Complete |
| M13 | ST-14 Cursor Queue | Complete |
| M13 | ST-15 Evaluation Queue | Complete |

**Sprint 4 complete. STOP — Registry, Knowledge, and Dashboard not started.**
