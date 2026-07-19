# Sprint 2 Report — M4 + M5 + M6 Screens

**Stage D2 — Sprint 2**  
**Date:** July 19, 2026  
**Status:** Complete  
**Next:** Milestone M7 (ST-05 Requirements) — **not started**

---

## Executive Summary

Sprint 2 implements the three locked Phase 1A delivery screens — **ST-02 Delivery List**, **ST-03 Create Engagement**, and **ST-04 Engagement Hub shell** — reusing Sprint 1 UI foundation components exclusively. No domain, application, infrastructure, or contract layers were modified. One presentation-safe constants file (`aos/constants/deliveryState.ts`) was added for import-boundary compliance.

| Verification | Result |
|--------------|--------|
| `npm run build` | PASS |
| `npm run test:aos` | PASS — 13 files, 44 tests |
| `npm run aos:validate` | PASS |

---

## 1. Screens Created

| ST | Screen | Path | Route |
|----|--------|------|-------|
| ST-02 | `DeliveryListScreen` | `aos/presentation/screens/delivery-list/DeliveryListScreen.tsx` | `/aos/delivery` |
| ST-03 | `CreateEngagementScreen` | `aos/presentation/screens/create-engagement/CreateEngagementScreen.tsx` | `/aos/delivery/new` |
| ST-04 | `EngagementHubLayoutScreen` | `aos/presentation/screens/engagement-hub/EngagementHubLayoutScreen.tsx` | `/aos/delivery/:engagementId/*` |

### ST-04 tab placeholders (shell only — M7+ deferred)

| Tab | Screen | Route segment |
|-----|--------|---------------|
| Overview | `EngagementOverviewScreen` | `` (index) |
| Requirements | `EngagementRequirementsPlaceholder` | `requirements` |
| Reuse | `EngagementReusePlaceholder` | `reuse` |
| Prompts | `EngagementPromptsPlaceholder` | `prompts` |
| Cursor | `EngagementCursorPlaceholder` | `cursor` |
| Evaluation | `EngagementEvaluationPlaceholder` | `evaluation` |
| QA / Handoff | `EngagementQaPlaceholder` | `qa` |
| Retrospective | `EngagementRetrospectivePlaceholder` | `retrospective` |

### Route adapters (pages)

| Page | Role |
|------|------|
| `AosDeliveryPage.tsx` | ST-02 gate + screen |
| `AosCreateEngagementPage.tsx` | ST-03 gate + screen |
| `AosEngagementHubPage.tsx` | ST-04 gate + layout shell |

---

## 2. Folder Tree (Sprint 2 additions)

```
aos/
├── constants/
│   └── deliveryState.ts              (NEW — UI-safe lifecycle labels)
├── hooks/
│   ├── useAosScope.ts                (NEW)
│   ├── queries/
│   │   ├── deliveryListFilters.ts    (NEW)
│   │   ├── useDeliveryListQuery.ts   (NEW)
│   │   ├── useDeliveryEngagementQuery.ts (NEW)
│   │   └── useErpCustomersQuery.ts   (NEW)
│   └── mutations/
│       └── useCreateEngagementMutation.ts (NEW)
├── pages/
│   ├── AosDeliveryPage.tsx           (UPDATED)
│   ├── AosCreateEngagementPage.tsx   (NEW)
│   └── AosEngagementHubPage.tsx      (NEW)
└── presentation/
    └── screens/
        ├── delivery-list/
        │   ├── DeliveryListScreen.tsx
        │   └── useDeliveryListScreenState.ts
        ├── create-engagement/
        │   └── CreateEngagementScreen.tsx
        └── engagement-hub/
            ├── EngagementHubLayoutScreen.tsx
            ├── EngagementContextProvider.tsx
            ├── EngagementTabPlaceholder.tsx
            ├── engagementHubTabs.ts
            ├── overview/EngagementOverviewScreen.tsx
            ├── requirements/…
            ├── reuse/…
            ├── prompts/…
            ├── cursor/…
            ├── evaluation/…
            ├── qa/…
            └── retrospective/…
```

---

## 3. Reuse Percentage

| Metric | Value |
|--------|-------|
| Sprint 1 catalog components available | 37 UI IDs + 5 layouts + 3 gates |
| Sprint 1 components used in Sprint 2 | **28 of 45** (62%) |
| Sprint 1 components required by ST-02/03/04 docs | **~90%** of doc-listed IDs |
| New UI catalog components (C-xxx) | **0** |
| Duplicate UI components created | **0** |

**Interpretation:** Sprint 2 achieves **100% reuse compliance** (no duplicate primitives). Overall catalog utilization is 62% because Sprint 1 built ahead for M7+ (dialogs, toasts, SidePanel, etc.) not yet needed for these three screens.

---

## 4. Component Reuse Matrix

