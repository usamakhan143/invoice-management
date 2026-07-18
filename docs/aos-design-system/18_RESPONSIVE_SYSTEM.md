# 18 — Responsive System

**Stage D1 — AOS Design System**

---

## Breakpoints (Semantic)

| Token | Min width | Target |
|-------|-----------|--------|
| `breakpoint-sm` | 640px | Large phone |
| `breakpoint-md` | 768px | Tablet portrait |
| `breakpoint-lg` | 1024px | Tablet landscape / small laptop |
| `breakpoint-xl` | 1280px | Desktop |
| `breakpoint-2xl` | 1536px | Wide desktop |

Implementation maps to CSS media queries later — no pixel values mandated in components beyond tokens.

---

## Layout Adaptation Rules

### ERP Shell
AOS inherits ERP sidebar collapse behavior — AOS docs govern **content area only**.

| Region | Desktop (≥ lg) | Tablet (md–lg) | Mobile (< md) |
|--------|----------------|----------------|---------------|
| Dashboard grid | 2-column (attention + risks) | 1-column stack | 1-column |
| Engagement hub tabs | Horizontal scroll if needed | Scrollable tab bar | Dropdown “Jump to tab” optional |
| ContextPanel | Right rail fixed width | Below main content | SidePanel full screen |
| SidePanel | 400–480px overlay | 85% width | 100% width |
| DataTable | Full columns | Hide low-priority columns | Card list variant OR horizontal scroll (last resort) |
| ApprovalPanel | Sticky bottom bar | Sticky bottom | Full width sticky |
| PageHeader actions | Right inline | Stack below title | Primary full width |

---

## Touch Targets

Minimum `size-touch-min` (44×44px) for all interactive controls on touch devices — IconButton, FilterChip remove, tab items.

---

## Typography Scaling

No fluid display type — single token scale across breakpoints. Reduce **density** not font size on mobile tables (switch to card list).

---

## Navigation Mobile

- AosNavItem: ERP hamburger exposes sidebar
- EngagementTabBar: prefer scroll over wrapping to 3 lines
- Breadcrumb: collapse middle segments to “…”

---

## Dialogs Mobile

ConfirmationDialog / DangerDialog: full-width with margin `space-inline-md`; primary button full width stacked above secondary.

---

## AI Draft Mobile

AiDraftPanel: single column; ApprovalPanel sticky footer; ContextPanel moves to “View context” SidePanel trigger.

---

## Forbidden Responsive Patterns

- Separate mobile app navigation paradigm (tabs at bottom for PM)
- Hiding approval actions below fold without sticky footer
- Desktop-only Cursor handoff with no mobile fallback copy path

---

## Testing Contract

Every screen in FXD must document behavior at **md** and **lg** minimum before implementation sign-off.

---

## Related Documents
[03 Layout System](./03_LAYOUT_SYSTEM.md), [13 Navigation Components](./13_NAVIGATION_COMPONENTS.md)
