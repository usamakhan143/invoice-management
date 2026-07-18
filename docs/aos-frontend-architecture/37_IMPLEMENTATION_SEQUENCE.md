# 37 — Implementation Sequence

**Stage D1.6 — AOS Frontend Engineering Freeze**  
**Status:** Frozen — exact D2 order

This document is the **D2 execution plan**. Implement milestones in order unless parallel track noted. Do not skip acceptance criteria.

---

## Dependency Graph (High Level)

```
M0 Foundation
    ├── M1 UI Primitives Batch A
    ├── M2 UI Primitives Batch B
    └── M3 Gates + Layouts
            ├── M4 ST-02 Delivery List
            ├── M5 ST-03 Create Engagement
            └── M6 Engagement Hub Shell (ST-04 layout + tabs)
                    ├── M7 ST-05 Requirements
                    ├── M8 ST-07 Prompts
                    ├── M9 ST-08 Cursor
                    ├── M10 ST-09 Evaluation
                    ├── M11 ST-06 Reuse
                    ├── M12 ST-10 QA + ST-11 Retro
                    ├── M13 ST-12–15 Queues
                    ├── M14 ST-16–17 Registry
                    ├── M15 ST-18 Knowledge
                    └── M16 ST-01 Dashboard + ST-19 Playbook
```

**Parallel allowed:**

- M1 + M2 after M0 (two developers — batch A vs B)  
- M13 queues after M7–M10 hooks patterns established  
- M14–M15 parallel after M3  
- M16 dashboard last — depends on queue + engagement patterns  

---

## Milestone 0 — Foundation

### Scope

- Folder consolidation per [30 Frontend Architecture](./30_FRONTEND_ARCHITECTURE.md)  
- Add TanStack Query v5 + optional `@tanstack/react-virtual`  
- `aos/theme/tokens.css` — semantic token CSS variables  
- Tailwind `@theme` extension mapping tokens  
- `AosServicesProvider`, `QueryClientProvider`  
- `aos/wiring/createAosPresentationServices.ts`  
- `useAosServices()` hook  
- `aos/hooks/queries/keys.ts`  
- Import boundary eslint rule (documented)  
- Migrate `AosRouteGate` → `presentation/gates/`  
- Deprecate duplicate `aos/components/` paths  

### Acceptance criteria

- [ ] Providers wrap all `/aos/*` routes in App.tsx  
- [ ] Sample query hook calls `GetDeliveryEngagementQuery` with mock/in-memory service in test  
- [ ] No UI file imports `firebase/firestore`  
- [ ] Token smoke page internally (delete before M1 complete) — optional dev-only  

### Engineering Readiness Checklist (M0 exit — mandatory before Milestone 1)

All items **must pass** before M1 starts:

- [ ] `npm run build`
- [ ] `npm run test:aos`
- [ ] `npm run aos:validate`
- [ ] ESLint import boundaries pass
- [ ] No forbidden imports (per [30 Frontend Architecture](./30_FRONTEND_ARCHITECTURE.md))
- [ ] TanStack Query installed
- [ ] Theme tokens mapped (`aos/theme/tokens.css` + Tailwind `@theme`)
- [ ] Providers wired (`AosServicesProvider`, `QueryClientProvider`)
- [ ] Wiring verified (`aos/wiring/createAosPresentationServices.ts` + `useAosServices()`)
- [ ] Bundle baseline captured (record chunk sizes for AOS routes at M0 completion)
- [ ] Architecture compliance check PASS (layers, imports, precedence per [29 Implementation Contract](../aos-design-freeze/29_IMPLEMENTATION_CONTRACT.md))

**Rule:** Milestone 1 must not begin until every box above is checked.

### Entry criteria for D2

- D1.5 design freeze accepted  
- This document accepted  

---

## Milestone 1 — UI Primitives Batch A

### Components (C-xxx)

