# Phase F — Learning Engine Implementation Planning Index

**Status:** PLANNING FREEZE (no code authorized)  
**Prerequisite:** Phase E CLOSED  
**Objective:** Reconcile frozen Learning Engine architecture with post-Phase-E codebase and freeze implementation boundaries.

---

## Phase F Core Law

| Layer | Responsibility |
|-------|----------------|
| **Learning Engine** | Governed process: delivery evidence → learning candidates → human approval → promotion |
| **Knowledge Engine** | Approved corpus, storage, retrieval (`aosKnowledgePatterns`) |
| **Knowledge Intelligence Layer** | Graph, health, external change — **NOT Phase F** |

**ADR-009:** AI may recommend. Human approves governed promotion.

**Canonical trigger:** Retrospective **approved/closed** (see [13_DOCUMENTATION_RECONCILIATION.md](./13_DOCUMENTATION_RECONCILIATION.md)).

---

## Document Map

| Doc | Topic |
|-----|-------|
| [01_CURRENT_STATE_RECONCILIATION.md](./01_CURRENT_STATE_RECONCILIATION.md) | Post-E codebase audit: READY / PARTIAL / MISSING |
| [02_LEARNING_CANDIDATE_MODEL.md](./02_LEARNING_CANDIDATE_MODEL.md) | Frozen candidate entity and provenance |
| [03_LEARNING_LIFECYCLE_AND_INVARIANTS.md](./03_LEARNING_LIFECYCLE_AND_INVARIANTS.md) | States, transitions, LF invariants |
| [04_EXTRACTION_ARCHITECTURE.md](./04_EXTRACTION_ARCHITECTURE.md) | Trigger, orchestration, idempotency |
| [05_PROMOTION_ARCHITECTURE.md](./05_PROMOTION_ARCHITECTURE.md) | Target contracts, versioning, non-destructive writes |
| [06_PERSISTENCE_SECURITY_AND_AUDIT.md](./06_PERSISTENCE_SECURITY_AND_AUDIT.md) | Collections (proposed), rules, audit taxonomy |
| [07_AI_BOUNDARY_AND_CONFIDENCE.md](./07_AI_BOUNDARY_AND_CONFIDENCE.md) | AI port, confidence model, gates |
| [08_PHASE_E_TRACEABILITY_INTEGRATION.md](./08_PHASE_E_TRACEABILITY_INTEGRATION.md) | Immutable evidence consumption |
| [09_KNOWLEDGE_INTELLIGENCE_HANDOFF.md](./09_KNOWLEDGE_INTELLIGENCE_HANDOFF.md) | Future KIL contract only |
| [10_FAILURE_IDEMPOTENCY_AND_CONCURRENCY.md](./10_FAILURE_IDEMPOTENCY_AND_CONCURRENCY.md) | Failure modes, retries, transactions |
| [11_IMPLEMENTATION_SEQUENCE.md](./11_IMPLEMENTATION_SEQUENCE.md) | F1–F5 sprints, scope, gates |
| [12_PHASE_F_ACCEPTANCE_CRITERIA.md](./12_PHASE_F_ACCEPTANCE_CRITERIA.md) | LF-01…LF-15 acceptance matrix |
| [13_DOCUMENTATION_RECONCILIATION.md](./13_DOCUMENTATION_RECONCILIATION.md) | LE doc amendments vs Phase E reality |
| [PHASE_F_PLANNING_FREEZE_REPORT.md](./PHASE_F_PLANNING_FREEZE_REPORT.md) | Executive freeze verdict |
| [F1_DOMAIN_AND_CONTRACTS_REPORT.md](./F1_DOMAIN_AND_CONTRACTS_REPORT.md) | F1 sprint completion report |

---

## Governing Upstream Docs

- `docs/aos-learning-engine/*` (22 files) — process authority
- `docs/aos-phase-e/PHASE_E_FINAL_IMPLEMENTATION_REPORT.md` — evidence chain
- `docs/aos-knowledge-intelligence/*` — reference only; not implemented in F
- Frozen ADRs: ADR-008 (Module Registry), ADR-009 (Knowledge Engine), ADR-014 (Audit)

---

## Explicit Non-Goals (Planning Sprint)

- No Phase F code
- No Firestore collections or security rules
- No UI implementation
- No AI provider binding
- No Knowledge Intelligence graph/reasoning

---

## Authorization Gate

| Sprint | Prerequisite |
|--------|--------------|
| **F1** | This planning freeze accepted — **pending explicit GO** |
| F2–F5 | Prior sprint exit criteria met |
