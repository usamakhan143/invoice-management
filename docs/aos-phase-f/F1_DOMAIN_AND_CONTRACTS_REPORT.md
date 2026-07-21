# F1 — Learning Engine Domain + Contracts Report

**Sprint:** F1  
**Date:** July 21, 2026  
**Status:** COMPLETE  
**Next sprint:** F2 — pending explicit authorization

---

## 1. Executive Summary

F1 delivers the complete persistence-agnostic Learning Engine domain foundation and contracts layer required for F2–F5. Implemented entities, value objects, lifecycle rules, deterministic quality gates G-001 through G-005, promotion eligibility guards, amendment/supersession semantics, repository interfaces, AI extraction port + null adapter, and extended audit event types.

No Firestore, extraction orchestration, promotion writes, UI, or real AI providers were added.

**Verdict: GO for F2**

---

## 2. Folder Tree

```
aos/domain/learning/
├── errors.ts
├── learningResult.ts
├── index.ts
├── learningEngine.domain.test.ts
├── entities/
│   ├── learningCandidate.ts
│   ├── learningExtractionRun.ts
│   └── learningPromotionRecord.ts
├── valueObjects/
│   ├── confidenceSnapshot.ts
│   ├── gateResult.ts
│   ├── learningIdentifiers.ts
│   ├── learningProvenance.ts
│   ├── learningSourceRef.ts
│   ├── promotionTargetRef.ts
│   └── proposedContent.ts
└── rules/
    ├── learningAmendmentRules.ts
    ├── learningApprovalRules.ts
    ├── learningCandidateLifecycleRules.ts
    ├── learningCandidateRules.ts
    ├── learningExtractionRunLifecycleRules.ts
    ├── learningGateRules.ts
    ├── learningPromotionRecordRules.ts
    └── promotionEligibilityRules.ts

aos/contracts/learning/
├── LearningRepositories.ts
├── LearningExtractionAiPort.ts
├── NullLearningExtractionAiPort.ts
└── index.ts
```

---

## 3. Files Created

| Path |
|------|
| `aos/domain/learning/errors.ts` |
| `aos/domain/learning/learningResult.ts` |
| `aos/domain/learning/index.ts` |
| `aos/domain/learning/learningEngine.domain.test.ts` |
| `aos/domain/learning/entities/learningCandidate.ts` |
| `aos/domain/learning/entities/learningExtractionRun.ts` |
| `aos/domain/learning/entities/learningPromotionRecord.ts` |
| `aos/domain/learning/valueObjects/*.ts` (7 files) |
| `aos/domain/learning/rules/*.ts` (8 files) |
| `aos/contracts/learning/LearningRepositories.ts` |
| `aos/contracts/learning/LearningExtractionAiPort.ts` |
| `aos/contracts/learning/NullLearningExtractionAiPort.ts` |
| `aos/contracts/learning/index.ts` |

---

## 4. Files Modified

| Path | Change |
|------|--------|
| `aos/domain/audit/entities/auditEvent.ts` | Added `LearningAuditEventType`, `WorkflowAuditEventType`, `AuditEventType` union |
| `aos/contracts/index.ts` | Re-export learning contracts |

---

## 5. LearningCandidate Implementation

- Five frozen candidate types: `knowledge_pattern`, `module`, `prompt_improvement`, `playbook_improvement`, `evaluation_insight`
- All required + optional fields from planning doc 02
- Optimistic `version` field for LF-14
- Terminal status guards
- `createLearningCandidate()` validates provenance, runs universal gates, assigns deterministic ID

---

## 6. LearningProvenance Implementation

- Immutable value object with Phase E refs: requirementVersionId, promptVersionId, cursorSessionId, evaluationId, retrospectiveId
- Optional: rubricVersionId, cursorRevisionIds, sourceAuditEventIds, reuseAssessmentSnapshotId
- `buildLearningProvenanceFromTraceability()` copies DeliveryTraceabilityRefs without inventing IDs
- `validateLearningProvenanceContext()` rejects cross-company metadata (LF-02 domain boundary)

