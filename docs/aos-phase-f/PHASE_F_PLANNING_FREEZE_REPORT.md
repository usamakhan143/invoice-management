# Phase F Planning Freeze Report

**Date:** July 21, 2026  
**Status:** PLANNING FREEZE COMPLETE  
**Code authorized:** NONE  
**F1 authorized:** Pending explicit GO below

---

## Executive Summary

Phase F planning reconciles the frozen Learning Engine architecture (22 LE docs) with the **post-Phase-E production baseline**. Phase E delivers sufficient **immutable delivery evidence** — version chains, retrospective approval, and `DeliveryTraceabilityRefs` — to trigger governed learning extraction safely.

Phase F must implement the **learning process layer** (candidates, gates, approval, promotion) without redesigning Phase E or implementing Knowledge Intelligence. The architecture preserves **LE ≠ KE ≠ KIL**, **ADR-009 human approval**, and **non-destructive organizational versioning**.

**Verdict: GO for F1** (domain + contracts only) upon acceptance of this freeze.

---

## 1. Current Codebase Readiness

| Area | Verdict |
|------|---------|
| Phase E evidence chain | **READY** |
| Retrospective trigger + traceability | **READY** |
| Audit infrastructure | **READY** (extend taxonomy) |
| Promotion target catalogs | **READ-ONLY READY** — write paths **MISSING** |
| Learning Engine core | **MISSING** (expected) |
| UI patterns for approval | **READY** (reuse ST queue patterns) |

---

## 2. Phase E Assets Reusable

- `DeliveryTraceabilityRefs` + `approveRetrospective()`
- Five version collections + repositories
- Version history UI components
- `aosAuditEvents` append-only audit
- Read catalogs: Knowledge, Registry, Playbook
- Queue/approval presentation patterns

---

## 3. Learning Candidate Model

Frozen in [02_LEARNING_CANDIDATE_MODEL.md](./02_LEARNING_CANDIDATE_MODEL.md):

- Types: `knowledge_pattern`, `module`, `prompt_improvement`, `playbook_improvement`, `evaluation_insight`
- Deterministic IDs + immutable `LearningProvenance`
- Supporting: `LearningExtractionRun`, `LearningPromotionRecord`

---

## 4. Candidate Lifecycle

`extracted` → gates → `pending_review` → `approved` → `promoted`  
Terminals: `gate_blocked`, `rejected`, `promoted`, `superseded`  
AI never approves. Human mandatory for promotion.

---

## 5. Extraction Trigger

Post-commit `scheduleExtraction()` on retrospective **approved**. Non-blocking (LF-04).

---

## 6. Idempotency

- Run ID: `${companyId}_${engagementId}_${retrospectiveId}`
- Candidate ID: `${runId}_${type}_${fingerprint}`
- Promotion dedupe on `candidateId`

---

## 7. Evidence Boundary

Consume immutable Phase E versions only when chains enabled. No draft learning. Client PII blocked by gates. Reuse/QA/audit as supporting evidence — not auto-promoted.

---

## 8. Promotion Targets

| Candidate | Target |
|-----------|--------|
| knowledge_pattern | `aosKnowledgePatterns` new version |
| module | `aosModuleRegistry` |
| prompt_improvement | Org template / playbook — NOT PromptVersion |
| playbook_improvement | `aosPlaybookEntries` |
| evaluation_insight | Playbook rubric entry |

All with `LearningSourceRef` backward trace.

---

## 9. Organizational Versioning

Separate from Phase E delivery versions. Supersede — never delete. `patternVersion`, module semver, playbook section version.

---

## 10. Audit Model

Extend `aosAuditEvents` with 13 learning event types. Synchronous with promotion transaction.

---

## 11. Security / Tenancy

All learning collections company-scoped. Cross-company refs rejected in application + security tests. Immutable provenance fields.

---

## 12. Proposed Collections

1. `aosLearningExtractionRuns`
2. `aosLearningCandidates`
3. `aosLearningPromotions`

Not created in planning sprint.

---

## 13. Layer Ownership

| Layer | Owns |
|-------|------|
| Domain | Lifecycle, gates, eligibility, provenance rules |
| Application | Orchestration, evidence load, AI port call, approval commands |
| Infrastructure | Firestore, AI adapter |
| Presentation | Review UI only (F4) |

---

## 14. AI Boundary

`LearningExtractionAiPort` — provider agnostic. Null adapter in F1/F2. Untrusted proposals until gates + human approval.

---

## 15. Confidence Model

Four layers: AI (hint), evidence (domain), organizational (future), promotionEligible (domain composite). LLM confidence alone never authorizes promotion.

---

## 16. Approval Architecture

