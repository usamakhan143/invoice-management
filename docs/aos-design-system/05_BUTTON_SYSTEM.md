# 05 — Button System

**Stage D1 — AOS Design System**

---

## C-001 Button

### Purpose
Primary user commitment control — one clear action per region.

### Responsibilities
- Trigger navigation, submit forms, open dialogs, approve gates
- Show loading during async operations
- Never imply approval without explicit label

### Allowed Usage
PageHeader (max 1 primary), StickyFooterBar, AttentionItem, ApprovalPanel, Dialogs, empty states

### Forbidden Usage
Multiple primary buttons in same region; icon-only primary without aria-label; “Submit” on approve gates (use “Approve Requirement Set”)

### States
Default, hover, active, focus-visible, loading (spinner replaces label or left of label), disabled

### Loading
Disable click; show spinner; preserve button width to avoid layout shift

### Empty / Disabled / Permission Locked / Feature Flag Locked
Disabled: reduced opacity + `cursor-not-allowed`; Permission locked: hidden or disabled with tooltip “Insufficient permission”; Feature flag: hidden via FeatureFlagGate

### Success / Warning / Error
Not applicable as button types — use semantic **variants** below

### AI Generated / Human Approved
N/A

### Variants

| Variant | Token | Use |
|---------|-------|-----|
| **Primary** | `color-interactive-primary` | Single main action |
| **Secondary** | `color-interactive-secondary` | Cancel adjacent, alternate path |
| **Ghost** | transparent | Tertiary, table row actions |
| **Danger** | `color-interactive-danger` | Cancel engagement, reject |
| **Approve** | success border + primary fill | Explicit approval gates only |
| **Sidecar** | link style + external icon | Open ERP/BOS |

### Sizing
| Size | Height token | Use |
|------|--------------|-----|
| sm | `size-button-height-sm` | Tables, attention items |
| md | `size-button-height-md` | Default |
| lg | `size-button-height-md` + horizontal padding +1 step | Hero CTA only |

### Spacing
`space-inline-sm` between icon and label; `space-inline-md` between button groups

### Typography
`font-size-label`, `font-weight-medium`

### Icons
Leading icon optional; trailing chevron for navigation; external link icon on Sidecar variant

### Interaction
Enter/Space activates; disabled not focusable; loading prevents double-submit

### Accessibility
Native `<button>` or `role="button"`; accessible name = visible label; focus ring `color-border-focus`

### Examples
- Primary: “Continue to Requirements” on NextBestActionCard
- Approve: “Approve Prompt Pack”
- Danger: “Cancel Engagement” (opens DangerDialog)

### Anti-patterns
Button bar with 4+ equal-weight buttons; primary on every table row

### Future Extension
Split button for “Approve” + “Approve with note” — deferred

---

## C-002 IconButton

### Purpose
Compact icon-only action in toolbars and table rows.

### Allowed Usage
Copy prompt, dismiss non-blocking attention, close panel, row overflow menu

### Forbidden Usage
Primary engagement actions; approve gates; sole action without tooltip

### States
Same as Button + tooltip on hover/focus

### Sizing
Touch target minimum `size-touch-min` (44px) hit area; icon `size-icon-sm`

### Accessibility
**Required** `aria-label`; tooltip mirrors label

---

## C-003 ButtonGroup

### Purpose
Related secondary actions visually grouped.

### Allowed Usage
Pause + Cancel on engagement header (secondary/ghost only — not dual primary)

### Forbidden Usage
Grouping two primary actions

---

## C-004 LinkButton

### Purpose
Navigation styled as text link with optional chevron.

### Allowed Usage
“View all engagements”, breadcrumb actions, sidecar links

### Forbidden Usage
Destructive actions; approve actions

---

## Related Documents
[06 Form System](./06_FORM_SYSTEM.md), [14 Dialog Patterns](./14_DIALOG_PATTERNS.md)
