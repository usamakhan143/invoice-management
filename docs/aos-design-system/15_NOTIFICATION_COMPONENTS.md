# 15 — Notification Components

**Stage D1 — AOS Design System**  
Grounding: FXD Notification Philosophy.

---

## C-074 Toast

### Purpose
Transient feedback for completed actions — not primary workflow driver.

### Responsibilities
Auto-dismiss (4–6s); manual dismiss; stack max 3 visible

### Allowed Usage
“Requirement set approved”, “Capture submitted”, “Copied to clipboard”

### Forbidden Usage
Critical gate failures requiring action (use InAppAlert or AttentionQueue); long AI output

### States
Entering, visible, exiting

### Variants
Success, Warning, Error, Neutral (info)

### Loading
N/A

### Permission Locked
N/A

### Interaction
Pause dismiss on hover/focus; click action link optional (single)

### Accessibility
`role="status"` or `role="alert"` for errors; not sole error communication for forms

### Anti-patterns
Toast for validation errors on forms; toast spam on bulk operations

---

## C-075 InAppAlert

### Purpose
Persistent banner on page until dismissed or condition clears.

### Responsibilities
Page-level or engagement-level messages: evaluation failed, integration degraded, read-only mode

### Allowed Usage
Top of content column below PageHeader

### Forbidden Usage
Marketing messages; duplicate AttentionQueue content on dashboard

### States
Info, Warning, Error; dismissible vs sticky (Error often sticky until resolved)

### Typography
Body; action link inline

### Examples
“Evaluation failed — resolve before approving prompt pack. View evaluation”

---

## C-076 NotificationBadge

### Purpose
Numeric or dot indicator on nav items and icons.

### Responsibilities
Queue counts; tab dots — cap display “99+”

### Allowed Usage
AosNavItem, EngagementTabBar dots

### Forbidden Usage
Unread chat counts; arbitrary red dots without meaning

### Accessibility
`aria-label` with count and queue name

---

## Notification vs AttentionQueue Boundary

| Mechanism | When |
|-----------|------|
| **AttentionQueue** | Actionable founder decisions |
| **InAppAlert** | Contextual page state |
| **Toast** | Action confirmation |
| **NotificationBadge** | Queue depth hint |

Email/push notifications are **out of scope** for D1 — future integration notes in FXD.

---

## Related Documents
[FXD Notifications](../aos-founder-experience/08_NOTIFICATION_PHILOSOPHY.md), [09 AI Components](./09_AI_COMPONENTS.md)
