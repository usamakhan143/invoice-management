# Phase E — Immutable Versioning & Delivery Intelligence Foundation

**Status:** Planning freeze (pre-implementation)  
**Prerequisite:** Stage D4 **CLOSED** (runtime verification complete)  
**Scope:** ADR-004, ADR-005, ADR-006, ADR-007 version chains only  
**Out of scope:** Learning Engine implementation, Knowledge promotion, UI redesign, new ADRs

---

## Executive Summary

Phase E closes the explicitly deferred gap from D4.7: **immutable version chains** for requirements, prompts, cursor execution, and evaluation. D4 delivered a production-hardened **mutable workflow head** (single `aosEngagementWorkflows` document per engagement) with append-only audit (ADR-014). Phase E introduces **published version snapshots** without breaking that stack.

The approach follows frozen ADR-013 policy: **mutable draft heads + immutable published versions**. Consumers (Prompt Pack, Cursor Session, Evaluation) reference **exact version IDs**, not mutable embedded fields.

Implementation splits into three controlled sprints:

| Sprint | Focus |
|--------|--------|
| **E1** | Domain entities, version invariants, aggregate commands, contracts |
| **E2** | Firestore persistence, security rules, migration, application orchestration |
| **E3** | UI version surfaces, traceability refs, emulator E2E, Phase E verification |

---

## Source of Truth (Read-Only for This Sprint)

| Corpus | Use |
|--------|-----|
| `docs/aos-adr/ADR-004` … `ADR-007`, `ADR-013`, `ADR-014` | Version immutability policy |
| `docs/aos-domain-model/02` … `05` | Entity lifecycles, audit event names |
| `docs/aos-architecture/04`, `05`, `06`, `07` | Lifecycle and orchestration context |
| `docs/aos-production-audit/STAGE_D4_FINAL_RUNTIME_VERIFICATION.md` | D4 baseline + deferred items |
| `docs/aos-learning-engine/10`, `17` | Future traceability requirements |
| `docs/aos-frontend-architecture/` | D2 UI contracts (no redesign) |
| `aos/domain/workflow/`, `aos/application/`, `aos/infrastructure/` | **Actual D4.7 code** |

---

## Document Index

| Doc | Purpose |
|-----|---------|
| [01_VERSIONING_MODEL.md](./01_VERSIONING_MODEL.md) | Versioned aggregates, invariants, chain model |
| [02_CURRENT_TO_TARGET_GAP_MATRIX.md](./02_CURRENT_TO_TARGET_GAP_MATRIX.md) | D4.7 vs Phase E gap matrix |
| [03_PERSISTENCE_AND_SECURITY_PLAN.md](./03_PERSISTENCE_AND_SECURITY_PLAN.md) | Firestore collections, rules, migration |
| [04_IMPLEMENTATION_SEQUENCE.md](./04_IMPLEMENTATION_SEQUENCE.md) | E1 / E2 / E3 scope, files, exit criteria |
| [05_PHASE_E_ACCEPTANCE_CRITERIA.md](./05_PHASE_E_ACCEPTANCE_CRITERIA.md) | Tests and Phase E close gate |

---

## ADR Scope (Phase E)

| ADR | Artifact chain |
|-----|----------------|
| **ADR-004** | Requirement Set (mutable head) → **Requirement Version** (immutable) |
| **ADR-005** | Prompt Pack / Prompt Artifact (mutable head) → **Prompt Version** (immutable); pack references Requirement Version |
| **ADR-006** | **Cursor Session** (append-only) → exact **Prompt Version**; **Cursor Revision** on failure |
| **ADR-007** | **Evaluation** (append-only after confirm) → exact Prompt Version + rubric version |

**Not in Phase E version-chain scope (unchanged heads):**

- Reuse Assessment — version-linked, not independently versioned (domain model)
- Workflow QA checklist (`WorkflowQualityReport`) — gate artifact; retrospective append-only deferred separately
- Retrospective — append-only after submit (future hardening); traceability refs added in E3
- Module Registry / Knowledge Patterns — ADR-008/009; Learning Engine promotion is post-E

---

## GO / NO-GO for E1

**Verdict: GO** — frozen ADRs, domain model, and D4.7 code baseline are sufficient to begin E1 domain + contracts work.

**Non-blocking ambiguities** (resolved in planning docs, implement per spec):

1. Exact subcollection vs top-level collection naming — see [03](./03_PERSISTENCE_AND_SECURITY_PLAN.md)
2. Whether `in_review` status is enforced in E1 or E2 — defer UI/state to E3; domain supports it
3. Evaluation rubric storage — reference ID + embedded snapshot at score time (ADR-007)

**Blocking items:** None identified. No new architecture research required.

---

## Risks (Summary)

| Risk | Mitigation |
|------|------------|
| Breaking D4 founder journey / integration tests | Keep workflow head + gates; additive version stores; regression gate in E3 |
| Dual-write complexity during migration | Lazy version materialization on first post-E command; no destructive migration |
| Firestore rule complexity for immutable sub-docs | Separate collections with update/delete denied after publish |
| UI confusion draft vs published | Reuse existing D2 components; add version label + history panel only |
| Scope creep into Learning Engine | E3 adds refs only; no promotion pipelines |

See [04_IMPLEMENTATION_SEQUENCE.md](./04_IMPLEMENTATION_SEQUENCE.md) for sprint-level risk controls.

---

## STOP

This index completes the Phase E planning freeze. **Do not begin E1 implementation until explicitly authorized in a follow-up task.**
