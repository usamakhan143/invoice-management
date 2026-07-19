# 06 — Application Layer Audit

**Scope:** `aos/application/` — 7 services, DTOs, commands, queries  
**Principle:** Application orchestrates; domain owns business rules; no presentation logic

---

## Service Inventory

| Service | LOC (approx.) | Domain use | Persistence | Role |
|---------|:-------------:|:----------:|:-----------:|------|
| `DeliveryApplicationService` | 449 | **Heavy** | Firestore repo | Orchestrator |
| `EngagementWorkflowApplicationService` | 414 | **Minimal** | Memory store | **Logic holder (violation)** |
| `QueueProjectionApplicationService` | 240 | None | Composed reads | Projector |
| `DashboardApplicationService` | 280 | None | Composed reads | Aggregator |
| `ModuleRegistryApplicationService` | 80 | None | In-memory seed | Read stub |
| `KnowledgeApplicationService` | 70 | None | In-memory seed | Read stub |
| `PlaybookApplicationService` | 65 | None | In-memory seed | Read stub |

---

## DeliveryApplicationService — Reference Implementation

**Correct orchestration pattern:**

```49:52:aos/application/delivery/DeliveryApplicationService.ts
/**
 * Delivery application orchestration — coordinates domain, repositories, and read ports.
 * Business rules remain in the domain layer only.
 */
```

| Responsibility | Delegates to | Verified |
|----------------|--------------|----------|
| Create engagement | `validateCreateDeliveryEngagement()` domain rules | Yes |
| Lifecycle advance | `transitionDeliveryEngagement()` aggregate | Yes |
| Cancel | `cancelDeliveryEngagement()` aggregate | Yes |
| ERP ref validation | read ports + domain rules | Yes |
| DTO mapping | `toDeliveryEngagementDto()` | Yes |
| Error mapping | `mapDeliveryRepositoryError()` | Yes |

**No business logic in service methods** — only orchestration, validation assertion, and mapping. **Exemplary.**

---

## EngagementWorkflowApplicationService — Primary Violation

This service contains **imperative business logic** directly on DTOs:

| Method | Logic location | Should be |
|--------|----------------|-----------|
| `generateRequirementsDraft()` | Application (lines 43–74) | Requirements domain + AI port |
| `approveRequirements()` | Application (gate mutation) | Domain aggregate / gate rules |
| `generatePromptPackDraft()` | Application | Prompt domain |
| `approvePromptPack()` | Application | Prompt domain |
| `submitCursorSessions()` | Application | Cursor domain |
| `runEvaluation()` | Application | Evaluation domain |
| `completeQa()` | Application | QA domain rules |
| `submitRetrospective()` | Application | Retrospective domain |

**Evidence of domain leakage:** Service mutates `workflow.gates.*` booleans and `workflow.timeline` directly without domain validation functions.

**Gate advancement callback** correctly delegates lifecycle to `DeliveryApplicationService.advanceLifecycle()` via wiring — partial mitigation.

---

## Projection Services — Correct Pattern

### QueueProjectionApplicationService

- Reads delivery list + workflow store
- Builds queue row DTOs with attention metadata
- **No mutations** — read-only projection
- **Issue:** embeds `tabHref` URL strings (presentation concern)

### DashboardApplicationService

- Composes queues, delivery, knowledge, registry services
- Builds attention queue ranking heuristics
- **Issue:** imports `constants/deliveryState` instead of domain; hardcodes `lifecycleState: BUILDING` in NBA builder
- **Issue:** quick-action hrefs are presentation routes

---

## Seed Services — Acceptable Phase 1A Stubs

`ModuleRegistryApplicationService`, `KnowledgeApplicationService`, `PlaybookApplicationService`:

| Check | Status |
|-------|--------|
| Read-only | **Yes** — no mutations |
| Company scope parameter | **Accepted** — `AosReadScope` passed but seeds are global |
| Search in application | **Yes** — `*Search.ts` modules |
| Business logic | **Minimal** — ranking/scoring only |

These are **thin data providers**, not orchestrators — acceptable until repositories ship.

---

## DTO Analysis

| DTO | Leaks domain entities? | Stable for presentation? |
|-----|:----------------------:|:------------------------:|
| `DeliveryEngagementDto` | No — mapped | Yes |
| `EngagementWorkflowDto` | No — flat structure | Yes (but anemic) |
| `QueueProjectionDto` | No | Yes |
| `FounderDashboardDto` | No | Yes |
| `ModuleRegistryDto` | No | Yes |
| `KnowledgeDto` | No | Yes |
| `PlaybookDto` | No | Yes |

**Duplication concern:** `EngagementWorkflowDto` acts as both API contract and persistence model — will require mapping layer when domain entities arrive.

---

## Command/Query Discipline

| Pattern | Status |
|---------|--------|
| Commands as typed interfaces | **Yes** — `CreateDeliveryEngagementCommand`, etc. |
| Queries as typed interfaces | **Yes** — `GetDeliveryEngagementQuery`, etc. |
| Scope on every operation | **Yes** — `AosReadScope` / `AosActorScope` |
| Unit of work abstraction | **Present** — `DeliveryUnitOfWork` (passthrough default) |

Workflow service lacks command/query types — uses raw parameters.

---

## Application Layer Test Coverage

| Service | Test file | Coverage focus |
|---------|-----------|----------------|
| Delivery | Multiple + integration | Domain orchestration, repo errors |
| Workflow | `EngagementWorkflowApplicationService.test.ts` | Gate progression |
| Queues | `QueueProjectionApplicationService.test.ts` | Badge counts, filtering |
| Dashboard | `DashboardApplicationService.test.ts` | Attention queue assembly |
| Registry | `ModuleRegistryApplicationService.test.ts` | Seed listing |
| Knowledge | `KnowledgeApplicationService.test.ts` | Seed listing |
| Playbook | `PlaybookApplicationService.test.ts` | Seed listing |

**69 total AOS tests** — application layer has meaningful unit coverage for stubs; workflow domain rules untested at domain level (no domain to test).

---

## Application Layer Score

| Criterion | Score |
|-----------|------:|
| Delivery orchestration purity | **9/10** |
| Workflow orchestration purity | **3/10** |
| Projection service correctness | **8/10** |
| DTO stability | **7/10** |
| Scope discipline | **9/10** |
| Separation from presentation | **6/10** (URL leakage) |

---

## Verdict

Application layer is **split-quality**: delivery service is production-grade orchestration; workflow service is a **Phase 1A prototype that violates the "orchestrate only" principle** by housing business rules. Seed services are appropriately thin. Repository substitution must not copy workflow logic forward — it must migrate into domain aggregates per frozen model.
