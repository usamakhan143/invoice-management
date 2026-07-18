# 03 — Layout System

**Stage D1 — AOS Design System**  
**Grounding:** FXD Screen Architecture, ERP shell

---

## Page Anatomy

Every AOS screen uses this region model:

```
┌─────────────────────────────────────────────────────────┐
│ ERP Shell: Sidebar (global)                              │
├─────────────────────────────────────────────────────────┤
│ AOS Page Header                                          │
│   Breadcrumb · Title · Optional meta · Primary action    │
├─────────────────────────────────────────────────────────┤
│ Optional: Context Banner (lifecycle, blockers, sidecar)  │
├─────────────────────────────────────────────────────────┤
│ Optional: Tab Bar (engagement hub)                       │
├──────────────────────────┬──────────────────────────────┤
│ Main Content             │ Optional Side Panel          │
│                          │ (detail, AI draft, evidence) │
├──────────────────────────┴──────────────────────────────┤
│ Optional: Sticky Footer Actions (forms, approve bars)    │
└─────────────────────────────────────────────────────────┘
```

---

## Layout Primitives (Components)

### PageShell

| Field | Spec |
|-------|------|
| **Purpose** | Root wrapper for all AOS routes inside ERP content area |
| **Responsibilities** | Apply page padding tokens; max-width constraint on prose |
| **Allowed** | All AOS routes |
| **Forbidden** | Nesting PageShell |

### PageHeader

| Field | Spec |
|-------|------|
| **Purpose** | Title region + single primary action |
| **Responsibilities** | Breadcrumb slot; title; subtitle; action slot (max 1 primary) |
| **Forbidden** | Multiple primary buttons |

### ContextBanner

| Field | Spec |
|-------|------|
| **Purpose** | Engagement lifecycle, blockers, ERP/BOS links |
| **Variants** | `lifecycle`, `blocked`, `paused`, `sidecar-info` |
| **Forbidden** | Marketing banners |

### ContentGrid

| Field | Spec |
|-------|------|
| **Purpose** | Responsive column layout |
| **Columns** | 1 col default; 2 col ≥ `breakpoint-lg` for list+detail |
| **Forbidden** | 3+ col dashboard tiles |

### StickyFooterBar

| Field | Spec |
|-------|------|
| **Purpose** | Approve/Reject bars on review screens |
| **Allowed** | AI draft review, approval dialogs inline |
| **Forbidden** | Persistent on read-only views |

---

## Dashboard Layout

```
┌─ Attention Queue (full width, compact) ─────────────────┐
├─ Next Best Action (hero, full width) ────────────────────┤
├─ Waiting Panels (3 col at lg, stack on sm) ──────────────┤
├─ Reuse + Risks (2 col at lg) ────────────────────────────┤
└──────────────────────────────────────────────────────────┘
```

Max width: full content area — no centered narrow dashboard.

---

## Engagement Hub Layout

```
PageHeader: [Engagement Title] [Lifecycle Badge] [Pause|Cancel secondary]
ContextBanner: Client · Lead · Initiative links · Delivery lead
TabBar: Overview | Requirements | Reuse | Prompts | Cursor | Evaluation | QA | Retro
Main: tab content
```

Tab content uses **single primary column** + optional **right SidePanel** for detail.

---

## Queue Screen Layout (Global)

Requirements / Prompts / Cursor / Evaluation queues:

```
PageHeader + FilterBar
DataTable (compact density)
Row click → navigate to engagement tab (not inline expand)
```

---

## Side Panel Rules

| Rule | Detail |
|------|--------|
| Width | `size-sidebar-panel-width` token — 400–480px conceptual |
| Trigger | Row click, “Review”, “View evidence” |
| Close | Esc, overlay click, explicit close |
| Content | One artifact focus — prompt, evaluation, module |
| Stacking | Never two side panels |

---

## Spacing Between Regions

| Gap | Token |
|-----|-------|
| Header → Banner | `space-stack-md` |
| Banner → Tabs | `space-stack-sm` |
| Tabs → Content | `space-stack-md` |
| Sections in content | `space-stack-lg` |

---

## Scroll Behavior

| Element | Behavior |
|---------|----------|
| Tab bar | Sticky below ERP header |
| Table header | Sticky within table container |
| Approve footer | Sticky bottom of viewport on review pages |
| Page header | Scrolls away on mobile — tabs remain sticky |

---

## Breakpoints

See [18 Responsive System](./18_RESPONSIVE_SYSTEM.md).

---

## Related Documents

- [13 Navigation Components](./13_NAVIGATION_COMPONENTS.md)
- [FXD 02 Screen Architecture](../aos-founder-experience/02_SCREEN_ARCHITECTURE.md)
