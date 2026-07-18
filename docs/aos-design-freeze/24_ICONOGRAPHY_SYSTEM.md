# 24 — Iconography System

**Stage D1.5 — AOS Design Freeze**  
**Status:** Frozen — complete icon language

---

## Icon Philosophy

Icons **annotate** text — they never replace labels on primary actions. AOS icons are calm, geometric, and consistent with ERP shell where shared.

**North star:** Lucide/Linear-style outline icons — 1.5px stroke, rounded caps, 24×24 default grid.

---

## Library Decision (Locked)

| Scope | Library |
|-------|---------|
| ERP shell, sidebar (shared chrome) | **Inherit ERP existing icon set** — no mixed nav icons |
| AOS content area (domain icons) | **Lucide-compatible outline set** mapped to semantic names below |
| Status/semantic icons | Fixed mapping table — implementers do not pick ad hoc |

**Reason:** Shell consistency (D1 open question resolved); AOS domain needs distinct AI/Cursor/Evaluation vocabulary.

---

## Stroke Rules

| Rule | Value |
|------|-------|
| Stroke width | 1.5px at 24px (`size-icon-md`) |
| Corner | Rounded joins |
| Fill | **Outline default** — filled only for active nav or selected state |
| Optical alignment | Center on grid; chevrons aligned to text cap height |

---

## Filled vs Outline

| Context | Style |
|---------|-------|
| Default UI | Outline |
| Active sidebar nav item | Filled or solid accent (match ERP) |
| Status in StatusChip | Outline icon left of text |
| Destructive DangerDialog | Outline warning triangle — not filled red circle |
| AI indicator | Outline spark — never filled gradient orb |

---

## Size Tokens

| Token | Size | Use |
|-------|------|-----|
| `size-icon-xs` | 14px | Inline caption, FilterChip |
| `size-icon-sm` | 16px | Table row actions, StatusChip |
| `size-icon-md` | 20px | Buttons, AttentionItem |
| `size-icon-lg` | 24px | EmptyState, PageHeader meta |
| `size-icon-touch` | 20px icon in 44px hit area | IconButton |

**Spacing:** `space-inline-sm` between icon and label (4px token).

---

## Semantic Icon Map (Locked)

### Navigation

| Concept | Icon name | Notes |
|---------|-----------|-------|
| Dashboard | `layout-dashboard` | Attention, not analytics |
| Delivery | `package` or `briefcase` | Engagement portfolio |
| Registry | `blocks` | Reusable modules |
| Requirements queue | `file-text` | |
| Prompts queue | `message-square-code` | |
| Cursor queue | `terminal` | |
| Evaluation queue | `clipboard-check` | |
| Knowledge | `book-open` | |
| Playbook | `map` | Methodology |
| External Sidecar | `external-link` | ERP/BOS — always paired with text |
| SidePanel close | `x` | |

### Lifecycle

| State | Icon | Rule |
|-------|------|------|
| All lifecycle badges | **None by default** | Text label only — ADR neutral badges |
| Paused | `pause` | Optional left of badge |
| Cancelled | `ban` | Optional |
| Terminal closed | `archive` | Optional |

**Rule:** Lifecycle identity is **text-first** — icons supplementary only.

### Status

| Status | Icon |
|--------|------|
| Draft | `file-edit` |
| Approved | `lock` or `badge-check` |
| Superseded | `history` |
| Active session | `circle-dot` |
| Waiting | `clock` |
| Failed | `x-circle` |
| Warning | `alert-triangle` |
| Success | `check-circle` |

Always paired with text in StatusChip.

### Evaluation

| Concept | Icon |
|---------|------|
| Evaluation run | `clipboard-check` |
| Pass | `check-circle` + “Passed” |
| Fail | `x-circle` + “Failed” |
| Borderline | `alert-triangle` + “Borderline” |
| Rubric criterion | `list-checks` |
| Evidence link | `paperclip` or `file-search` |

### AI

| Concept | Icon |
|---------|------|
| AI generated | `sparkles` | Always with “AI Draft” text |
| AI explanation | `info` | AiExplainBlock |
| AI confidence | `gauge` | Optional — caption required |
| Regenerate | `refresh-cw` | Secondary action only |

**Forbidden:** Robot mascots; brain icons on every AI surface.

### Cursor

| Concept | Icon |
|---------|------|
| Cursor session | `terminal` |
| Copy prompt | `copy` |
| Open Cursor | `external-link` |
| Capture | `upload` or `file-input` |
| Handoff | `arrow-right-left` |

### Knowledge

| Concept | Icon |
|---------|------|
| Pattern | `lightbulb` | Not emoji |
| Lesson learned | `notebook-pen` |
| Anti-pattern | `shield-alert` |
| Promotion | `arrow-up-circle` |

### Registry

| Concept | Icon |
|---------|------|
| Module | `blocks` |
| Version | `git-branch` |
| Deprecated | `archive-x` |
| Reuse | `recycle` or `repeat-2` |

### Risk

| Concept | Icon |
|---------|------|
| Risk item | `alert-triangle` |
| Stale session | `clock-alert` |
| Repeated failure | `alert-octagon` |

Severity conveyed by text + border token — not icon color alone.

---

## Warning / Success Icons

- **Never icon-only** for pass/fail/warning.  
- Success green icon only when text “Passed” adjacent.  
- Warning amber icon + “Borderline” or explicit warning copy.  
- Error red icon + “Failed” — not entire row red.

---

## Forbidden Icon Usage

1. Icon-only primary buttons (except IconButton with aria-label)  
2. Different icon sets mixed in same toolbar  
3. Filled decorative icons on every card header  
4. Emoji as icon replacement  
5. Animated spinning icons except Button loading and explicit in-progress states  
6. Checkmark on LifecycleBadge by default  
7. Kanban column icons  
8. User avatars for “assignee” — no assignee concept Phase 1  
9. Brand logos inside StatusChip  
10. Custom SVG per screen — use catalog names only  

---

## Future Extension

Phase 2 dark mode: icons inherit `color-text-primary` — no separate dark SVG assets.

Custom module icons from registry metadata — **rejected** Phase 1 (text + blocks icon only).

---

## Related Documents

- [25 Content and Copy](./25_CONTENT_AND_COPY_GUIDELINES.md)
- [Design System — Buttons](../aos-design-system/05_BUTTON_SYSTEM.md)
