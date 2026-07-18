# M0A — Engineering Foundation Report

**Stage D2 — Milestone M0A**  
**Date:** July 18, 2026  
**Status:** Complete  
**Next:** Milestone M1 (UI Primitives Batch A) — **not started**

---

## 1. Folder Tree (AOS presentation + engineering)

```
aos/
├── architecture/
│   ├── importBoundaryRules.ts
│   ├── importBoundaries.test.ts
│   └── verifyImportBoundaries.ts
├── hooks/
│   ├── mutations/index.ts          (placeholder)
│   ├── queries/
│   │   ├── index.ts
│   │   └── keys.ts
│   ├── ui/index.ts                 (placeholder)
│   ├── useAosServices.ts
│   └── useAosServices.test.ts
├── presentation/
│   ├── gates/
│   │   ├── AosRouteGate.tsx        (migrated from components/)
│   │   └── index.ts
│   ├── layouts/
│   │   ├── AosProvidersLayout.tsx
│   │   └── index.ts
│   ├── providers/
│   │   ├── AosProviders.tsx
│   │   ├── AosQueryProvider.tsx
│   │   ├── AosServicesContext.ts
│   │   ├── AosServicesProvider.tsx
│   │   ├── createAosQueryClient.ts
│   │   └── index.ts
│   ├── screens/index.ts            (placeholder)
│   └── ui/index.ts                 (placeholder)
├── theme/
│   └── tokens.css
└── wiring/
    ├── createAosPresentationServices.ts
    ├── createAosPresentationServices.test.ts
    ├── index.ts
    └── types.ts
```

---

## 2. Dependencies Installed

| Package | Scope | Version (resolved) |
|---------|-------|-------------------|
| `@tanstack/react-query` | dependencies | ^5.x |
| `@tanstack/react-virtual` | dependencies | ^3.x |
| `@tanstack/react-query-devtools` | devDependencies | ^5.x |

No other libraries added.

---

## 3. Providers Created

| Provider | File | Role |
|----------|------|------|
| `AosServicesProvider` | `presentation/providers/AosServicesProvider.tsx` | Injects `AosPresentationServices` |
| `AosQueryProvider` | `presentation/providers/AosQueryProvider.tsx` | TanStack Query client + dev-only devtools (lazy) |
| `AosProviders` | `presentation/providers/AosProviders.tsx` | Combined stack |
| `AosProvidersLayout` | `presentation/layouts/AosProvidersLayout.tsx` | Wraps all `/aos/*` routes in `App.tsx` |

---

## 4. Wiring

| Artifact | Purpose |
|----------|---------|
| `createAosPresentationServices()` | Composition root — `DeliveryApplicationService` + existing infra factories |
| `useAosServices()` | Hook access to presentation services |
| `aosQueryKeys` | Centralized TanStack Query key factory |
| `createAosQueryClient()` | Frozen default query/mutation options |

**Injection path:** Tests and future Storybook pass `{ delivery: mockService }` to skip infrastructure.

**Runtime path:** Default factory uses existing `createAosDeliveryRepositories()` + `createAosDeliveryReadPorts()`.

---

## 5. Import Boundary Verification

| Check | Result |
|-------|--------|
| `npm run aos:import-boundaries` | **PASS** |
| `aos/architecture/importBoundaries.test.ts` | **PASS** |
| Rules source | `aos/architecture/importBoundaryRules.ts` |
| Exempt | `aos/wiring/`, `aos/presentation/providers/` |

Forbidden patterns enforced for `presentation/ui`, `screens`, `layouts`, `gates`, `hooks`, `pages`.

---

## 6. Architecture Compliance

| Constraint | Status |
|------------|--------|
| ADR-015 — UI → application only | ✓ Hooks/services provider; no UI→Firestore |
| Frontend Architecture layer model | ✓ Folders + gates migration |
| No new components/screens | ✓ Placeholders only |
| tokens.css semantic names only | ✓ All values `unset` |
| TanStack Query v5 | ✓ Installed + provider |
| Design docs unchanged | ✓ |

**Build blocker fix (minimal):** Corrected import paths in `createAosDeliveryReadPorts.ts` (`../../../services/firebase`, `../../integration/ports/...`) — pre-existing defect surfaced by wiring in Vite bundle.

---

## 7. Verification Commands

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run test:aos` | **PASS** (29 tests) |
| `npm run aos:validate` | **PASS** (7 converter checks) |
| `npm run aos:import-boundaries` | **PASS** |

---

## 8. Bundle Baseline (M0A — post-build)

| Chunk | Size | Gzip |
|-------|------|------|
| `dist/assets/index-*.js` (main) | 1,114.49 kB | 284.21 kB |
| `dist/assets/index-*.css` | 202.73 kB | 26.59 kB |
| AOS page chunks (each) | ~0.30–0.35 kB | ~0.24–0.27 kB |
| `AosRouteGate-*.js` | 4.15 kB | 1.36 kB |

**Note:** Main bundle includes AOS provider stack + Firebase wiring loaded via `AosProvidersLayout`. Per-page AOS lazy chunks remain minimal. Devtools lazy-loaded in dev only.

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Main bundle grows when visiting AOS routes | Accept M0A; code-split delivery service wiring in M1 if needed |
| `AosServicesProvider` recreates services if `servicesOptions` reference changes | App uses default (no inline options) |
| ESLint plugin not added — boundaries via script + vitest | Sufficient for M0A; optional eslint-plugin-import later |
| Full wiring test requires Firebase browser context | Deferred to integration/E2E; unit test uses injection |

---

## 10. Remaining Work (M0B / M1 — not started)

- [ ] Map token CSS values (visual — post M0A)
- [ ] Tailwind `@theme` extension from tokens
- [ ] M1 UI primitives (C-001–C-011, C-080–C-083)
- [ ] Sample `useDeliveryEngagementQuery` hook
- [ ] Consolidate legacy `aos/components/` into `presentation/ui/` during M1
- [ ] Optional: ESLint flat config for import boundaries

---

## Stop Condition

**M0A complete.** Do not proceed to M1 in this sprint.
