# 15 — Prompt Quality Metrics

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Measure prompt effectiveness as a driver of organizational learning — linking Prompt Engine outputs to Evaluation outcomes so template evolution is evidence-based.

---

## Inputs

| Input | Source |
|-------|--------|
| Prompt Artifact versions | Prompt Engine |
| Evaluation scores & dimensions | Evaluation Engine |
| Revision counts | Cursor + Prompt domains |
| Context budget usage | Prompt assembly |
| Template version at pack creation | Prompt Engine |
| Knowledge retrieval hits in context | Knowledge Engine |
| Agency type | Engagement metadata |

---

## Outputs

| Output | Consumer |
|--------|----------|
| First-pass evaluation rate | Flywheel + Prompt evolution |
| Prompt improvement candidates | Learning Engine |
| Template effectiveness ranking | Prompt Engine |
| Rubric calibration signals | Evaluation Engine |
| Context assembly quality score | Prompt Engine |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| Evaluation Engine | Score source of truth |
| Prompt Engine | Template lifecycle |
| Learning Engine | Candidate generation from metrics |

---

## Approval

Template changes driven by metrics still require delivery lead approval (doc 04).

---

## Versioning

Metrics tagged with `promptArtifactVersion`, `templateVersion`, `rubricVersion` for correlation.

---

## Promotion Rules

| Metric threshold | Prompt evolution action |
|------------------|------------------------|
| Structure ≥80% first-pass (same template, N≥3) | Sub-template promotion candidate |
| Missing reuse context correlates with fail | Add reuse block candidate |
| Context overflow >20% prompts | Assembly priority adjustment |
| Dimension X consistently low | Rubric weight review |
| Revision loop >2 on objective type | Exemplar + constraint candidate |

---

## Lifecycle

```
prompt approved → executed → evaluated
        │
        ▼
per-prompt metrics event
        │
        ▼
pack-level aggregation
        │
        ▼
engagement-level prompt quality snapshot (at retrospective)
        │
        ▼
learning extraction → prompt candidates
        │
        ▼
template version bump (if approved)
        │
        ▼
measure improvement on subsequent engagements
```

---

## Metric Catalog

| Metric | Definition | Trend |
|--------|------------|-------|
| **First-pass evaluation rate** | Pass on first eval / total prompts | ↑ |
| **Average evaluation score** | Mean weighted score | ↑ |
| **Revision rate** | Prompts with ≥1 revision / total | ↓ |
| **Context budget utilization** | Used / allocated context | → target band |
| **Knowledge retrieval hit rate** | Prompts with relevant pattern injected / total | ↑ |
| **Reuse directive compliance** | Eval passes reuse checks / prompts with directives | ↑ |
| **Template regression rate** | Pass rate drop after template change | ↓ |
| **Time-to-pass** | Median hours execute → pass | ↓ |

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Template change causes regression | Rollback (doc 10) |
| Metric on unevaluated prompt | Exclude |
| Compare across incompatible rubrics | Segment by rubricVersion |
| Overfitting template to one client | Block promotion (doc 04) |

---

## Audit Requirements

- `aos_prompt_quality_snapshot`
- `aos_prompt_template_regression_detected`
- `aos_prompt_improvement_candidate_created`

---

## Related Documents

- [04_PROMPT_EVOLUTION_RULES.md](04_PROMPT_EVOLUTION_RULES.md)
- `docs/aos-architecture/06_PROMPT_ENGINE.md`
- `docs/aos-adr/ADR-005_PROMPT_PACK_ARCHITECTURE.md`
