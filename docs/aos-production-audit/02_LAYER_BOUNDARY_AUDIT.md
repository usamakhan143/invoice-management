# 02 — Layer Boundary Audit

**Reference:** `docs/aos-frontend-architecture/30_FRONTEND_ARCHITECTURE.md`, `aos/architecture/importBoundaryRules.ts`  
**Automated check:** `verifyAosImportBoundaries()` → **PASS** (0 violations)

---

## Expected Dependency Direction

```
pages → presentation (screens, gates, layouts)
screens → hooks → application (via services context)
application → domain + contracts + integration/ports
infrastructure → contracts + domain (mapping only)
wiring → application + infrastructure (composition root)
```

Lower layers must not import presentation. Domain must not import infrastructure or presentation.

---

## Layer-by-Layer Assessment

### Presentation Layer (`aos/presentation/`)

| Sub-layer | Files | Allowed imports | Status |
|-----------|------:|-----------------|--------|
| `ui/` | 38 | React, design tokens, local utils | **Clean** — no application/domain/infrastructure |
| `screens/` | 20+ | ui, layouts, hooks, gates, config, constants | **Mostly clean** — see violations |
| `layouts/` | 6 | ui utils only | **Clean** |
| `gates/` | 4 | hooks, config | **Clean** |
| `providers/` | 3 | wiring (exempt) | **Allowed** |
| `navigation/` | 2 | ui, hooks | **Clean** |

**Finding:** `presentation/ui/` has zero imports from `/application/`, `/domain/`, `/infrastructure/`, or Firebase — verified by grep.

---

### Hooks Layer (`aos/hooks/`)

| Rule | Status | Evidence |
|------|--------|----------|
| No domain imports | **Pass** | Enforced by checker |
| No infrastructure imports (production) | **Pass** | Production hooks use `useAosServices()` |
| No presentation/ui or screens | **Pass** | Enforced by checker |
| No direct application service instantiation | **Pass** | Services from context |

**Violations (not in checker):**

| File | Import | Issue |
|------|--------|-------|
| `hooks/useAosServices.ts:2` | `../presentation/providers/AosServicesContext` | Hooks depend upward on presentation context |
| `hooks/queries/useErpCustomersQuery.ts:4` | `../../../services/customerService` | Bypasses application layer for ERP data |
| `hooks/useAosScope.ts:3` | `../../services/companyId` | Direct ERP service for tenant resolution |

---

### Application Layer (`aos/application/`)

| Service | Imports domain? | Imports infra? | Imports presentation? | Verdict |
|---------|:---------------:|:--------------:|:---------------------:|---------|
| `DeliveryApplicationService` | Yes (rules, aggregate) | No | No | **Correct** |
| `EngagementWorkflowApplicationService` | Minimal (value object ID) | No | No | **DTO-anemic** |
| `QueueProjectionApplicationService` | No | No | No | **Projection only** |
| `ModuleRegistryApplicationService` | No | No | No | **Seed stub** |
| `KnowledgeApplicationService` | No | No | No | **Seed stub** |
| `DashboardApplicationService` | No | No | No | **Aggregator** |
| `PlaybookApplicationService` | No | No | No | **Seed stub** |

**Violations:**

| File | Issue |
|------|-------|
| `QueueProjectionApplicationService.ts:48` | Embeds URL paths (`tabHref: /aos/delivery/...`) — presentation routing in application |
| `DashboardApplicationService.ts:257-260` | Hardcoded quick-action hrefs |
| `EngagementWorkflowApplicationService.ts` | ~414 lines of gate/business logic on DTOs — should be domain rules |

---

### Domain Layer (`aos/domain/`)

| Rule | Status | Evidence |
|------|--------|----------|
| No infrastructure imports | **Pass** | Grep: zero matches |
| No presentation imports | **Pass** | Grep: zero matches |
| Pure business rules | **Partial** | Delivery domain is pure; imports `aos/constants/` and `aos/types/` |

