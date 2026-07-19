# 07 — Domain Layer Audit

**Scope:** `aos/domain/` — 21 files, delivery bounded context only  
**Reference:** `docs/aos-domain-model/*`, ADR-003, ADR-013

---

## Domain Coverage vs. Frozen Model

| Frozen domain | Implemented? | Location |
|---------------|:------------:|----------|
| Delivery Engagement | **Yes** | `domain/delivery/` |
| Delivery Template | **Yes** | `entities/deliveryTemplate.ts` |
| Delivery Quality Report | **Yes** | `entities/deliveryQualityReport.ts` |
| Requirements | **No** | Stubbed in workflow DTO |
| Prompt Pack | **No** | Stubbed in workflow DTO |
| Cursor Session | **No** | Stubbed in workflow DTO |
| Evaluation | **No** | Stubbed in workflow DTO |
| Knowledge Pattern | **No** | Seed data only |
| Module Registry | **No** | Seed data only |
| Agency Playbook | **No** | Seed data only |
| Retrospective | **No** | Stubbed in workflow DTO |

**Domain implementation coverage:** **3 of 11** frozen entities (~27%).

---

## Delivery Domain Structure

```
domain/delivery/
├── entities/           deliveryEngagement, deliveryTemplate, deliveryQualityReport
├── lifecycle/          FSM tables for all 3 entities
├── rules/              validation functions returning DomainResult
├── deliveryEngagementAggregate.ts
├── deliveryState.ts, templateState.ts, qualityReportState.ts
├── valueObjects.ts     branded IDs, artifact refs
├── relationships.ts    cross-entity refs
├── errors.ts           domain error codes
└── domainResult.ts     shared result type (at domain root)
```

**Pattern quality:** Clean separation of entities, rules, lifecycle, and aggregate — textbook DDD structure.

---

## Aggregate Integrity (ADR-003)

### deliveryEngagementAggregate.ts

| Rule | Status | Evidence |
|------|--------|----------|
| Transitions validated before mutation | **Yes** | Calls `validateDeliveryEngagementTransition()` first |
| Artifact refs checked at gates | **Yes** | `validateTransitionArtifacts()` |
| Returns DomainResult | **Yes** | `domainOk` / `domainFail` pattern |
| Cancel is separate path | **Yes** | `cancelDeliveryEngagement()` |
| No direct state assignment bypass | **Yes** | All via `applyTransition()` |

**No aggregate violations detected** in delivery engagement aggregate.

---

## Lifecycle Integrity

### deliveryEngagementLifecycle.ts

States: `INTAKE → DISCOVERY → PLANNING → BUILDING → EVALUATING → DELIVERING → HANDOFF → CLOSED` plus `PAUSED`, `CANCELLED`.

| Check | Status |
|-------|--------|
| Forward transitions explicit | **Yes** — `FORWARD_TRANSITIONS` map |
| Pause/resume controlled | **Yes** |
| Cancel from allowed states | **Yes** |
| Terminal states immutable | **Yes** — CLOSED/CANCELLED have no forward transitions |
| Tests exist | **Yes** — `deliveryEngagementLifecycle.test.ts` |

**No lifecycle leaks** — UI cannot bypass domain FSM for delivery engagement state; mutations go through `DeliveryApplicationService.advanceLifecycle()`.

---

## Domain Rules

### deliveryEngagementRules.ts

| Validation | Present |
|------------|:-------:|
| Create engagement invariants | Yes |
| Update engagement invariants | Yes |
| Lead reference (optional) | Yes |
| Initiative reference (optional) | Yes |
| Customer required | Yes |
| Delivery lead required | Yes |

**Tests:** `deliveryEngagementRules.test.ts` — rules covered.

---

## Domain Purity Issues

### DP-01: External constant imports

```1:3:aos/domain/delivery/entities/deliveryEngagement.ts
import type { AgencyType } from "../../../constants/agencyType";
import type { EngagementType } from "../../../constants/engagementType";
import type { CompanyId, EpochMs, UserId } from "../../../types";
```

Domain depends on shared packages outside `domain/` folder. Acceptable pragmatic choice but weakens strict DDD isolation.

### DP-02: Duplicated delivery state

Identical enums in:

- `domain/delivery/deliveryState.ts`
- `constants/deliveryState.ts`

Application services import from **different sources**:

- `DeliveryEngagementDto.ts` → domain
- `DashboardApplicationService.ts` → constants
- `PlaybookDto.ts` → constants

**Drift risk:** If domain adds a state, UI constants may lag.

---

## Workflow Gate vs. Domain Lifecycle

UI gates (`workflowGates.ts`) block tabs based on `EngagementWorkflowDto.gates` booleans. Delivery lifecycle advances via separate domain events triggered on gate approval.

**Potential desync:** Workflow gates and delivery lifecycle are updated in separate code paths (workflow service vs. delivery aggregate). Wiring connects them via `advanceEngagementLifecycle` callback, but no single domain invariant ensures they stay synchronized.

**Severity:** Medium — works in happy path; edge cases (partial failure) untested.

---

## Value Objects

| Type | Branded? | Validation |
|------|:--------:|:----------:|
| `DeliveryEngagementId` | Yes | String alias |
| `DeliveryTemplateId` | Yes | String alias |
| `DeliveryQualityReportId` | Yes | String alias |
| `DeliveryEngagementArtifactRefs` | Yes | Structured object with booleans |

Branded IDs prevent accidental string mixing — good practice.

---

## Missing Domain (Critical Gap)

Frozen domain model defines rich entities for:

- Requirement Version (immutable approved sets)
- Prompt Pack / Prompt Artifact / Prompt Version
- Cursor Session / Revision
- Evaluation / Rubric Result
- Retrospective / Knowledge Promotion

**None exist in code.** All behavior simulated in `EngagementWorkflowApplicationService` on a flat DTO.

This is the **single largest domain audit finding** — the UI presents a complete workflow, but 73% of the frozen domain model is unimplemented.

---

## Domain Test Coverage

| File | Tests |
|------|-------|
| `deliveryEngagementRules.test.ts` | Yes |
| `deliveryEngagementLifecycle.test.ts` | Yes |
| Aggregate tests | Via application/integration tests |

**Domain-only test files:** 2. Adequate for implemented scope; insufficient for frozen model scope.

---

## Domain Layer Score

| Criterion | Score |
|-----------|------:|
| Implemented domain quality | **9/10** |
| Frozen model coverage | **3/10** |
| Aggregate integrity | **9/10** |
| Lifecycle correctness | **9/10** |
| Domain purity | **7/10** |
| Test coverage (implemented) | **8/10** |

---

## Verdict

The **delivery domain is well-crafted** and faithfully implements ADR-003 for the aggregate root. **Workflow child domains are entirely absent** — replaced by an application-layer DTO prototype. This is acceptable for Phase 1A UI validation but **blocks production approval** until domain entities, rules, and aggregates are implemented per frozen model.