| Sprint 1 Component | ID | ST-02 | ST-03 | ST-04 | Notes |
|--------------------|-----|-------|-------|-------|-------|
| Button | C-001 | ✓ | ✓ | — | Create, retry, submit, cancel |
| IconButton | C-002 | — | — | — | Not required |
| ButtonGroup | C-003 | — | — | — | Not required |
| LinkButton | C-004 | ✓ | ✓ | — | ERP customer sidecar |
| FormField | C-005 | — | ✓ | — | |
| TextInput | C-006 | — | ✓ | — | |
| TextArea | C-007 | — | ✓ | — | |
| Select | C-008 | ✓ | ✓ | — | Filters + form fields |
| SearchInput | C-009 | ✓ | ✓ | — | List search + customer search |
| Checkbox | C-010 | — | — | — | Not required |
| Radio | C-010 | — | — | — | Not required |
| Switch | C-010 | — | — | — | Not required |
| FormSection | C-011 | — | ✓ | — | |
| DataTable | C-012 | ✓ | — | — | md+ table |
| TableToolbar | C-013 | ✓ | — | — | |
| FilterBar | C-014 | ✓ | — | — | |
| FilterChip | C-015 | ✓ | — | — | |
| Pagination | C-016 | ✓ | — | — | Load more |
| Card | C-017 | ✓ | — | — | sm card-list |
| Dialog | C-070 | — | — | — | M7+ |
| Toast | C-074 | — | — | — | M7+ |
| InAppAlert | C-075 | ✓ | ✓ | ✓ | Feature disabled |
| EmptyState | C-080 | ✓ | — | — | |
| LoadingState | C-081 | ✓ | ✓ | ✓ | |
| ErrorState | C-082 | ✓ | ✓ | ✓ | |
| SkeletonBlock | C-083 | ✓ | ✓ | ✓ | Tab placeholders |
| PageShell | — | ✓ | ✓ | ✓ | |
| PageHeader | — | ✓ | ✓ | ✓ | |
| ContextBanner | — | — | — | ✓ | Lifecycle strip |
| StickyFooterBar | — | — | ✓ | — | Full-page form actions |
| Breadcrumb | C-062 | — | ✓ | ✓ | |
| EngagementTabBar | C-061 | — | — | ✓ | URL-synced tabs |
| SidePanel | C-063 | — | — | — | M7+ |
| PermissionGate | C-090 | ✓ | ✓* | — | *ST-03 uses Navigate redirect |
| FeatureFlagGate | C-091 | ✓ | ✓ | ✓ | |
| LockedOverlay | C-092 | — | — | — | Not required yet |

---

## 5. New Artifacts (Non-UI)

| Artifact | Type | Purpose |
|----------|------|---------|
| `aos/constants/deliveryState.ts` | Constants | UI-safe lifecycle labels (import boundary) |
| `useAosScope` | Hook | Actor/read scope from ERP auth |
| `useDeliveryListQuery` | Hook | TanStack Query → `listCompanyDeliveries` |
| `useDeliveryEngagementQuery` | Hook | TanStack Query → `getEngagement` |
| `useErpCustomersQuery` | Hook | ERP `CustomerService.getCustomers` for ST-03 select |
| `useCreateEngagementMutation` | Hook | TanStack Mutation → `createEngagement` |
| `useDeliveryListScreenState` | UI state hook | URL filter/sort sync |
| `EngagementContextProvider` | Context | Hub engagement snapshot |
| `EngagementTabPlaceholder` | Screen helper | Skeleton tab panels (not C-xxx) |

**No new C-xxx catalog components.**

---

## 6. ST-02 Feature Coverage

| Requirement | Implementation |
|-------------|----------------|
| Search | `SearchInput` + URL `q` param |
| Filters | Status, lead, customer via `FilterBar` + `Select` |
| Pagination | `Pagination` load-more with Firestore cursor |
| Sorting | Client-side sort on title/status/updatedAt with URL sync |
| Empty state | `EmptyState` + create CTA |
| Loading | `DataTable` skeleton + loading flags |
| Error | `ErrorState` + retry preserves URL filters |
| Permission denied | `PermissionGate` hides create; route gate redirects |
| Feature disabled | `FeatureFlagGate` + `InAppAlert` |
| Responsive sm | Card-list variant with `Card` + chevron |
| Row navigation | → `/aos/delivery/:id` |
| Create navigation | → `/aos/delivery/new` |

---

## 7. ST-03 Feature Coverage

| Requirement | Implementation |
|-------------|----------------|
| Full page (no modal) | `PageShell` + form + `StickyFooterBar` |
| ERP customer searchable select | `SearchInput` (300ms debounce) + `Select` |
| Form fields | Title, scope, delivery lead, agency/engagement type |
| Permission gate | Redirect to list without `ENGAGEMENTS_MANAGE` |
| Success navigation | → `/aos/delivery/:newId` |
| Cancel | → `/aos/delivery` |
| Loading/error | `SkeletonBlock`, `ErrorState`, inline `InAppAlert` |

