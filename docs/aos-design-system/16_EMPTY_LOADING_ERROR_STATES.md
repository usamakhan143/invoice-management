# 16 — Empty, Loading, Error States

**Stage D1 — AOS Design System**

---

## C-080 EmptyState

### Purpose
Universal pattern when a view has no data — always offer a next step.

### Responsibilities
Illustration optional (minimal line icon — not cartoon); title; description; primary action; secondary link optional

### Allowed Usage
Tables, tabs, queues, dashboard sections, SidePanel

### Forbidden Usage
Empty state without action when user can create/start something

### States
Default only

### Typography
Title: `font-size-heading`; description: `font-size-body`, secondary color token

### Spacing
Centered in container; `space-stack-md` between elements

### Examples

| Context | Title | Action |
|---------|-------|--------|
| Engagements list | No engagements yet | Create Engagement |
| Requirements tab | No requirements | Start requirement capture |
| Attention queue | Nothing needs attention | View all engagements |
| Evaluation | No evaluations | Complete capture first |

### Anti-patterns
“No data” only; Lorem ipsum; empty table with no EmptyState component

---

## C-081 LoadingState

### Purpose
Full-region loading when structure unknown.

### Responsibilities
Spinner or skeleton; optional message “Loading engagement…”

### Allowed Usage
Initial page load, tab switch with no cached data

### Forbidden Usage
Loading entire app for button click — use button loading state

### Variants
**Spinner** — small regions; **Skeleton** — known layout

---

## C-082 ErrorState

### Purpose
Recoverable failure to load data or execute operation.

### Responsibilities
Clear message; error code optional (mono caption); Retry primary; Contact support secondary (future)

### Allowed Usage
Page level, tab level, SidePanel

### Forbidden Usage
Generic “Something went wrong” without retry for transient errors

### States
Default, retrying

### Accessibility
`role="alert"`; focus moves to error summary on page-level error

### Examples
“Could not load engagement. Firestore unavailable. Retry”

---

## C-083 SkeletonBlock

### Purpose
Placeholder shapes preserving layout during load.

### Responsibilities
Match target component geometry — table rows, card headers, attention items

### Allowed Usage
Inside DataTable, Card, AttentionQueue, AiDraftPanel

### Forbidden Usage
Indefinite skeleton without timeout → ErrorState at 30s optional

---

## State Matrix by Surface

| Surface | Loading | Empty | Error |
|---------|---------|-------|-------|
| Dashboard | Skeleton sections | Partial empty per widget | ErrorState per widget |
| DataTable | Skeleton rows | EmptyState in tbody | ErrorState replaces table |
| Engagement tab | Tab skeleton | Tab EmptyState | Tab ErrorState |
| AiDraftPanel | Paragraph skeleton | Empty copy | ErrorState inline |
| Dialog submit | Button loading | N/A | Inline in dialog |

---

## AI / Approval State Overlays

When loading AI generation:
- AiDraftPanel shows skeleton + caption “Generating draft…”
- Do not show EmptyState until generation completes empty

When approval in flight:
- ApprovalPanel buttons loading — not full page LoadingState

---

## Related Documents
[07 Table System](./07_TABLE_SYSTEM.md), [09 AI Components](./09_AI_COMPONENTS.md)