Learning queue grouped by engagement. Evidence inspection via Phase E3 components. Approve/reject/defer/amend. Founder/delivery lead authority. No auto-promote on SLA miss.

---

## 17. Metrics Classification

| Class | Examples |
|-------|----------|
| **Phase F operational** | Candidate counts, promotion success rate, gate block rate — computable from learning collections |
| **Derived** | Reuse rate post-promotion — needs engagement linkage |
| **Future KIL** | Pattern health, graph centrality |
| **Future analytics** | Dashboards, quarterly snapshots (docs 12–16) |

No dashboards in Phase F.

---

## 18. Knowledge Intelligence Handoff

Structural `KilHandoffRef` on promotion records only. No graph/vector/external intel in F.

---

## 19. Failure / Concurrency

Documented in [10_FAILURE_IDEMPOTENCY_AND_CONCURRENCY.md](./10_FAILURE_IDEMPOTENCY_AND_CONCURRENCY.md). Transaction-safe promotion. Optimistic locking on approve. No silent failures.

---

## 20. LF Invariant Matrix

LF-01 through LF-15 defined in [03_LEARNING_LIFECYCLE_AND_INVARIANTS.md](./03_LEARNING_LIFECYCLE_AND_INVARIANTS.md) and [12_PHASE_F_ACCEPTANCE_CRITERIA.md](./12_PHASE_F_ACCEPTANCE_CRITERIA.md).

---

## 21. Documentation Conflicts

10 reconciliations in [13_DOCUMENTATION_RECONCILIATION.md](./13_DOCUMENTATION_RECONCILIATION.md). Key: `approved` = `closed`, AOS audit primary, no Knowledge Record yet, PromptVersion ≠ org template.

---

## 22. Implementation Sequence

F1 Domain+Contracts → F2 Persistence+Extraction → F3 Promotion → F4 UI → F5 Flywheel verification. See [11_IMPLEMENTATION_SEQUENCE.md](./11_IMPLEMENTATION_SEQUENCE.md).

---

## 23. Blocking Ambiguities

| # | Item | Resolution |
|---|------|------------|
| 1 | Technical reviewer dual approval for modules | Defer enforcement to F3; permission key TBD |
| 2 | Org prompt template store vs playbook only | **Freeze:** playbook `prompt_template` sufficient for F3 |
| 3 | ERP ActivityLogger dual-write | Optional F5 — not blocking |
| 4 | AI provider selection | Deferred to F5; null port until then |

**No unresolved blockers for F1.**

---

## 24. Risks

| Risk | Mitigation |
|------|------------|
| Scope creep into KIL | Explicit out-of-scope; handoff contract only |
| PromptVersion conflation | Frozen separate org template path |
| Extraction blocks retro | Post-commit async (LF-04) |
| PII leakage | Gate G-003 + sanitization |
| Duplicate candidates | Deterministic IDs |
| Catalog write without governance | Human approve + transaction audit |

---

## 25. GO / NO-GO for F1

| Decision | **GO** |
|----------|--------|
| Rationale | Phase E evidence sufficient; domain model reconciled; no open architectural blockers for contracts-only sprint |
| Condition | Explicit user authorization of F1 sprint |
| F1 delivers | Domain entities, gates, lifecycle, ports, contracts, unit tests — no Firestore/UI/AI |

---

## 26. Documents Created

```
docs/aos-phase-f/
├── 00_PHASE_F_INDEX.md
├── 01_CURRENT_STATE_RECONCILIATION.md
├── 02_LEARNING_CANDIDATE_MODEL.md
├── 03_LEARNING_LIFECYCLE_AND_INVARIANTS.md
├── 04_EXTRACTION_ARCHITECTURE.md
├── 05_PROMOTION_ARCHITECTURE.md
├── 06_PERSISTENCE_SECURITY_AND_AUDIT.md
├── 07_AI_BOUNDARY_AND_CONFIDENCE.md
├── 08_PHASE_E_TRACEABILITY_INTEGRATION.md
├── 09_KNOWLEDGE_INTELLIGENCE_HANDOFF.md
├── 10_FAILURE_IDEMPOTENCY_AND_CONCURRENCY.md
├── 11_IMPLEMENTATION_SEQUENCE.md
├── 12_PHASE_F_ACCEPTANCE_CRITERIA.md
├── 13_DOCUMENTATION_RECONCILIATION.md
└── PHASE_F_PLANNING_FREEZE_REPORT.md
```

---

## Strict Stop Confirmation

- No Phase F code implemented
- No Firestore collections created
- No security rules modified
- No UI built
- No AI providers bound
- No Knowledge Intelligence started

**Phase F Planning Freeze: COMPLETE**