---

## 7. Confidence Model

- Separate fields: `aiConfidence`, `evidenceConfidence`, `organizationalConfidence`, `promotionEligible`
- `computeEvidenceConfidence()` deterministic rules
- `buildConfidenceSnapshot()` — AI confidence ≥ 0.9 with insufficient evidence never sets `promotionEligible: true`

---

## 8. Candidate Lifecycle

States: `extracted`, `gate_blocked`, `gate_deferred`, `pending_review`, `approved`, `rejected`, `promoted`, `promotion_failed`, `superseded`

Legal/illegal transitions enforced in `learningCandidateLifecycleRules.ts`. Gate outcomes map directly to initial status on create.

---

## 9. Human Approval Rules

- `approveCandidate`, `rejectCandidate`, `deferCandidate`, `supersedeCandidate`
- Human actor required (`assertHumanGovernedActor`)
- AI actor explicitly rejected (`rejectAiApprovalAttempt`, `rejectAiPromotionAttempt`)
- Version conflict detection on all governed commands

---

## 10. Amendment / Supersession

- `createAmendmentCandidate()` supersede original + create new with `amendmentOfCandidateId`
- Original proposal never mutated
- `assertAmendmentProvenancePreserved()` validates immutable provenance copy

---

## 11. Extraction Run Lifecycle

States: `pending`, `running`, `completed`, `partial`, `failed`

`createLearningExtractionRun()` with deterministic `extractionRunId`. Legal transitions enforced. Provenance snapshot validation helper included.

---

## 12. Deterministic ID / Fingerprint Strategy

**Decision:** Pure djb2 hash in domain layer — no crypto dependency, architecture-safe.

```
extractionRunId = `${companyId}_${engagementId}_${retrospectiveId}`
sourceFingerprint = djb2(`${candidateType}|${normalizedTitle}|${promotionTargetKind}`)
candidateId = `${extractionRunId}_${candidateType}_${sourceFingerprint}`
```

Documented in `learningIdentifiers.ts`. Application may use stronger hashing only if equivalence preserved.

---

## 13. G-001 through G-005 Implementation

| Gate | Implementation |
|------|----------------|
| G-001 | Retrospective approved + ID match |
| G-002 | ≥1 grounded artifact ID in provenance |
| G-003 | Deterministic email/phone regex (domain policy; full PII scan deferred to application) |
| G-004 | AI metadata required when aiRecommendation present |
| G-005 | Candidate type enum validation |

`evaluateUniversalGates()` returns typed `GateResult` with `mayEnterPendingReview`.

---

## 14. Promotion Eligibility

- `assertPromotionEligible()` — requires approved status, human approval metadata, gate pass, confidence policy
- `assertNonDestructivePromotionStrategy()` — LF-08 version strategy validation
- `assertDuplicatePromotionGuard()` — LF-11 domain guard

---

## 15. LearningPromotionRecord

- Immutable record model with `LearningSourceRef` backward trace
- Optional `KilHandoffRef` structural metadata (not implemented)
- `createLearningPromotionRecord()` deep-freezes via `freezePublishedRecord`

---

## 16. Repository Contracts

- `LearningCandidateRepository` — upsert, status update, list by engagement/status/run
- `LearningExtractionRunRepository` — create, update, get by retrospective
- `LearningPromotionRepository` — append, get by candidateId
- All company-scoped; Symbol DI tokens exported

---

## 17. AI Port + Null Adapter

- `LearningExtractionAiPort.proposeCandidates()` — proposals only
- `NullLearningExtractionAiPort` — returns empty proposals deterministically
- No provider SDK imports

---

## 18. Audit Event Types

Extended `auditEvent.ts` with 13 frozen learning event types:

