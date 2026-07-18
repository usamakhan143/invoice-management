# 08 — Notification Philosophy

**Stage D0 — FXD**  
**Grounding:** Dashboard attention model, ADR-007, founder decision map

---

## Core Principle

**Notify only when human judgment is required or delivery is blocked.**

Silence is a feature. The founder checks the Dashboard intentionally — notifications pull them in when waiting has a cost.

---

## Notification Tiers

### Tier 1 — Action Required (Always notify)

Human gate cannot proceed without founder or delivery lead.

| Event | Message shape | Channel |
|-------|---------------|---------|
| Requirement set ready for approval | “[Client] requirements ready for your approval” | In-app + optional email |
| Prompt pack ready for approval | “[Engagement] prompt pack awaits approval before Cursor can run” | In-app + optional email |
| Evaluation failed (founder override policy) | “[Engagement] evaluation failed — iteration or override needed” | In-app |
| QA blocked at handoff | “[Engagement] QA incomplete — handoff blocked” | In-app |
| Retrospective blocks close | “[Engagement] ready to close — retrospective required” | In-app |

### Tier 2 — Awareness (Dashboard only — no push)

Visible on Dashboard attention queue; **no push notification**.

| Event | Rationale |
|-------|-----------|
| Cursor capture incomplete | Developer responsibility first |
| AI draft ready for review (non-blocking) | Founder pulls when ready |
| Reuse scan suggestions | Informational |
| Stale engagement heuristic | Risk panel — not urgent by default |

### Tier 3 — Never Notify

| Event | Why silent |
|-------|------------|
| Every Cursor session start | Noise |
| Every evaluation pass | Expected path |
| Every requirement edit in draft | Work in progress |
| Lifecycle state forward auto-eligible | No decision yet |
| Module registry browse | Pull model |
| Knowledge library updates | Pull model |
| “Daily digest” of all activity | Spam |
| @mentions / comment threads | No generic collaboration model in AOS |

---

## Recipient Rules

| Role | Tier 1 notifications |
|------|---------------------|
| **Founder / owner** | All Tier 1 if permission allows |
| **Delivery lead** | Tier 1 for their engagements |
| **Developer** | Capture reminders only (Tier 2 in-app) |
| **Admin** | Configurable — default same as founder |

Permissions follow ERP `aos/config/permissions.ts` — AOS does not duplicate user system.

---

## Timing Rules

1. **Debounce:** Same attention type for same engagement — max 1 push per 4 hours.
2. **Quiet hours:** Respect user locale — default no email 8pm–8am.
3. **Batch:** Multiple approvals for same engagement → one notification with count.
4. **Resolve on action:** Notification clears when decision recorded.

---

## Channel Strategy (Phase 1 FXD)

| Channel | Use |
|---------|-----|
| **In-app badge** | Primary — Dashboard attention count |
| **Email** | Opt-in Tier 1 only |
| **Mobile push** | Future — same rules as email |
| **Slack/Teams** | Future integration — not Phase 1 |

---

## Anti-Patterns (Forbidden)

- “You have 47 updates”
- Weekly activity summaries with no action
- Notifications for other users’ draft saves
- Marketing-style “tips” in notification stream
- Red badge on every sidebar item

---

## Related Documents

- [04 Dashboard Philosophy](./04_DASHBOARD_PHILOSOPHY.md)
- [07 Decision Map](./07_DECISION_MAP.md)
- [09 UX Principles](./09_UX_PRINCIPLES.md)
