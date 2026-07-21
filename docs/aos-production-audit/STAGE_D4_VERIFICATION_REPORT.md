# Stage D4 — Independent Verification Report

**Date:** July 21, 2026  
**Verifier role:** External principal engineer (cold read of current codebase)  
**Scope:** Re-evaluate Stage D4 claims in `STAGE_D4_PRODUCTION_HARDENING_REPORT.md` without relying on prior audit conclusions or implementation reports  
**Method:** Source inspection, automated script execution, test run

---

## Executive Verdict

Stage D4 delivered **material architectural improvement**: workflow business rules moved into a domain aggregate, production wiring binds Firestore repositories, the in-memory workflow store is gone, and automated boundary/security checks pass.

However, several D4 claims are **overstated**. The “E2E founder journey” does not exercise Firestore or a complete delivery lifecycle. Append-only audit is enforced for the audit collection but not for all workflow mutations. Catalog contracts still depend on application DTOs (layer inversion persists outside workflow).

**Overall D4 verification:** **PARTIAL PASS** — suitable for controlled pilot with known gaps; not fully production-grade without follow-up.

---

## Verification Commands Run (Independent)

| Command | Result | Notes |
|---------|--------|-------|
| `npm run aos:import-boundaries` | PASS | 0 violations |
| `npm run aos:security` | PASS | 8 collections matched in `firestore.rules` |
| `npm run aos:validate` | PASS | 7 converter checks |
| `npm run test:aos` | PASS | 27 files, 77 tests (integration test excluded) |
| `npm run build` | PASS | Vite production build succeeded |

---

## Claim-by-Claim Verification

### 1. Workflow domain is now the owner of business rules

**Verdict: PASS (with caveats)**

**Evidence — domain owns commands and gate logic:**

- All workflow mutations are exported from `aos/domain/workflow/aggregate/engagementWorkflowAggregate.ts` (`generateRequirementsDraft`, `approveRequirements`, `runReuseAssessment`, `generatePromptPack`, `startCursorSession`, `runEvaluation`, `approveQaHandoff`, `approveRetrospective`, etc.).
- Gate recomputation lives in domain entity helpers:

```200:202:aos/domain/workflow/entities/engagementWorkflow.ts
export function withRecomputedGates(workflow: EngagementWorkflow): EngagementWorkflow {
  return { ...workflow, gates: recomputeWorkflowGates(workflow) };
}
```

- Domain aggregate tests enforce business rules (e.g. reuse blocked until requirements approved, QA blocked when checklist incomplete) in `aos/domain/workflow/aggregate/engagementWorkflowAggregate.test.ts`.

**Caveats (not failures of ownership, but completeness gaps):**

- Stub “AI generation” content is hardcoded inside the aggregate (acceptable for Phase 1A, but not real orchestration).
- Requirement versioning is not immutable history (single `requirementSet` object mutated — ADR-004 still partial).

---

### 2. `EngagementWorkflowApplicationService` is orchestration-only

**Verdict: PARTIAL**

**Evidence — orchestration pattern is the default:**

```65:83:aos/application/workflow/EngagementWorkflowApplicationService.ts
  private async persistCommand(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    outcome: WorkflowAggregate.WorkflowCommandOutcome,
    lifecycleCommand?: Parameters<typeof WorkflowAggregate.lifecycleEventForCommand>[0],
  ): Promise<EngagementWorkflowDto> {
    await this.auditEvents.append(outcome.auditEvent);
    const saved = await this.workflows.save(scope.companyId, outcome.workflow);
    // ...
  }
```

Most public methods follow: load → `WorkflowAggregate.*` → persist → map DTO.

**Evidence — inconsistent orchestration (business-adjacent side effects skipped):**

Three methods bypass `persistCommand` and **do not append audit events**:

| Method | Lines | Behavior |
|--------|-------|----------|
| `updateRequirementDraft` | 101–112 | domain call → `workflows.save` only |
| `setReuseModuleDecision` | 151–164 | domain call → `workflows.save` only |
| `updateQaChecklist` | 231–243 | domain call → `workflows.save` only |

These are still thin orchestrators (no inline gate rules), but they break the documented D4 pattern of “load → domain → append audit → save.”

**Additional note:** Lifecycle advancement artifact mapping lives in `aos/wiring/createAosPresentationServices.ts` (lines 80–94), not in the application service — acceptable composition-root orchestration.

---

### 3. Firestore repositories replace all workflow memory persistence

**Verdict: PASS**

**Evidence — memory store removed:**

- `aos/infrastructure/memory/` — **does not exist** (0 files).
- Grep for `EngagementWorkflowMemoryStore` and `EngagementWorkflowStore` — **no code references** (docs only).

