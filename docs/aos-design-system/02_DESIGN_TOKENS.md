# 02 — Design Tokens

**Stage D1 — AOS Design System**  
**Note:** Token **names** only — implementation maps to CSS/Tailwind in a future stage. No CSS in this document.

---

## Token Naming Convention

```
{category}-{property}-{variant}-{state?}
```

Examples: `color-text-secondary`, `space-stack-md`, `radius-card`.

---

## Color Tokens

### Text

| Token | Semantic use |
|-------|--------------|
| `color-text-primary` | Body, headings |
| `color-text-secondary` | Metadata, captions |
| `color-text-tertiary` | Placeholder, disabled text |
| `color-text-inverse` | Text on primary button |
| `color-text-link` | Links |
| `color-text-link-sidecar` | ERP/BOS external links |
| `color-text-danger` | Error messages |
| `color-text-success` | Pass labels (evaluation) |
| `color-text-warning` | Warning labels |
| `color-text-ai` | AI-generated label text |
| `color-text-approved` | Approved artifact label |

### Surface

| Token | Semantic use |
|-------|--------------|
| `color-surface-page` | AOS content background |
| `color-surface-card` | Card background |
| `color-surface-elevated` | Modals, dropdowns |
| `color-surface-inset` | Code blocks, capture excerpts |
| `color-surface-ai-draft` | AI draft panel background |
| `color-surface-approved` | Approved artifact subtle tint |
| `color-surface-danger-subtle` | Danger dialog background tint |
| `color-surface-warning-subtle` | Risk panel tint |

### Border

| Token | Semantic use |
|-------|--------------|
| `color-border-default` | Card, input borders |
| `color-border-subtle` | Dividers |
| `color-border-focus` | Focus ring |
| `color-border-ai` | AI draft panel border |
| `color-border-approved` | Approved artifact border |
| `color-border-danger` | Error states |

### Interactive

| Token | Semantic use |
|-------|--------------|
| `color-interactive-primary` | Primary button fill |
| `color-interactive-primary-hover` | Primary hover |
| `color-interactive-primary-disabled` | Primary disabled |
| `color-interactive-secondary` | Secondary button |
| `color-interactive-danger` | Danger button |

### Lifecycle (Badge — neutral-first)

| Token | Use |
|-------|-----|
| `color-lifecycle-neutral-bg` | All lifecycle badges default |
| `color-lifecycle-neutral-text` | Lifecycle label text |
| `color-lifecycle-paused-bg` | Paused only — subtle amber tint |
| `color-lifecycle-cancelled-bg` | Cancelled — muted |
| `color-lifecycle-terminal-bg` | Closed — muted |

**Rule:** No per-state rainbow — text carries meaning (`building`, `evaluating`).

---

## Spacing Tokens

| Token | Use |
|-------|-----|
| `space-stack-xs` | Tight inline gaps |
| `space-stack-sm` | Form field internal |
| `space-stack-md` | Default stack between elements |
| `space-stack-lg` | Section separation |
| `space-stack-xl` | Page regions |
| `space-inline-sm` | Icon + text |
| `space-inline-md` | Button groups |
| `space-page-x` | Content horizontal padding |
| `space-page-y` | Content vertical padding |
| `space-card-padding` | Card internal padding |

---

## Typography Tokens

| Token | Use |
|-------|-----|
| `font-family-sans` | UI prose |
| `font-family-mono` | IDs, versions, captures |
| `font-size-display` | Page title |
| `font-size-heading` | Section title |
| `font-size-body` | Body text |
| `font-size-label` | Labels, table headers |
| `font-size-caption` | Metadata |
| `font-weight-regular` | Body |
| `font-weight-medium` | Labels, buttons |
| `font-weight-semibold` | Headings |
| `line-height-body` | Body |
| `line-height-tight` | Headings, compact tables |

---

## Radius Tokens

| Token | Use |
|-------|-----|
| `radius-sm` | Chips, badges |
| `radius-md` | Inputs, buttons |
| `radius-lg` | Cards |
| `radius-xl` | Modals |
| `radius-full` | Avatars, dots |

---

## Shadow Tokens

| Token | Use |
|-------|-----|
| `shadow-none` | Flat cards default |
| `shadow-sm` | Dropdowns |
| `shadow-md` | Modals, side panels |
| `shadow-focus` | Focus ring substitute |

**Philosophy:** Prefer border over shadow for cards (Linear-like).

---

## Z-Index Tokens

| Token | Layer |
|-------|-------|
| `z-base` | Content |
| `z-sticky` | Sticky table header, tab bar |
| `z-dropdown` | Menus |
| `z-side-panel` | Side panels |
| `z-modal` | Dialogs |
| `z-toast` | Notifications |

---

## Duration Tokens

| Token | Use |
|-------|-----|
| `duration-fast` | 100–150ms |
| `duration-normal` | 200–250ms |
| `duration-slow` | 300ms max |

---

## Sizing Tokens

| Token | Use |
|-------|-----|
| `size-icon-sm` | Inline icons |
| `size-icon-md` | Button icons |
| `size-touch-min` | Minimum 44×44px touch target |
| `size-button-height-md` | Default button |
| `size-button-height-sm` | Compact tables |
| `size-input-height` | Form inputs |
| `size-sidebar-panel-width` | Side panel default |
| `size-content-max-width` | Readable prose max width |
| `size-table-row-height-comfortable` | Default row |
| `size-table-row-height-compact` | Queues |

---

## Component-Specific Tokens

| Token | Component |
|-------|-----------|
| `size-attention-queue-max-visible` | 7 (FXD) |
| `size-next-best-action-min-height` | Hero card |
| `size-lifecycle-badge-height` | Badge |
| `size-status-chip-height` | Chip |

---

## Dark Mode (Future)

All tokens must have `-dark` counterparts planned. Phase 1 UI may ship light-only; token names must not block dark mode.

---

## Related Documents

- [01 Design Language](./01_DESIGN_LANGUAGE.md)
- [05 Button System](./05_BUTTON_SYSTEM.md)
