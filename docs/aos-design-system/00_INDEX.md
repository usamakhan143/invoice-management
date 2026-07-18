# AOS Design System — Index

**Stage:** AOS Phase 1, Stage D1  
**Status:** Documentation only — permanent UI specification  
**Supersedes:** Nothing (first design system lock)  
**Subordinate to:** AOS Architecture v1.0, ADR-001–015, FXD (`docs/aos-founder-experience/`)

---

## Purpose

This folder is the **permanent design contract** for all AOS UI. Every future screen, component, and interaction must conform to these documents.

Stage D1 defines **what** to build and **how it behaves** — not CSS, React, or Figma assets.

---

## Document Map

| # | Document | Scope |
|---|----------|-------|
| 01 | [Design Language](./01_DESIGN_LANGUAGE.md) | Visual and interaction philosophy |
| 02 | [Design Tokens](./02_DESIGN_TOKENS.md) | Semantic token names (no CSS values mandate) |
| 03 | [Layout System](./03_LAYOUT_SYSTEM.md) | Page structure, grids, regions |
| 04 | [Component Library](./04_COMPONENT_LIBRARY.md) | Master catalog + spec template |
| 05 | [Button System](./05_BUTTON_SYSTEM.md) | All button variants |
| 06 | [Form System](./06_FORM_SYSTEM.md) | Inputs, validation, forms |
| 07 | [Table System](./07_TABLE_SYSTEM.md) | Data tables, lists, queues |
| 08 | [Card System](./08_CARD_SYSTEM.md) | Generic card primitives |
| 09 | [AI Components](./09_AI_COMPONENTS.md) | Draft, approval, context, AI states |
| 10 | [Cursor Components](./10_CURSOR_COMPONENTS.md) | Sessions, capture, handoff |
| 11 | [Evaluation Components](./11_EVALUATION_COMPONENTS.md) | Rubrics, scores, gates |
| 12 | [Engagement Components](./12_ENGAGEMENT_COMPONENTS.md) | Hub, lifecycle, engagement-specific |
| 13 | [Navigation Components](./13_NAVIGATION_COMPONENTS.md) | Nav, tabs, breadcrumbs |
| 14 | [Dialog Patterns](./14_DIALOG_PATTERNS.md) | Modals and confirmations |
| 15 | [Notification Components](./15_NOTIFICATION_COMPONENTS.md) | Toasts, badges, in-app alerts |
| 16 | [Empty, Loading, Error States](./16_EMPTY_LOADING_ERROR_STATES.md) | Universal state patterns |
| 17 | [Permission & Feature Flag UI](./17_PERMISSION_AND_FEATURE_FLAG_UI.md) | Gates and locked states |
| 18 | [Responsive System](./18_RESPONSIVE_SYSTEM.md) | Breakpoints and adaptation |
| 19 | [Accessibility Guidelines](./19_ACCESSIBILITY_GUIDELINES.md) | WCAG contract |
| 20 | [Final Design System Report](./20_FINAL_DESIGN_SYSTEM_REPORT.md) | Summary and readiness |

---

## Relationship to Other Docs

| Source | Design system use |
|--------|-------------------|
| `docs/aos-founder-experience/` | Screen purpose, journeys, UX principles |
| `docs/aos-domain-model/` | Lifecycle states, entity names on labels |
| `aos/config/permissions.ts` | Permission locked UI |
| `aos/config/featureFlags.ts` | Feature flag locked UI |
| `docs/erp-discovery/05_REUSABLE_COMPONENTS.md` | ERP shell extension — AOS visual language still distinct inside content area |

---

## Component Spec Contract

Every component in files 04–15 follows the **Component Specification Schema** defined in [04_COMPONENT_LIBRARY.md](./04_COMPONENT_LIBRARY.md).

Implementers must not ship UI that lacks documented states or violates forbidden usage.

---

## Permanent Exclusions (ADR-012)

The design system will **never** define:

- Kanban boards, sprint boards, task cards
- Story point or velocity widgets
- Generic backlog rows
- Gantt/timeline PM views (delivery Timeline is evidence-based, not scheduling)

---

## Glossary

| Term | Meaning |
|------|---------|
| **Semantic token** | Named design decision (e.g. `color-text-primary`) — implementation maps to CSS later |
| **Attention item** | Dashboard row requiring founder judgment |
| **Gate** | Human approval blocking lifecycle progression |
| **Evidence** | Evaluation, capture, or approved version proving progress |
| **Sidecar link** | Navigation out to ERP/BOS read-only surfaces |
