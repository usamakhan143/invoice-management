# 34 — Performance Guidelines

**Stage D1.6 — AOS Frontend Engineering Freeze**  
**Status:** Frozen

---

## Rendering Philosophy

AOS UI prioritizes **correctness and calm** over aggressive optimization. Optimize only where measurement or architecture doc identifies risk.

**Targets (guidance, not CI gates Phase 1):**

| Metric | Target |
|--------|--------|
| Route cold load (lazy chunk) | < 500ms on mid laptop |
| Time to skeleton | < 100ms after route |
| Interaction response | < 100ms hover/focus |
| Query display | skeleton immediately — never blank |

---

## Memoization Rules

| Use `React.memo` | Do not memo |
|----------------|-------------|
| L2 composites receiving stable props (DataTable, AttentionQueue items) | L1 primitives unless profiling proves need |
| Row components in lists >50 rows | Screens |
| Expensive pure formatters extracted to module | Every callback by default |

| Use `useMemo` | Location |
|---------------|----------|
| Derived rows, filtered lists from URL | Screen hook only |
| Permission booleans combining multiple checks | Screen |

| Use `useCallback` | When |
|-------------------|------|
| Handler passed to memoized child | Required |
| Handler passed to dumb component not memoized | Optional — avoid premature |

**Rule:** No memoization without list >50 items or proven re-render issue.

---

## Virtualization

| Surface | Virtualization |
|---------|----------------|
| Queue tables >100 rows | Required — use windowed list |
| Engagement list >100 | Required |
| AiDraftPanel long content | Native scroll — no virtual |
| Timeline full history | Virtualize when >100 events Phase 1b |
| AttentionQueue | Max 8 visible — no virtual |

**Locked library:** `@tanstack/react-virtual` when virtualization needed — add with TanStack Query M0.

---

## Lazy Loading

| Asset | Strategy |
|-------|------------|
| AOS routes | Already lazy in App.tsx — maintain |
| Engagement hub tabs | Lazy load tab screen components via `React.lazy` inside hub |
| Heavy UI (Timeline) | Lazy within screen below fold |
| Icons | Tree-shaken icon import — one icon per module import path |
| Playbook content | Lazy fetch markdown/json chunk |

**Forbidden:** Lazy load primitives used on every screen (Button, Skeleton).

---

## Route Splitting

One lazy chunk per **top-level AOS page** minimum. Engagement hub may share one chunk with nested lazy tabs if bundle >200kb — measure in M4.

| Chunk | Routes |
|-------|--------|
| `aos-dashboard` | ST-01 |
| `aos-delivery` | ST-02, ST-03, ST-04–11 hub |
| `aos-queues` | ST-12–15 (may split if large) |
| `aos-registry` | ST-16, ST-17 |
| `aos-knowledge` | ST-18 |
| `aos-playbook` | ST-19 |

---

## Suspense Philosophy

| Use Suspense | Fallback |
|--------------|----------|
| Lazy route pages | ERP Spinner (existing) |
| Lazy tab panel | Region SkeletonBlock — not full page spinner |
| Async playbook section | Card skeleton |

**No Suspense for data fetching** — TanStack Query handles loading states explicitly (design freeze requires skeleton semantics Suspense cannot express per-region).

---

## Image Policy

Phase 1 AOS: **minimal images** — icons only, no hero imagery.

| Rule | Detail |
|------|--------|
| Format | SVG icons inline or sprite |
| Photos | Forbidden on dashboard |
| Client logos | Not fetched Phase 1 — text name only |
| PDF previews | Deferred QA/handoff Phase 2 |

---

## Polling Optimization

- Pause when tab hidden  
- Exponential backoff on query error (TanStack Query retry config)  
- Do not poll engagement detail on dashboard — only attention queue  
- Single polling query per active screen — no duplicate intervals  

---

## Bundle Strategy

| Rule | Detail |
|------|--------|
| AOS code | Stay under `aos/` — no leaking into ERP pages bundle except shared components |
| Firebase | Import modular SDK paths only in infrastructure |
| Domain | Must not ship to UI bundle — verify with dependency-cruiser or manual import rules M0 |
| Duplication | Shared UI in `presentation/ui` — not copied per screen |
| Day-one deps | `react`, `react-router-dom`, `@tanstack/react-query`, `@tanstack/react-virtual` (when needed) |

Run bundle analysis at M4 milestone before engagement hub ships.

---

## Large Tables

| Technique | When |
|-----------|------|
| Compact density token | All queues default |
| Pagination / load more | Firestore cursor — never fetch all |
| Column hiding md breakpoint | Per responsive doc |
| Card-list sm | Instead of horizontal scroll |
| Sticky header | Within scroll container |
| Row memo | >50 rows |

---

## Performance Anti-Patterns

1. Fetch entire engagement graph in one query  
2. Realtime listeners on list screens Phase 1  
3. Re-render entire hub on tab switch  
4. Inline anonymous functions to memoized rows without need  
5. Import entire icon library  
6. Import application services in UI components  
7. Unbounded `useEffect` fetch chains  
8. Loading spinner replacing full layout on refetch  
9. Virtual + pagination combined incorrectly  
10. Synchronous heavy format in render (move to DTO or useMemo in hook)  

---

## Related Documents

- [32 State Management](./32_STATE_MANAGEMENT.md)
- [18 Responsive System](../aos-design-system/18_RESPONSIVE_SYSTEM.md)
- [37 Implementation Sequence](./37_IMPLEMENTATION_SEQUENCE.md)
