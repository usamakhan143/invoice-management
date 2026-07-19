# 04 — Component Reuse Audit

**Reference:** `docs/aos-frontend-architecture/31_COMPONENT_ARCHITECTURE.md`, Sprint 1 catalog  
**Scope:** `aos/presentation/ui/`, `aos/presentation/screens/`

---

## Catalog Inventory

| Category | Implemented | Deferred | Total defined |
|----------|:-----------:|:--------:|:-------------:|
| Base UI (C-001–C-018) | 18 | 0 | 18 |
| Dashboard/AI (C-020–C-035) | 13 | 0 | 13 |
| Engagement (C-040–C-054) | 14 | 0 | 14 |
| Navigation (C-061–C-063) | 3 | 1 (C-060) | 4 |
| Dialogs (C-070–C-076) | 7 | 0 | 7 |
| States (C-080–C-083) | 4 | 0 | 4 |
| Gates (C-090–C-092) | 3 | 0 | 3 |
| **Total** | **56** | **1** | **57 active** |

C-060 `AosNavItem` deferred — `AosSidebarNavLinks.tsx` uses raw `NavLink` + C-076 `NotificationBadge`.

---

## Reuse Statistics by Screen Category

| Screen group | Catalog reuse % | Notes |
|--------------|:-----------------:|-------|
| Queue screens (ST-12–15) | **~95%** | Shared `QueueScreenTemplate.tsx` |
| Engagement tabs (ST-05–11) | **~85%** | C-030–035, C-040–043, C-072, C-023 |
| Founder dashboard (ST-01) | **~88%** | 4 new components (C-020–022, C-024); rest catalog |
| Catalog lists (ST-16, 18, 19) | **~80%** | Primitives reused; screen logic duplicated |
| Delivery list (ST-02) | **~75%** | Largest one-off surface (454 lines) |
| Create engagement (ST-03) | **~82%** | Form catalog + ERP selects |

**Overall catalog reuse estimate:** **~84%** of presentation UI surface area uses frozen catalog components.

---

## Unnecessary / Dead Components

| Item | Location | Status |
|------|----------|--------|
| `AosPlaceholderLayout` | `presentation/components/` | **Exported, never imported** at runtime |
| `EngagementTabPlaceholder` | `engagement-hub/` | **Dead code** — all tabs have real screens |
| Empty barrels | `utils/index.ts`, `shared/index.ts`, `services/index.ts`, `hooks/ui/index.ts` | `export {}` — placeholder only |
| `screens/index.ts` | Partial exports | Pages import screens directly, barrel unused |

---

## Duplication Findings

### D-01: Catalog SidePanel trio (~70 lines each)

Identical loading → error → detail pattern:

- `KnowledgeDetailSidePanel` in `KnowledgeScreen.tsx`
- `RegistryModuleSidePanel` in `RegistryScreen.tsx`
- `PlaybookEntrySidePanel` in `PlaybookScreen.tsx`

**Consolidation opportunity:** `CatalogDetailSidePanel<T>` wrapper — estimated **~200 lines** saved.

---

### D-02: Catalog list screens (~270–330 lines each)

Shared toolbar: `PageShell` + `PageHeader` + `SearchInput` + `FilterBar` + `Select` + card grid + SidePanel.

- `KnowledgeScreen.tsx` (331 lines)
- `RegistryScreen.tsx` (271 lines)
- `PlaybookScreen.tsx` (308 lines)

**Consolidation opportunity:** `CatalogScreenTemplate` (queues already have `QueueScreenTemplate.tsx`) — estimated **~400 lines** saved.

---

### D-03: `formatUpdatedAt` copied 6×

Identical date formatter in:

- `DeliveryListScreen.tsx`
- 4 queue screens
- `RegistryDetailScreen.tsx` (`formatUsedAt`)

**Consolidation opportunity:** Single `presentation/utils/formatRelativeTime.ts`.

---

### D-04: Engagement workflow boilerplate (7 tabs)

Each tab repeats:

```tsx
if (isLoading) return <LoadingState … />;
if (isError) return <ErrorState … />;
if (!gate) return <WaitingStatePanel … />;
```

**Consolidation opportunity:** `useEngagementWorkflowScreen()` hook or `WorkflowTabShell`.

---

### D-05: Search utilities (application layer)

`normalizeSearch()` duplicated in:

- `knowledgeSearch.ts`
- `registrySearch.ts`

`playbookSearch.ts` inlines same logic. Structural duplication across 3 `filterAndRank*` functions.

---

### D-06: Badge/chip styling overlap

- C-050 `LifecycleBadge`
- C-051 `StatusChip`
- C-052 `GateChip`

ST-02 defines local `StatusLabel` duplicating C-050 pill styles instead of importing `LifecycleBadge`.

---

### D-07: KnowledgeCard vs RegistryCard

Both in `EngagementComponents.tsx` share interactive Card + keyboard handler + StatusChip meta (~40 lines). Partially consolidated via C-017 Card base; could extract `SelectableCatalogCard`.

---

## Components Correctly Not Duplicated

| Decision | Evidence |
|----------|----------|
| Extended C-044/C-045 for catalog mode | Registry and Knowledge screens reuse domain cards |
| Queue template shared | 4 queue screens use one template |
| Dialog family composes C-070 | Approval, Confirmation, Danger dialogs share base |
| No duplicate DataTable | Single C-012 used in delivery list and registry detail |

---

## New Components Justified (M16)

| ID | Component | Justification |
|----|-----------|---------------|
| C-020 | AttentionQueue | Founder-specific; no catalog equivalent |
| C-021 | AttentionItem | Paired with C-020 |
| C-022 | NextBestActionCard | Single-CTA decision surface |
| C-024 | RiskPanel | Factual risk display (not generic alert) |

No duplicate attention/NBA/risk components found elsewhere.

---

## Reuse Audit Score

| Metric | Value |
|--------|------:|
| Catalog coverage | **56/57 = 98%** of defined IDs |
| Runtime reuse ratio | **~84%** |
| Dead component count | **2** |
| High-impact duplication clusters | **7** |
| Estimated consolidatable LOC | **~700–900** |

---

## Verdict

Component architecture **follows the frozen catalog discipline** with strong queue and engagement tab reuse. **Screen-level duplication** in catalog lists and SidePanel orchestration is the primary maintainability risk — not component proliferation. No evidence of reckless one-off component creation.
