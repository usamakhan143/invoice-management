# 16 — Module Quality Metrics

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Measure Module Registry asset quality and learning contribution — ensuring organizational learning improves **which modules get recommended**, not merely how many exist.

---

## Inputs

| Input | Source |
|-------|--------|
| Module Registry entries & versions | Module Registry |
| Reuse accept/reject events | Reuse domain |
| Evaluation outcomes linked to modules | Evaluation Engine |
| Usage counts per engagement | Registry + workflow |
| Staleness flags | Stale detection pipeline |
| Extraction registrations | Learning Engine |
| ERP codebase change events | Platform signals |

---

## Outputs

| Output | Consumer |
|--------|----------|
| Module quality score (dynamic) | Matching Engine weighting |
| Usage & success statistics | Registry UI (future) |
| Deprecation/stale alerts | Review queue |
| Module learning candidates | Learning Engine |
| Investment priority list | Agency planning |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| Module Registry | Score storage |
| Learning Engine | Score update candidates |
| Technical reviewer | New module quality baseline |
| Matching Engine | Consumes scores |

---

## Approval

Score decreases >15 points require delivery lead approval. Automatic small adjustments from eval pass/fail may apply within threshold.

New module registration requires technical reviewer + delivery lead (doc 03).

---

## Versioning

Scores versioned as metadata history — each change appends score event with reason, not silent overwrite.

Module semver independent of quality score.

---

## Promotion Rules

| Signal | Registry action |
|--------|-----------------|
| 3+ successful reuses | Score bonus |
| Eval failure attributed to module | Score penalty + annotation |
| Codebase removal detected | Stale → deprecated workflow |
| Repeated gap near module domain | Sibling module or extension candidate |
| Zero usage in 12 months (active) | Review for deprecation |

---

## Lifecycle

```
module registered
        │
        ▼
reuse + evaluation events update score
        │
        ▼
rolling usage/success metrics
        │
        ▼
stale detection (platform change)
        │
        ▼
review → revalidate OR deprecate
        │
        ▼
learning extraction may register successor module
```

---

## Metric Catalog

| Metric | Definition | Trend |
|--------|------------|-------|
| **Module quality score** | 0–100 composite | Stable ↑ for good modules |
| **Reuse success rate** | Pass evals when used / total uses | ↑ |
| **Adoption count** | Engagements using module | ↑ then plateau |
| **Rejection rate** | Rejected recommendations / recommended | ↓ |
| **Stale module count** | Modules flagged stale / active | ↓ |
| **Time since last use** | Days since last adoption | Monitor |
| **Failure attribution rate** | Failures linked to module / module uses | ↓ |
| **Gap adjacency** | Unmatched reqs near module domain | ↓ after investment |

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Score drift without events | Reconciliation audit |
| Deprecated module recommended | Matching penalty + incident |
| Inflated score from forced reuse | Manual reset + investigation |
| Duplicate modules split metrics | Merge registry entries |

---

## Audit Requirements

- `aos_module_quality_score_updated`
- `aos_module_stale_detected`
- `aos_module_deprecation_recommended`

Links: `moduleId`, `moduleVersion`, `engagementId`, `evaluationId`, `delta`, `reason`.

---

## Related Documents

- [03_MODULE_PROMOTION_RULES.md](03_MODULE_PROMOTION_RULES.md)
- [13_REUSE_METRICS.md](13_REUSE_METRICS.md)
- `docs/aos-architecture/09_REUSABLE_MODULE_SYSTEM.md`
