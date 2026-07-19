# 08 — Infrastructure Audit

**Scope:** `aos/infrastructure/` — Firestore, adapters, memory, integration  
**Principle:** Infrastructure implements contracts; maps external data to domain; never contains business rules

---

## Component Inventory

| Category | Count | Location |
|----------|------:|----------|
| Firestore repositories | 3 | `firestore/repositories/` |
| Document converters | 3 | `firestore/models/` |
| ERP/BOS read adapters | 4 | `adapters/` |
| Memory store | 1 | `memory/EngagementWorkflowMemoryStore.ts` |
| Wiring factories | 2 | `firestore/wiring/`, `wiring/` |
| Firestore utilities | 6 | `firestore/*.ts` |
| Integration tests | 2 | `integration/` |
| Emulator harness | 1 | `testing/emulatorHarness.ts` |

---

## Firestore Repositories

### DeliveryEngagementFirestoreRepository

| Check | Status | Evidence |
|-------|--------|----------|
| Implements contract | **Yes** | `DeliveryEngagementRepository` |
| Company-scoped queries | **Yes** | `.where("companyId", "==", companyId)` on all list/find |
| Company mismatch guard | **Yes** | `assertCompanyMatch()` on save |
| Document converter | **Yes** | `deliveryEngagementDocument.ts` |
| Pagination support | **Yes** | cursor-based in list queries |
| Error mapping | **Yes** | `AosRepositoryError` with `AOS_COMPANY_MISMATCH` |
| Domain entity in/out | **Yes** | Returns `DeliveryEngagement`, not DTO |

**Same pattern** for `DeliveryTemplateFirestoreRepository` and `DeliveryQualityReportFirestoreRepository`.

---

## Document Converters

| Converter | Round-trip tested? | Validation |
|-----------|:------------------:|------------|
| `deliveryEngagementDocument.ts` | **Yes** | `runConverterChecks.ts` (7 checks pass) |
| `deliveryTemplateDocument.ts` | **Yes** | Same runner |
| `deliveryQualityReportDocument.ts` | **Yes** | Same runner |

Converter checks validate:

- Entity → document → entity fidelity
- Required field presence
- Timestamp handling
- State enum mapping

**No converter drift detected** — `npm run aos:validate` passes.

---

## Read Adapters (Sidecar Law)

| Adapter | Port | Company isolation |
|---------|------|-------------------|
| `CustomerReadAdapter` | `CustomerReadPort` | `companyScopedDocumentData()` |
| `LeadReadAdapter` | `LeadReadPort` | Company filter on queries |
| `UserReadAdapter` | `UserReadPort` | `resolveCompanyUser()` with company check |
| `InitiativeReadAdapter` | `InitiativeReadPort` | `companyScopedDocumentData()` |

```4:10:aos/infrastructure/adapters/companyScope.ts
/** Returns document data when docId belongs to companyId; otherwise null (not found). */
export function companyScopedDocumentData(
  data: FirebaseFirestore.DocumentData | undefined,
  companyId: CompanyId,
): ... {
  if (String(data.companyId ?? "") !== companyId) return null;
```

**Cross-company reads return null** (not found) rather than leaking data — correct security posture.

---

## Memory Store

### EngagementWorkflowMemoryStore

| Check | Status |
|-------|--------|
| Company-scoped keys | **Yes** — `${companyId}:${engagementId}` |
| `listByCompany()` prefix filter | **Yes** |
| Deep clone on read/write | **Yes** — `structuredClone()` |
| Implements store port | **Yes** |
| Depends on application DTOs | **Violation** — see Layer Boundary Audit LB-01 |
| Survives page refresh | **No** — in-memory Map |
| Thread-safe | N/A — single-threaded JS |

**Production blocker:** All workflow state lost on refresh.

---

## Dependency Direction

| From | To | Allowed? |
|------|-----|:--------:|
| Repositories | contracts, domain, firestore utils | **Yes** |
| Adapters | integration/ports, companyScope | **Yes** |
| Memory store | application DTOs | **No** |
| Wiring | repositories + adapters | **Yes** |
| Infrastructure | presentation | **No** — verified clean |

---

## Firestore Collection Mapping

Collections defined in `firestore/collections.ts` — AOS-owned collections separated from ERP read collections used in adapters.

| Collection type | Write access | Read access |
|-----------------|:------------:|:-----------:|
| Delivery engagements | AOS repos | AOS repos |
| Delivery templates | AOS repos | AOS repos |
| Quality reports | AOS repos | AOS repos |
| ERP customers/leads | **None** | Adapters read-only |
| BOS initiatives | **None** | Adapters read-only |

**No Firestore writes outside AOS delivery collections** — sidecar law compliant.

---

## Integration Test Infrastructure

| Test | Scope | Runs in CI? |
|------|-------|:-----------:|
| `deliveryStack.integration.test.ts` | Full delivery stack with emulator | **Excluded** from `test:aos` |
| `deliveryStack.verification.test.ts` | Verification checks | Included |
| `emulatorHarness.ts` | Test fixture seeding | Test-only |

Integration test exclusion means **full Firestore round-trips are not CI-gated** on every `test:aos` run.

---

## Missing Infrastructure

| Component | Frozen requirement | Status |
|-----------|-------------------|--------|
| Workflow Firestore repository | Yes | **Missing** |
| Registry repository | Yes | **Missing** |
| Knowledge repository | Yes | **Missing** |
| Playbook repository | Yes | **Missing** |
| Audit/event store | ADR-014 | **Missing** |
| AI orchestration adapter | Architecture docs | **Missing** |
| Cursor integration adapter | ADR-006 | **Missing** |

---

## Infrastructure Score

| Criterion | Score |
|-----------|------:|
| Delivery repo quality | **9/10** |
| Converter correctness | **9/10** |
| Adapter isolation | **9/10** |
| Dependency direction | **6/10** (memory store) |
| Coverage of frozen model | **3/10** |
| Integration test CI gating | **5/10** |

---

## Verdict

Infrastructure for the **delivery vertical slice is production-quality** — company-scoped repos, validated converters, and read-only ERP adapters follow enterprise patterns. **80% of required infrastructure is absent** (workflow, registry, knowledge, playbook, audit). Memory store dependency inversion must be corrected during repository implementation.
