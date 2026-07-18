# 33 — Data Flow

**Stage D1.6 — AOS Frontend Engineering Freeze**  
**Status:** Frozen — end-to-end data flow architecture

---

## Purpose

Document the **complete path** from persistence to pixels and back — so every layer knows its job and nothing is skipped.

---

## Read Flow (Rendering)

```
Firestore document
        │
        ▼
Infrastructure Repository (converter → domain entity)
        │
        ▼
Application Query Handler (entity → DTO, permissions metadata optional)
        │
        ▼
Application Service public method
        │
        ▼
Hook: use*Query (TanStack Query cache)
        │
        ▼
Screen (smart container)
        │
        ▼
UI Component (dumb — props)
        │
        ▼
DOM render (Loading / Empty / Error / Success states)
```

**UI never observes Firestore snapshot shape** — only DTO props defined in `aos/application/*/dto/`.

---

## Write Flow (Mutations)

```
User action (Button / Dialog confirm)
        │
        ▼
Screen handler
        │
        ▼
Hook: use*Mutation
        │
        ▼
Application Command Handler (validation, domain rules)
        │
        ▼
Repository persist (Firestore transaction/batch)
        │
        ▼
Domain events / audit append (infrastructure)
        │
        ▼
Mutation result DTO or error
        │
        ▼
Hook: invalidate queries + toast
        │
        ▼
Screen re-renders from refetch
```

**No UI path writes to Firestore directly.**

---

## Layer Responsibilities

| Layer | Input | Output |
|-------|-------|--------|
| **Firestore** | Repository writes | Documents |
| **Repository** | Domain entity / query filters | Entities, cursor pages |
| **Application** | Commands, queries | DTOs, `ApplicationError` |
| **Hook** | Service + params | `{ data, isLoading, error, refetch }` |
| **Screen** | Hook results | Props + handlers |
| **Component** | Props | Events |

---

## DTO Policy

| Rule | Detail |
|------|--------|
| Shape | Flat, JSON-serializable, display-ready strings |
| Version IDs | Included as strings for mono display |
| Enums | string union matching domain — mapped to labels in UI via constants |
| Nested | Max 2 levels — deeper → separate query |
| Gate summary | Pre-computed on server/application — not UI inference |
| Timestamps | ISO strings — formatted in UI |
| ERP embeds | Customer name, lead name — resolved in application via read ports |
| Never in DTO | Domain entity methods, Firestore refs, class instances |

---

## Hook Conventions

| Hook type | Naming | Returns |
|-----------|--------|---------|
| Query | `useDeliveryEngagementQuery(id)` | standard query result |
| List | `useDeliveryListQuery(filters)` | data + pagination cursor |
| Mutation | `useApproveRequirementSetMutation()` | mutate, isPending, error |
| Infinite | `useDeliveryListInfiniteQuery` | Phase 1b if load-more needed |

Hooks obtain services via `useAosServices()` from provider — never instantiate repositories.

---

## Rendering States

Every screen hook result maps to UI states per ST-xx:

| Query state | UI component |
|-------------|--------------|
| `isLoading && !data` | SkeletonBlock / LoadingState |
| `isError` | ErrorState + Retry → `refetch` |
| `isSuccess && empty` | EmptyState |
| `isSuccess && data` | Content components |
| `isFetching && data` | Subtle stale indicator optional — not full skeleton |

Mutations:

| Mutation state | UI |
|----------------|-----|
| `isPending` | Button loading, dialog disable close |
| `isError` | Inline error or Toast |
| `isSuccess` | Toast + invalidate (no optimistic UI on gates) |

---

## Mutations

| Category | Examples | Post-success |
|----------|----------|--------------|
| Gate | approve requirement, approve prompt | invalidate engagement + tab + queue |
| Lifecycle | pause, resume, cancel | invalidate engagement + delivery list |
| Capture | submit capture | invalidate cursor + evaluation |
| Create | create engagement | invalidate list + navigate to new id |

Commands map 1:1 to application command types already in `aos/application/delivery/commands/`.

---

## Refresh

| Trigger | Mechanism |
|---------|-----------|
| Manual Retry | `refetch()` |
| Polling | query `refetchInterval` |
| Window focus | `refetchOnWindowFocus: true` for engagement detail only |
| Post-mutation | invalidation |
| Tab return | engagement query refetch on EngagementHubLayout mount |

**Not used Phase 1:** Firestore realtime listeners.

---

## Error Flow

```
Application throws / returns ApplicationError
        │
        ▼
Hook surfaces error.message + code
        │
        ▼
Screen maps code → UI treatment
        │
        ├── VALIDATION → inline form errors
        ├── NOT_FOUND → ErrorState 404 copy
        ├── PERMISSION → Toast + LockedOverlay
        ├── CONFLICT → InAppAlert (stale draft)
        ├── NETWORK → ErrorState + Retry
        └── UNKNOWN → ErrorState generic + support caption
```

See [36 Error Handling](./36_ERROR_HANDLING.md) for full matrix.

---

## Loading Flow

Parallel queries on screen:

- Independent regions load independently — dashboard AttentionQueue and RiskPanel separate skeletons  
- Engagement hub: engagement query gates tab content (`enabled` after engagement loaded)  
- ERP customer select: async load — Select skeleton  

Waterfall forbidden where parallel possible — use parallel queries in screen hook.

---

## Permission Flow

```
ERP usePermissions()
        │
        ▼
Screen computes boolean flags OR PermissionGate wraps region
        │
        ▼
UI receives disabled / hidden props
        │
        ▼
Mutation still fails closed server-side — UI mirrors only
```

Permission keys from `aos/constants/permissionKeys.ts` — never hardcoded strings in UI.

---

## Feature Flag Flow

```
useAosFeatureFlags()
        │
        ├── Route level: AosRouteGate (existing)
        ├── Tab level: FeatureFlagGate hides tab
        └── Action level: conditional render / disabled
```

Flags from `aos/config/featureFlags.ts` only.

---

## ERP / BOS Read Port Flow

```
Hook → Application Service → Read Port interface
        │
        ▼
Adapter (infrastructure) → ERP Firestore / BOS collections
        │
        ▼
DTO merged into engagement or form options
```

Sidecar links: DTO includes `erpCustomerUrl`, `bosInitiativeUrl` — UI renders LinkButton Sidecar variant.

---

## Attention Queue Data Flow (Special)

```
Application projection query (cross-engagement)
        │
        ▼
Server-side sort (urgency — application responsibility)
        │
        ▼
useAttentionQueueQuery
        │
        ▼
AttentionQueue dumb component
```

UI does not sort or filter urgency — only client filter by engagement if added Phase 1b.

---

## Related Documents

- [32 State Management](./32_STATE_MANAGEMENT.md)
- [36 Error Handling](./36_ERROR_HANDLING.md)
- [Delivery Application Service](../../aos/application/delivery/DeliveryApplicationService.ts)
