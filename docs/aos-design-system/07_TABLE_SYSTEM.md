# 07 — Table System

**Stage D1 — AOS Design System**

---

## C-012 DataTable

### Purpose
Display homogeneous records — engagements, queue items, registry modules.

### Responsibilities
Sort (where meaningful), row navigation, compact/comfortable density, sticky header

### Allowed Usage
Delivery list, global queues, registry list, knowledge list

### Forbidden Usage
Kanban; nested expandable tree tasks; inline editing of approved artifacts

### States
Default, row hover, row selected, row disabled (terminal engagement read-only actions)

### Loading
Skeleton rows (5) or LoadingState overlay — preserve header

### Empty
EmptyState component centered in table body — with next action

### Disabled
Row actions disabled with tooltip explaining gate

### Permission Locked
Hide action column cells; show view-only row

### Feature Flag Locked
Entire table replaced with FeatureFlagGate message

### Success / Warning / Error
Row-level StatusChip in column — not row background colors (except subtle failed evaluation tint optional)

### AI Generated / Human Approved
Column “Source” with chip: Draft / Approved / AI-scored

### Sizing
Compact: `size-table-row-height-compact` for queues; Comfortable: engagement lists

### Spacing
Cell padding `space-stack-sm` vertical, `space-inline-md` horizontal

### Typography
Header: `font-size-label`, `font-weight-medium`; cell body: `font-size-body`

### Interaction
Row click → navigate (engagement hub or side panel); checkbox column optional future

### Accessibility
`<table>` with `<th scope="col">`; sort buttons with aria-sort

### Examples
| Client | Engagement | State | Lead | Updated | Action |
|--------|------------|-------|------|---------|--------|

### Anti-patterns
10+ columns; horizontal scroll on desktop default; action button per row as primary fill

---

## C-013 TableToolbar

### Purpose
Search + filters + optional primary action above table.

### Layout
SearchInput left; FilterChips center; single Button right

---

## C-014 FilterBar

### Purpose
Lifecycle state, agency type, status filters for lists.

### Allowed filters
Domain enums only — `DeliveryState`, `AgencyType`, queue-specific status

### Forbidden
Custom “priority” or “sprint” filters

---

## C-015 FilterChip

### Purpose
Removable active filter indicator.

### Interaction
Click X removes; shows filter name + value

---

## C-016 Pagination

### Purpose
Cursor-based pagination (matches repository contract).

### Display
“Load more” button preferred over page numbers for Firestore cursor model

### Copy
“Showing 25 · Load more” — not “Page 1 of 10” unless total known

---

## Queue Table Column Standards

| Queue | Required columns |
|-------|------------------|
| Requirements | Engagement, Client, Draft status, AI readiness, Updated, Action |
| Prompts | Engagement, Client, Pack status, Artifacts count, Updated, Action |
| Cursor | Engagement, Artifact, Session status, Capture, Updated, Action |
| Evaluation | Engagement, Session, Result, Rubric score, Updated, Action |

---

## Related Documents
[08 Card System](./08_CARD_SYSTEM.md), [16 Empty/Loading/Error](./16_EMPTY_LOADING_ERROR_STATES.md)