`aos_learning_extraction_started|completed|failed|retriggered`, `aos_learning_candidate_created`, `aos_learning_gate_evaluated`, `aos_learning_candidate_approved|rejected|deferred|superseded`, `aos_learning_candidate_promoted`, `aos_learning_promotion_failed|rollback`

---

## 19. LF Invariant Compliance Matrix

| ID | F1 Status | Evidence |
|----|-----------|----------|
| LF-01 | **PASS** | Provenance required on create; tests |
| LF-02 | **PASS (domain boundary)** | validateLearningProvenanceContext; F2 security deferred |
| LF-03 | **PASS** | Deterministic ID tests |
| LF-04 | **DEFERRED TO F2** | Post-commit extraction orchestration |
| LF-05 | **PASS** | AI actor rejection tests |
| LF-06 | **PASS** | assertPromotionEligible requires approval |
| LF-07 | **DEFERRED TO F3** | Audit-transaction coupling |
| LF-08 | **PASS (domain model)** | Non-destructive strategy guard; F3 write deferred |
| LF-09 | **PASS (domain policy)** | G-003 gate; application sanitization deferred |
| LF-10 | **PASS (contract)** | buildLearningProvenanceFromTraceability |
| LF-11 | **PASS** | assertDuplicatePromotionGuard |
| LF-12 | **PASS** | gate_blocked excluded from review |
| LF-13 | **PASS** | LearningSourceRef + promotion record tests |
| LF-14 | **PASS (domain model)** | Version conflict on approve; F2 transaction deferred |
| LF-15 | **PASS (types)** | AuditEventType union extended |

---

## 20. Domain Test Coverage

| Metric | Value |
|--------|-------|
| New test file | `learningEngine.domain.test.ts` |
| New tests | **34** |
| Total AOS unit tests | **127** (was 93) |
| Lifecycle + gate branch coverage | 100% of implemented branches |

---

## 21. Architecture Audit

| Check | Result |
|-------|--------|
| No Firestore learning code | PASS |
| No Firebase in learning domain/contracts | PASS |
| No React/UI | PASS |
| No real AI provider | PASS |
| No catalog writes | PASS |
| No Phase E entity mutation | PASS |
| No KIL implementation | PASS |
| No duplicate domain concepts | PASS |
| Import boundaries | PASS |
| Contracts layer clean | PASS |

---

## 22. Regression Command Results

| Command | Result |
|---------|--------|
| `npm run test:aos` | **127 passed** |
| `npm run build` | **PASS** |
| `npm run aos:validate` | **PASS** (12 checks) |
| `npm run aos:import-boundaries` | **PASS** |
| `npm run aos:security` | **PASS** (13 collections) |
| `npm run test:aos:integration` | **45 passed** |

---

## 23. Technical Debt Intentionally Deferred

- GK/GM/GP type-specific promotion gates (F3)
- Application-layer PII sanitization pipeline (F2)
- Firestore persistence + security rules (F2)
- Extraction orchestration hook (F2)
- Promotion write pipelines (F3)
- Learning queue UI (F4)
- Real AI adapter (F5)
- ERP ActivityLogger dual-write (F5)
- Knowledge Record entity (F5 optional)

---

## 24. Blockers Discovered for F2

| Item | Notes |
|------|-------|
| None architectural | F2 can proceed with defined contracts |
| Permission keys for learning approve | Can use existing founder role pattern |
| Feature flag `LEARNING_ENGINE` | To add in F2 application layer |

---

## 25. GO / NO-GO Recommendation for F2

| Decision | **GO** |
|----------|--------|
| Rationale | Domain foundation complete; all F1 exit criteria met; regression green |
| F2 scope | Firestore repos, 3 collections, security rules, extraction application service, idempotency integration tests |

---

## Strict Stop Confirmation

- F1 complete — no F2 code started
- No Firestore learning collections created
- No security rules modified for learning
- No approveRetrospective extraction hook
- No promotion pipelines, UI, AI providers, or KIL

**Awaiting explicit authorization for F2.**
