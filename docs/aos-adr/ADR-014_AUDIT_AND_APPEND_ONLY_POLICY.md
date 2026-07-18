# ADR-014 — Audit and Append-Only Policy

## 1. Decision

Core delivery evidence is append-only, significant transitions are audited, and meaningful AOS history is never physically deleted.

## 2. Status

**Accepted**

## 3. Context

BOS already preserves strategic history and restricts physical deletion. AOS needs stronger evidence for prompt versions, Cursor attempts, evaluations, revisions, requirements, decisions, and learning. ERP ActivityLogger provides the existing company audit mechanism.

## 4. Problem

Mutable or deletable execution history lets teams hide failed prompts, alter quality outcomes, and break traceability. A parallel AOS audit system would duplicate ERP infrastructure. Conversely, logging every field edit as a business event would create noise.

## 5. Decision

Requirement Versions, Prompt Versions, Module Versions, Cursor Sessions, Cursor Revisions, confirmed Evaluations, accepted ADRs, and submitted Retrospectives are append-only. Core mutable records use cancel, archive, deprecate, or supersede rather than hard delete after meaningful use. Significant lifecycle transitions emit AOS event types through ERP ActivityLogger. Every entity records company, creator, updater, and timestamps where applicable.

## 6. Why this decision

AI-assisted delivery requires trustworthy evidence of what was requested, executed, accepted, rejected, and learned. Append-only history makes evaluation and continuous learning credible while reusing the ERP's established audit ownership.

## 7. Alternatives considered

- Hard delete with backups
- Soft delete only, without immutable evidence
- Separate AOS audit collection as the sole audit source
- Git history as the audit trail
- Log every field mutation indefinitely

## 8. Why alternatives were rejected

Backups are not normal audit access. Soft delete alone still permits content edits. A separate sole audit system duplicates ERP ownership. Git excludes non-code artifacts. Logging every keystroke adds noise without governance value.

## 9. Consequences

- Storage and retention requirements grow.
- Corrections use amendments or supersession.
- Privacy and retention policy must account for durable records.
- Activity event taxonomy must be centralized during implementation.

## 10. Benefits

- Trustworthy delivery history
- Reliable evaluation and learning
- Clear actor accountability
- Safe investigation of failures
- Consistency with BOS immutability

## 11. Risks

- Sensitive content could be retained longer than needed.
- Audit volume may become expensive.
- Poor event taxonomy can make logs unusable.
- Users may expect deletion rights that conflict with governance.

## 12. Future impact

Retention, legal deletion, encryption, and archival tiers may be introduced. Compliance-mandated deletion must be explicit, audited, and narrowly scoped; it cannot silently rewrite outcomes.

## 13. Related ADRs

ADR-004, ADR-006, ADR-007, ADR-009, ADR-013, ADR-015

## 14. Related Domain Entities

Requirement Version, Prompt Version, Cursor Session, Cursor Revision, Evaluation, Module Version, Retrospective, Architecture Decision Record, Delivery Engagement

## 15. Related Architecture Documents

- `docs/aos-domain-model/00_DOMAIN_MODEL_INDEX.md`
- `docs/aos-domain-model/ARCHITECTURE_FREEZE_REPORT.md`
- `docs/aos-domain-model/READINESS_VERDICT.md`
- `docs/erp-discovery/02_MODULE_INVENTORY.md`
- `services/activityLogger.ts` (existing ERP precedent)

## 16. Things that are permanently forbidden

- Hard-deleting executed prompts, sessions, revisions, or confirmed evaluations
- Editing append-only evidence in place
- Hiding failed execution from quality reports or retrospectives
- Creating a competing user/activity ownership model in AOS
- Silent correction without amendment, supersession, or audit event
