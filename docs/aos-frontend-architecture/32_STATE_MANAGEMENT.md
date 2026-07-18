# 32 — State Management

**Stage D1.6 — AOS Frontend Engineering Freeze**  
**Status:** Frozen — no implementation, architecture only

---

## Purpose

Freeze **where state lives**, who owns it, and how it moves — so D2 does not debate Redux vs Context vs Query ad hoc.

---

## State Taxonomy

| Category | Owner | Technology | Lifetime |
|----------|-------|------------|----------|
| **Server state** | Query hooks | TanStack Query v5 | Cached, invalidated, stale-time governed |
| **Local UI state** | Component or `hooks/ui/` | React `useState` / `useReducer` | Mount-scoped or screen-scoped |
| **Form state** | Form screen region | React controlled fields | Submit or unmount |
| **Derived state** | Selectors in hooks | `useMemo` in hook layer | Recomputed on query/form change |
| **URL state** | Router | `searchParams`, path params | Bookmarkable |
| **Auth / company** | ERP | Existing ERP hooks | Session |

**Forbidden Phase 1:** Redux, Zustand, MobX, global event buses for server data.

---

## Local State

### What belongs in local state

| State | Example | Location |
|-------|---------|----------|
| Panel open/closed | SidePanel visible | Screen or `useSidePanel` ui hook |
| Accordion expanded | AiDraftPanel section | Dumb component internal |
| Dialog open | ApprovalDialog | Screen |
| Hover/focus | — | CSS only — not React state |
| Selected tab memory | Engagement hub | URL is source of truth — not local duplicate |
| Transient input before debounce | Search typing | SearchInput internal until debounce fires URL/query |

### What must NOT be local state

- Engagement list data  
- Requirement set content  
- Permission outcomes — derive from ERP permissions each render  
- Feature flag values — read from hook  

---

## Server State

### Ownership

| Concern | Owner |
|---------|-------|
| Fetch | `hooks/queries/use*Query.ts` |
| Cache | TanStack Query client in `AosServicesProvider` |
| Keys | `aos/hooks/queries/keys.ts` — centralized query key factory |
| Stale time | Defined per query in hook file header comment |
| Polling | Query `refetchInterval` — values from Interaction System doc |
| Enabled guard | Query `enabled: !!engagementId && isEnabled(FLAG)` |

### Query key structure (locked pattern)

Hierarchical keys mirroring domain:

- `['aos', 'deliveries', 'list', filters]`  
- `['aos', 'delivery', engagementId]`  
- `['aos', 'delivery', engagementId, 'requirements', setId]`  
- `['aos', 'queues', 'requirements', filters]`  

**Rule:** All invalidations use key prefixes — never manual cache surgery scattered in components.

---

## UI State

Ephemeral presentation state shared across siblings within one screen:

- `hooks/ui/useStickyFooterVisibility.ts`  
- `hooks/ui/useDialogState.ts`  

**Not shared across screens** except via URL or query invalidation.

---

## Form State

| Pattern | Use |
|---------|-----|
| Controlled components | All AOS FormField inputs |
| Default values | From query DTO on load — reset on DTO version change |
| Validation | Client: required/format; Server: application error mapped to fields |
| Submit | Mutation hook — not form library Phase 1 |
| Dirty tracking | Optional caption “Unsaved changes” — no auto-save Phase 1 on requirement edits |

**Create engagement form:** Local form state until submit mutation.  
**Cancel engagement:** DangerDialog + reason field — submit via mutation.  
**Approval note:** Local until ApprovalDialog confirm.

---

## Derived State

Computed in hooks — never duplicated in UI components:

| Derived | Inputs |
|---------|--------|
| `canApprove` | permissions + engagement state + draft status from DTO |
| `nextBestAction` | application DTO field — UI does not compute lifecycle |
| `gateChips` | DTO gate summary array |
| `attentionItems` | server-sorted queue DTO |
| `tableRows` | list DTO + client filter from URL search only |

**Rule:** If derivation requires domain rules → belongs in application layer DTO, not hook.

---

## Cache Ownership

| Data type | Cache owner | Invalidation trigger |
|-----------|-------------|----------------------|
| Delivery list | list query | create, cancel, pause, resume mutations |
| Single engagement | engagement query | any engagement mutation |
| Requirement set | requirements query | approve, revision, generate draft |
| Queues | queue queries | any gate mutation on affected type |
| ERP customer picklist | customers query | long stale time (5 min) — ERP read port |
| Static playbook | query with `staleTime: Infinity` | manual only |

**Cross-query invalidation:** Mutations declare `invalidates: ['aos', 'delivery', engagementId]` meta processed by mutation hook wrapper.

---

## Polling Ownership

Polling configured only in query hooks — never `setInterval` in components.

| Query hook | Interval | Stop condition |
|------------|----------|----------------|
| `useAttentionQueueQuery` | 60s | document hidden |
| `useCursorSessionQuery` (active) | 30s | status !== active |
| `useEvaluationRunQuery` | 5s | completed or 5 min timeout |
| `useReuseAssessmentQuery` | 10s | terminal status |

Pause on `document.visibilityState === 'hidden'`.

---

## Optimistic Updates

**Default: disabled** for all gate mutations (per Design Freeze Interaction System).

| Mutation | Optimistic |
|----------|------------|
| Approve requirement set | No |
| Approve prompt pack | No |
| Submit capture | No |
| Create engagement | No |
| Remove FilterChip | N/A (URL only) |
| Filter URL update | Immediate (not server) |

Future optimistic **only** with ADR + design freeze amend.

---

## Invalidation Strategy

```
Mutation success
  → invalidate declared query keys
  → refetch active queries on screen
  → Toast (success)
Mutation failure
  → no invalidation
  → error to UI (see Error Handling doc)
```

**Engagement hub:** Mutations invalidate engagement query + relevant tab query + affected global queue.

---

## Future Realtime

Phase 1: **polling only**.

Phase 2 architecture (documented, not implemented):

| Surface | Realtime candidate | Owner |
|---------|-------------------|-------|
| AttentionQueue | Firestore listener on projection collection | New `hooks/queries/useAttentionQueueRealtime.ts` replaces polling |
| Cursor session active | Listener on session doc | Engagement cursor hook |

**Migration rule:** Realtime hook must expose **same DTO shape** as polling hook — screens unchanged.

**Prerequisite:** Architecture doc amend + ADR note if listener in client affects Firestore rules/cost.

---

## State Anti-Patterns

1. Duplicating server data in `useState` after fetch  
2. Prop drilling >3 levels — extract screen hook or composition  
3. Context for server lists  
4. Invalidating entire `['aos']` tree on every mutation  
5. Form state persisted in sessionStorage without doc  
6. Optimistic approve  
7. Polling in `useEffect` in screens  

---

## Related Documents

- [22 Interaction System](../aos-design-freeze/22_INTERACTION_SYSTEM.md)
- [33 Data Flow](./33_DATA_FLOW.md)
- [31 Component Architecture](./31_COMPONENT_ARCHITECTURE.md)
