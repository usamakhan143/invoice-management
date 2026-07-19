# 01 — Architecture Compliance Audit

**Scope:** ADR-001 through ADR-015 vs. `aos/` implementation  
**Method:** Document-by-document comparison against inspected source files

---

## Summary Matrix

| ADR | Title | Compliance | Severity of Gaps |
|-----|-------|:----------:|:----------------:|
| ADR-001 | AOS Purpose | **Partial** | Medium |
| ADR-002 | Three-Layer Ownership | **Compliant** | — |
| ADR-003 | Delivery Engagement Root | **Compliant** | — |
| ADR-004 | Requirement Versioning | **Non-compliant (stub)** | Critical |
| ADR-005 | Prompt Pack Architecture | **Non-compliant (stub)** | Critical |
| ADR-006 | Cursor Execution Model | **Partial** | High |
| ADR-007 | Evaluation Gate | **Partial** | High |
| ADR-008 | Module Registry | **Partial (UI only)** | High |
| ADR-009 | Knowledge Engine | **Partial (UI only)** | High |
| ADR-010 | Reuse-First Development | **Partial** | Medium |
| ADR-011 | Sidecar Law Extension | **Compliant** | — |
| ADR-012 | No Generic PM | **Compliant** | — |
| ADR-013 | Versioning Policy | **Partial** | High |
| ADR-014 | Audit & Append-Only | **Non-compliant (stub)** | Critical |
| ADR-015 | Implementation Boundaries | **Compliant** | — |

**Overall ADR compliance:** 5 fully compliant, 6 partial, 4 non-compliant (stub/deferred).

---

## ADR-001 — AOS Purpose

**Decision:** AOS is an AI-first delivery orchestration system for software agencies.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Founder decision surfaces | **Met** | `FounderDashboardScreen.tsx` — attention queue, NBA, decision cards; no analytics charts |
| Delivery lifecycle workflow | **Met** | ST-04–ST-11 engagement hub tabs with gate progression |
| Learning loop | **Stub** | Retrospective UI exists; knowledge is in-memory seed (`knowledgeSeed.ts`) |
| Cursor integration readiness | **Partial** | ST-08 session capture UI; no real Cursor API integration |

**Gap:** Purpose is realized at UI level; backend orchestration and learning persistence are not production-real.

---

## ADR-002 — Three-Layer Ownership

**Decision:** ERP owns clients/leads; BOS owns strategy; AOS owns delivery artifacts.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ERP read-only ports | **Met** | `CustomerReadAdapter`, `LeadReadAdapter`, `UserReadAdapter` in `aos/infrastructure/adapters/` |
| BOS initiative read port | **Met** | `InitiativeReadAdapter.ts` |
| AOS owns delivery entities | **Met** | `DeliveryEngagementFirestoreRepository.ts` |
| No ERP write from AOS | **Met** | No Firestore writes to ERP collections in AOS code |
| Create engagement validates ERP refs | **Met** | `DeliveryApplicationService` calls `validateLeadReference`, `validateInitiativeReference` via read ports |

**Verdict:** Compliant.

---

## ADR-003 — Delivery Engagement Root

**Decision:** Delivery Engagement is the aggregate root for engagement-scoped artifacts.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Aggregate root exists | **Met** | `deliveryEngagementAggregate.ts` — `transitionDeliveryEngagement`, `cancelDeliveryEngagement` |
| Lifecycle FSM | **Met** | `deliveryEngagementLifecycle.ts` — `FORWARD_TRANSITIONS`, pause/resume/cancel |
| Company-scoped repository | **Met** | All queries filter `companyId` in `DeliveryEngagementFirestoreRepository.ts` |
| Child artifacts keyed to engagement | **Partial** | Workflow DTO keyed by `engagementId` in memory store; not persisted as domain entities |
| Closure gates | **Met** | Domain transition requires artifact refs; workflow gates mirror in application wiring |

**Gap:** Child domains (requirements, prompts, etc.) exist as DTO fields in `EngagementWorkflowDto`, not as separate domain aggregates with versioning — acceptable for Phase 1A UI but not full ADR-003 realization.

---

## ADR-004 — Requirement Versioning

**Decision:** Requirements are versioned; approved sets are immutable; supersession is explicit.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Requirement Version entity | **Missing** | No `aos/domain/requirements/` |
| Immutable approved versions | **Missing** | `EngagementWorkflowApplicationService.approveRequirements()` mutates DTO in place (line ~98+) |
| Supersession tracking | **Missing** | Single `requirementSet` field on DTO |
| Version display in UI | **Partial** | `RequirementCard` shows version from DTO seed |

**Verdict:** Non-compliant — stub implementation only.

---

## ADR-005 — Prompt Pack Architecture

**Decision:** Prompt packs are structured, versioned, approval-gated execution artifacts.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Prompt Pack domain | **Missing** | No domain folder; DTO field `promptPack` on workflow |
| Prompt Artifact / Version | **Missing** | Generated inline in `EngagementWorkflowApplicationService.generatePromptPackDraft()` |
| Approval gate | **Partial** | `gates.promptPackApproved` boolean on DTO |
| Structured prompt composition | **Partial** | Seed items in application service, not domain rules |

**Verdict:** Non-compliant — UI stub.

---

## ADR-006 — Cursor Execution Model

**Decision:** Cursor sessions record implementation attempts with submission evidence.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Session entity | **Stub** | `cursorSessions[]` on `EngagementWorkflowDto` |
| Submission gate | **Partial** | `submitCursorSessions()` sets `gates.cursorSubmitted` |
| Revision tracking | **Missing** | No revision domain model |
| Cursor API integration | **Missing** | UI-only capture in `EngagementCursorScreen.tsx` |

**Verdict:** Partial — gate semantics present; execution model not persisted.

