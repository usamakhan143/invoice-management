# 18 — Learning Audit Trail

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define the **append-only audit architecture** for all Learning Engine operations — integrating with ERP ActivityLogger per ADR-014 without duplicating ERP ownership.

Learning audit makes organizational learning **accountable and investigable**.

---

## Inputs

| Input | Source |
|-------|--------|
| All Learning Engine lifecycle events | Learning Engine |
| Promotion pipeline executions | Target engines |
| Human approval/rejection actions | Approval workflow |
| AI extraction jobs | AI Orchestration |
| Quality gate evaluations | Gate pipeline |
| Metric snapshots | Metrics pipeline |

---

## Outputs

| Output | Destination |
|--------|-------------|
| ERP ActivityLogger events | `activities` collection (ERP-owned) |
| Trace graph nodes | AOS learning audit store (future) |
| Audit export bundles | Compliance / review |
| Integrity reports | Operations |

---

## Ownership

| Aspect | Owner |
|--------|-------|
| Activity event emission | AOS services → ERP logger |
| Event taxonomy | AOS governance (centralized) |
| Storage | ERP `activities` + AOS supplementary refs |
| Retention policy | Doc 19 |

**Forbidden:** Separate user/activity ownership in AOS (ADR-014 §16).

---

## Approval

Audit records require no approval — they are system effects of governed actions.

Human overrides and rollbacks must emit explicit audit events.

---

## Versioning

Event schema versioned (`aosAuditEventSchemaVersion`). Old events remain valid; new fields optional.

---

## Promotion Rules

Audit emission is **synchronous gate** for promotion:

- Promotion does not commit until ActivityLogger acknowledges event (or retry queue succeeds).
- Failed audit → promotion rolled back.

---

## Lifecycle

```
action occurs → audit event composed → ERP ActivityLogger.write
        │
        ├── success → action committed
        └── failure → retry (exponential backoff) → alert → rollback
```

Events never updated or deleted — corrections via supplementary `*_correction` events.

---

## Event Taxonomy (Learning Engine)

### Extraction phase

| Event | When |
|-------|------|
| `aos_learning_extraction_started` | Retrospective closed triggers job |
| `aos_learning_extraction_completed` | Report published |
| `aos_learning_extraction_failed` | Job error |

### Candidate phase

| Event | When |
|-------|------|
| `aos_learning_candidate_created` | Candidate typed |
| `aos_quality_gate_evaluated` | Gate run |
| `aos_ai_recommendation_created` | AI suggestion stored |

### Review phase

| Event | When |
|-------|------|
| `aos_learning_review_opened` | Reviewer opens bundle |
| `aos_learning_candidate_approved` | Approved |
| `aos_learning_candidate_rejected` | Rejected with reason |
| `aos_learning_candidate_deferred` | Deferred |

### Promotion phase

| Event | When |
|-------|------|
| `aos_learning_promotion_executed` | Success |
| `aos_learning_promotion_failed` | Pipeline error |
| `aos_knowledge_pattern_promoted` | Pattern active |
| `aos_module_registered_from_learning` | Module registered |
| `aos_prompt_template_updated_from_learning` | Template bumped |
| `aos_playbook_section_updated` | Playbook updated |

### Metrics & integrity

| Event | When |
|-------|------|
| `aos_learning_metrics_snapshot` | Snapshot taken |
| `aos_decision_trace_node_created` | Trace link added |
| `aos_learning_audit_integrity_alert` | Broken chain detected |

### Standard payload fields

`companyId`, `actorUserId`, `engagementId`, `retrospectiveId`, `candidateId`, `timestamp`, `correlationId`, `metadata{}`

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Logger unavailable | Retry queue; hold promotion |
| Event schema mismatch | Block deploy until schema aligned |
| PII in audit metadata | Scrub before write; block if unable |
| Volume cost exceeded | Sampling for debug events only; never skip promotion audits |
| Compliance deletion request | Narrow legal process (doc 19); never silent rewrite |

---

## Audit Requirements

Meta-requirement: this document **is** the audit specification. Implementation must:

1. Centralize event type constants.
2. Correlate all events in engagement bundle via `correlationId`.
3. Support export by `engagementId` and date range.
4. Never hard-delete audit events.
5. Log human overrides with mandatory reason text.

---

## Related Documents

- [17_DECISION_TRACEABILITY.md](17_DECISION_TRACEABILITY.md)
- [19_RETENTION_STRATEGY.md](19_RETENTION_STRATEGY.md)
- `docs/aos-adr/ADR-014_AUDIT_AND_APPEND_ONLY_POLICY.md`
