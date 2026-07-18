# AOS Architecture Decision Record Index

**Architecture version:** AOS Phase 0 v1.0  
**ADR freeze date:** July 17, 2026  
**Authority:** AOS Architecture Phase 0, Domain Model Freeze, and Readiness Verdict  
**Scope:** Decisions that implementation may realize but may not silently reinterpret

## Purpose

This register converts the approved AOS architecture and frozen domain model into explicit, durable decisions. The ADRs explain why each decision exists, which alternatives were rejected, and which implementation choices are permanently forbidden.

An ADR is normative. Architecture documents provide the broader design; domain documents define entities and lifecycles; ADRs lock the decisions implementation must preserve.

## Status Meanings

| Status | Meaning |
|---|---|
| Proposed | Under review; not yet binding |
| Accepted | Binding for implementation |
| Superseded | Replaced by a later accepted ADR |
| Deprecated | Retained for history but no longer recommended |

All ADRs in this freeze are **Accepted**.

## ADR Register

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | AOS is an AI-first software delivery operating system | Accepted |
| ADR-002 | ERP, BOS, and AOS retain separate ownership | Accepted |
| ADR-003 | Delivery Engagement is the aggregate root | Accepted |
| ADR-004 | Approved requirements are immutable versions | Accepted |
| ADR-005 | Delivery execution is organized into Prompt Packs and Prompt Artifacts | Accepted |
| ADR-006 | Cursor is the execution engine, not the system of record | Accepted |
| ADR-007 | Evaluation is a mandatory progression gate | Accepted |
| ADR-008 | Reusable assets are governed by a metadata registry | Accepted |
| ADR-009 | Delivery knowledge is captured and promoted through a Knowledge Engine | Accepted |
| ADR-010 | Development is reuse-first, with minimal net-new code | Accepted |
| ADR-011 | BOS sidecar law extends to AOS | Accepted |
| ADR-012 | AOS rejects generic project-management primitives | Accepted |
| ADR-013 | Mutable heads and immutable published versions govern change | Accepted |
| ADR-014 | Execution, evaluation, versions, and decisions are append-only | Accepted |
| ADR-015 | Implementation may realize but not redesign the frozen architecture | Accepted |

## Precedence

If implementation guidance conflicts:

1. `FINAL_ARCHITECTURE_LOCK.md`
2. Accepted ADRs in this directory
3. `docs/aos-domain-model/ARCHITECTURE_FREEZE_REPORT.md`
4. Other AOS domain-model documents
5. `docs/aos-architecture/`
6. Implementation plans and code comments

Lower-precedence material cannot override a higher-precedence decision.

## Governance

- Accepted ADRs are never edited to disguise a changed decision.
- Clarifying wording may be corrected only when meaning is unchanged.
- A material change requires a new ADR, impact analysis, and explicit approval.
- A replacement ADR marks the prior ADR **Superseded** and links both directions.
- Implementation convenience, framework limitations, deadlines, or UI preferences are not sufficient reasons to bypass an ADR.
- Firestore layout, repository signatures, services, UI, permissions, feature flags, and read-port details remain implementation choices only where they preserve these decisions.

## Covered Baselines

- `docs/erp-discovery/`
- `docs/aos-architecture/`
- `docs/aos-domain-model/`
- `bos/docs/INTEGRATION_LAYER.md`
- Existing BOS sidecar and domain-layer precedents

## Freeze Result

The ADR register is complete for AOS Phase 0 v1.0. Implementation may begin only within the boundaries established by these records and the final architecture lock.