**Evidence — production wiring uses Firestore:**

```28:39:aos/infrastructure/firestore/wiring/createAosWorkflowRepositories.ts
export function createAosWorkflowRepositories(
  options: CreateAosWorkflowRepositoriesOptions = {},
): AosWorkflowRepositoryBundle {
  const firestore = options.firestore ?? db;

  return {
    workflows: new EngagementWorkflowFirestoreRepository(firestore),
    auditEvents: new AuditEventFirestoreRepository(firestore),
    registry: new ModuleRegistryFirestoreRepository(firestore),
    knowledge: new KnowledgeFirestoreRepository(firestore),
    playbook: new PlaybookFirestoreRepository(firestore),
  };
}
```

```75:79:aos/wiring/createAosPresentationServices.ts
  const workflow =
    options.workflow ??
    new EngagementWorkflowApplicationService({
      workflows: workflowRepos.workflows,
      auditEvents: workflowRepos.auditEvents,
```

**Evidence — in-memory repos retained only for unit/E2E tests:**

- `aos/infrastructure/testing/inMemoryWorkflowRepositories.ts` — test double implementing `EngagementWorkflowRepository` / `AuditEventRepository` contracts (appropriate).

---

### 4. Append-only audit trail fully satisfies ADR-014

**Verdict: PARTIAL**

**Evidence — audit collection is append-only at infrastructure and rules layers:**

Repository exposes only `append` and `listByEngagement`; rejects duplicate IDs:

```13:35:aos/infrastructure/firestore/repositories/AuditEventFirestoreRepository.ts
/** Append-only audit store — ADR-014. Updates and deletes are not exposed. */
export class AuditEventFirestoreRepository implements AuditEventRepository {
  // ...
  async append(event: AuditEvent): Promise<AuditEvent> {
    // ...
    if (existing.exists) {
      throw new Error(`Audit event ${event.id} already exists — append-only violation`);
    }
```

Firestore rules block update/delete on audit events:

```716:721:firestore.rules
    match /aosAuditEvents/{docId} {
      allow read: if aosCompanyReadOk(resource.data);
      allow create: if aosCompanyWriteOk(request.resource.data);
      allow update: if false;
      allow delete: if false;
    }
```

**Gaps vs ADR-014 full policy (`docs/aos-adr/ADR-014_AUDIT_AND_APPEND_ONLY_POLICY.md`):**

| Gap | Severity | Evidence |
|-----|----------|----------|
| Not all workflow mutations emit audit events | Medium | `updateRequirementDraft`, `setReuseModuleDecision`, `updateQaChecklist` save without audit (§2 above) |
| Workflow state is mutable in place | Medium | `EngagementWorkflowFirestoreRepository.save` uses `set(..., { merge: true })` — requirement/prompt/evaluation entities updated in single document, not version chains |
| Audit event IDs are deterministic | Low | `createAuditEvent(..., \`${type}-${occurredAt}\`)` — collision risk if two events same ms/type |
| Security script is shallow | Low | `scripts/verify-aos-firestore-security.ts` checks string presence, not rule semantics |
| Clients can still create arbitrary audit docs | Low | Rules allow `create` for any company member; no schema validation in rules |

**Conclusion:** Append-only is **correct for `aosAuditEvents`**, but ADR-014’s broader append-only/versioning requirements are **not fully satisfied**.

---

### 5. Registry, Knowledge and Playbook repositories are company-scoped

**Verdict: PASS**

**Evidence — company-scoped queries, doc IDs, and seed-on-first-read:**

All three repositories follow the same pattern (example: Module Registry):

```20:36:aos/infrastructure/firestore/repositories/ModuleRegistryFirestoreRepository.ts
  async ensureSeeded(scope: AosReadScope): Promise<void> {
    // ...
      const existing = await this.collection()
        .where("companyId", "==", scope.companyId)
        .limit(1)
        .get();
      if (!existing.empty) {
        return;
      }
      const batch = this.firestore.batch();
      for (const module of getModuleRegistrySeedCatalog()) {
        const ref = this.collection().doc(catalogDocId(scope.companyId, module.moduleId));
        batch.set(ref, { companyId: scope.companyId, ...module });
```

- `KnowledgeFirestoreRepository` — `companyId__patternId` doc keys, `where("companyId", "==", scope.companyId)`.
- `PlaybookFirestoreRepository` — same pattern for playbook entries.

**Architectural debt (does not invalidate company scoping):**

- Repository **contracts** import application DTOs:

