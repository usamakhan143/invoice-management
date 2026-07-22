# F2 — Persistence and Extraction Report

**Sprint:** F2  
**Date:** July 22, 2026  
**Status:** COMPLETE  
**Prerequisite:** F1 ACCEPTED AND CLOSED  
**Next sprint:** F3 — pending explicit authorization

---

## 1. Executive Summary

F2 makes the Learning Engine operational from **approved retrospective → extraction run → persisted learning candidates → pending human review**. Implemented Firestore repositories for three learning collections, `LearningExtractionApplicationService`, post-commit retrospective trigger, application-layer PII sanitization, learning audit events, security rules, indexes, and emulator-backed integration tests.

No promotion pipelines, UI, real AI, or KIL work was started.

**Verdict: GO for F3**

---

## 2. Folder Tree

```
aos/application/learning/
├── LearningExtractionApplicationService.ts
├── createLearningExtractionApplicationService.ts
├── learningAuditHelpers.ts
├── sanitizePromotableText.ts
└── sanitizePromotableText.test.ts

aos/infrastructure/firestore/
├── models/learningDocument.ts
├── repositories/
│   ├── LearningCandidateFirestoreRepository.ts
│   ├── LearningExtractionRunFirestoreRepository.ts
│   └── LearningPromotionFirestoreRepository.ts
└── wiring/createAosLearningRepositories.ts

aos/config/learningEngineConfig.ts

aos/infrastructure/integration/
└── learningExtraction.integration.test.ts
```

---

## 3. Files Created

| Path |
|------|
| `aos/application/learning/LearningExtractionApplicationService.ts` |
| `aos/application/learning/createLearningExtractionApplicationService.ts` |
| `aos/application/learning/learningAuditHelpers.ts` |
| `aos/application/learning/sanitizePromotableText.ts` |
| `aos/application/learning/sanitizePromotableText.test.ts` |
| `aos/infrastructure/firestore/models/learningDocument.ts` |
| `aos/infrastructure/firestore/repositories/LearningExtractionRunFirestoreRepository.ts` |
| `aos/infrastructure/firestore/repositories/LearningCandidateFirestoreRepository.ts` |
| `aos/infrastructure/firestore/repositories/LearningPromotionFirestoreRepository.ts` |
| `aos/infrastructure/firestore/wiring/createAosLearningRepositories.ts` |
| `aos/config/learningEngineConfig.ts` |
| `aos/infrastructure/integration/learningExtraction.integration.test.ts` |

---

## 4. Files Modified

| Path | Change |
|------|--------|
| `aos/infrastructure/firestore/collections.ts` | Added 3 learning collections |
| `aos/config/featureFlags.ts` | Added `LEARNING_ENGINE` flag (default false) |
| `aos/application/workflow/EngagementWorkflowApplicationService.ts` | Post-commit `onRetrospectiveApproved` hook |
| `aos/application/workflow/createEngagementWorkflowApplicationService.ts` | Pass hook through factory |
| `aos/wiring/createAosPresentationServices.ts` | Wire learning extraction when flag enabled |
| `aos/infrastructure/testing/emulatorHarness.ts` | Clear learning collections |
| `firestore.rules` | Learning collection security rules |
| `firestore.indexes.json` | Required query indexes |
| `scripts/verify-aos-firestore-security.ts` | Promotion append-only check |
| `aos/infrastructure/integration/firestoreSecurity.integration.test.ts` | Learning security tests |
| `docs/aos-phase-f/00_PHASE_F_INDEX.md` | Link to this report |

---

## 5. Firestore Collection Mapping

| Collection | Doc ID | Responsibility |
|------------|--------|----------------|
| `aosLearningExtractionRuns` | Deterministic `extractionRunId` | Run status, provenance snapshot, candidate IDs |
| `aosLearningCandidates` | Deterministic `candidateId` | Candidate lifecycle, gates, provenance |
| `aosLearningPromotions` | UUID `promotionId` | Append-only promotion history (F3 writes) |

---

## 6. Repository Implementations

- **LearningExtractionRunFirestoreRepository** — create (idempotent), update, getById, getByRetrospective
- **LearningCandidateFirestoreRepository** — upsert (fingerprint idempotent), updateStatus (LF-14 version check), list queries
- **LearningPromotionFirestoreRepository** — append-only, getByCandidateId

All operations company-scoped via `assertCompanyMatch`. No delete APIs.

---

## 7. Extraction Application Flow

```
approveRetrospective (persisted)
  → onRetrospectiveApproved (post-commit, void)
  → scheduleExtraction (feature flag gate)
  → runExtraction
      → load workflow + traceabilityRefs
      → build provenance
      → idempotent run create/start
      → sanitize retro lessons
      → deterministic candidates from lessons
      → optional AI port proposals
      → createLearningCandidate (domain)
      → upsert candidates
      → audit events
      → complete/partial/fail run
```

---

## 8. Retrospective Post-Commit Trigger

- Hook: `onRetrospectiveApproved` in `EngagementWorkflowApplicationService.approveRetrospective()`
- Fires only when status **changes** to `approved`
- Runs **after** `persistCommand` succeeds
- Uses `void` async — LF-04 safe
- Gated by `isLearningEngineEnabled()` (default false in production wiring)

---

## 9. Idempotency Strategy

