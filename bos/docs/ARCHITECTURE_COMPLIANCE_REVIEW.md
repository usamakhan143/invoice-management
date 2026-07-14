# Sprint 3 — Architecture Compliance Review

Review date: Sprint 3 integration layer. Frozen architecture v1.0 (docs 06, 07, 10, 11, 12, 20).

## Compliance Matrix

| Requirement | Source | Status | Notes |
|-------------|--------|--------|-------|
| Sidecar law — no BOS fields on ERP | Doc 06, R-001 | **PASS** | Bridge adapters are read-only; `assertAttributionSidecarLaw` enforced |
| Collection naming `bosVentures` etc. | Doc 10 | **PASS** | Not CRM `businesses` |
| Domain lifecycles Doc 11 | Doc 11 | **PASS** | FSM in `domain/lifecycle/*`; strengthened with status guards |
| Repository validates before persist | Doc 06 | **PASS** | create/update/status/close paths validated |
| No physical delete | Doc 11 | **PASS** | Rules `allow delete: if false` |
| Application layer between UI and repos | Philosophy | **PASS** | `bos/application/*` added |
| ERP modules unaware of BOS | Doc 20 | **PASS** | No ERP page/service imports of BOS |
| `resolveCompanyIdForUser` tenancy | R-014 | **PASS** | Documented; enforced at service scope contract |
| Feature flags default integration off | Doc 20 | **PASS** | Phase 1B flags false |
| Firestore rules tenancy | D-002 | **ACCEPTED** | Granular `bos_*` in app layer only |
| `bosAttributions` repo + rules | Phase 1B | **DEFERRED** | Contract + skeleton service only |
| ERP permission wiring | Doc 12 | **DEFERRED** | Intentionally not Sprint 3 |
| UI shell | Doc 20 Sprint 3 (original) | **NOT STARTED** | Per user directive — integration first |

## Violations Found & Resolved

| Issue | Severity | Resolution |
|-------|----------|------------|
| Update paths allowed empty names | Medium | Added `validateUpdate*` rules + repo calls |
| Decision create lacked FK checks | Medium | Repo validates venture/initiative links |
| Unknown status strings at runtime | Medium | `statusGuards.ts` + repo parsing |
| Initiative close lesson rule not wired | Medium | `lessonLearned` on input; validation uses it |
| Budget amount/currency mismatch | Low | `validateBudgetPair` on create/update |
| No automated Firestore tests | High | Emulator integration suite added |

## Remaining Gaps (Not Violations)

1. **`bosAttributions` Firestore implementation** — Phase 1B
2. **Attribution duplicate guard (R-009)** — requires attribution repo
3. **Backup export v6** — database migration service
4. **Subscribe/realtime on application services** — future UI sprint
5. **Application → infrastructure import** — composition root uses default singletons; DI factory optional later

## Conclusion

Sprint 3 strengthens the foundation without exposing BOS to users. Repository layer is architecture-compliant. Proceed to UI only after explicit approval and permission wiring.
