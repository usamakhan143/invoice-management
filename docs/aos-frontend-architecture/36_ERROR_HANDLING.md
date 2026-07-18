# 36 — Error Handling

**Stage D1.6 — AOS Frontend Engineering Freeze**  
**Status:** Frozen

---

## Purpose

Define **error boundaries, recovery, messaging, and offline behavior** — consistent with Design Freeze Interaction System and Content Guidelines.

---

## Error Classification

| Class | Source | UI treatment |
|-------|--------|--------------|
| **Render** | React component throw | ErrorBoundary |
| **Query** | Fetch failure | ErrorState + Retry |
| **Mutation** | Command rejection | Inline / Toast / Dialog |
| **Validation** | Client or server field rules | FormField inline |
| **Permission** | 403 from application | Toast + LockedOverlay |
| **Not found** | Missing engagement | ErrorState 404 |
| **Conflict** | Stale version | InAppAlert |
| **Network** | Offline / timeout | ErrorState + Retry |
| **Unknown** | Unhandled code | ErrorState generic |

---

## Error Boundaries

| Boundary | Location | Fallback |
|----------|----------|----------|
| **ERP global** | AppLayout (existing ErrorBoundary) | ERP error page |
| **AOS module** | Wrap AOS route outlet in App.tsx | AOS ErrorState full region with “Return to dashboard” |
| **Screen optional** | Per-screen for risky subtrees (Timeline) | Region ErrorState — rest of screen live |

**Rule:** ErrorBoundary never swallows errors silently — log to console Phase 1; observability hook Phase 2.

**Forbidden:** ErrorBoundary around every card.

---

## Page Errors

Full content region replacement:

| Condition | Component | Copy pattern |
|-----------|-----------|--------------|
| Engagement not found | ErrorState | “Engagement not found” + link Delivery list |
| Module not found | ErrorState | “Module not found” + link Registry |
| Permission denied route | Navigate away via AosRouteGate — not ErrorState |
| Feature disabled | Navigate to `/aos` — not ErrorState |

---

## Component Errors

Region-scoped:

| Region | Failure | UI |
|--------|---------|-----|
| AttentionQueue widget | query fail | Widget ErrorState — dashboard rest loads |
| ContextPanel Sidecar | ERP read fail | Caption “Could not load customer” — degrade |
| AiDraftPanel generation | AI fail | Inline ErrorState + Retry |
| DataTable | query fail | Table ErrorState |

---

## Mutation Failures

| Mutation type | UI |
|---------------|-----|
| Approve gate | ApprovalDialog stays open; inline error; no invalidation |
| Create engagement | Form-level banner + field errors |
| Cancel engagement | DangerDialog inline |
| Submit capture | Form inline + Retry |
| Copy clipboard | Toast error |

**Never** toast-only for form validation errors.

---

## Retry

| Error class | Retry behavior |
|-------------|----------------|
| Network | ErrorState button → `refetch()` or `mutate()` |
| Query timeout | Same |
| Mutation transient | Button retry on dialog |
| Validation | User fixes fields — no Retry button |
| Permission | No retry — explain role |
| Conflict | Refresh engagement → InAppAlert “Content changed — review latest draft” |

Query retry config (TanStack Query): 2 retries, exponential backoff, network errors only.

---

## Fallbacks

| Scenario | Fallback |
|----------|----------|
| ERP customer name missing | Show customer ID mono caption |
| BOS initiative link fail | Hide link — show “Initiative unavailable” |
| AI explanation missing | Omit AiExplainBlock — not placeholder lorem |
| Partial engagement DTO | Render available fields — banner for partial load |
| Image/icon fail | Text label remains |

---

## Recovery Flows

```
Evaluation failed
  → InAppAlert sticky on Evaluation tab
  → NBA updates on Overview (after invalidation)
  → AttentionQueue item on next poll

Stale draft on approve
  → CONFLICT error
  → Refetch requirement set
  → InAppAlert

Session abandoned
  → CursorSessionCard status from DTO
  → RiskPanel may show on Overview
```

---

## Offline Behavior

Firebase client offline persistence: **follow ERP existing pattern** — do not enable new offline cache for AOS Phase 1 unless ERP already enables globally.

| State | UX |
|-------|-----|
| Offline detected | InAppAlert info “You appear offline — changes unavailable” |
| Read cached | TanStack Query may show stale data with caption if `isFetching` false and network error on refetch |
| Mutations offline | Disable submit buttons; Toast “Connect to network to continue” |
| Polling offline | Paused — resume on online event |

---

## User Messaging

Follow [25 Content Guidelines](../aos-design-freeze/25_CONTENT_AND_COPY_GUIDELINES.md):

- State problem + action  
- Include artifact name/version when known  
- No “Oops”  
- Error codes in mono caption for support (`ERR_ENGAGEMENT_NOT_FOUND`) — application layer defines codes  

---

## Application Error Contract

Application layer exposes structured errors to hooks:

| Field | Purpose |
|-------|---------|
| `code` | Machine enum for UI mapping |
| `message` | Developer/log message |
| `userMessage` | Display string |
| `fieldErrors` | Optional map for forms |

Hooks map `code` → UI treatment — screens do not switch on raw strings.

---

## Logging

Phase 1: `console.error` in ErrorBoundary + mutation onError.

Phase 2: ActivityLogger extension for AOS errors — architecture defer.

---

## Error Anti-Patterns

1. Empty catch blocks  
2. Generic toast for all errors  
3. Full page reload on Retry  
4. Silently swallow permission errors  
5. Optimistic UI hiding mutation errors  
6. ErrorBoundary inside button  
7. User-facing stack traces  

---

## Related Documents

- [22 Interaction System](../aos-design-freeze/22_INTERACTION_SYSTEM.md)
- [25 Content Guidelines](../aos-design-freeze/25_CONTENT_AND_COPY_GUIDELINES.md)
- [33 Data Flow](./33_DATA_FLOW.md)