| Key | Behavior |
|-----|----------|
| `extractionRunId` | `${companyId}_${engagementId}_${retrospectiveId}` — completed run no-op on retry |
| `candidateId` | Deterministic fingerprint — upsert returns existing if same fingerprint |
| Duplicate schedule | Running/completed guards prevent duplicate processing |

Proven in integration test D.

---

## 10. PII / Client-Fact Sanitization

- `sanitizePromotableText()` — redacts email/phone patterns to `[REDACTED_*]` tokens
- Applied to retrospective lesson text before candidate creation
- Domain G-003 still evaluates sanitized output
- Provenance IDs preserved unchanged (LF-01, LF-10)

---

## 11. AI Port Behavior

- Uses `NullLearningExtractionAiPort` by default
- AI proposals merged when port returns data; metadata mapped to `aiRecommendation`
- AI cannot approve/promote/write catalogs
- G-004 blocks AI candidates missing model metadata (integration test G)

---

## 12. Audit Behavior

Events appended to `aosAuditEvents` via `composeLearningAuditEvent()`:

- `aos_learning_extraction_started|completed|failed|retriggered`
- `aos_learning_candidate_created`
- `aos_learning_gate_evaluated`

No parallel audit system.

---

## 13. Firestore Security Rules

- Company-scoped read/write on all 3 collections
- Deletes denied
- Candidate: immutable `provenance`, `sourceFingerprint`, `candidateId` on update
- Extraction run: immutable `extractionRunId`, `retrospectiveId`, `idempotencyKey`
- Promotions: append-only (`update, delete: if false`)

---

## 14. Required Indexes

- `aosLearningCandidates`: `(companyId, status)`, `(companyId, engagementId)`, `(companyId, extractionRunId)`
- `aosLearningExtractionRuns`: `(companyId, status)`, `(companyId, retrospectiveId)`
- `aosLearningPromotions`: `(companyId, candidateId)`

---

## 15. Emulator Integration Coverage

| Test | Requirement |
|------|-------------|
| A | Run + candidates persist after retro approval |
| D | Idempotent duplicate extraction |
| E | Cross-company read rejected |
| F | Null AI deterministic path |
| G | Gate-blocked AI candidates excluded from review |
| H | Retro approval independent of extraction |
| I | Learning audit events appended |
| J | Optimistic version conflict |

Plus extended `firestoreSecurity.integration.test.ts` for learning collections.

---

## 16. LF-01 through LF-15 Updated Matrix

| ID | F2 Status |
|----|-----------|
| LF-01 | **PASS** |
| LF-02 | **PASS** (runtime + security tests) |
| LF-03 | **PASS** (idempotent integration) |
| LF-04 | **PASS** (post-commit hook) |
| LF-05 | **PASS** (domain unchanged; AI port propose-only) |
| LF-06 | **PASS** (no promotion in F2) |
| LF-07 | **DEFERRED TO F3** |
| LF-08 | **DEFERRED TO F3** |
| LF-09 | **PASS** (sanitization + G-003) |
| LF-10 | **PASS** |
| LF-11 | **DEFERRED TO F3** |
| LF-12 | **PASS** |
| LF-13 | **DEFERRED TO F3** |
| LF-14 | **PASS** (version conflict integration) |
| LF-15 | **PASS** |

---

## 17. Architecture Audit

| Check | Result |
|-------|--------|
| Domain owns business rules | PASS — gates/lifecycle in domain only |
| Application orchestrates | PASS |
| Infrastructure persists/maps | PASS |
| Presentation untouched | PASS |
| No Firestore in domain/application | PASS |
| No Learning UI | PASS |
| No promotion pipeline | PASS |
| No KIL | PASS |
| No real AI | PASS |
| Phase E unchanged | PASS |

---

## 18. Verification Command Results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run test:aos` | **129 passed** |
| `npm run aos:validate` | **PASS** |
| `npm run aos:import-boundaries` | **PASS** |
| `npm run aos:security` | **PASS** (16 collections) |
| `npm run test:aos:integration` | **54 passed** |

---

## 19. Defects Discovered and Fixes

| Defect | Fix |
|--------|-----|
| Race from async hook + manual extraction in tests | Tests disable hook unless explicitly testing it |
| Cross-company getById threw vs returned null | Repository throws `AOS_COMPANY_MISMATCH` — test expects throw (tenant isolation) |

---

## 20. Technical Debt Intentionally Deferred

- F3 promotion pipelines and catalog writes
- F4 learning review UI
- F5 real AI provider binding
- GK/GM/GP type-specific gates beyond universal G-001–G-005
- ERP ActivityLogger dual-write
- Manual extraction retrigger UI
- Hook-based async error surfacing to operators

---

## 21. Blockers for F3

| Item | Notes |
|------|-------|
| None architectural | Promotion record repo ready |
| Permission keys for approve | Reuse founder/delivery lead pattern |
| Catalog repo write methods | Need create/version extensions on knowledge/registry/playbook repos |

---

## 22. GO / NO-GO Recommendation for F3

| Decision | **GO** |
|----------|--------|
| Rationale | Extraction flywheel operational; persistence + idempotency + security proven; regression green |
| F3 scope | Promotion pipelines, catalog writes, promotion audit gate LF-07 |

---

## Strict Stop Confirmation

- F2 complete — no F3 code started
- No promotion pipelines
- No learning UI
- No real AI provider
- No KIL implementation

**Awaiting explicit authorization for F3.**
