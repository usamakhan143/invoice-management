# 14 — Delivery Intelligence Metrics

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Measure **planning and execution intelligence** — how accurately the agency estimates, sequences, and delivers engagements — so organizational learning improves forecasts and intake decisions, not just code reuse.

---

## Inputs

| Input | Source |
|-------|--------|
| Engagement planning estimates | Intake / requirements |
| Actuals (duration, prompts, revisions) | Workflow artifacts |
| Lifecycle timestamps | Delivery Engagement |
| Evaluation cycles | Evaluation Engine |
| Reuse metrics | Doc 13 |
| Prompt quality metrics | Doc 15 |
| Retrospective estimation notes | Retrospective |
| BOS ROI data (read-only) | BOS initiatives linked to engagements |

---

## Outputs

| Output | Consumer |
|--------|----------|
| Estimation calibration factors | Agency Playbook |
| Delivery velocity trends | Leadership dashboard |
| Scope classification insights | Future intake |
| Intelligence learning candidates | Playbook + Knowledge |
| Engagement complexity score | Matching + prompt sizing |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| AOS metrics pipeline | Computation |
| Delivery lead | Calibration approval |
| Agency Playbook | Stores estimation guidance |
| BOS | Strategic ROI (AOS reads, does not write) |

---

## Approval

Calibration factor updates to playbook require delivery lead approval. Automatic metric computation requires none.

---

## Versioning

Calibration factors versioned with playbook sections. Historical engagement snapshots immutable for replay.

---

## Promotion Rules

| Intelligence signal | Promotion target |
|--------------------|------------------|
| Systematic underestimate on agency type | Playbook estimation section |
| Prompt count variance pattern | Prompt sizing template |
| Duration variance by engagement type | Intake checklist |
| Repeated scope creep pattern | Knowledge Pattern (process) |
| High ROI engagement profile | BOS read for strategic alignment (manual BOS update) |

Requires N≥5 engagements for statistical promotion (same as Continuous Learning).

---

## Lifecycle

```
intake estimate recorded
        │
        ▼
delivery actuals captured (append-only)
        │
        ▼
retrospective variance analysis
        │
        ▼
engagement intelligence snapshot
        │
        ▼
rolling calibration (30d/90d/all-time)
        │
        ▼
playbook/template updates (approved)
```

---

## Metric Catalog

| Metric | Comparison | Learning use |
|--------|------------|--------------|
| **Prompt count delta** | Planned vs actual prompts in pack | Pack sizing calibration |
| **Revision rate** | Prompts needing revision / total | Prompt quality baseline |
| **Engagement duration delta** | Planned vs actual lifecycle days | Intake estimates |
| **Evaluation cycle count** | Eval iterations to pass | Rubric/prompt strictness |
| **First-pass rate** | First eval pass / total prompts | Execution quality |
| **Scope stability** | Requirement versions after approval | Requirements process |
| **Handoff completeness** | QA checklist completion time | Handoff playbook |
| **Complexity score accuracy** | Predicted vs observed complexity | Matching weights |

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Insufficient sample size | Defer calibration; show confidence interval |
| Outlier engagement skews calibration | Mark outlier; optional exclude with audit |
| Mixing incomparable engagement types | Segment by agency type + engagement type |
| Using metrics for individual surveillance | Policy violation; disable report |

---

## Audit Requirements

- `aos_delivery_intelligence_snapshot`
- `aos_estimation_calibration_updated`
- `aos_complexity_score_computed`

Per engagement: `engagementId`, estimates[], actuals[], deltas[], `snapshotVersion`.

---

## Related Documents

- [05_PLAYBOOK_EVOLUTION_RULES.md](05_PLAYBOOK_EVOLUTION_RULES.md)
- [12_LEARNING_METRICS.md](12_LEARNING_METRICS.md)
- `docs/aos-architecture/10_CONTINUOUS_LEARNING.md` (Estimation Learning)
