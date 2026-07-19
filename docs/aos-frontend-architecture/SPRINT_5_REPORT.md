# Sprint 5 Report — M14 Registry (ST-16 → ST-17)

**Stage D2 — Sprint 5**  
**Date:** July 19, 2026  
**Status:** Complete  
**Next:** M15 (ST-18 Knowledge) — **not started**  
**Explicitly deferred:** Dashboard + Playbook (M16)

---

## Executive Summary

Sprint 5 implements **M14 — ST-16 Module Registry** and **ST-17 Module Detail**: agency-wide module catalog with keyword search, agency-type and status filters, SidePanel detail on ST-16, and full detail route at `/aos/registry/:moduleId`. All UI reuses frozen catalog components (C-045 RegistryCard, C-044 KnowledgeCard, C-063 SidePanel) with a Phase 1A in-memory registry application stub — no domain, Firestore, or infrastructure changes.

| Verification | Result |
|--------------|--------|
| `npm run build` | PASS |
| `npm run test:aos` | PASS — 19 files, 56 tests |
| `npm run aos:validate` | PASS — 7 converter checks |

---

## 1. Milestone & Governing Documents

| Item | Value |
|------|-------|
| **Milestone** | M14 — ST-16 & ST-17 Registry |
| **Implementation sequence** | `37_IMPLEMENTATION_SEQUENCE.md` § Milestone 14 |
| **Implementation contract** | `29_IMPLEMENTATION_CONTRACT.md` |
| **Screen templates** | `21_SCREEN_TEMPLATES.md` — ST-16, ST-17 |
| **Component architecture** | `31_COMPONENT_ARCHITECTURE.md` — `screens/registry/`, `screens/registry-detail/` |
| **Search & discovery** | `26_SEARCH_AND_DISCOVERY.md` — Registry search ranking + filters |

---

## 2. Acceptance Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| UI-Review ST-16–17 PASS | PASS | Grid catalog + SidePanel + full detail page |
| SidePanel detail | PASS | Opens on card select via `?module=` URL param |
| Search + filters per doc 26 | PASS | `q`, `agencyType`, `status`; 2-char min; exact ID > prefix > substring ranking |

---

## 3. Folder Tree (M14 additions)

```
aos/
├── application/registry/
│   ├── dto/ModuleRegistryDto.ts
│   ├── ModuleRegistryApplicationService.ts
│   ├── ModuleRegistryApplicationService.test.ts
│   ├── moduleRegistrySeed.ts
│   ├── registrySearch.ts
│   └── index.ts
├── hooks/queries/
│   ├── registryListFilters.ts
│   ├── useRegistryQueries.ts
│   └── useRegistryQueries.test.ts
├── pages/
│   ├── AosRegistryPage.tsx          (updated — ST-16)
│   └── AosRegistryDetailPage.tsx    (new — ST-17)
└── presentation/screens/
    ├── registry/
    │   ├── RegistryScreen.tsx
    │   └── useRegistryScreenState.ts
    └── registry-detail/
        └── RegistryDetailScreen.tsx
```

---

## 4. Components Reused

| ID | Component | Usage |
|----|-----------|-------|
| C-045 | RegistryCard | ST-16 grid + ST-17 expanded header (catalog mode extended) |
| C-044 | KnowledgeCard | ST-17 related knowledge links |
| C-063 | SidePanel | ST-16 module detail overlay |
| C-012 | DataTable | ST-17 usage history |
| C-009 | SearchInput | ST-16 toolbar search |
| C-014 | FilterBar | ST-16 agency type + status filters |
| C-015 | FilterChip | Active filter chips with clear-all |
| C-051 | PageHeader / PageShell | Both screens |
| C-004 | Breadcrumb | ST-17 wayfinding back to registry |
| C-080–C-083 | LoadingState, EmptyState, ErrorState, InAppAlert | Standard screen states |
| C-071 | LinkButton | Copy module ID, view detail, clear filters |

**RegistryCard extension (not duplicate):** Optional `status`, `version`, `reuseCount`, `onSelect` props add catalog mode per C-045 design-system spec while preserving reuse-assessment mode for ST-06.

---

## 5. New Hooks

| Hook | Query key | Purpose |
|------|-----------|---------|
| `useRegistryListQuery` | `["aos","registry","list", filters]` | ST-16 catalog list |
| `useRegistryModuleQuery` | `["aos","registry","detail", moduleId]` | SidePanel + ST-17 detail |

**URL state:** `useRegistryScreenState` syncs `q`, `agencyType`, `status`, `module` (SidePanel selection).

---

## 6. Screens Implemented