C-001 Button, C-002 IconButton, C-003 ButtonGroup, C-004 LinkButton  
C-005 FormField, C-006 TextInput, C-007 TextArea, C-008 Select, C-009 SearchInput, C-010 Checkbox/Radio/Switch, C-011 FormSection  
C-080 EmptyState, C-081 LoadingState, C-082 ErrorState, C-083 SkeletonBlock  

### Acceptance criteria

- [ ] Each component has Vitest + axe test  
- [ ] All design system states represented  
- [ ] UI Review checklist for primitives PASS  

---

## Milestone 2 — UI Primitives Batch B

### Components

C-012 DataTable, C-013 TableToolbar, C-014 FilterBar, C-015 FilterChip, C-016 Pagination  
C-017 Card, C-018 CardHeader/Body/Footer  
C-070 Dialog base, C-071 ConfirmationDialog, C-072 ApprovalDialog, C-073 DangerDialog  
C-074 Toast, C-075 InAppAlert, C-076 NotificationBadge  

### Acceptance criteria

- [ ] DataTable compact + comfortable density props  
- [ ] Dialog focus trap verified  
- [ ] Toast stack max 3  

---

## Milestone 3 — Gates + Layouts

### Components / layouts

PageShell, PageHeader, ContextBanner, ContentGrid, StickyFooterBar  
C-060 AosNavItem (AOS content nav if any), C-062 Breadcrumb, C-063 SidePanel  
C-090 PermissionGate, C-091 FeatureFlagGate, C-092 LockedOverlay  
C-061 EngagementTabBar  

### Acceptance criteria

- [ ] Layouts compose with tokens only  
- [ ] PermissionGate hides nav per fail-closed  
- [ ] EngagementTabBar keyboard + URL sync contract documented in screen README  

---

## Milestone 4 — ST-02 Delivery List

### Screen

`DeliveryListScreen` — ST-02  
Hooks: `useDeliveryListQuery`, URL filter sync  
Page: update `AosDeliveryPage`  

### Components used

C-012–C-016, C-050, C-051, layouts, gates  

### Acceptance criteria

- [ ] UI-Review ST-02 PASS  
- [ ] Row click navigates to `/aos/delivery/:id`  
- [ ] Create button → ST-03 route  
- [ ] Loading/empty/error states  
- [ ] Responsive card-list sm  

---

## Milestone 5 — ST-03 Create Engagement

### Screen

`CreateEngagementScreen` — ST-03  
Hooks: `useCreateEngagementMutation`, `useErpCustomersQuery`  
Route: add `/aos/delivery/new` in App.tsx  

### Acceptance criteria

- [ ] UI-Review ST-03 PASS  
- [ ] ERP customer searchable select  
- [ ] Success navigates to engagement overview  
- [ ] Permission + flag gated  

---

## Milestone 6 — Engagement Hub Shell

### Screen

`EngagementHubLayoutScreen` + nested `<Outlet />`  
Routes: `/aos/delivery/:engagementId/*`  
Hooks: `useDeliveryEngagementQuery`, `EngagementContextProvider`  
Placeholder tab screens (skeleton only)  

### Acceptance criteria

- [ ] UI-Review ST-04 shell PASS (tabs + header + banner)  
- [ ] Deep link to tab works  
- [ ] Lazy tab chunks  
- [ ] E2E-02 path  

---

## Milestone 7 — ST-05 Requirements

### Components

C-040, C-030, C-031, C-032, C-033, C-034, C-035  
Hooks: requirement queries + approve mutation  

### Acceptance criteria

- [ ] UI-Review ST-05 PASS  
- [ ] Full approval flow with ApprovalDialog  
- [ ] AI draft banner  
- [ ] No optimistic approve  
- [ ] E2E-04 partial (view + dialog open)  

---

## Milestone 8 — ST-07 Prompts

### Components

C-041, handoff strip pattern  
Hooks: prompt pack query + approve mutation  

