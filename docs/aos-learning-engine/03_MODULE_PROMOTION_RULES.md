# 03 — Module Promotion Rules

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define how delivery outcomes produce **Module Registry** improvements — new entries, quality score updates, deprecation flags, and gap signals — so reuse compounds across engagements (ADR-010).

Module promotion is organizational learning expressed as **catalogued reusable assets**, not ad hoc code memory.

---

## Inputs

| Input | Source |
|-------|--------|
| Module Candidates | Learning Extraction |
| Reuse Assessment outcomes | Reuse domain |
| Evaluation results (module-related) | Evaluation Engine |
| Cursor session file scope | Cursor Integration |
| Net-new code extracted | Post-evaluation extraction |
| ERP Discovery reuse map | Bootstrap |
| Existing Registry entries | Module Registry |
| Rejected reuse recommendations | Reuse Assessment |

---

## Outputs

| Output | Destination |
|--------|-------------|
| New Module Registry Entry | Module Registry |
| Module Version bump | Module Registry |
| Quality score adjustment | Module Registry metadata |
| Anti-pattern annotation | Module entry + Knowledge Pattern |
| Gap flag ("needed module") | Investment queue |
| Deprecation notice | Module Registry |
| Usage statistics update | Module metrics |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| AOS Module Registry | Catalog ownership |
| Delivery lead | Registration approval |
| Technical reviewer | Architecture/safety review for new modules |
| Learning Engine | Candidate generation |
| ERP | Consumed modules remain ERP-owned (sidecar law) |

---

## Approval

| Action | Approver |
|--------|----------|
| Register new module from engagement | Delivery lead + technical reviewer |
| Quality score decrease > threshold | Delivery lead |
| Deprecate module | Delivery lead |
| Gap flag for investment | Agency owner (optional) |
| Annotate with anti-pattern | Delivery lead |

**Forbidden:** Registering ERP-owned capability as AOS module without ADR-approved architecture change (ADR-010 §16).

---

## Versioning

- **Module Registry Entry:** stable identity (`moduleId`).
- **Module Version:** semver (`major.minor.patch`) per ADR-013 alignment.
- Breaking integration change → major bump.
- Learning-driven annotation → metadata version note, not necessarily semver bump.

---

## Promotion Rules

### Candidate types

| Candidate type | Trigger | Registry action |
|----------------|---------|-----------------|
| `new_module` | Genuine gap + evaluated net-new code | Register entry |
| `score_increase` | Successful reuse + passing evaluation | +quality score |
| `score_decrease` | Module linked to evaluation failure | −quality score + note |
| `deprecation` | Codebase removed/replaced | Mark deprecated |
| `gap_signal` | Repeated unmatched requirement category | Flag needed module |
| `annotation` | Pattern applies to module | Link Knowledge Pattern |

### Registration eligibility (new module)

All must pass:

1. **Gap justification** — Reuse Assessment documented why existing modules insufficient.
2. **Evaluation pass** — Code produced under module scope passed evaluation.
3. **Extraction complete** — Boundaries, dependencies, and integration points documented.
4. **No ERP duplication** — Sidecar law check passed.
5. **Privacy check** — No client-specific coupling in reusable boundary.

### Quality score rules

| Event | Score delta (conceptual) |
|-------|-------------------------|
| Reuse accepted + eval pass | +5 |
| Reuse accepted + eval fail | −10 |
| Reuse rejected but dev built equivalent | Review for registry gap |
| 3+ engagements reuse successfully | +10 bonus |
| Referenced module deprecated in codebase | Set stale; −20 on confirmation |

Scores inform Matching Engine weighting, not hard blocking (except deprecated).

### Reuse rejection learning

When developer rejects reuse recommendation:

1. Capture rejection reason as Knowledge Record.
2. If equivalent built → candidate for `new_module` or matching rule update.
3. If false positive match → candidate for Matching Engine weight adjustment.

---

## Lifecycle

```
engagement reuse decision
        │
        ▼
evaluation outcome
        │
        ▼
Learning Extraction → Module Candidate
        │
        ▼
review queue → approved → Registry mutation
        │
        ▼
available to Matching Engine (next engagement)
        │
        ▼
stale detection → deprecated (never hard delete)
```

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Register duplicate module | Merge entries; link versions |
| Module without evaluation | Block registration |
| ERP capability re-registered | Block; cite duplication report |
| Score gaming (forced reuse) | Audit review; ADR-010 anti-gaming |
| Stale module recommended | Stale detection + matching penalty |
| Client code in module boundary | Block; engagement-scoped only |

---

## Audit Requirements

- `aos_module_candidate_created`
- `aos_module_registered_from_learning`
- `aos_module_quality_score_updated`
- `aos_module_deprecated_from_learning`
- `aos_module_gap_flagged`
- `aos_reuse_rejection_recorded`

Links: `engagementId`, `moduleId`, `evaluationId`, `reuseAssessmentId`, `candidateId`.

---

## Related Documents

- [16_MODULE_QUALITY_METRICS.md](16_MODULE_QUALITY_METRICS.md)
- [13_REUSE_METRICS.md](13_REUSE_METRICS.md)
- `docs/aos-architecture/09_REUSABLE_MODULE_SYSTEM.md`
- `docs/aos-adr/ADR-008_MODULE_REGISTRY.md`
