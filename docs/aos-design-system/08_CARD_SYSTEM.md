# 08 — Card System

**Stage D1 — AOS Design System**

---

## C-017 Card

### Purpose
Generic bounded container for related content.

### Responsibilities
Apply surface, radius, padding tokens; optional header/footer slots

### Allowed Usage
Dashboard panels, engagement overview sections, settings groups

### Forbidden Usage
Kanban columns; draggable task cards

### States
Default, interactive (hover border on clickable card), selected

### Loading
SkeletonBlock inside body

### Empty
EmptyState inside body — compact variant

### Visual
Border `color-border-default`; background `color-surface-card`; radius `radius-lg`; shadow `shadow-none` default

### Spacing
Padding `space-card-padding`

---

## C-018 CardHeader / CardBody / CardFooter

### Purpose
Structural slots for title, content, actions.

### CardHeader
Title `font-size-heading`; optional meta right (StatusChip)

### CardFooter
Action alignment right; max one primary Button

---

## Card Variants (Semantic)

| Variant | Border/ surface token | Use |
|---------|----------------------|-----|
| **Default** | standard | General |
| **AiDraft** | `color-border-ai`, `color-surface-ai-draft` | AI content |
| **Approved** | `color-border-approved` | Immutable artifacts |
| **Risk** | `color-surface-warning-subtle` | Risk panel |
| **Evidence** | `color-surface-inset` | Captures, rubrics |

Domain-specific cards (Prompt, Evaluation, etc.) extend these variants — see files 09–12.

---

## Related Documents
[09 AI Components](./09_AI_COMPONENTS.md), [12 Engagement Components](./12_ENGAGEMENT_COMPONENTS.md)
