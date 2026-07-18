# 06 — Form System

**Stage D1 — AOS Design System**

---

## C-005 FormField

### Purpose
Wraps label, control, hint, and validation message for one input.

### Responsibilities
Associate label with control; show errors; show FieldInfoTip pattern for help

### Allowed Usage
All AOS forms — create engagement, capture, retrospective, cancel reason

### Forbidden Usage
Wrapping entire multi-field sections (use FormSection)

### States
Default, focus (child), error, disabled, read-only

### Loading
Skeleton on async default values (ERP customer load)

### Empty
Optional fields show “Optional” in caption token

### Permission Locked
Read-only display mode — no input, show value as text

### Feature Flag Locked
Field hidden if entire form section gated

### Typography
Label: `font-size-label`; error: `color-text-danger` + `font-size-caption`

### Accessibility
`htmlFor` / `id` link; `aria-describedby` for hint and error; `aria-invalid` on error

---

## C-006 TextInput

### Purpose
Single-line text entry.

### Allowed Usage
Title, scope summary, cancel reason, search filters

### Forbidden Usage
Multi-line prose (use TextArea); read-only version IDs without copy affordance

### Sizing
Full width in forms; fixed width only in filter bar

---

## C-007 TextArea

### Purpose
Multi-line entry — scope, notes, capture excerpts.

### Sizing
Min 3 rows; max height scroll at ~12 rows; monospace variant for capture paste

---

## C-008 Select

### Purpose
Single selection from known options — agency type, engagement type, lifecycle filter.

### Allowed Usage
Enums with ≤20 options; ERP customer picker uses searchable variant

### Forbidden Usage
Lifecycle state manual override (domain gates control transitions)

---

## C-009 SearchInput

### Purpose
Filter lists — engagements, registry, knowledge.

### Behavior
Debounce 300ms; clear button; Esc clears when focused

### Icons
Search icon leading; clear trailing

---

## C-010 Checkbox / Radio / Switch

### Purpose
Boolean or single-choice in small sets.

### Allowed Usage
Filter chips backend; QA checklist items; bulk table select (future)

### Forbidden Usage
Approve gates (use explicit Approve button)

---

## C-011 FormSection

### Purpose
Group related fields with heading.

### Spacing
`space-stack-lg` between sections; `space-stack-md` within

---

## Form-Level Patterns

### Create Engagement Form
- ERP customer Select (searchable) — sidecar link to ERP on selected
- Required: title, delivery lead, customer
- Optional: lead, initiative, template
- Primary: “Create Engagement”
- Secondary: Cancel

### Capture Form (Cursor)
- Required fields marked; AI completeness indicator
- StickyFooterBar: “Submit Capture”

### Cancel Engagement
- DangerDialog + required TextArea reason (domain rule)

### Validation Display
- Inline on blur/submit — not toast-only
- Summary banner on submit if multiple errors

---

## Anti-patterns
- Auto-save without draft indicator on requirement edits
- Hidden required fields
- Generic “Save” on immutable approved records

---

## Related Documents
[14 Dialog Patterns](./14_DIALOG_PATTERNS.md), [17 Permission UI](./17_PERMISSION_AND_FEATURE_FLAG_UI.md)