---

## ADR-007 — Evaluation Gate

**Decision:** Evaluations must pass before lifecycle progression.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Evaluation entity | **Stub** | `evaluation` field on workflow DTO |
| Rubric scoring | **Partial** | UI displays rubric; scores set in application service |
| Pass/fail gate | **Partial** | `gates.evaluationPassed`; wired to delivery lifecycle advance |
| Evaluation-before-progression | **Met (UI)** | `workflowGates.ts` blocks tabs; `EngagementTabBar` respects gate state |

**Verdict:** Partial — gate enforcement works in UI; evaluation domain absent.

---

## ADR-008 — Module Registry

**Decision:** Agency-wide reusable module catalog with quality metadata.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Registry UI (ST-16, ST-17) | **Met** | `RegistryScreen.tsx`, `RegistryDetailScreen.tsx` |
| Module metadata | **Stub** | `moduleRegistrySeed.ts` — 6 in-memory modules |
| Firestore persistence | **Missing** | No registry repository |
| Reuse linkage to engagements | **Partial** | Reuse tab shows recommendations from workflow service |

**Verdict:** Partial — UI contract met; persistence deferred.

---

## ADR-009 — Knowledge Engine

**Decision:** Patterns promoted from retrospectives with confidence and provenance.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Knowledge UI (ST-18) | **Met** | `KnowledgeScreen.tsx` with filters, SidePanel |
| Pattern entity | **Stub** | `knowledgeSeed.ts` — 6 patterns |
| Promotion workflow | **Missing** | Retrospective captures candidates but no promotion pipeline |
| Confidence scoring | **Display only** | Shown on `KnowledgeCard`; no engine |

**Verdict:** Partial — reference UI only.

---

## ADR-010 — Reuse-First Development

**Decision:** Reuse assessment precedes prompt pack generation.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Reuse tab (ST-06) | **Met** | `EngagementReuseScreen.tsx` |
| Assessment before prompts | **Met (gate)** | `gates.reuseRecorded` blocks prompt tab via `workflowGates.ts` |
| Registry matching | **Stub** | Hardcoded recommendations in `generateReuseAssessment()` |
| Founder dashboard reuse strip | **Met** | `FounderDashboardScreen.tsx` shows `RegistryCard` strip |

**Verdict:** Partial — gate order correct; matching logic is stub.

---

## ADR-011 — Sidecar Law Extension

**Decision:** AOS reads ERP/BOS; never writes across ownership boundaries.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Read adapters only | **Met** | 4 adapters under `infrastructure/adapters/` |
| Company-scoped reads | **Met** | `companyScope.ts` — `companyScopedDocumentData()` returns null on mismatch |
| No cross-layer writes | **Met** | AOS Firestore writes limited to delivery collections |
| Delivery links to ERP refs | **Met** | Engagement entity stores `customerId`, `leadId`, optional `initiativeId` |

**Verdict:** Compliant.

---

## ADR-012 — No Generic Project Management

**Decision:** No tasks, sprints, story points, kanban, backlogs as core concepts.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No kanban boards | **Met** | Grep across `aos/presentation/` — no kanban components |
| No velocity/burndown | **Met** | Dashboard explicitly avoids charts (`FounderDashboardScreen.tsx`) |
| Lifecycle badges not PM columns | **Met** | `LifecycleBadge` (C-050) shows delivery state |
| Gate-based tabs not sprint boards | **Met** | `EngagementTabBar` (C-061) with gate chips |
| Queue screens are review queues | **Met** | ST-12–15 use `QueueScreenTemplate`, not task boards |

**Verdict:** Compliant — strongest ADR adherence in presentation layer.

---

## ADR-013 — Versioning Policy

**Decision:** Mutable heads with immutable version history.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Delivery engagement versioning | **Partial** | Domain entity has `version` field; repository saves whole document |
| Requirement version immutability | **Missing** | Single mutable DTO |
| Prompt version history | **Missing** | No version chain |
| Playbook/knowledge version display | **Display only** | Version shown on cards; no history API |

**Verdict:** Partial — delivery entity supports versioning; child artifacts do not.

---

## ADR-014 — Audit and Append-Only Policy

**Decision:** Evidence and audit trails are append-only.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Timeline events | **Partial** | `workflow.timeline[]` unshifted in application service |
| Append-only enforcement | **Missing** | In-memory DTO; no immutability guards |
| Audit persistence | **Missing** | Timeline lost on refresh |
| Firestore audit collections | **Missing** | No audit repository |

**Verdict:** Non-compliant — stub timeline only.

---

## ADR-015 — Implementation Boundaries

**Decision:** Implementation may not redesign ownership, aggregates, lifecycles, or sidecar law.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Delivery Engagement remains root | **Met** | No alternate aggregate introduced |
| No generic PM added | **Met** | ADR-012 verified |
| No domain ownership changes | **Met** | ERP/BOS/AOS boundaries preserved |
| No silent lifecycle changes | **Met** | `deliveryEngagementLifecycle.ts` matches frozen transitions |
| UI/infra additions allowed | **Met** | In-memory stubs used within boundary |

**Verdict:** Compliant — implementation stayed within semantic boundaries even where stubs defer full realization.

---

## Compliance Conclusion

The implementation **honors ADR-015 semantic boundaries** and **fully complies** with ADR-002, ADR-003 (delivery slice), ADR-011, and ADR-012. **Four ADRs are stub-only** (004, 005, 014, and partially 013) because workflow child domains were implemented as in-memory DTOs rather than frozen domain models — an explicit Phase 1A deferral consistent with `FINAL_IMPLEMENTATION_REPORT.md`, but not production-complete per the ADRs themselves.

**Risk:** Stub DTOs could become de facto domain if repository substitution delays — requires governance before Phase 2.
