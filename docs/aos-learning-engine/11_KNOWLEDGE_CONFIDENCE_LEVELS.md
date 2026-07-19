# 11 — Knowledge Confidence Levels

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define an evidence-strength taxonomy for knowledge and learning candidates — distinguishing hypothesis from canonical guidance so organizational learning scales without treating every anecdote as agency law.

---

## Inputs

| Input | Source |
|-------|--------|
| Knowledge Records | Knowledge Engine |
| Evaluation outcomes | Evaluation Engine |
| Cross-engagement pattern frequency | Metrics aggregation |
| Human validation actions | Approval workflow |
| Bootstrap corpus designation | ERP Discovery / ADRs |
| AI confidence scores (capped) | AI Recommendation pipeline |

---

## Outputs

| Output | Use |
|--------|-----|
| Confidence level on each record/candidate | Gate + promotion eligibility |
| Confidence elevation events | Audit + metric tracking |
| Retrieval ranking weight | Knowledge retrieval |
| UI confidence indicators | Future learning queue screens |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| Learning Engine | Initial assignment (rules-based + AI cap) |
| Delivery lead | Elevation to `canonical` |
| Metrics pipeline | Automatic elevation to `repeated` |

---

## Approval

| Transition | Authority |
|------------|-----------|
| → `validated` | Team member confirms record |
| → `repeated` | Automated when frequency threshold met |
| → `canonical` | Delivery lead explicit elevation |
| Override downgrade | Delivery lead with reason |

---

## Versioning

Confidence is metadata on record/candidate — not a separate version chain. Changes append confidence history log.

---

## Promotion Rules

### Level definitions

| Level | Code | Meaning | Promotable to Pattern? |
|-------|------|---------|------------------------|
| Hypothesis | `hypothesis` | Unverified idea or AI guess | No |
| Single observation | `single_observation` | One engagement, one event | No |
| Validated | `validated` | Human-confirmed, sourced | Yes (with review) |
| Repeated | `repeated` | ≥2 engagements or ≥3 evals same signal | Yes (priority queue) |
| Canonical | `canonical` | Bootstrap ADR/Discovery or ≥5 engagements + lead sign-off | Yes (auto-suggest active) |

### Elevation rules

```
single_observation
        │ human confirms
        ▼
validated
        │ frequency threshold OR second engagement match
        ▼
repeated
        │ delivery lead + sustained evidence
        ▼
canonical
```

### AI cap rule

AI cannot assign above `validated` on initial extraction. `repeated` and `canonical` require system frequency data or human elevation.

### Retrieval weighting

| Level | Retrieval priority |
|-------|-------------------|
| `hypothesis` | Excluded from auto-injection |
| `single_observation` | Engagement-scoped only |
| `validated` | Normal weight |
| `repeated` | Elevated weight |
| `canonical` | Highest weight; shown in constraints |

---

## Lifecycle

Confidence may increase or decrease:

- **Increase:** new supporting evidence, human validation.
- **Decrease:** contradicting evaluation, pattern stale, human downgrade.

Decrease does not delete records — marks lower confidence with audit.

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Premature canonical | Downgrade on review; tighten gates |
| Stale canonical | Move to `stale` pattern state |
| Confidence inflation by AI | Cap + human review |
| Never elevates (orphan observation) | Remains engagement-scoped (acceptable) |

---

## Audit Requirements

- `aos_confidence_assigned`
- `aos_confidence_elevated`
- `aos_confidence_downgraded`

Fields: `entityType`, `entityId`, `fromLevel`, `toLevel`, `reason`, `evidenceIds[]`.

---

## Related Documents

- [02_KNOWLEDGE_PROMOTION_RULES.md](02_KNOWLEDGE_PROMOTION_RULES.md)
- [08_QUALITY_GATES.md](08_QUALITY_GATES.md)
- `docs/aos-architecture/08_KNOWLEDGE_ENGINE.md`
