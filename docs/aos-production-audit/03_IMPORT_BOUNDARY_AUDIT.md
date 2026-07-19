# 03 — Import Boundary Audit

**Tooling:** `aos/architecture/verifyImportBoundaries.ts`, `aos/architecture/importBoundaryRules.ts`  
**Result:** `{ "ok": true, "violations": [] }` — all enforced rules pass

---

## Enforced Rules (Frozen)

| Layer prefix | Forbidden import patterns |
|--------------|---------------------------|
| `presentation/ui` | `/application/`, `/domain/`, `/infrastructure/`, `/contracts/`, Firebase, `/wiring/` |
| `presentation/screens` | `/domain/`, `/infrastructure/`, Firebase |
| `presentation/layouts` | `/domain/`, `/infrastructure/`, Firebase |
| `presentation/gates` | `/domain/`, `/infrastructure/`, Firebase |
| `hooks` | `/domain/`, `/infrastructure/`, Firebase, `/presentation/ui/`, `/presentation/screens/` |
| `pages` | `/domain/`, `/infrastructure/`, `/application/`, Firebase |

**Exempt:** `aos/wiring/`, `aos/presentation/providers/`

---

## Clean Areas (Verified)

| Check | Result |
|-------|--------|
| Presentation → domain entity imports | **0 matches** |
| Presentation → infrastructure imports | **0 matches** |
| Presentation → Firebase imports | **0 matches** |
| Application → presentation imports | **0 TypeScript imports** |
| Hooks → infrastructure (production) | **0 matches** |
| `presentation/ui` → application | **0 matches** |
| TODO / FIXME in `aos/` | **0 matches** |
| `console.log` in `aos/` | **0 matches** |

---

## Undetected Violations (Doc vs. Checker)

### V-01: Screens → Application (9 files)

Architecture doc (`30_FRONTEND_ARCHITECTURE.md`) states data crosses layers via hooks only. Checker **allows** application imports from screens.

| File | Import |
|------|--------|
| `RegistryScreen.tsx:4,11` | `REGISTRY_SEARCH_MIN_CHARS`, `ModuleRegistryCatalogStatus` |
| `KnowledgeScreen.tsx:4` | `KNOWLEDGE_SEARCH_MIN_CHARS` |
| `PlaybookScreen.tsx:4-5` | `PLAYBOOK_SEARCH_MIN_CHARS`, `PLAYBOOK_ENTRY_TYPE_LABELS`, `PlaybookEntryType` |
| `CreateEngagementScreen.tsx:13` | `CreateDeliveryEngagementCommand` |
| `DeliveryListScreen.tsx:12` | `DeliveryEngagementDto` |
| `EngagementContextProvider.tsx` | `DeliveryEngagementDto` |
| `workflowGates.ts` | `EngagementWorkflowDto` |
| `useRegistryScreenState.ts` | `ModuleRegistryCatalogStatus` |
| `usePlaybookScreenState.ts` | `PlaybookEntryType` |

**Impact:** Screens coupled to application DTO shapes; harder to swap data sources without screen edits.

---

### V-02: Hooks → Presentation Providers

```
aos/hooks/useAosServices.ts
  import { AosServicesContext } from "../presentation/providers/AosServicesContext";
```

Creates soft cycle:

```
presentation/screens → hooks → presentation/providers → wiring
```

Not a hard circular import (context file does not import hooks), but violates "lower layers never import presentation."

---

### V-03: Hooks → ERP Services (Bypass)

```
aos/hooks/queries/useErpCustomersQuery.ts
  import { CustomerService } from "../../../services/customerService";

aos/hooks/useAosScope.ts
  import { resolveCompanyIdForUser } from "../../services/companyId";
```

These sit outside AOS layer rules (ERP root services), but break the intended AOS data flow.

---

### V-04: Infrastructure → Application

```
aos/infrastructure/memory/EngagementWorkflowMemoryStore.ts
  import type { EngagementWorkflowDto } from "../../application/workflow/dto/EngagementWorkflowDto";
  import type { EngagementWorkflowStore } from "../../application/workflow/EngagementWorkflowStore";
```

Classic dependency inversion violation. Store port and persistence model should live in `contracts/` or domain.

---

### V-05: Application Tests → Infrastructure

```
aos/application/workflow/EngagementWorkflowApplicationService.test.ts:3
aos/application/queues/QueueProjectionApplicationService.test.ts:6
  import { EngagementWorkflowMemoryStore } from "../../infrastructure/memory/..."
```

Tests excluded from checker — acceptable for unit tests, but couples application tests to concrete infra.

---

### V-06: Public Barrel Leakage

```10:21:aos/index.ts
export * from "./infrastructure";
export * from "./presentation";
export * from "./hooks";
export * from "./wiring";
```

Any consumer importing from `aos/` root can reach Firestore repositories and presentation internals — bypasses intentional layer isolation for external modules.

---

## Circular Reference Analysis

| Potential cycle | Hard cycle? | Notes |
|-----------------|:-----------:|-------|
| hooks ↔ presentation/providers | **No** | One-directional import |
| application ↔ infrastructure (store) | **No** | Infra imports app types; app imports store via wiring only |
| domain ↔ constants (deliveryState) | **No** | Duplicate files, not mutual imports |

**No hard circular TypeScript module cycles detected.**

---

## Firebase Import Map

Firebase imports confined to:

- `aos/infrastructure/firestore/**`
- `aos/infrastructure/integration/**` (emulator tests)

Zero Firebase imports in presentation, hooks, pages, or application — **compliant with frontend architecture**.

---

## Import Boundary Score

| Category | Score |
|----------|------:|
| Automated rule compliance | **100%** |
| Architecture doc compliance | **~78%** |
| Dependency inversion purity | **~65%** |

---

## Verdict

Automated boundaries **pass completely** and prevent the most dangerous leaks (Firebase in UI, domain in screens). **Document-level violations exist** in screens→application, hooks→presentation, and infrastructure→application — these are architectural debt, not runtime bugs, but will compound if not addressed during repository substitution.
