# 09 — Performance Audit

**Source:** Vite production build output (July 19, 2026), source inspection  
**Reference:** `docs/aos-frontend-architecture/34_PERFORMANCE_GUIDELINES.md`

---

## Bundle Analysis

### AOS Route Chunks (lazy-loaded)

| Chunk | Size | Gzip |
|-------|-----:|-----:|
| `AosDashboardPage` | 8.45 kB | 2.27 kB |
| `AosPlaybookPage` | 7.89 kB | 2.76 kB |
| `AosKnowledgePage` | 8.08 kB | 2.75 kB |
| `AosRegistryPage` | 5.60 kB | 2.25 kB |
| `AosRegistryDetailPage` | 3.63 kB | 1.49 kB |
| `AosDeliveryPage` | 10.22 kB | 3.52 kB |
| `AosCreateEngagementPage` | 6.25 kB | 2.64 kB |
| `AosEngagementHubPage` | 5.46 kB | 2.28 kB |
| Engagement tab screens | 1.5–3.5 kB each | lazy |
| Queue pages | via shared chunks | lazy |
| `AiComponents` | 6.53 kB | 1.52 kB |
| `EngagementComponents` | 8.55 kB | 2.25 kB |

**AOS-specific lazy loading:** All 14 `aos/pages/` routes loaded via `React.lazy()` in `App.tsx` (lines 42–78 area).

**Verdict:** Route-level code splitting is **correct and effective** — AOS pages do not bloat initial ERP load until navigated.

---

### Shared / Main Bundle Concern

| Chunk | Size | Gzip |
|-------|-----:|-----:|
| `index` (main) | **1,189.16 kB** | 303.90 kB |
| `react-pdf.browser` | 1,507.18 kB | 502.17 kB |

AOS services wired at composition root contribute to main bundle growth (~+12 kB from M15→M16 per implementation report). Main bundle exceeds Rollup 500 kB warning threshold.

**AOS wiring in main bundle:** `createAosPresentationServices.ts` instantiates Firestore repos and all 7 services — this pulls delivery infrastructure into the shared chunk even when user never visits AOS.

---

## Lazy Loading Assessment

| Asset | Lazy? | Evidence |
|-------|:-----:|----------|
| AOS pages | **Yes** | `App.tsx` lazy imports |
| Engagement tab screens | **Yes** | Individual lazy imports |
| DevTools (React Query) | **Yes** | `AosQueryProvider.tsx` conditional lazy |
| UI catalog components | **Partial** | Co-located in shared chunks pulled by first route |
| Firestore repos | **No** | Eager via wiring singleton |

---

## Memoization

| Pattern | Usage count | Assessment |
|---------|:-----------:|------------|
| `useMemo` | ~15 files | Used for filters, columns, scope, context values |
| `useCallback` | ~12 files | URL param updates, SidePanel close, tab focus |
| `React.memo` | **0** | No component memoization anywhere in `aos/` |

**Notable memoization:**

- `DeliveryListScreen.tsx` — `rows`, `columns`, `leadOptions`, `customerOptions` memoized
- `useAosScope.ts` — scope object memoized on auth deps
- Screen state hooks — filter objects memoized from URL params

**Gap:** Large list screens (delivery list, catalog grids) render full lists without `React.memo` on row/card components. Acceptable at current data volumes (seed data < 20 items); **will not scale** to hundreds of engagements without virtualization or memoized rows.

---

## Query Patterns

### TanStack Query Configuration

- Centralized keys in `aos/hooks/queries/keys.ts`
- Scope-gated queries via `enabled: isReady` pattern
- Stale time defaults from `AosQueryProvider`

### Invalidation

| Trigger | Invalidates |
|---------|-------------|
| Workflow mutation | `deliveries.workflow`, `deliveries.detail`, `queues.*` |
| Create engagement | `deliveries.all()` |

**Gap:** Registry, knowledge, playbook, dashboard queries have **no mutation invalidation** — read-only stubs, so moot until writes exist.

**Gap:** No optimistic updates on workflow mutations — full refetch after each gate action.

---

## Virtualization

| Component | Virtualized? |
|-----------|:------------:|
| C-012 DataTable | **No** |
| Delivery list mobile cards | **No** |
| Catalog card grids | **No** |
| Attention queue | **No** (max ~10 items by design) |

Reference to `data-table-virtual` in workflow seed data only — not implemented.

**Verdict:** Virtualization not needed at Phase 1A scale; **required before production** with real engagement volumes.

---

## Rendering Hotspots (Potential)

| Hotspot | Risk | Mitigation needed at scale |
|---------|------|---------------------------|
| `DeliveryListScreen` (454 LOC) | Medium | Memoized columns help; full re-render on sort/filter |
| `FounderDashboardScreen` (295 LOC) | Low | Composes ~12 sections; single query |
| `KnowledgeScreen` (331 LOC) | Medium | Re-renders full grid on filter change |
| `EngagementHubLayoutScreen` | Low | Outlet-based tab switching unmounts inactive tabs (lazy) |
| Dashboard service aggregation | Low | Server-side read model eventually |

---

## Network / Data Fetching

| Pattern | Status |
|---------|--------|
| Parallel queries on dashboard | **No** — single composed query |
| Query deduplication | **Yes** — TanStack Query default |
| ERP customer fetch | Separate query bypassing AOS services |
| Firestore pagination | Supported in delivery repo; UI uses cursor pagination |

---

## Performance Score

| Dimension | Score (0–10) |
|-----------|:------------:|
| Route code splitting | 9 |
| Main bundle discipline | 5 |
| Memoization | 6 |
| Query efficiency | 7 |
| Virtualization readiness | 3 |
| Scale headroom (100+ engagements) | 4 |

---

## Verdict

Performance is **adequate for Phase 1A demo/validation** with lazy routes and small datasets. **Not production-ready at agency scale** — main bundle bloat, no virtualization, no workflow query optimization, and eager infrastructure wiring in the composition root will become bottlenecks with real data volumes.
