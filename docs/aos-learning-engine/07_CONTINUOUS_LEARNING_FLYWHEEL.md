# 07 — Continuous Learning Flywheel

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Specify the **compounding mechanics** by which each closed engagement makes the next engagement faster, higher quality, and more reuse-heavy — the primary long-term value proposition of AOS (ADR-001).

This document operationalizes the flywheel that `docs/aos-architecture/10_CONTINUOUS_LEARNING.md` describes at philosophy level.

---

## Inputs

| Input | Source |
|-------|--------|
| All engagement workflow artifacts | AOS delivery pipeline |
| Learning Engine promotions | Post-retrospective |
| Registry + Knowledge + Prompt assets | AOS engines |
| Platform change events | ERP/BOS commits |
| Bootstrap corpus | ERP Discovery, BOS docs |
| Quarterly metrics review | Operational process |

---

## Outputs

| Output | Beneficiary |
|--------|-------------|
| Richer intake context | Next engagement planning |
| Better reuse suggestions | Matching Engine |
| Better default prompts | Prompt Engine |
| Higher first-pass evaluation rate | Delivery team |
| Calibrated estimates | Playbook + planning |
| Updated compounding metrics | Agency leadership |

---

## Ownership

| System | Flywheel contribution |
|--------|------------------------|
| Learning Engine | Orchestrates post-retrospective learning |
| Knowledge Engine | Patterns for retrieval |
| Module Registry | Reusable assets |
| Prompt Engine | Execution templates |
| Evaluation Engine | Quality feedback |
| Matching Engine | Reuse suggestions |
| Agency Playbook | Process defaults |

---

## Approval

Flywheel **measurement** is automatic. Flywheel **mutations** (promotions) require human approval per docs 02–06 and [09_APPROVAL_WORKFLOW.md](09_APPROVAL_WORKFLOW.md).

Quarterly flywheel review: delivery lead + agency owner approve portfolio-level template/playbook changes.

---

## Versioning

Each flywheel cycle anchored to:

- `engagementId`
- `retrospectiveId`
- `learningExtractionReportId`
- Snapshot of asset versions (registry, templates, playbook) at cycle start vs end

Enables before/after comparison per engagement.

---

## Promotion Rules

### Flywheel stages (post-retrospective)

```
Retrospective (closed)
        ↓
Learning Extraction
        ↓
Knowledge Candidates ──────────→ Knowledge Pattern Promotion
Module Candidates ─────────────→ Module Registry Improvements
Prompt Improvement Candidates ─→ Prompt Template Updates
Evaluation Insights ───────────→ Rubric / constraint updates
Playbook Proposals ────────────→ Agency Playbook Updates
        ↓
Reusable Assets (combined catalog)
        ↓
Future Engagement intake
        ├── Requirements analysis ( richer patterns )
        ├── Reuse Assessment ( better matching )
        ├── Prompt Pack ( better templates )
        ├── Cursor execution ( clearer constraints )
        ├── Evaluation ( calibrated rubrics )
        └── Retrospective ( new cycle )
```

### Compounding rules

| Rule | Rationale |
|------|-----------|
| Patterns cross engagements (anonymized) | Organizational learning |
| Client facts never cross | Privacy |
| Templates agency-wide | Efficiency |
| Failed patterns agency-wide | Mistake prevention |
| Bootstrap seeds first cycle | Day-zero value |
| N≥5 engagements for statistical calibration | Avoid noise |

### Feedback loop timing

| Loop | Frequency | Owner |
|------|-----------|-------|
| Per-prompt | Immediate | Evaluation Engine |
| Per-engagement | On retrospective close | Learning Engine |
| Per-quarter | Scheduled review | Delivery lead |
| Per-platform-change | Event-driven | Registry + Knowledge refresh |
| Per-discovery-audit | Periodic | Full corpus refresh |

---

## Lifecycle

```
Bootstrap (Day Zero)
        │
        ▼
Engagement 1 → … → Retrospective → Learning → Assets+
        │
        ▼
Engagement 2 (starts with Assets+)
        │
        ▼
(repeat — each cycle adds marginal assets and calibrates metrics)
        │
        ▼
Plateau phase (registry/knowledge growth slows; metrics still refine)
```

---

## Failure Cases

| Anti-pattern | Flywheel break | Prevention |
|--------------|----------------|------------|
| Skip retrospective | No extraction | Domain close gate |
| Candidates never reviewed | Assets don't compound | Review queue + SLA |
| Templates never updated | Same prompt mistakes | Prompt evolution rules |
| Registry stale | Bad reuse suggestions | Stale detection |
| Metrics never reviewed | No calibration | Quarterly review |
| Client data in patterns | Trust violation | Anonymization gates |
| Surveillance use | Team stops capturing | Learning vs surveillance policy |

---

## Audit Requirements

- Per-cycle: `aos_flywheel_cycle_completed` with metric snapshot
- Quarterly: `aos_flywheel_quarterly_review`
- Regression: `aos_flywheel_metric_regression_detected`

Metrics attached as immutable snapshot object (not rewritten).

---

## Related Documents

- `docs/aos-architecture/10_CONTINUOUS_LEARNING.md`
- [12_LEARNING_METRICS.md](12_LEARNING_METRICS.md)
- [01_LEARNING_LIFECYCLE.md](01_LEARNING_LIFECYCLE.md)