```1:7:aos/contracts/ModuleRegistryRepository.ts
import type { ModuleRegistryDetailDto } from "../application/registry/dto/ModuleRegistryDto";
import type { AosReadScope } from "../application/types";

export interface ModuleRegistryRepository {
  ensureSeeded(scope: AosReadScope): Promise<void>;
  listAll(scope: AosReadScope): Promise<readonly ModuleRegistryDetailDto[]>;
```

Infrastructure depends on application seed catalogs (`getModuleRegistrySeedCatalog`, etc.) — partial recurrence of pre-D4 inversion outside the workflow bounded context.

---

### 6. Import boundary extensions actually prevent previous violations

**Verdict: PASS**

**Evidence — extended rules exist:**

```24:73:aos/architecture/importBoundaryRules.ts
  {
    layer: "presentation/screens",
    forbiddenImportPatterns: [
      "/domain/",
      "/infrastructure/",
      "/application/",
      // ...
    ],
  },
  {
    layer: "pages",
    forbiddenImportPatterns: [
      "/domain/",
      "/infrastructure/",
      "/application/",
      // ...
    ],
  },
  {
    layer: "hooks",
    forbiddenImportPatterns: [
      // ...
      "/presentation/providers/",
    ],
  },
```

**Evidence — `useAosServices` moved to hooks layer:**

```1:8:aos/hooks/useAosServices.ts
import { useContext } from "react";
import { AosServicesContext } from "./AosServicesContext";
import type { AosPresentationServices } from "../wiring/types";
```

**Evidence — automated enforcement passes:**

- `npm run aos:import-boundaries` → PASS
- Grep: no `/application/` imports under `aos/presentation/screens/` or `aos/pages/`
- Grep: no `/presentation/providers/` imports under `aos/hooks/`

**Evidence — presentation type facade exists:**

- `aos/types/presentation.ts` — re-exports read-model types for screens
- `aos/constants/searchLimits.ts` — shared constants (referenced by screens)

**Limitation:** Boundary rules do not cover `aos/contracts/` importing application DTOs (see §5). That inversion is outside the enforced layer graph.

---

### 7. Firestore security rules enforce tenant isolation

**Verdict: PARTIAL**

**Evidence — all 8 AOS collections have company-scoped rules:**

```668:678:firestore.rules
    function aosCompanyReadOk(data) {
      return data.companyId is string &&
        data.companyId.size() > 0 &&
        canAccessCompanyData(data.companyId);
    }

    function aosCompanyWriteOk(data) {
      return data.companyId is string &&
        data.companyId.size() > 0 &&
        canAccessCompanyData(data.companyId);
    }
```

Collections covered: `aosDeliveryEngagements`, `aosDeliveryTemplates`, `aosDeliveryQualityReports`, `aosEngagementWorkflows`, `aosAuditEvents`, `aosModuleRegistry`, `aosKnowledgePatterns`, `aosPlaybookEntries`.

**Evidence — verification script passes:** `npm run aos:security` (8 collections).

**Gaps:**

| Gap | Notes |
|-----|-------|
| Isolation model is company membership only | No AOS-specific role matrix in rules (unlike BOS granular permissions) |
| Verification script is presence-based | Does not validate `canAccessCompanyData` implementation or cross-tenant negative tests |
| Workflow Firestore integration not in default CI | `deliveryStack.integration.test.ts` runs only via emulator exec; excludes workflow/catalog collections |
| Mutable collections allow client updates | Expected for workflow/catalog, but increases tampering surface vs server-mediated writes |

Tenant isolation **exists and is structurally sound** for company-scoped data; **verification depth is insufficient** for production sign-off.

---

### 8. E2E founder journey validates the complete delivery lifecycle

**Verdict: FAIL**

**Evidence — test file explicitly disclaims browser/Firestore E2E:**

```1:4:aos/e2e/founderJourney.e2e.test.ts
/**
 * Founder journey E2E scenarios (E2E-01 through E2E-05) — application + in-memory persistence.
 * Validates production-hardened workflow domain and audit trail without browser automation.
 */
```

**Evidence — uses in-memory repositories, not Firestore:**

```29:31:aos/e2e/founderJourney.e2e.test.ts
  function createStack() {
    const workflows = new InMemoryEngagementWorkflowRepository();
    const auditEvents = new InMemoryAuditEventRepository();
```

**Evidence — delivery service is mocked, not real:**

```32:60:aos/e2e/founderJourney.e2e.test.ts
    const delivery = {
      listCompanyDeliveries: vi.fn().mockResolvedValue({ items: [ /* static */ ] }),
      getEngagement: vi.fn().mockResolvedValue({ /* static */ }),
      advanceLifecycle: vi.fn().mockResolvedValue(undefined),
    } as unknown as DeliveryApplicationService;
```

