# 09 — Approval Workflow

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define the **human governance chain** for all Learning Engine promotions — who reviews what, in what order, with what authority, and how rejections feed back into organizational learning.

---

## Inputs

| Input | Source |
|-------|--------|
| Gate-passed candidates | Quality gates |
| Learning Extraction Report | Learning Engine |
| Review queue UI (future ST-12+) | AOS presentation |
| Reviewer permissions | ERP permission system |
| Candidate bundles (related items) | Learning Engine grouping |

---

## Outputs

| Output | Destination |
|--------|-------------|
| Approved promotions | Target engines (Knowledge, Registry, Prompt, Playbook) |
| Rejection records | Audit + optional Knowledge Record |
| Deferred decisions | Watch list |
| Batch approval manifest | Audit trail |
| Notification to stakeholders | ERP notification (future) |

---

## Ownership

| Role | Scope |
|------|-------|
| Delivery lead | Default approver for all promotion types |
| Technical reviewer | Module registration, architecture-sensitive patterns |
| Agency owner | Strategic playbook changes |
| Architecture owner | ADR conflicts, sidecar law disputes |
| Founder (small agency) | May hold all roles — permissions still enforced |

Permissions map to existing AOS permission keys (future: `LEARNING_APPROVE`, `MODULE_REGISTER`, etc.).

---

## Approval

### Workflow stages

```
1. Candidate appears in Learning Queue (grouped by engagement)
2. Reviewer opens bundle → sees evidence links + AI summary
3. Reviewer action per candidate:
      • Approve → execute promotion pipeline
      • Reject → reason required
      • Defer → return to watch list
      • Request changes → amend candidate text (creates amendment record)
4. Promotion pipeline executes (atomic per candidate)
5. Audit events emitted
6. Engagement learning record marked reviewed
```

### Batch rules

- Related candidates (same root failure) may be batch-approved with single manifest.
- Mixed-type bundles allowed but each item needs individual approve action (no single-click promote all without review).

### SLAs (operational)

| Priority | Target review time |
|----------|-------------------|
| Critical failure pattern | 1 business day |
| Standard candidates | 5 business days |
| Deferred/watch list | Next evidence event |

SLA miss does **not** auto-promote.

---

## Versioning

- Approval decision immutable once recorded.
- Amended candidate creates new candidate version; prior version archived.
- Promotion executes against approved candidate version ID.

---

## Promotion Rules

| Candidate type | Required approvers |
|----------------|-------------------|
| Knowledge Pattern | Delivery lead |
| Module (new) | Delivery lead + technical reviewer |
| Module (score/annotate) | Delivery lead |
| Prompt Template | Delivery lead |
| Playbook section | Delivery lead (strategic: + agency owner) |
| Evaluation rubric | Delivery lead |

Rejections must include `rejectionReason` enum + free text:

- `insufficient_evidence`
- `not_generalizable`
- `client_specific`
- `duplicate`
- `architecture_conflict`
- `incorrect_ai_extraction`
- `other`

Rejections of type `incorrect_ai_extraction` feed AI calibration (doc 20).

---

## Lifecycle

```
candidate (gate passed)
        │
        ▼
queued → under_review → approved → promoted → active asset
                    │
                    ├── rejected → closed (audited)
                    └── deferred → watch_list → re-queued on new evidence
```

Engagement-level status:

- `learning_pending_review`
- `learning_partially_promoted`
- `learning_complete`

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Approver lacks permission | Route to authorized user |
| Promotion pipeline partial failure | Rollback transaction; mark candidate `promotion_failed` |
| Duplicate approval | Idempotent promotion handler |
| Reviewer absent | Escalation to agency owner; no auto-approve |
| Conflict between two approved promotions | Supersession workflow |

---

## Audit Requirements

- `aos_learning_review_opened`
- `aos_learning_candidate_approved`
- `aos_learning_candidate_rejected`
- `aos_learning_candidate_deferred`
- `aos_learning_promotion_executed`
- `aos_learning_promotion_failed`
- `aos_learning_engagement_review_complete`

All include: `reviewerId`, `candidateId`, `candidateVersion`, `timestamp`, `engagementId`.

---

## Related Documents

- [01_LEARNING_LIFECYCLE.md](01_LEARNING_LIFECYCLE.md)
- [06_AI_RECOMMENDATION_RULES.md](06_AI_RECOMMENDATION_RULES.md)
- [17_DECISION_TRACEABILITY.md](17_DECISION_TRACEABILITY.md)
