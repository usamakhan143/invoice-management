# Stage D4.7 — Final Runtime Verification Report

**Date:** July 21, 2026  
**Scope:** Resume D4.7 — Firebase Emulator integration execution and gap closure only  
**Stage D4 exit status:** **CLOSED**

---

## 1. Environment Verification

| Check | Result |
|-------|--------|
| **Java version (shell)** | **openjdk 21.0.11 LTS** (Eclipse Temurin-21.0.11+10) |
| **JAVA_HOME used for emulator runs** | `C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot` |
| **Prior blocker (JDK 11)** | Resolved — Firebase CLI 15.x emulators start successfully on JDK 21 |
| **Firebase CLI** | 15.13.0 |
| **Emulator ports** | Firestore 8080, Auth 9099 |

**Note:** System-wide `JAVA_HOME` may still point to JDK 11. Integration runs require JDK 21 on `PATH`/`JAVA_HOME` as documented above.

---

## 2. Firebase Emulator Execution Result

| Command | Executed | Result |
|---------|:--------:|--------|
| `npm run test:aos:integration` | **Yes** | **PASS** — 5 files, **32 tests** |

Emulator command:

```bash
firebase emulators:exec --only firestore,auth "vitest run aos/infrastructure/integration/ --pool=forks --fileParallelism=false --sequence.concurrent=false"
```

---

## 3. Integration Suites Executed

| File | Tests | Emulator-backed | Result |
|------|------:|:---------------:|--------|
| `deliveryStack.integration.test.ts` | 11 | Yes | **PASS** |
| `deliveryStack.verification.test.ts` | 11 | No (converter/domain) | **PASS** |
| `firestoreSecurity.integration.test.ts` | 8 | Yes (rules-unit-testing) | **PASS** |
| `founderJourney.integration.test.ts` | 1 | Yes | **PASS** |
| `workflowStack.integration.test.ts` | 1 | Yes | **PASS** |
| **Total** | **32** | | **32 PASS / 0 FAIL** |

---

## 4. Workflow Persistence Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Create/mutate workflow through application service | **PASS** | `workflowStack.integration.test.ts` |
| Persist to Firestore | **PASS** | Real writes via authenticated client + rules |
| Reload from Firestore | **PASS** | New repository instances after full path |
| State survives service reconstruction | **PASS** | `reloadedService.getWorkflow` assertions |
| Audit events persist with mutations | **PASS** | Timeline includes `requirements.draft_updated`, `reuse.module_decision`, `qa.checklist_updated` |
| Converter round-trip | **PASS** | `deliveryStack.verification.test.ts` + integration reload |

---

## 5. Founder Journey Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Real `DeliveryApplicationService` | **PASS** | `founderJourney.integration.test.ts` |
| Real `EngagementWorkflowApplicationService` | **PASS** | Same suite |
| Firestore delivery + workflow repositories | **PASS** | Injected `harness.db` — no in-memory substitutes |
| Lifecycle advancement wired | **PASS** | `advanceEngagementLifecycle` callback to delivery service |
| Full path requirements → retrospective | **PASS** | Single integration test green |
| In-memory smoke test (`founderJourney.e2e.test.ts`) | N/A | Not used as integration proof |

---

## 6. Tenant / Company Isolation Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Company A cannot read Company B workflow docs | **PASS** | `firestoreSecurity.integration.test.ts` |
| Company A cannot write Company B workflow docs | **PASS** | Same suite |
| Cross-company audit read blocked | **PASS** | Same suite |
| Catalog tenant isolation (module registry) | **PASS** | Same suite |
| Repository `findById` company enforcement | **PASS** | `deliveryStack.integration.test.ts` |
| Read adapters hide foreign tenant data | **PASS** | `customerExists` / `getCustomerSummary` return false/null for foreign company |

---

## 7. Audit Immutability Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Audit events created via legitimate client flow | **PASS** | Workflow integration + security rules create test |
| Existing audit events cannot be updated | **PASS** | `firestoreSecurity.integration.test.ts` — update rejected |
| Existing audit events cannot be deleted | **PASS** | Same — delete rejected |
| Firestore rules enforce append-only | **PASS** | Runtime emulator rules evaluation |

---

## 8. Workflow Audit Coverage Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| All workflow mutations emit audit events | **PASS** | Unit tests (D4.6) + integration timeline assertions |
| Audit persisted to `aosAuditEvents` | **PASS** | `workflowStack.integration.test.ts` reload path |
| Mutations use `persistCommand` | **PASS** | Application service (D4.6 gap closure) |

---

## 9. Failures Discovered During D4.7 Resume

