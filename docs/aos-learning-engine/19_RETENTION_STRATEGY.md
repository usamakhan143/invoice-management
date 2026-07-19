# 19 — Retention Strategy

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define how long learning artifacts persist, when they archive, and how privacy/compliance interact with ADR-014 append-only policy — balancing organizational memory with storage cost and data minimization.

Retention serves **organizational learning continuity**, not indefinite hoarding of noise.

---

## Inputs

| Input | Source |
|-------|--------|
| All learning artifact types | AOS engines |
| ERP ActivityLogger events | ERP |
| Company retention policy | Governance (future) |
| Legal/compliance requests | External |
| Stale/deprecated signals | Stale detection |
| Storage cost metrics | Operations |

---

## Outputs

| Output | Effect |
|--------|--------|
| Retention tier assignment | Per artifact type |
| Archive state transitions | Cold storage |
| Exclusion from active retrieval | Deprecated/stale/archived |
| Compliance deletion manifest | Legal (exception path) |
| Retention audit log | Governance |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| Agency owner | Retention policy approval |
| AOS | Tier enforcement |
| ERP | Activity log retention (aligned) |
| Legal/compliance | Deletion authorization |

---

## Approval

Policy changes require agency owner approval. Legal deletion requires documented authorization — never developer-initiated.

---

## Versioning

Retention policy versioned. Artifacts record `retentionPolicyVersion` at creation.

---

## Promotion Rules

Retention does not block promotion. Promotion may **extend** retention tier (e.g., canonical patterns → permanent tier).

---

## Lifecycle

### Retention tiers

| Tier | Artifact types | Active retrieval | Duration |
|------|----------------|------------------|----------|
| **T0 — Permanent** | Canonical patterns, ADR-linked, append-only evals, closed retrospectives | Yes (if active) | Indefinite |
| **T1 — Long** | Active patterns, modules, templates, promotion traces | Yes | Life of company + 7 years |
| **T2 — Standard** | Engagement-scoped records, candidates, extraction reports | Engagement + 3 years | 3 years post-close |
| **T3 — Short** | Rejected candidates, deferred watch list (no promotion) | No after 1 year | 1 year |
| **T4 — Archive** | Deprecated/stale superseded versions | Historical only | T1 metadata; content cold storage |

### State transitions

```
active → stale → deprecated → archived (cold)
                │
                └── never hard delete (default)
```

### Legal deletion exception (narrow)

When legally mandated:

1. Written authorization stored.
2. Deletion manifest published (what, why, who).
3. Append-only **tombstone** event — not silent removal.
4. Promoted patterns derived from deleted engagement require human review.

Does not apply to confirmed evaluations or closed retrospectives except where law explicitly requires and compliance approves.

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Accidental hard delete | Restore from backup; incident review |
| Premature archive | Restore to T2; audit correction |
| Retention policy conflict with ADR-014 | ADR-014 prevails; adjust policy |
| Unbounded growth | Archive T3/T2 on schedule; compress snapshots |

---

## Audit Requirements

- `aos_retention_tier_assigned`
- `aos_artifact_archived`
- `aos_artifact_restored_from_archive`
- `aos_legal_deletion_executed` (with authorization ref)
- `aos_retention_policy_updated`

---

## Related Documents

- [18_LEARNING_AUDIT_TRAIL.md](18_LEARNING_AUDIT_TRAIL.md)
- [10_VERSIONING_STRATEGY.md](10_VERSIONING_STRATEGY.md)
- `docs/aos-adr/ADR-014_AUDIT_AND_APPEND_ONLY_POLICY.md`
