# 04 — Dashboard Philosophy

**Stage D0 — FXD**  
**Grounding:** ADR-007, ADR-010, ADR-012, `docs/aos-architecture/05_AI_ORCHESTRATION.md`

---

## Purpose

The Founder Dashboard is a **decision surface**, not an analytics dashboard.

It must answer within five seconds:

1. What needs my attention?
2. What is blocked?
3. What should I approve?
4. Where is AI waiting?
5. Where is Cursor waiting?
6. What can be reused?
7. What delivery risks exist?
8. What should I do next?

---

## Design Stance

| Inspired by | Borrowed concept | Rejected concept |
|-------------|------------------|------------------|
| **Linear** | Clean issue priority, minimal chrome | Issue = Task mapping |
| **Stripe** | Clear status, actionable alerts | Payment KPI walls |
| **Notion** | Contextual blocks, calm density | Blank canvas freedom |
| **Vercel** | Deployment-style factual progress | Infra metrics overload |
| **Apple** | One primary action per moment | Feature discoverability clutter |

---

## Layout Architecture (Conceptual)

### Zone A — Attention Queue (Primary)

Ordered list of **Attention Items**. Each item has:

- Engagement title + client name
- Attention type (approval, block, waiting, risk)
- Single sentence: why now
- Primary action button (one only)
- Secondary: dismiss / snooze (non-blocking items only)

**Max visible:** 7 items. Overflow → “View all” to filtered Delivery list.

### Zone B — Next Best Action (Hero)

One card for the **highest-priority engagement**:

- Current lifecycle state (factual label from domain)
- Exactly one recommended next step
- Blockers listed if any
- CTA: “Continue” → Engagement Hub tab

### Zone C — Waiting States (Secondary)

Compact panels:

| Panel | Shows |
|-------|-------|
| **AI waiting** | Draft generations ready for review; clarifications unanswered |
| **Cursor waiting** | Approved prompts not yet executed; captures incomplete |
| **Approval waiting** | Requirements, prompt packs, evaluations, quality report |

### Zone D — Reuse Opportunities (Secondary)

- Modules matching active discovery/planning engagements
- “Save ~X hours” only when AI confidence high — otherwise omit estimate

### Zone E — Delivery Risks (Secondary)

Factual risk flags only:

- Failed evaluation (count)
- Engagement paused > N days
- Discovery open > N days without approval
- Session capture missing > N days after execution

No red/yellow KPI tiles — **plain language risk list**.

---

## Explicitly Excluded

| Excluded | Reason |
|----------|--------|
| Sprint velocity | ADR-012 |
| Task completion % | Not task-based |
| Developer leaderboard | Wrong incentive |
| Revenue charts | ERP/BOS domains |
| Generic “projects on track” | Meaningless without evaluation evidence |
| Chart walls | Decision fatigue |

---

## Attention Item Types

| Type | Trigger (conceptual) | Founder action |
|------|---------------------|----------------|
| `APPROVE_REQUIREMENTS` | Draft set complete, AI readiness high | Review → approve |
| `APPROVE_PROMPT_PACK` | Pack generated, gates pass | Review → approve |
| `REVIEW_EVALUATION` | Evaluation failed or borderline | Accept fail → iterate |
| `COMPLETE_CAPTURE` | Cursor session missing capture | Submit capture |
| `RUN_REUSE_SCAN` | Planning entered, no assessment | Run scan |
| `QA_BLOCKED` | Delivering with open QA gaps | Complete QA |
| `RETROSPECTIVE_DUE` | Handoff complete, not closed | Complete retrospective |
| `RISK_STALE` | Stalled engagement heuristic | Open hub |

---

## AI on the Dashboard

AI **prioritizes and explains** — never auto-approves.

- Rank attention queue by business impact + blocking severity
- Generate one-line “why now” per item
- Suggest daily focus: “Complete 2 prompt approvals to unblock Building on Client X”

---

## Empty States

| State | Message philosophy |
|-------|-------------------|
| No engagements | “Create your first delivery engagement when a client is ready in ERP.” |
| All clear | “Nothing needs you right now. Active engagements are progressing.” — factual, not celebratory spam |

---

## Refresh Model

- Pull on load + manual refresh
- Real-time optional later — not FXD requirement
- Attention queue is **eventually consistent** with engagement state

---

## Related Documents

- [07 Decision Map](./07_DECISION_MAP.md)
- [08 Notification Philosophy](./08_NOTIFICATION_PHILOSOPHY.md)
- [09 UX Principles](./09_UX_PRINCIPLES.md)
