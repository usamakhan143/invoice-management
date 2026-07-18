# 09 — UX Principles

**Stage D0 — FXD**  
**Grounding:** ADR-012, ADR-001, Apple/Linear/Stripe design philosophy adapted for AOS

---

## The Founder's Question

Every screen must answer:

> **“What should I do next?”**

If a screen cannot answer this, it fails FXD review.

---

## Principle 1 — One Clear Next Action

- Each engagement view shows **exactly one** primary CTA
- Secondary actions are visually subordinate
- No button walls — if everything is primary, nothing is

---

## Principle 2 — No Unnecessary Buttons

- Actions appear **in context** of lifecycle state
- Disabled actions explain **why** (gate not passed)
- Destructive actions (cancel) require confirmation + reason

---

## Principle 3 — AI Assists, Founder Decides

- AI outputs labeled **Draft**
- Approve actions are human-only
- AI never hidden — show “AI suggested” vs “You edited”
- Override requires audit note

---

## Principle 4 — Never Hide Critical Business Information

Always visible on Engagement Hub:

- Client name (ERP)
- Lifecycle state (domain label)
- Delivery lead
- Blockers
- Pending approvals

Never collapse into icons-only.

---

## Principle 5 — Never Overwhelm the Founder

- Dashboard max 7 attention items
- Progressive disclosure for version history, captures, rubrics
- Default views show **current** artifact — history one click away
- No chart walls on first load

---

## Principle 6 — Progress Must Always Be Factual

- Lifecycle state from domain — not percentage complete
- “3 of 12 prompts evaluated” is factual
- “72% complete” without evidence is **forbidden**
- Paused and cancelled shown honestly — not hidden

---

## Principle 7 — Evidence Over Status

- Evaluation pass/fail beats green checkmarks
- Approved version IDs visible to power users
- Append-only history accessible — never “cleaned up”

---

## Principle 8 — Engagement Context Never Lost

- Breadcrumb: Delivery → [Engagement Title] → [Tab]
- Global queues always show engagement name + client
- Switching engagements preserves no confusing global state

---

## Principle 9 — Sidecar Transparency

- ERP/BOS links labeled “View in ERP” / “View in BOS”
- Read-only badge on external data
- Never imply AOS owns customer or initiative records

---

## Principle 10 — Calm Density (Linear-Inspired)

- Typography hierarchy over borders
- Whitespace over grid lines
- Color for state — not decoration
- Dark mode compatible (future) — design neutral first

---

## Principle 11 — Reuse Visible

- Registry matches surface wherever planning happens
- Net-new requires visible justification — not buried in modal
- Reuse rate shown at retrospective — not gamified on dashboard

---

## Principle 12 — Keyboard-Ready (Future)

FXD notes for UI stage:

- `⌘K` command palette: jump engagement, approve queue
- Not Phase 1 requirement — architecture allows

---

## UX Anti-Patterns (Forbidden)

| Anti-pattern | Why |
|--------------|-----|
| Kanban drag-drop | ADR-012 |
| Confetti on approve | Trivializes gates |
| Fake progress bars | Misleading |
| Auto-advance lifecycle | Domain gates violated |
| Hide failed evaluations | Breaks trust |
| Generic empty states | Must guide next action |

---

## Accessibility Baseline (UI Stage)

- WCAG 2.1 AA target
- State never color-only
- Screen reader labels for lifecycle and gate status

---

## Related Documents

- [04 Dashboard Philosophy](./04_DASHBOARD_PHILOSOPHY.md)
- [10 Product Philosophy](./10_PRODUCT_PHILOSOPHY.md)
- [02 Screen Architecture](./02_SCREEN_ARCHITECTURE.md)
