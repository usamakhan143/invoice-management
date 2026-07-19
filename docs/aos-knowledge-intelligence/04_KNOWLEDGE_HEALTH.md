# 04 — Knowledge Health

**Stage D2.6 — Knowledge Intelligence Layer**

---

## Purpose

Define **organization-wide knowledge health metrics** — composite signals that measure whether organizational intelligence is fresh, complete, trustworthy, and compounding — distinct from Learning Engine promotion metrics and Knowledge Engine storage metrics.

Health metrics answer: **"Is our agency getting smarter, or just accumulating noise?"**

---

## Health Model Overview

```
┌─────────────────────────────────────────────────────────┐
│              KNOWLEDGE HEALTH DASHBOARD (future)         │
│                                                          │
│  Vitality          Trust              Efficiency         │
│  ─────────         ─────              ──────────         │
│  Freshness         Confidence Dist.   Promotion Bottleneck│
│  Learning Velocity Knowledge Accuracy Review Backlog     │
│  Knowledge Growth  Knowledge Stability Promotion Rate     │
│                                                          │
│  Coverage          Hygiene            Value              │
│  ────────          ───────            ─────              │
│  Completeness      Duplicate Knowledge Knowledge ROI     │
│  Knowledge Diversity Dead Knowledge  Knowledge Debt      │
│  Knowledge Aging                                         │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ computed from OKG + engine read APIs
                          │
              Knowledge Intelligence Layer
```

---

## Metric Catalog

### Vitality — Is knowledge alive and growing?

#### Freshness

| Property | Definition |
|----------|------------|
| **What** | % of active L3 assets (patterns, modules, templates) updated or validated within rolling window (default 12 months) |
| **Formula** | `active_assets_touched_12m / total_active_L3_assets` |
| **Healthy** | ↑ toward 80%+ for mature agency |
| **Unhealthy** | ↓ below 50% — corpus stagnating |
| **Action** | Stale review campaign; external change sweep |

#### Learning Velocity

| Property | Definition |
|----------|------------|
| **What** | Rate of net new promoted assets + meaningful version bumps per quarter |
| **Formula** | `(promotions + material_version_bumps) / quarter` |
| **Healthy** | Steady then plateau (flywheel maturing) |
| **Unhealthy** | Zero for 2+ quarters post-active delivery |
| **Action** | Retrospective quality audit; Learning Engine bottleneck check |
| **Note** | Distinct from Learning Engine's per-engagement capture rate |

#### Knowledge Growth

| Property | Definition |
|----------|------------|
| **What** | Net change in active graph nodes (L3) over time |
| **Formula** | `active_L3_end - active_L3_start - deprecations` |
| **Healthy** | Positive early; near-zero late (mature catalog) |
| **Unhealthy** | Unbounded growth without dedup — noise accumulation |

---

### Trust — Is knowledge reliable?

#### Confidence Distribution

| Property | Definition |
|----------|------------|
| **What** | Histogram of confidence levels across active Knowledge Patterns |
| **Source** | `docs/aos-learning-engine/11_KNOWLEDGE_CONFIDENCE_LEVELS.md` |
| **Healthy** | Majority `validated`/`repeated`; growing `canonical` core |
| **Unhealthy** | Spike in `hypothesis` or orphan `single_observation` promoted incorrectly |
| **Action** | Confidence downgrade review |

#### Knowledge Accuracy

| Property | Definition |
|----------|------------|
| **What** | % of active patterns with ≥1 `validated_by` Evaluation in last 18 months |
| **Formula** | `patterns_with_recent_eval / active_patterns` |
| **Healthy** | ↑ over time |
| **Unhealthy** | Patterns without eval backing used in prompt assembly |
| **Action** | Re-validation queue |

#### Knowledge Stability

| Property | Definition |
|----------|------------|
| **What** | Inverse of churn — rate of deprecations + supersessions vs active corpus |
| **Formula** | `1 - (deprecations_quarter / active_L3_start)` |
| **Healthy** | Stable core with controlled edge churn |
| **Unhealthy** | High churn without external change events — process instability |

---

### Coverage — Is knowledge complete?

#### Coverage

| Property | Definition |
|----------|------------|
| **What** | % of requirement categories (by domain) with ≥1 supporting Module OR Pattern |
| **Formula** | `covered_categories / total_categories_observed` |
| **Healthy** | ↑ toward agency-type-specific targets |
| **Unhealthy** | Repeated gaps in same category across engagements |
| **Action** | Investment queue (Module gap flags from Learning Engine) |

#### Knowledge Completeness

| Property | Definition |
|----------|------------|
| **What** | % of closed engagements with complete OKG subgraph (all expected edges present) |
| **Formula** | `engagements_complete_graph / engagements_closed` |
| **Healthy** | → 100% |
| **Unhealthy** | Missing `derived_from`, broken traces |
| **Action** | Graph reconciliation |

#### Knowledge Diversity

| Property | Definition |
|----------|------------|
| **What** | Entropy/shannon across domain tags — avoids over-concentration in one domain |
| **Healthy** | Balanced across Architecture, Frontend, Security, Delivery, etc. |
| **Unhealthy** | 80% patterns in one domain — blind spots |
| **Action** | Targeted capture in underrepresented domains |