| # | Symptom | Classification |
|---|---------|----------------|
| 1 | Firebase CLI refused Java 11 | **Environment** |
| 2 | `INTERNAL ASSERTION FAILED: Expected a class definition` on compat auth in Vitest Node | **Test environment** |
| 3 | `auth/invalid-api-key` in emulator harness | **Test configuration** |
| 4 | Security rules blocked unscoped collection list/delete in test cleanup | **Test infrastructure** |
| 5 | `resource.data` null on GET blocked `getOrCreate` | **Security rules** |
| 6 | Parallel integration files raced on shared emulator | **Test configuration** |
| 7 | Undefined nested fields rejected by Firestore on workflow save | **Application/converter** |
| 8 | Founder journey lifecycle event from DRAFT | **Integration test correctness** |
| 9 | Wrong `getEngagement` call signature in test | **Integration test correctness** |
| 10 | `defaultFirestore.ts` (`node:module`) broke Vite production build | **Application/infrastructure** |
| 11 | `createAosPresentationServices.test.ts` loaded real Firebase after composition change | **Unit test** |

---

## 10. Root Causes and Fixes Applied

| Fix | Files / area | Purpose |
|-----|--------------|---------|
| Point `JAVA_HOME` to Temurin JDK 21 for emulator runs | Shell env | Unblock Firebase emulators |
| Modular auth in emulator harness (`getAuth` + emulator config with fake apiKey) | `aos/infrastructure/testing/emulatorHarness.ts` | Node-safe auth sign-in for client Firestore |
| Admin SDK for integration seed/cleanup | `emulatorHarness.ts` | Bypass rules for test teardown and cross-tenant fixtures |
| `aosCompanyGetOk()` — allow GET when `resource == null` | `firestore.rules` | Support legitimate `getOrCreate` without weakening tenant checks on existing docs |
| Sequential integration execution | `package.json` `test:aos:integration` | Prevent cross-file emulator races |
| `deepOmitUndefinedFields` for workflow documents | `documentPayload.ts`, `engagementWorkflowDocument.ts` | Firestore rejects nested `undefined` |
| Required explicit `firestore` in wiring factories; `db` injected at presentation root only | Wiring + `createAosPresentationServices.ts` | Avoid pulling compat auth into integration imports; keep Vite build clean |
| Timestamp via compat firestore helper (not `services/firebase`) | Delivery Firestore repositories | Decouple repositories from app firebase module |
| Founder journey: intake/discovery lifecycle + correct `getEngagement` query object | `founderJourney.integration.test.ts` | Match delivery state machine and API |
| Delivery integration: expect `DELIVERY_NOT_FOUND` for missing engagement update | `deliveryStack.integration.test.ts` | Match application-layer behavior |
| Mock `services/firebase` in presentation wiring unit test | `createAosPresentationServices.test.ts` | Keep unit suite Node-safe |

**No assertions were weakened. Emulator validation was not bypassed for application behavior tests.**

---

## 11. Full Regression Results (Final)

| Command | Result | Detail |
|---------|--------|--------|
| `java -version` | **PASS** | OpenJDK 21.0.11 (Temurin) |
| `npm run build` | **PASS** | Vite production build |
| `npm run test:aos` | **PASS** | 26 files, **67 tests** |
| `npm run aos:validate` | **PASS** | 7 converter checks |
| `npm run aos:import-boundaries` | **PASS** | Layer boundaries |
| `npm run aos:security` | **PASS** | 8 AOS collections (structural) |
| `npm run test:aos:integration` | **PASS** | 5 files, **32 tests** |

---

## 12. ADR-014 Honest Compliance Status

| Item | Status | Notes |
|------|--------|-------|
| **A. Append-only audit collection** | **PASS (runtime)** | Rules block update/delete; emulator security tests pass |
| **B. All implemented workflow mutations audited** | **PASS** | Unit + integration timeline coverage |
| **C. Audit update/delete prevented by Firestore rules** | **PASS (runtime)** | `firestoreSecurity.integration.test.ts` |
| **D. Immutable version chains (ADR-004 / ADR-005 / ADR-006 / ADR-007)** | **DEFERRED — PHASE E** | Not claimed complete; version-chain immutability remains Phase E |

---

## 13. Remaining Deferred Work

- **Phase E:** Immutable requirement/prompt/evaluation version chains (ADR-004/005/006/007)
- **Ops:** Set system `JAVA_HOME` to JDK 21 permanently on developer/CI machines running emulator integration
- **BOS integration tests:** Same compat-auth-in-Node issue affects `test:bos:integration` (out of D4 scope; not required for Stage D4 close)

---

## 14. Final Stage D4 Production-Hardening Verdict

| Criterion | Met? |
|-----------|:----:|
| JDK 21+ emulator execution | **YES** |
| Integration suite executed (not skipped) | **YES** |
| Workflow persistence verified | **YES** |
| Founder journey integration verified | **YES** |
| Tenant isolation verified (runtime) | **YES** |
| Audit immutability verified (runtime) | **YES** |
| Workflow audit coverage verified | **YES** |
| Build + unit + architecture checks green | **YES** |

### **Stage D4 status: CLOSED**

Runtime verification gate satisfied. Phase E not started.

---

## STOP

Verification complete. No Phase E implementation. Changes limited to D4.7 gap closure required for emulator-backed verification.