| ST | Screen | Route | Behavior |
|----|--------|-------|----------|
| ST-16 | `RegistryScreen` | `/aos/registry` | Search + filters → 2-col RegistryCard grid → SidePanel on select |
| ST-17 | `RegistryDetailScreen` | `/aos/registry/:moduleId` | Breadcrumb → expanded card → usage DataTable → KnowledgeCard links |

---

## 7. Application Layer (Phase 1A stub)

| Artifact | Role |
|----------|------|
| `ModuleRegistryApplicationService` | `listModules()` + `getModule()` |
| `moduleRegistrySeed.ts` | 6 seeded modules (includes `auth-firebase-v2`, `form-field-kit` aligned with ST-06) |
| `registrySearch.ts` | Keyword ranking: exact ID → name prefix → substring (doc §26) |
| `ModuleRegistryDto` | List + detail DTOs with usage history and knowledge links |

Wired via `createAosPresentationServices` → `services.registry`.

---

## 8. Bundle Impact

| Chunk | Before (M13) | After (M14) | Delta |
|-------|--------------|-------------|-------|
| `AosRegistryPage` | 0.38 kB (placeholder) | 5.67 kB | +5.29 kB |
| `AosRegistryDetailPage` | — | 3.70 kB | +3.70 kB (new lazy route) |
| `useRegistryQueries` | — | 0.49 kB | +0.49 kB (shared) |
| `SidePanel` | — | 1.35 kB | Shared chunk (also used by ST-05) |
| `EngagementComponents` | ~6.30 kB | 6.98 kB | +0.68 kB (RegistryCard catalog mode) |
| `index` (main) | 1,164.18 kB | 1,169.93 kB | +5.75 kB |

Registry routes remain lazy-loaded; no main-bundle regression beyond composition-root registry service wiring.

---

## 9. Accessibility Summary

| Area | Implementation |
|------|----------------|
| Search | `aria-label="Search modules"` on SearchInput |
| Filters | `aria-label` on agency type and status Select controls; FilterBar `role="group"` |
| SidePanel | `role="dialog"`, `aria-modal`, focus trap, Escape to close, backdrop labeled “Close panel” |
| RegistryCard (catalog) | `role="button"`, keyboard Enter/Space activation when selectable |
| Breadcrumb | `nav aria-label="Breadcrumb"` with `aria-current="page"` on current segment |
| Error states | `role="alert"` on ErrorState |
| DataTable | Compact usage history with link actions per row |

---

## 10. Test Summary

| Test file | Coverage |
|-----------|----------|
| `ModuleRegistryApplicationService.test.ts` | List filters; detail lookup; unknown module |
| `registrySearch` (via service test) | Exact ID ranking; min-char guard |
| `useRegistryQueries.test.ts` | Query key serialization |
| `createAosPresentationServices.test.ts` | Registry service wired |

**Totals:** 19 test files, 56 tests — all PASS.

---

## 11. Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Presentation calls hooks only | PASS | |
| No Firestore in presentation | PASS | |
| No domain entity changes | PASS | DTOs in application layer |
| No infrastructure / Firestore changes | PASS | In-memory seed catalog |
| No duplicate UI components | PASS | Extended C-045; reused C-044, C-063 |
| Frozen search ranking (doc 26) | PASS | |
| SidePanel detail on ST-16 | PASS | |
| Import boundaries | PASS | Screens → hooks → application DTOs |
| No new architecture documents | PASS | Sprint report only (established D2 pattern) |

---

## 12. Known Technical Debt

| Item | Severity | Description |
|------|----------|-------------|
| In-memory seed catalog | **High** | Not production-durable; resets on refresh |
| Static usage history | Medium | Mock engagement references in seed data |
| Knowledge links non-navigable | Low | KnowledgeCard displayed; ST-18 not implemented (M15) |
| No register-from-UI | Low | Phase 1 — retrospective promotion only (per ST-16) |
| Clipboard API | Low | `navigator.clipboard` may fail in non-HTTPS contexts |

---

## 13. Remaining Milestones (Not Started)

| Milestone | Scope | Status |
|-----------|-------|--------|
| M15 | ST-18 Knowledge Library | **Deferred per Sprint 5 stop rule** |
| M16 | ST-01 Dashboard + ST-19 Playbook | **Deferred per Sprint 5 stop rule** |

---

## 14. Verification Log

```
npm run build          → PASS (30.2s)
npm run test:aos       → PASS — 19 files, 56 tests (32.6s)
npm run aos:validate   → PASS — 7 converter checks
```

---

## 15. Sign-off

| Milestone | Screen | Status |
|-----------|--------|--------|
| M14 | ST-16 Module Registry | Complete |
| M14 | ST-17 Module Detail | Complete |

**Sprint 5 complete. STOP — Knowledge and Dashboard not started.**