**External dependencies in domain:**

```
aos/domain/delivery/entities/deliveryEngagement.ts
  → aos/constants/agencyType.ts
  → aos/constants/engagementType.ts
  → aos/types/index.ts (CompanyId, UserId, EpochMs)
```

This is a **domain purity compromise** — constants mirror frozen enums for UI safety but create dual source of truth with `domain/delivery/deliveryState.ts` vs `constants/deliveryState.ts`.

**Coverage gap:** Domain exists only for `delivery` bounded context (21 files). Requirements, Prompt, Cursor, Evaluation, Knowledge, Registry domains from frozen model are **not implemented**.

---

### Contracts Layer (`aos/contracts/`)

| Interface | Implemented by |
|-----------|----------------|
| `DeliveryEngagementRepository` | `DeliveryEngagementFirestoreRepository` |
| `DeliveryTemplateRepository` | `DeliveryTemplateFirestoreRepository` |
| `DeliveryQualityReportRepository` | `DeliveryQualityReportFirestoreRepository` |

**Gap:** No contracts for workflow, registry, knowledge, or playbook — stores defined as application ports (`EngagementWorkflowStore`).

---

### Infrastructure Layer (`aos/infrastructure/`)

| Component | Depends on | Status |
|-----------|------------|--------|
| Firestore repositories | contracts, domain entities, firestore utils | **Correct** |
| Read adapters | integration/ports, companyScope | **Correct** |
| `EngagementWorkflowMemoryStore` | **application DTOs + store interface** | **Inversion violation** |

```1:2:aos/infrastructure/memory/EngagementWorkflowMemoryStore.ts
import type { EngagementWorkflowDto } from "../../application/workflow/dto/EngagementWorkflowDto";
import type { EngagementWorkflowStore } from "../../application/workflow/EngagementWorkflowStore";
```

Infrastructure must depend on contracts/domain, not application DTOs.

---

### Wiring Layer (`aos/wiring/`)

| File | Role | Status |
|------|------|--------|
| `createAosPresentationServices.ts` | Binds repos, ports, memory store, 7 services | **Correct composition root** |
| `types.ts` | `AosPresentationServices` interface | **Clean** |

Singleton pattern at lines 26–67 prevents duplicate service instances on re-render — acceptable for SPA.

---

## Boundary Violation Summary

| ID | Violation | Layers | Severity |
|----|-----------|--------|----------|
| LB-01 | Infrastructure imports application DTOs | Infra → App | **High** |
| LB-02 | Screens import application directly | Presentation → App | **Medium** |
| LB-03 | Hooks import presentation context | Hooks → Presentation | **Medium** |
| LB-04 | Hooks bypass application for ERP | Hooks → ERP services | **Medium** |
| LB-05 | Application embeds URL routes | App → Presentation concern | **Low** |
| LB-06 | Domain imports shared constants | Domain → Constants | **Low** |
| LB-07 | Workflow logic in application without domain | App (logic leak) | **High** |
| LB-08 | Public barrel exports all layers | `aos/index.ts` | **Medium** |

---

## Checker vs. Architecture Doc Gap

The frozen checker enforces a **subset** of `30_FRONTEND_ARCHITECTURE.md`:

| Doc rule | Enforced? |
|----------|-----------|
| Screens must not import application | **No** — explicitly allowed in rules |
| Hooks must not import presentation/providers | **No** |
| Application must not embed routes | **No** |
| Infrastructure must not import application | **No** |

**Recommendation (informational):** Extend rules in a future hardening sprint — not part of this audit.

---

## Verdict

**Layer boundaries are structurally sound** for the delivery vertical slice with automated enforcement on the presentation/hooks/pages critical path. **Two high-severity gaps** (infra→app inversion, workflow logic outside domain) must be resolved before treating the architecture as production-grade at enterprise scale.
