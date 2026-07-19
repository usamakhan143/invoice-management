# 12 — Learning Metrics

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Measure whether AOS is achieving **organizational learning** — capture maturity, promotion throughput, pattern effectiveness, and flywheel health — not activity volume for its own sake.

---

## Inputs

| Input | Source |
|-------|--------|
| Learning Extraction Reports | Learning Engine |
| Promotion/rejection events | Approval workflow |
| Knowledge Pattern lifecycle | Knowledge Engine |
| Engagement close events | Delivery domain |
| Quarterly reviews | Operational process |
| Flywheel metric snapshots | Metrics pipeline |

---

## Outputs

| Output | Consumer |
|--------|----------|
| Learning KPI dashboard (future) | Agency leadership |
| Quarterly learning review pack | Delivery lead |
| Flywheel health score | Continuous improvement |
| Anomaly alerts | Regression detection |

---

## Ownership

| Metric category | Owner |
|-----------------|-------|
| Capture & promotion | AOS Learning Engine |
| Pattern effectiveness | Knowledge Engine |
| Review SLA | Operations / delivery lead |
| Reporting | AOS (read ERP for company scope) |

---

## Approval

Metrics are **computed automatically**. Published quarterly summaries require delivery lead acknowledgment. No metric alters promotions retroactively.

---

## Versioning

Metric definitions versioned (`metricDefinitionVersion`). Historical snapshots immutable — recomputation creates new snapshot, does not overwrite.

---

## Promotion Rules

Metrics inform **review priority**, not automatic promotion:

| Metric signal | Action |
|---------------|--------|
| Low promotion rate + high candidate volume | Review bottleneck alert |
| High rejection rate (AI) | Model calibration review |
| Rising canonical count | Positive flywheel signal |
| Flat knowledge capture over N engagements | Process audit |

---

## Lifecycle

```
engagement close → metric events emitted → rolling aggregates
        │
        ▼
engagement-level snapshot (immutable)
        │
        ▼
company rolling windows (30d, 90d, all-time)
        │
        ▼
quarterly review → optional goal adjustments
```

---

## Metric Catalog

| Metric | Formula (conceptual) | Direction |
|--------|---------------------|-----------|
| **Learning capture rate** | Engagements with ≥1 Knowledge Record / total closed | ↑ |
| **Extraction completeness** | Candidates generated / expected candidate types | → 100% |
| **Promotion rate** | Approved promotions / gate-passed candidates | Monitor (not maximize blindly) |
| **Promotion latency** | Median hours retrospective close → first promotion | ↓ |
| **Rejection rate** | Rejected / total reviewed | Monitor AI quality |
| **Pattern activation rate** | New active patterns / quarter | ↑ then stable |
| **Pattern stale rate** | Stale / active patterns | ↓ |
| **Evidence linkage rate** | Promotions with full source chain / total promotions | → 100% |
| **Flywheel cycle completion** | Engagements reaching `learning_complete` / closed | ↑ |
| **Knowledge reuse in prompts** | Prompts with ≥1 retrieved pattern / total packs | ↑ |

### Learning vs surveillance

Track **aggregate** metrics only (per `10_CONTINUOUS_LEARNING.md`). No individual developer learning rankings.

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Metric computation error | Alert; manual snapshot |
| Gaming (forced records) | Audit sampling |
| Missing events | Reconciliation job |
| Misleading promotion rate | Pair with rejection + quality metrics |

---

## Audit Requirements

- `aos_learning_metrics_snapshot` (quarterly, immutable)
- `aos_learning_metric_regression_detected`
- `aos_learning_quarterly_review_acknowledged`

---

## Related Documents

- [07_CONTINUOUS_LEARNING_FLYWHEEL.md](07_CONTINUOUS_LEARNING_FLYWHEEL.md)
- [13_REUSE_METRICS.md](13_REUSE_METRICS.md)
- [14_DELIVERY_INTELLIGENCE_METRICS.md](14_DELIVERY_INTELLIGENCE_METRICS.md)