**Scenario coverage vs “complete lifecycle”:**

| Scenario | What it actually tests |
|----------|------------------------|
| E2E-01 | Dashboard attention after `generateRequirementsDraft` |
| E2E-02 | Mocked delivery list + `getWorkflow` |
| E2E-03 | **Command object shape assertion only** — does not call create engagement |
| E2E-04 | Requirements draft → approve + audit event type check |
| E2E-05 | Requirements queue href projection |

**Not covered:** prompt pack, cursor sessions, evaluation, QA handoff, retrospective, Firestore persistence, UI navigation, lifecycle advancement integration (mocked).

The suite is a **useful application-layer smoke test**, not an E2E validation of the complete delivery lifecycle.

---

### 9. No architectural regressions were introduced during D4

**Verdict: PARTIAL**

**Confirmed improvements (no regression):**

| Item | Status |
|------|--------|
| In-memory workflow store removed | Improved |
| Workflow contracts use domain entities | Improved |
| `constants/deliveryState.ts` re-exports domain | Confirmed |
| PageHeader uses `subtitle` (not `description`) | Confirmed in 9 screens |
| `role="tabpanel"` on engagement hub tabs | Confirmed on 8 tab panels |
| Build passes | Confirmed |
| Test count 77 / 27 files | Confirmed |

**Regressions or unresolved debt introduced or left visible:**

| ID | Finding | Severity |
|----|---------|----------|
| R-D4-01 | Catalog repository **contracts** still import application DTOs (`ModuleRegistryRepository`, `KnowledgeRepository`, `PlaybookRepository`) | Medium |
| R-D4-02 | Catalog Firestore repos import application seed catalogs | Medium |
| R-D4-03 | Audit trail incomplete for 3 workflow mutation paths | Medium |
| R-D4-04 | “E2E” label overstates test scope; no Firestore workflow integration in default test run | Medium |
| R-D4-05 | `types/presentation.ts` re-exports from application (facade pattern — screens protected, but types layer depends on application) | Low |
| R-D4-06 | `EngagementWorkflowFirestoreRepository.listByCompany` parses engagement ID via `doc.id.split("__")` — fragile if IDs contain `__` | Low |
| R-D4-07 | No automated test proves Firestore workflow/catalog repos against emulator (unlike delivery stack integration test) | Medium |

No catastrophic regression (memory store in production path, screens importing Firestore, etc.) was found.

---

## D4 Report Claim Cross-Check

| D4 Report Claim | Independent Result |
|-----------------|-------------------|
| Memory store removed | **Confirmed** |
| Business logic in aggregate | **Confirmed** |
| Application service orchestration-only | **Partial** (3 methods skip audit pattern) |
| Firestore replaces memory persistence | **Confirmed** for production wiring |
| Append-only audit ADR-014 compliant | **Partial** (audit collection only) |
| Company-scoped catalog repos | **Confirmed** |
| Import boundaries extended | **Confirmed** |
| 8 AOS Firestore rule blocks | **Confirmed** |
| E2E-01–05 complete founder journey | **Not confirmed** |
| `npm run build` PASS | **Confirmed** (July 21, 2026 run) |
| All Critical/High D3 items resolved | **Mostly confirmed** with E2E and ADR-014 caveats |

---

## Hidden Technical Debt Register (Post-D4)

1. **Mislabeled E2E suite** — rename or extend to Firestore emulator + full workflow path.
2. **Partial audit coverage** — align all mutation paths with `persistCommand` or document intentional exclusions.
3. **Catalog contract inversion** — move DTOs to contracts/domain read models; keep seeds in domain or infrastructure seed modules.
4. **ADR-004/005/006/007 still partial** — workflow document mutates entities in place; no immutable version chains.
5. **Shallow security verification** — add emulator-based negative tenant tests for all 8 collections.
6. **Workflow Firestore integration tests missing** — mirror `deliveryStack.integration.test.ts` for workflow + audit + catalog.

---

## Final Verdict

| Category | Verdict |
|----------|---------|
| Structural D4 goals (domain, Firestore, remove memory store) | **Achieved** |
| Production hardening completeness | **Partial** |
| D4 report accuracy | **Overstated on E2E and ADR-014 compliance** |

**Recommendation:** Accept Stage D4 as a **valid architecture milestone** for controlled pilot. Do **not** treat E2E-01–05 or ADR-014 “Compliant” as production sign-off without the follow-up items above.

**STOP.** Verification complete. No Phase E work performed.
