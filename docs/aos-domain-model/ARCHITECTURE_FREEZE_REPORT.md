# Architecture Freeze Report

**Sprint:** AOS Domain Modeling Sprint  
**Date:** July 2026  
**Status:** FREEZE CANDIDATE  
**Supersedes:** Nothing (first domain freeze)  
**Prerequisites:** AOS Architecture Phase 0 (`docs/aos-architecture/`)

---

## Freeze Scope

This report certifies that the following are **defined and frozen** for implementation:

- 24 domain entities across 6 bounded areas
- Lifecycle states and valid transitions for all mutable entities
- Invariants and business rules per entity
- Creation, update, and deletion policies
- Versioning strategy for versioned entities
- Audit requirements per entity
- Complete relationship map with cardinality
- Dependency graph for implementation ordering
- Cross-layer boundaries with ERP and BOS

---

## Frozen Decisions

### FD-01 — Three-Layer Ownership

| Layer | Owns |
|-------|------|
| ERP | Business data |
| BOS | Founder strategy |
| AOS | Software delivery |

**Frozen.** No entity in this model duplicates ERP or BOS entities.

### FD-02 — Delivery Engagement as Root Aggregate

All delivery work flows from Delivery Engagement. It is the aggregate root for engagement-scoped entities.

**Frozen.** No alternative root (e.g., "Project" separate from Engagement) will be introduced.

### FD-03 — Requirement Version Immutability

Approved requirements are snapshotted in Requirement Version. No retroactive edits.

**Frozen.** Scope changes create new Requirement Set → new Version.

### FD-04 — Prompt Version Immutability

Approved prompts are snapshotted in Prompt Version. Cursor Sessions reference exact versions.

**Frozen.** Revisions create new Prompt Versions, never edit existing.

### FD-05 — Append-Only Execution Records

Cursor Sessions, Evaluations, and Cursor Revisions are never deleted.

**Frozen.** Matches BOS append-only decision pattern.

### FD-06 — Module Registry Metadata Only

Registry stores metadata and file paths, never source code copies.

**Frozen.**

### FD-07 — Knowledge Promotion with Anonymization

Client identifiers stripped when Knowledge Records promote to Knowledge Patterns.

**Frozen.** Privacy requirement.

### FD-08 — No Physical Deletes on Core Entities

All 24 entities follow deprecate/archive/cancel — never hard delete after meaningful use.

**Frozen.** Matches BOS immutability pattern.

### FD-09 — Sequential Prompt Pack Execution

Artifact N+1 blocked until artifact N evaluation passes.

**Frozen.** Core delivery discipline.

### FD-10 — Evaluation Before Progress

No engagement state advance without required evaluations.

**Frozen.**

### FD-11 — Retrospective Required for Close

Engagement cannot reach `closed` without completed Retrospective.

**Frozen.** Continuous Learning dependency.

### FD-12 — Company Tenancy on All Entities

Every entity carries `companyId`. No exceptions.

**Frozen.** Matches ERP/BOS pattern.

### FD-13 — ERP User References

All user fields reference ERP `users/{uid}`. AOS does not own user identity.

**Frozen.**

### FD-14 — Foreign Keys to ERP/BOS Are Read-Only

AOS stores reference IDs only. Hydration via read ports.

**Frozen.** Sidecar law extension.

### FD-15 — Agency Playbook as Top-Level Knowledge Container

One active playbook per company organizing templates, rubrics, and patterns.

**Frozen.**

---

## Entity Freeze Checklist