---

## 8. ST-04 Shell Coverage

| Requirement | Implementation |
|-------------|----------------|
| PageShell + PageHeader | ✓ |
| ContextBanner | Lifecycle + customer context |
| EngagementTabBar | 8 tabs, keyboard nav |
| URL deep links | Tab path segments synced |
| Lazy tab chunks | `React.lazy` in `App.tsx` |
| EngagementContextProvider | Engagement DTO + refetch |
| Domain tab content | **Not implemented** — skeleton placeholders only |

---

## 9. Performance & Bundle Impact

| Chunk | Sprint 1 (M0A) | Sprint 2 | Delta |
|-------|----------------|----------|-------|
| `index-*.js` (main) | 1,114 kB | 1,118 kB | +4 kB |
| `AosDeliveryPage` | ~0.3 kB placeholder | **15.4 kB** | +15 kB |
| `AosCreateEngagementPage` | — | **10.3 kB** | new |
| `AosEngagementHubPage` | — | **5.2 kB** | new |
| Tab placeholder chunks | — | lazy (small) | code-split |

**Observations:**
- Screen code is lazy-loaded — main bundle growth is minimal (+4 kB)
- Delivery list pulls shared UI (`DataTable`, `ToastProvider` deps) into route chunks
- Customer query reuses existing `customerService` — no duplicate Firestore client
- Tab placeholders lazy-load per M6 acceptance criteria

---

## 10. Accessibility

| Area | Coverage |
|------|----------|
| ST-02 table | Sortable headers with `aria-sort`; row keyboard activation |
| ST-02 search | `SearchInput` Escape-to-clear, labelled input |
| ST-03 form | `FormField` label association, `aria-invalid` on errors |
| ST-04 tabs | `role="tablist/tab"`, Arrow/Home/End keyboard nav |
| ST-04 panels | `role="tabpanel"` + `aria-labelledby` on placeholders |
| Error regions | `role="alert"` on `ErrorState` |
| Loading | `role="status"` on `LoadingState` |

### Tests added
- `engagementHubTabs.test.ts` — URL tab resolution
- `deliveryListFilters.test.ts` — query key serialization
- Existing Sprint 1 a11y tests retained (44 total aos tests)

---

## 11. Architecture Compliance

| Rule | Status |
|------|--------|
| Screens call hooks; UI components remain dumb | PASS |
| No Firestore in presentation | PASS |
| No domain imports in screens/hooks | PASS (via `aos/constants/deliveryState`) |
| No application/infrastructure changes | PASS |
| Import boundaries | PASS |
| Pages are thin route adapters | PASS (~15 lines each) |
| Create route sibling to hub | PASS (`/aos/delivery/new`) |
| Hub nested routes | PASS (`/aos/delivery/:engagementId/*`) |

---

## 12. Known Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Customer list via ERP service, not AOS read port | Medium | Documented M5 hook; no list port in frozen contracts |
| Client-side sort/filter on fetched page | Low | API lacks sort param; acceptable for Phase 1A page size |
| Load-more replaces cursor in URL only | Low | Full infinite scroll deferred |
| Tab placeholders use generic skeleton | Low | M7+ replaces with domain screens |
| Screen integration test blocked by Firebase in jsdom | Low | Unit tests cover tab URL + filter keys |
| C-050 LifecycleBadge not implemented | Low | Inline status label used per Sprint 1 gap |

---

## 13. Remaining Milestones (Not Started)

| Milestone | Screen | Status |
|-----------|--------|--------|
| M7 | ST-05 Requirements | Not started |
| M8 | ST-07 Prompts | Not started |
| M9 | ST-08 Cursor | Not started |
| M10 | ST-09 Evaluation | Not started |
| M11 | ST-06 Reuse | Not started |
| M12 | ST-10 QA + ST-11 Retro | Not started |
| M13 | ST-12–15 Queues | Not started |
| M14–M16 | Registry, Knowledge, Dashboard | Not started |

---

## 14. Verification Log

```
npm run build          → PASS (46.7s)
npm run test:aos       → PASS — 13 files, 44 tests (35.9s)
npm run aos:validate   → PASS — 7 converter checks
Import boundaries      → PASS
```

---

## 15. Sign-off

| Milestone | Status |
|-----------|--------|
| M4 — ST-02 Delivery List | Complete |
| M5 — ST-03 Create Engagement | Complete |
| M6 — ST-04 Engagement Hub shell | Complete |
| M7 — Requirements | Not started |

**Sprint 2 complete. STOP — no M7 work begun.**
