# 14 — Dialog Patterns

**Stage D1 — AOS Design System**

---

## C-070 Dialog (Base)

### Purpose
Modal overlay for focused decisions interrupting current flow.

### Responsibilities
- Trap focus while open
- Block background interaction
- Close on Esc unless destructive in progress
- Return focus to trigger on close

### Allowed Usage
Confirmations, approvals requiring explicit consent, destructive actions

### Forbidden Usage
Large forms better suited to full page; browsing content; nested dialogs

### States
Open, closing, submitting

### Loading
Primary button loading; disable close during submit

### Sizing
Sm: confirmations; Md: approval with note; Lg: rare — prefer SidePanel

### Spacing
`space-stack-md` between title, body, actions

### Typography
Title: `font-size-heading`; body: `font-size-body`

### Interaction
Tab cycles focus; Enter submits only on ConfirmationDialog with single primary

### Accessibility
`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, initial focus on title or first field

---

## C-071 ConfirmationDialog

### Purpose
Confirm non-destructive or reversible actions.

### Responsibilities
Clear title as question; body explains consequence; Cancel + Confirm

### Allowed Usage
“Submit capture?”, “Request revision?”, “Add module to engagement?”

### Forbidden Usage
Approving requirement sets without review screen context (use ApprovalDialog after review)

### States
Default, submitting, error inline in body

### Buttons
Secondary Cancel (ghost); Primary Confirm (labeled specifically — not “OK”)

### Examples
Title: “Submit capture?” Body: “This will trigger evaluation for Session #1042.” Primary: “Submit Capture”

### Anti-patterns
Generic “Are you sure?” without entity names

---

## C-072 ApprovalDialog

### Purpose
Final explicit consent for human gates with legal/audit weight.

### Responsibilities
- Restate artifact name and version
- Require optional/required note per domain policy
- Approve variant button (success semantic)
- Show immutable consequence copy

### Allowed Usage
Final confirm after ApprovalPanel review — “Approve Requirement Set v3”

### Forbidden Usage
Skipping ApprovalPanel review; checkbox-only consent

### States
Default, submitting, success (close + toast)

### Permission Locked
Dialog not openable — trigger disabled at source

### AI Generated
Body must state “You are approving AI-generated content that has been reviewed”

### Human Approved
On success, dialog closes; parent shows approved state

### Examples
Title: “Approve requirement set v3?” Note field optional. Primary: “Approve”

### Anti-patterns
Same styling as ConfirmationDialog without Approve button variant

---

## C-073 DangerDialog

### Purpose
Confirm irreversible or high-impact destructive actions.

### Responsibilities
- Danger title and icon (with text)
- Required reason field when domain mandates (cancel engagement)
- Typed confirmation for catastrophic actions (future: type engagement name)

### Allowed Usage
Cancel engagement, reject artifact (if irreversible), archive (if ever allowed — append-only preferred)

### Forbidden Usage
Routine navigation; dismissing drafts without consequence copy

### States
Default, submitting, validation error on empty reason

### Buttons
Secondary Cancel; Primary Danger “Cancel Engagement”

### Examples
Title: “Cancel this engagement?” Required TextArea: reason. Primary: “Cancel Engagement”

### Anti-patterns
Red dialog for non-destructive actions; danger primary labeled “Confirm”

---

## Dialog vs SidePanel Decision Matrix

| Need | Pattern |
|------|---------|
| Quick confirm | ConfirmationDialog |
| Gate approval with note | ApprovalDialog |
| Cancel / reject irreversible | DangerDialog |
| Browse detail | SidePanel |
| Review long AI draft | Full page + ApprovalPanel |

---

## Anti-patterns (Global)

- Stacking dialogs
- Auto-opening dialogs on page load
- Dialog without escape hatch except during submit

---

## Related Documents
[05 Button System](./05_BUTTON_SYSTEM.md), [09 AI Components](./09_AI_COMPONENTS.md), [06 Form System](./06_FORM_SYSTEM.md)