| # | Entity | Lifecycle | Invariants | CRUD rules | Versioning | Audit | Status |
|---|--------|-----------|------------|------------|------------|-------|--------|
| 1 | Delivery Engagement | ✅ | ✅ | ✅ | N/A (pointer) | ✅ | **FROZEN** |
| 2 | Requirement Set | ✅ | ✅ | ✅ | Via Version | ✅ | **FROZEN** |
| 3 | Requirement | ✅ | ✅ | ✅ | Via Set Version | ✅ | **FROZEN** |
| 4 | Requirement Attachment | ✅ | ✅ | ✅ | Via Set Version | ✅ | **FROZEN** |
| 5 | Requirement Version | ✅ | ✅ | Create only | Self | ✅ | **FROZEN** |
| 6 | Reuse Assessment | ✅ | ✅ | ✅ | N/A | ✅ | **FROZEN** |
| 7 | Reuse Recommendation | ✅ | ✅ | ✅ | Via Assessment | ✅ | **FROZEN** |
| 8 | Delivery Template | ✅ | ✅ | ✅ | Integer | ✅ | **FROZEN** |
| 9 | Prompt Pack | ✅ | ✅ | ✅ | Integer | ✅ | **FROZEN** |
| 10 | Prompt Artifact | ✅ | ✅ | ✅ | Via Version | ✅ | **FROZEN** |
| 11 | Prompt Version | ✅ | ✅ | Create only | Self | ✅ | **FROZEN** |
| 12 | Cursor Session | ✅ | ✅ | Append only | N/A | ✅ | **FROZEN** |
| 13 | Cursor Revision | ✅ | ✅ | Append only | N/A | ✅ | **FROZEN** |
| 14 | Evaluation | ✅ | ✅ | Append only | Amendment | ✅ | **FROZEN** |
| 15 | Evaluation Rubric | ✅ | ✅ | ✅ | Integer | ✅ | **FROZEN** |
| 16 | Knowledge Record | ✅ | ✅ | ✅ | N/A | ✅ | **FROZEN** |
| 17 | Knowledge Pattern | ✅ | ✅ | ✅ | Integer | ✅ | **FROZEN** |
| 18 | Module Registry Entry | ✅ | ✅ | Deprecate only | Via Version | ✅ | **FROZEN** |
| 19 | Module Version | ✅ | ✅ | Create only | Self | ✅ | **FROZEN** |
| 20 | Retrospective | ✅ | ✅ | ✅ | N/A | ✅ | **FROZEN** |
| 21 | Agency Playbook | ✅ | ✅ | ✅ | Integer | ✅ | **FROZEN** |
| 22 | Architecture Decision Record | ✅ | ✅ | ✅ | Supersession | ✅ | **FROZEN** |
| 23 | Prompt Template | ✅ | ✅ | ✅ | Integer | ✅ | **FROZEN** |
| 24 | Delivery Quality Report | ✅ | ✅ | ✅ | N/A | ✅ | **FROZEN** |

**All 24 entities: FROZEN**

---

## Explicitly NOT Frozen (Deferred)

These are intentionally excluded from this freeze:

| Item | Reason |
|------|--------|
| Firestore collection names | Implementation decision |
| TypeScript entity interfaces | Implementation decision |
| Repository method signatures | Implementation decision |
| UI page designs | Out of scope |
| AI provider selection | Phase 3 decision |
| File storage mechanism | Phase 3 decision |
| Junction entities for N:M | Implement if query patterns require |
| Permission key final strings | Implementation (must extend `config/permissions.ts`) |
| Feature flag key final strings | Implementation |
| Retainer recurring engagement mechanics | Phase 2+ extension |

---

## Consistency with Prior Architecture

| Prior doc | Consistency check |
|-----------|------------------|
| `docs/aos-architecture/01_AOS_VISION.md` | ✅ Domain supports AI-first delivery OS vision |
| `docs/aos-architecture/02_CORE_PRINCIPLES.md` | ✅ All 3 ownership laws enforced in entity boundaries |
| `docs/aos-architecture/04_PROJECT_LIFECYCLE.md` | ✅ Lifecycle states map to engagement states |
| `docs/aos-architecture/06_PROMPT_ENGINE.md` | ✅ Prompt Artifact/Version/Pack model matches |
| `docs/aos-architecture/08_KNOWLEDGE_ENGINE.md` | ✅ Knowledge Record/Pattern/Retrospective match |
| `docs/aos-architecture/09_REUSABLE_MODULE_SYSTEM.md` | ✅ Module Registry Entry/Version match |
| `docs/erp-discovery/09_DUPLICATION_REPORT.md` | ✅ Reuse Assessment enforces anti-duplication |
| `bos/domain/entities/initiative.ts` | ✅ Clear separation from Delivery Engagement |
| `bos/docs/INTEGRATION_LAYER.md` | ✅ Layer discipline and sidecar law preserved |

---

## Change Control After Freeze

Changes to frozen entities require:

1. Documented rationale in `MISSING_CONCEPTS_REPORT.md` or new amendment doc
2. Impact assessment on relationship map and dependency graph
3. Explicit approval before implementation code changes
4. No retroactive changes to frozen lifecycle states without migration plan

**Allowed without freeze amendment:**
- Adding optional fields marked "future extensibility"
- Adding new audit event types
- Adding new Evaluation Rubric dimensions

**Requires freeze amendment:**
- New entities
- Lifecycle state changes
- Cardinality changes
- Deletion policy changes
- New ERP/BOS write paths

---

## Sign-Off Criteria Met

| Criterion | Met? |
|-----------|------|
| All 24 entities defined | ✅ |
| Relationships mapped | ✅ |
| Dependency graph complete | ✅ |
| ERP/BOS boundaries clear | ✅ |
| No Firestore schemas invented | ✅ |
| No code written | ✅ |
| Consistent with architecture Phase 0 | ✅ |
| Missing concepts documented separately | ✅ |

**Verdict: READY FOR FREEZE** (pending Readiness Verdict confirmation)
