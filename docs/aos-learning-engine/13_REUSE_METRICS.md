# 13 — Reuse Metrics

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Measure reuse-first delivery outcomes (ADR-010) and feed the Learning Engine with signals for Module Registry and Matching Engine improvement.

Reuse metrics prove whether organizational learning reduces net-new code over time.

---

## Inputs

| Input | Source |
|-------|--------|
| Reuse Assessment records | Reuse domain |
| Reuse recommendation accept/reject | Reuse domain |
| Module usage in engagements | Module Registry |
| Evaluation outcomes on reused vs net-new | Evaluation Engine |
| Prompt reuse directives compliance | Prompt + Evaluation |
| Planned vs actual reuse | Engagement planning metadata |
| Learning promotions affecting matching | Learning Engine |

---

## Outputs

| Output | Consumer |
|--------|----------|
| Reuse rate (engagement + rolling) | Flywheel metrics |
| Matching accuracy signals | Matching Engine tuning |
| Module usage leaderboard | Registry quality |
| Gap frequency reports | Investment priorities |
| Reuse learning candidates | Module + Knowledge promotion |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| Matching Engine | Recommendation generation |
| Module Registry | Usage counters |
| Learning Engine | Rejection → learning conversion |
| Delivery lead | Interpretation (not quota enforcement) |

---

## Approval

Metrics automatic. Matching rule changes from reuse metrics require delivery lead approval.

---

## Versioning

Reuse metric snapshots per engagement immutable. Matching weight versions tracked separately.

---

## Promotion Rules

Reuse events trigger learning candidates:

| Event | Learning candidate |
|-------|-------------------|
| Reuse rejected | Matching rule or new module |
| Reuse accepted + eval fail | Module score decrease |
| Reuse accepted + eval pass | Module score increase |
| Unmatched requirement category | Gap flag |
| Dev built equivalent without recommendation | Registry gap |

**Forbidden:** Treating reuse rate as hard quota (ADR-010 §16 anti-gaming).

---

## Lifecycle

```
plan reuse estimate (intake)
        │
        ▼
reuse assessment (actual decisions)
        │
        ▼
delivery + evaluation
        │
        ▼
retrospective → reuse metrics snapshot
        │
        ▼
learning extraction → registry/matching updates
        │
        ▼
next engagement matching (improved)
```

---

## Metric Catalog

| Metric | Definition | Target trend |
|--------|------------|--------------|
| **Reuse rate** | Reused modules + patterns / total module needs | ↑ |
| **Net-new code ratio** | Net-new LOC or modules / total delivery scope | ↓ |
| **Recommendation acceptance rate** | Accepted / total recommendations | Monitor |
| **False positive rate** | Rejected recommendations / total | ↓ |
| **False negative rate** | Equivalent built without recommendation / gaps | ↓ |
| **Reuse eval pass rate** | Pass evals on reused modules / reuse uses | ↑ |
| **Gap recurrence** | Same unmatched category across engagements | ↓ |
| **Registry coverage** | Requirement categories with ≥1 module / total categories | ↑ |
| **Planned vs actual reuse delta** | abs(planned − actual) / planned | ↓ (calibration) |

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Forced reuse to hit metric | Audit; ADR-010 violation |
| Metric without assessment | Exclude engagement from reuse rate |
| Duplicate module counting | Dedup by moduleId |
| Client-specific code counted as reusable | Exclude from reuse rate |

---

## Audit Requirements

- `aos_reuse_metrics_snapshot` (per engagement)
- `aos_reuse_rejection_recorded`
- `aos_matching_weight_updated_from_learning`

---

## Related Documents

- [03_MODULE_PROMOTION_RULES.md](03_MODULE_PROMOTION_RULES.md)
- [16_MODULE_QUALITY_METRICS.md](16_MODULE_QUALITY_METRICS.md)
- `docs/aos-adr/ADR-010_REUSE_FIRST_DEVELOPMENT.md`
