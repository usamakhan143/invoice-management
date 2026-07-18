# 11 — Evaluation Components

**Stage D1 — AOS Design System**  
Domain: Evaluation domain, ADR-007 Evaluation Gate.

---

## C-043 EvaluationCard

### Purpose
Represent a quality evaluation run against an engagement artifact (post-Cursor or gate checkpoint).

### Responsibilities
- Rubric name, score/result, pass/fail gate outcome
- Link to full evidence and re-run action (if domain allows)
- Show evaluation version and timestamp

### Allowed Usage
Evaluation tab, global Evaluation queue, EvidencePanel summaries

### Forbidden Usage
Score as gamification leaderboard; editing rubric from card

### States
**Passed**, **Failed**, **Borderline**, **Running**, **Superseded**

### Loading
Running: spinner + “Evaluation in progress” — poll or subscribe

### Empty
Tab EmptyState: “No evaluations yet — Complete capture to run evaluation”

### Disabled
Re-run disabled if prior gate approved and policy blocks

### Permission Locked
View only without `evaluation.run`

### Feature Flag Locked
Hide run actions if evaluation engine flag off

### Success
Passed — Success chip, subtle success border optional

### Warning
Borderline — Warning chip + AiExplainBlock if available

### Error
Failed — Error chip; primary action “View failures” not hide

### AI Generated
AI-scored dimensions labeled per row in detail view

### Human Approved
Human override of evaluation (if domain supports) — explicit audit banner

### Sizing
Card in list; compact row in queue table

### Typography
Score display: `font-size-heading`; rubric name: `font-size-label`

### Icons
Pass/fail icon with text — never icon alone

### Interaction
Click → evaluation detail with EvidencePanel + rubric breakdown

### Examples
“Delivery Quality Rubric · Failed · 62% · 3 criteria failed”

### Anti-patterns
Green/red entire card background; percentage without rubric context

### Future Extension
Comparative evaluation across versions — side-by-side panel

---

## Evaluation Detail Composition

| Region | Component |
|--------|-----------|
| Header | PageHeader + StatusChip + LifecycleBadge context |
| Summary | EvaluationCard expanded |
| Breakdown | DataTable of criteria rows (criterion, score, evidence link) |
| Evidence | EvidencePanel |
| Actions | Re-run (secondary), Proceed to gate (primary if pass) |

---

## Rubric Row (Sub-component)

### Purpose
Single criterion line in evaluation breakdown.

### States
Pass, Fail, N/A, Manual review

### Typography
Criterion name body; score caption mono

### Accessibility
Table row with text pass/fail — not color-only

---

## Gate Integration

When evaluation fails:
- NextBestActionCard shows “Resolve evaluation failures”
- AttentionQueue item severity Error
- Lifecycle progression blocked — banner on engagement header

When evaluation passes:
- GateChip updates to allow next lifecycle transition (domain-driven)

---

## Related Documents
[09 AI Components](./09_AI_COMPONENTS.md), [12 Engagement Components](./12_ENGAGEMENT_COMPONENTS.md), [07 Table System](./07_TABLE_SYSTEM.md)