### Acceptance criteria

- [ ] UI-Review ST-07 PASS  
- [ ] Unapproved pack blocks Cursor tab dot logic  

---

## Milestone 9 — ST-08 Cursor

### Components

C-042, capture form  
Hooks: sessions query + capture mutation + polling  

### Acceptance criteria

- [ ] UI-Review ST-08 PASS  
- [ ] Polling active session 30s  
- [ ] Copy prompt toast  

---

## Milestone 10 — ST-09 Evaluation

### Components

C-043, rubric row sub-component  
Hooks: evaluation query + run mutation + polling  

### Acceptance criteria

- [ ] UI-Review ST-09 PASS  
- [ ] Pass/fail primary, score caption secondary  
- [ ] Fail shows InAppAlert  

---

## Milestone 11 — ST-06 Reuse

### Components

C-045, C-044  
Hooks: reuse assessment query  

### Acceptance criteria

- [ ] UI-Review ST-06 PASS  
- [ ] Tab soft-disabled until requirements gate  

---

## Milestone 12 — ST-10 QA + ST-11 Retrospective

### Screens

QA handoff, Retrospective + full Timeline C-053/C-054  

### Acceptance criteria

- [ ] UI-Review ST-10, ST-11 PASS  
- [ ] Timeline append-only display  

---

## Milestone 13 — ST-12–15 Global Queues

### Screens

Four queue screens sharing `QueueScreenTemplate` internal layout  

### Hooks

One queue query hook each  

### Acceptance criteria

- [ ] UI-Review ST-12–15 PASS  
- [ ] Row → engagement tab navigation  
- [ ] No inline approve  
- [ ] Nav badge counts from query  

---

## Milestone 14 — ST-16–17 Registry

### Acceptance criteria

- [ ] UI-Review ST-16–17 PASS  
- [ ] SidePanel detail  
- [ ] Search + filters per doc 26  

---

## Milestone 15 — ST-18 Knowledge

### Acceptance criteria

- [ ] UI-Review ST-18 PASS  
- [ ] KnowledgeCard list + SidePanel  

---

## Milestone 16 — ST-01 Dashboard + ST-19 Playbook

### Components

C-020, C-021, C-022, C-024 + dashboard layout  
Playbook static content  

### Acceptance criteria

- [ ] UI-Review ST-01, ST-19 PASS  
- [ ] AttentionQueue navigates to engagement tabs  
- [ ] Dashboard partial error isolation  
- [ ] E2E-01, E2E-05 complete  

---

## Component Build Order (Reference)

| Order | Component IDs |
|-------|---------------|
| 1 | C-001–C-004, C-080–C-083 |
| 2 | C-005–C-011 |
| 3 | C-017–C-018, C-070–C-076 |
| 4 | C-012–C-016 |
| 5 | C-090–C-092, layouts, C-061–C-063 |
| 6 | C-050–C-052 |
| 7 | C-040, C-030–C-035, C-031 |
| 8 | C-041, C-042 |
| 9 | C-043 |
| 10 | C-044, C-045 |
| 11 | C-020–C-024, C-053–C-054 |
| 12 | C-022, C-023 |

---

## D2 Exit Criteria (Phase 1 UI Complete)

- [ ] All ST-01–ST-20 templates implemented (ST-20 embedded)  
- [ ] All C-xxx catalog components implemented  
- [ ] UI Review PASS on every screen  
- [ ] E2E-01 through E2E-05 pass  
- [ ] `npm run test:aos` pass  
- [ ] No import boundary violations  
- [ ] No design freeze blockers open  

---

## Related Documents

- [30 Frontend Architecture](./30_FRONTEND_ARCHITECTURE.md)
- [21 Screen Templates](../aos-design-freeze/21_SCREEN_TEMPLATES.md)
- [29 Implementation Contract](../aos-design-freeze/29_IMPLEMENTATION_CONTRACT.md)
