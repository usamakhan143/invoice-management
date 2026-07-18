# 17 — Permission and Feature Flag UI

**Stage D1 — AOS Design System**  
Grounding: `aos/config/permissions.ts`, `aos/config/featureFlags.ts`, ADR-015.

---

## Principles

1. **Fail closed** — no permission → no action affordance (hide or disable per matrix below)
2. **Explicit locks** — user understands why, not silent omission without reason when already aware of feature
3. **Feature flags ≠ permissions** — flags hide experimental surfaces; permissions enforce authorization
4. **No client-only security** — UI gates mirror server enforcement; UI is not security boundary

---

## C-090 PermissionGate

### Purpose
Conditionally render children based on permission key(s).

### Responsibilities
Evaluate permission keys from config; support `any` / `all` modes

### Allowed Usage
Wrap buttons, nav items, tabs, ApprovalPanel actions

### Forbidden Usage
Wrapping entire app without fallback route

### States
Authorized (render children), unauthorized (render fallback or null)

### Permission Locked UI Modes

| Mode | When |
|------|------|
| **Hidden** | Nav items, destructive actions user should not know exist |
| **Disabled + tooltip** | Actions visible in collaborative UI — “Requires Delivery Lead role” |
| **LockedOverlay** | Read-only view of artifact with approve actions blocked |
| **Read-only substitute** | Form fields become text |

### Examples
`requirements.approve` gates ApprovalPanel primary buttons

### Accessibility
Disabled controls remain focusable only if tooltip explains — otherwise hide from tab order

---

## C-091 FeatureFlagGate

### Purpose
Hide or replace experimental features.

### Responsibilities
Read from `featureFlags.ts`; no permission logic

### States
Enabled (children), disabled (fallback or null)

### Feature Flag Locked UI Modes

| Mode | When |
|------|------|
| **Hidden** | Default for nav routes and tabs |
| **Disabled with badge “Beta off”** | Settings/debug only |
| **Coming soon placeholder** | Rare — prefer hide |

### Examples
`cursor.integration` off → hide Cursor nav and tab

---

## C-092 LockedOverlay

### Purpose
Semi-transparent overlay on read-only content with lock icon and message.

### Responsibilities
Block interaction with covered region; link to request access or show required role

### Allowed Usage
AiDraftPanel view without approve permission; approved artifact for read-only role

### Forbidden Usage
Whole page lock without navigation escape

### Typography
Message: `font-size-body`; role: `font-size-caption`

### Accessibility
`aria-hidden="true"` on covered content; overlay message focusable

---

## Permission × Component Matrix (Conceptual)

| Component | Typical permission |
|-----------|-------------------|
| Create Engagement | `delivery.create` |
| Approve Requirements | `requirements.approve` |
| Run Cursor session | `cursor.execute` |
| Run evaluation | `evaluation.run` |
| Registry reuse | `registry.reuse` |
| Cancel engagement | `delivery.cancel` |

Exact keys implement from `permissionKeys.ts` — UI docs reference semantic names above.

---

## Founder vs Operator Roles (UX)

- **Founder** — full approve gates on dashboard
- **Delivery Lead** — engagement-scoped actions
- **Read-only** — LockedOverlay on drafts; approved artifacts visible

Role names in copy must match ERP/BOS role display names from read adapters.

---

## Anti-patterns

- Showing approve button that fails on submit
- Feature flag checks duplicated ad hoc — always use FeatureFlagGate
- Permission error as toast only

---

## Related Documents
[05 Button System](./05_BUTTON_SYSTEM.md), [13 Navigation Components](./13_NAVIGATION_COMPONENTS.md)