---

### Hygiene — Is corpus clean?

#### Duplicate Knowledge

| Property | Definition |
|----------|------------|
| **What** | Count of `duplicate_of` edges unresolved + semantic near-duplicate clusters |
| **Healthy** | ↓ toward zero active duplicates |
| **Unhealthy** | Same lesson as 5 patterns — retrieval noise |
| **Action** | Merge queue (human) |

#### Dead Knowledge

| Property | Definition |
|----------|------------|
| **What** | Active L3 assets with zero retrievals/references in 24 months AND no eval validation |
| **Formula** | Graph degree + usage counters |
| **Healthy** | Low count; intentional canonical retention OK |
| **Unhealthy** | Large dead weight — archive candidates |
| **Action** | Archive tier (doc 19 Learning Engine retention) |

#### Knowledge Aging

| Property | Definition |
|----------|------------|
| **What** | Age distribution of active assets (median, p90 age since last touch) |
| **Healthy** | Median age bounded; canonical assets may be old if validated |
| **Unhealthy** | p90 age high without `affected_by` review after external changes |

#### Knowledge Debt

| Property | Definition |
|----------|------------|
| **What** | Accumulated unresolved intelligence debt |
| **Components** | Unresolved `contradicts` + stale flags + ECE review backlog + orphan nodes + deferred candidates |
| **Formula** | Weighted sum (see weights below) |
| **Healthy** | ↓ or stable low |
| **Unhealthy** | ↑ quarter-over-quarter |
| **Action** | Quarterly debt paydown sprint |

**Debt weights (conceptual):**

| Item | Weight |
|------|--------|
| Active contradicts pair | 10 |
| Critical ECE unreviewed | 8 |
| Stale pattern in auto-injection | 5 |
| Orphan promoted pattern | 5 |
| Deferred learning candidate > 90d | 3 |
| Dead knowledge node | 1 |

---

### Efficiency — Is the system flowing?

#### Review Backlog

| Property | Definition |
|----------|------------|
| **What** | Count + age of items in Learning + KIL review queues |
| **Source** | Learning Engine approval queue + KIL conflict/ECE queues |
| **Healthy** | Median age ↓ |
| **Unhealthy** | Growing backlog — flywheel blocked |
| **Action** | Resource allocation; batch review |

#### Promotion Bottlenecks

| Property | Definition |
|----------|------------|
| **What** | Stage with max median latency: extraction → gate → review → promote |
| **Healthy** | Balanced stages |
| **Unhealthy** | Review stage >> others |
| **Note** | Learning Engine metric; KIL aggregates for health score |

---

### Value — Is knowledge worth the cost?

#### Knowledge ROI

| Property | Definition |
|----------|------------|
| **What** | Estimated delivery savings attributed to reused patterns/modules vs cost of capture + review |
| **Components** | Reuse rate delta × engagements; time saved estimates; review hours cost |
| **Healthy** | Positive and ↑ |
| **Unhealthy** | High capture cost, low retrieval hit rate |
| **Action** | Cut noise capture; improve retrieval (Phase 3+) |
| **Note** | Directional metric — not financial ledger |

---

## Composite Health Score (Future)

Optional single index (0–100) for executive view:

```
Health = weighted_mean(Freshness, Accuracy, Coverage, 
         inverse(Debt), inverse(Duplicate_rate), Learning_velocity_normalized)
```

Weights configurable per agency maturity phase (doc 07).

---

## Measurement Ownership

| Metric | Computed by | Consumed by |
|--------|-------------|-------------|
| All KIL health metrics | KIL analytics (future) | Dashboard, quarterly review |
| Promotion bottleneck | Reads Learning Engine events | KIL aggregation |
| Confidence distribution | Reads Knowledge Engine | KIL aggregation |
| Graph completeness | KIL graph integrity jobs | Health alerts |

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Metric gaming (forced promotions) | Pair with Accuracy + Debt |
| False freshness (touch without substance) | Require material version or eval link |
| ROI overclaim | Label as estimate; audit assumptions |
| Health score hides domain blind spot | Always show Diversity + Coverage breakdown |

---

## Boundaries

| Document | Overlap |
|----------|---------|
| `docs/aos-learning-engine/12_LEARNING_METRICS.md` | LE = process metrics; KIL = corpus/graph health |
| `docs/aos-learning-engine/13-16` | LE = operational; KIL = organizational aggregate |
| Knowledge Engine metrics (`08_KNOWLEDGE_ENGINE.md`) | KE = capture/retrieval rates; KIL = health composite |

---

## Related Documents

- [01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md](01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md)
- [03_EXTERNAL_CHANGE_INTELLIGENCE.md](03_EXTERNAL_CHANGE_INTELLIGENCE.md)
- [05_KNOWLEDGE_DOMAINS.md](05_KNOWLEDGE_DOMAINS.md)
- [07_INTELLIGENCE_ROADMAP.md](07_INTELLIGENCE_ROADMAP.md)
