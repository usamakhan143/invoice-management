# 13 — Navigation Components

**Stage D1 — AOS Design System**  
Grounding: FXD Navigation Architecture, `aos/config/navigation.ts`.

---

## C-060 AosNavItem

### Purpose
Primary sidebar entry for AOS module routes inside ERP shell.

### Responsibilities
- Icon + label from navigation config
- Active state for current route
- Badge count for queues (optional, max 99+)

### Allowed Usage
AOS sidebar — Dashboard, Engagements, Requirements Queue, Prompts Queue, Cursor Queue, Evaluation Queue, Registry, Knowledge, Settings

### Forbidden Usage
Nested 3-level PM hierarchies; “Projects > Sprints > Tasks”

### States
Default, hover, active, disabled (permission), feature-flag hidden

### Loading
Badge skeleton only — nav items always visible if route exists

### Permission Locked
Hidden via PermissionGate — not shown disabled by default (fail closed on nav)

### Feature Flag Locked
Hidden if route flag off

### Sizing
ERP sidebar inherits shell; AOS content uses consistent item height token

### Typography
Label: `font-size-label`; badge: `font-size-caption`

### Icons
One icon per nav item — consistent stroke style

### Interaction
Click navigates; keyboard roving tabindex in sidebar

### Accessibility
`aria-current="page"` on active; badge has accessible name “12 items in queue”

### Examples
“Engagements” with active indicator; “Evaluation Queue” with badge “3”

### Anti-patterns
AOS nav duplicating entire ERP menu inside content area

---

## C-061 EngagementTabBar

### Purpose
Horizontal tabs for engagement hub sub-screens.

### Responsibilities
Reflect FXD 8+1 tabs; preserve tab on refresh via URL; show gate indicator dot on tabs needing action

### Allowed Usage
Engagement hub only — `/aos/engagements/:id/*`

### Forbidden Usage
Tabs for generic PM views (Board, Backlog, Sprints)

### States
Default, hover, active, disabled (engagement not yet reached lifecycle phase — optional soft disable with tooltip)

### Loading
Skeleton tab bar — 9 placeholders

### Tab indicators
Small dot on Requirements/Prompts/Cursor/Evaluation when gate pending — not numeric overload

### Interaction
Keyboard left/right; URL sync mandatory

### Accessibility
`role="tablist"`; tabs `role="tab"`; panels `role="tabpanel"`

---

## C-062 Breadcrumb

### Purpose
Wayfinding: AOS > Engagements > {Client} — {Title} > Tab

### Responsibilities
Truncate long titles; link all but current segment

### Allowed Usage
PageHeader below title or inline

### Forbidden Usage
Breadcrumb deeper than 4 segments without collapse

### Typography
Caption size; current segment `font-weight-medium`

---

## C-063 SidePanel

### Purpose
Secondary surface for detail without full navigation — registry module detail, filter advanced, context.

### Responsibilities
- Slide from right (desktop); full-screen sheet (mobile)
- Close on Esc, overlay click (non-destructive), explicit close button
- Preserve underlying scroll position

### Allowed Usage
Knowledge detail, Registry detail, advanced filters, ContextPanel expanded

### Forbidden Usage
Primary engagement workflows that need full hub context; nested side panels

### States
Closed, opening, open, closing

### Loading
Skeleton in panel body

### Empty
EmptyState compact variant

### Sizing
Width token `size-side-panel-width` (~400–480px desktop); 100% mobile

### Interaction
Focus moves to panel on open; restore focus on close

### Accessibility
`role="dialog"` or `aria-modal="true"`; focus trap; labelled by panel title

### Anti-patterns
Side panel for ApprovalPanel primary flow — approvals need full column width

---

## PageHeader Pattern (Layout primitive)

Not separate catalog ID — composed from typography + Breadcrumb + LifecycleBadge + actions.

### Responsibilities
Page title, optional description, primary/secondary actions right-aligned

### Rule
Max one primary Button in PageHeader

---

## Search (Global)

### Purpose
Cross-engagement search — engagements, artifacts by ID.

### Component
SearchInput in TableToolbar or nav area

### Behavior
Minimum 2 characters; results grouped by type; navigate on select

### Forbidden
Searching ERP write operations; task search

---

## Filters (Global pattern)

FilterBar + FilterChip — see [07 Table System](./07_TABLE_SYSTEM.md)

Engagement list filters: lifecycle state, agency type, lead, updated range

Queue filters: gate status, stale only

---

## Related Documents
[03 Layout System](./03_LAYOUT_SYSTEM.md), [FXD Navigation](../aos-founder-experience/03_NAVIGATION_ARCHITECTURE.md)
