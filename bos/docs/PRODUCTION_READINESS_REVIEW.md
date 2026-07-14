# BOS Vertical Slice — Production Readiness Review

**Date:** 2026-06-10  
**Scope:** Smallest end-to-end production workflow (Venture → Initiative → Decision → Expense attribution → Investment summary → Close → Decision history)  
**Verdict:** **Slice complete. Architecture remains frozen. Phase 1B may proceed after deploy verification.**

---

## What Was Delivered

| Step | Implementation |
|------|----------------|
| 1. Create BosVenture | `/bos/ventures` — `BosVenturesPage` → `BosVentureApplicationService` → `bosVentures` |
| 2. Create BosInitiative | `/bos/initiatives` — `BosInitiativesPage` → `BosInitiativeApplicationService` → `bosInitiatives` |
| 3. Create BosDecision | Initiative detail — `BosDecisionApplicationService` → `bosDecisions` |
| 4. Attribute one ERP expense | Sidecar `bosAttributions`; ERP expenses read-only via `FirestoreErpExpenseReadAdapter` |
| 5. Investment summary | `BosAttributionApplicationService.getInitiativeInvestmentSummary()` on detail page |
| 6. Close initiative | Status transition + closure fields; lesson required when invested > 0 and outcome ≠ killed |
| 7. Decision history | Same detail page lists decisions by initiative |

**Navigation:** Sidebar **Strategy** group (Initiatives, Ventures). Routes wired in `App.tsx`.  
**Permissions:** Granular `BOS_*` keys; owners inherit all; team members via Role Management.  
**Explicitly not built:** Funnel, campaigns, KPI engine, offers, channels, experiments, dashboard, reports, delivery, Meta/GHL.

---

## What Worked Well

1. **Layered architecture held under real UI load.** React pages call application services only; repositories enforce domain rules; Firestore converters stay isolated. No ERP mutation paths appeared during the slice.

2. **Sidecar attribution law is enforceable in practice.** Expense attribution writes only to `bosAttributions`. Investment totals are computed at read time from sidecar + ERP read adapter. `ExpensesPage` was not touched.

3. **Initiative detail as workflow hub.** A single page covers activate → decide → attribute → summarize → close → history without needing dashboard, reports, or separate attribution/decision routes.

4. **Permissions integrate cleanly with existing ERP patterns.** `PERMISSION_CATEGORIES.BOS`, granular keys, `usePermissions` helpers, and sidebar gating mirror Finance/Leads conventions. Owners work out of the box.

5. **Domain guards compose predictably.** Initiative must be active/paused before attribution; duplicate active attribution per expense is blocked; close requires lesson when money was spent (unless killed). Errors surface as user-readable messages in the UI.

6. **Build and converter validation pass.** `npm run build` and `npm run bos:validate` succeed after wiring.

---

## What Was Difficult

1. **Attribution was the missing persistence piece.** Venture, initiative, and decision repos existed from Sprint 2; `bosAttributions` collection, repository, rules, and indexes had to be added for the slice to be real—not stubbed.

2. **ERP expense discovery across tenancy models.** Companies may store expenses under `companyId` or legacy `userId`. `listExpensesForCompany()` queries both and deduplicates—necessary for real expense pickers, not demo data.

3. **Firestore rules + indexes are a deploy gate.** Attribution queries (`initiativeId` + `status`, `sourceId` + `status`) require composite indexes and the new rules block. **Production Firebase must deploy `firestore.rules` and `firestore.indexes.json` before attribution works live.**

4. **Integration tests blocked locally.** Firebase emulator tests require JDK 21+; Vitest loads the integration suite and fails without emulator (`INTERNAL ASSERTION FAILED` from Auth compat). Unit domain tests pass; emulator coverage remains a CI/local JDK fix.

5. **Minor infrastructure drift.** `pagination.ts` had a wrong import (`../errors` vs `./errors`) that only surfaced at Vite build time—converter checks did not catch it.

6. **React reload ergonomics.** Initiative detail `loadAll` dependencies needed care to avoid refetch loops when expense selection changed.

---

## Architectural Assumptions Validated

| Assumption | Evidence |
|------------|----------|
| Four core entities (Venture, Initiative, Decision, Attribution) suffice for a complete strategic loop | Full workflow completed without new entity types |
| Sidecar pattern isolates BOS from ERP | Expenses read-only; attributions in separate collection; investment computed externally |
| Application services are the correct UI boundary | Pages never import Firestore or repositories directly |
| Initiative lifecycle gates attribution | Draft initiatives cannot attribute; active/paused can |
| Decision log attaches to initiative context | FK validation + list-by-initiative works in UI |
| Company scoping via `resolveCompanyIdForUser` | `useBosScope` provides consistent read/actor scope |
| Frozen architecture supports incremental vertical slices | Slice added attribution repo + UI without redesign |

---

## Assumptions That Failed or Need Refinement

| Assumption | Reality |
|------------|---------|
| Sprint 3 attribution service was “complete” | Repository and Firestore persistence were still required for production |
| Integration tests run in default `npm test` | Emulator suite fails in plain Vitest; should be gated (`test:integration` only) or skipped without `FIRESTORE_EMULATOR_HOST` |
| Investment summary needs KPI engine | **Not required** for slice—simple sum over active attributions + ERP titles is sufficient |
| Separate BOS dashboard needed for validation | **Not required**—initiative detail page is enough for Phase 1A proof |
| Converter checks catch all import issues | Vite/Rollup still needed for path resolution validation |

None of these failures require architecture redesign— they are implementation and tooling gaps.

---

## Production Checklist Before Live Use

- [ ] Deploy `firestore.rules` (includes `bosAttributions`)
- [ ] Deploy `firestore.indexes.json` (two `bosAttributions` composite indexes)
- [ ] Confirm company has at least one expense in Finance → Expenses
- [ ] For non-owner users: assign BOS permissions in Role Management (Strategy category)
- [ ] Walk through: Venture → Initiative → **Activate** → Decision → Attribute expense → Verify summary → Close with lesson → Verify history

---

## Should the Architecture Remain Frozen?

**Yes.**

The vertical slice proves the frozen model works end-to-end:

- No new entities were needed beyond the already-defined Attribution sidecar.
- No ERP schema changes were required.
- No dashboard, KPI engine, or funnel modules were needed to validate strategic accountability.
- The hardest part was wiring missing attribution persistence and deploy artifacts—not rethinking the domain.

**Recommendation:** Keep architecture frozen. Begin **Phase 1B** only after:

1. One successful live Firebase walkthrough post-rules/index deploy, and  
2. Gating or fixing emulator integration tests in CI.

Phase 1B can expand surface area (attribution management UI, portfolio views, richer investment analytics) **without** changing the core Venture → Initiative → Decision → Attribution model validated here.

---

## Files Touched (Vertical Slice)

**UI:** `pages/app/bos/*`, `hooks/useBosScope.ts`, `utils/bosFormat.ts`, `App.tsx`, `components/Sidebar.tsx`  
**Application:** `BosAttributionApplicationService.ts`, ERP read port/adapter extensions  
**Infrastructure:** `FirestoreBosAttributionRepository`, attribution document model, `pagination.ts` fix  
**Security:** `firestore.rules`, `firestore.indexes.json`, `config/permissions.ts`, `hooks/usePermissions.tsx`  
**Not modified:** `ExpensesPage.tsx`, ERP write paths, funnel/campaign/KPI modules
