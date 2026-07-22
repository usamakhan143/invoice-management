# F3 — Governed Promotion Pipeline Report

**Sprint:** Phase F — F3  
**Status:** COMPLETE — awaiting explicit authorization before F4  
**Date:** 2026-07-22

---

## 1. Executive Summary

Sprint F3 implements the human-governed promotion pipeline from approved Learning Candidates into canonical organizational assets. The Learning Engine owns the **process** (governance, gates, orchestration, promotion records, audit); bounded-context catalog owners retain **asset ownership**.

Delivered:

- Human approval workflow (approve / reject / defer / supersede)
- Target-specific domain gates (GK, GM, GP, GB, GE) plus mandatory universal gates (G-001–G-005)
- `LearningPromotionApplicationService` with transactional orchestration
- Non-destructive catalog writes (create / new_version / supersede)
- Idempotent promotion via deterministic `promotionId` and early duplicate detection
- Append-only `LearningPromotionRecord` with full backward trace
- Audit chain in `aosAuditEvents` (approval + promotion in transaction per LF-07)
- F4-ready DTOs — **no UI added**

All regression suites pass including 16 new emulator integration tests (A–Q).

---

## 2. Target Ownership Map

| Candidate Type | Promoted Asset Kind | Canonical Owner | Collection | Write Path |
|----------------|---------------------|-----------------|------------|------------|
| `knowledge_pattern` | `knowledge_pattern` | Knowledge Engine | `aosKnowledgePatterns` | `KnowledgeRepository.publishFromPromotion` |
| `module` | `module_registry` | Module Registry | `aosModuleRegistry` | `ModuleRegistryRepository.publishFromPromotion` |
| `prompt_improvement` | `prompt_template` | Playbook (prompt templates) | `aosPlaybookEntries` (`entryType: prompt_template`) | `PlaybookRepository.publishFromPromotion` |
| `playbook_improvement` | `playbook` | Agency Playbook | `aosPlaybookEntries` | `PlaybookRepository.publishFromPromotion` |
| `evaluation_insight` | `evaluation_rubric` | Evaluation rubrics (via Playbook) | `aosPlaybookEntries` (`entryType: rubric`) | `PlaybookRepository.publishFromPromotion` |

**Explicitly NOT promoted into (Phase E immutable):**

- `aosRequirementVersions`
- `aosPromptVersions` (engagement prompt versions ≠ organizational prompt templates)
- Confirmed `aosEvaluations`

Learning Engine does **not** duplicate Knowledge, Registry, Prompt Version, or Playbook stores.

---

## 3. Folder Tree (F3 additions)

```
aos/
├── application/learning/
│   ├── LearningGovernanceApplicationService.ts      (NEW)
│   ├── LearningPromotionApplicationService.ts       (NEW)
│   ├── LearningPromotionOrchestrator.ts               (NEW)
│   ├── createLearningGovernanceApplicationService.ts  (NEW)
│   ├── createLearningPromotionApplicationService.ts (NEW)
│   └── learningGovernanceDtos.ts                    (NEW)
├── domain/
│   ├── catalog/entities/
│   │   ├── knowledgePattern.ts                      (MOD — learningSource, supersedesPatternId)
│   │   ├── moduleRegistry.ts                        (MOD — learningSource, supersedesModuleId)
│   │   └── playbookEntry.ts                         (MOD — learningSource, supersedesEntryId)
│   └── learning/rules/
│       ├── promotionGateRules.ts                    (NEW — GK/GM/GP/GB/GE)
│       ├── promotionTargetDraftRules.ts             (NEW — write plans)
│       └── learningPromotionLifecycleRules.ts       (NEW — promoted/failed transitions)
├── contracts/
│   ├── KnowledgeRepository.ts                       (MOD — publishFromPromotion)
│   ├── ModuleRegistryRepository.ts                  (MOD — publishFromPromotion)
│   ├── PlaybookRepository.ts                        (MOD — publishFromPromotion)
│   └── learning/LearningRepositories.ts             (MOD — saveCandidate)
└── infrastructure/
    ├── firestore/repositories/
    │   ├── KnowledgeFirestoreRepository.ts          (MOD)
    │   ├── ModuleRegistryFirestoreRepository.ts     (MOD)
    │   ├── PlaybookFirestoreRepository.ts           (MOD)
    │   └── LearningCandidateFirestoreRepository.ts  (MOD — saveCandidate)
    └── integration/
        └── learningPromotion.integration.test.ts    (NEW — 16 tests A–Q)
docs/aos-phase-f/
└── F3_GOVERNED_PROMOTION_PIPELINE_REPORT.md         (NEW)
```

---

## 4. Files Created

| File | Purpose |
|------|---------|
| `aos/domain/learning/rules/promotionGateRules.ts` | Target-specific promotion gates |
| `aos/domain/learning/rules/promotionTargetDraftRules.ts` | Resolve non-destructive write plans |
| `aos/domain/learning/rules/learningPromotionLifecycleRules.ts` | Promoted / promotion_failed transitions |
| `aos/application/learning/LearningGovernanceApplicationService.ts` | Human governance orchestration |
| `aos/application/learning/LearningPromotionApplicationService.ts` | Promotion orchestration |
| `aos/application/learning/LearningPromotionOrchestrator.ts` | Firestore transactional writes |
| `aos/application/learning/createLearningGovernanceApplicationService.ts` | Factory |
| `aos/application/learning/createLearningPromotionApplicationService.ts` | Factory |
| `aos/application/learning/learningGovernanceDtos.ts` | F4-ready DTOs |
| `aos/infrastructure/integration/learningPromotion.integration.test.ts` | Emulator tests A–Q |
| `docs/aos-phase-f/F3_GOVERNED_PROMOTION_PIPELINE_REPORT.md` | This report |

---

## 5. Files Modified

| File | Change |
|------|--------|
| Catalog entities (3) | Optional `learningSource`, supersession IDs |
| Catalog contracts (3) | `publishFromPromotion` command |
| `LearningRepositories.ts` | `SaveLearningCandidateCommand`, `saveCandidate` |
| Catalog Firestore repos (3) | Transactional promotion writes + stale marking |
| `LearningCandidateFirestoreRepository.ts` | Full candidate save with optimistic version |
| `learningEngine.domain.test.ts` | F3 gate + write plan unit tests |

---

## 6. Target-Specific Domain Gates

Implemented in `promotionGateRules.ts` (domain only):

| Gate | Rule |
|------|------|
| GK-001 | Not client_preference (frozen types exclude it) |
| GK-002 | Organizational confidence validated/proven |
| GK-003 | Anonymization scan (G-003 reuse) |
| GK-004 | No duplicate active pattern without supersede |
| GK-005 | Grounded evaluation ID required |
| GM-001 | Evaluation evidence present |
| GM-002 | Gap rationale documented |
| GM-003 | Sidecar compliance notes present |
| GM-004 | No duplicate active module name |
| GM-005 | Human approval satisfies technical review |
| GP-001 | Evaluation or failure cluster reference |
| GP-002 | Exemplar anonymized |
| GP-003 | Template diff within 10k char budget |
| GP-004 | Annotate strategy blocked for material changes |
| GB-001 | Generalizable playbook body (≥20 chars) |
| GB-002 | Human approval satisfies ADR review |
| GB-003 | Retrospective link present |
| GE-001 | Evaluation evidence or failure_pattern type |
| GE-002 | Insight type categorized |

Universal G-001–G-005 re-evaluated at promotion time in application orchestration.

---

## 7. Human Approval Workflow

`LearningGovernanceApplicationService`:

```
load candidate → verify actor ≠ ai → domain rule → saveCandidate → audit append
```

| Action | Domain Rule | Audit Event |
|--------|-------------|---------------|
| Approve | `approveCandidate` | `aos_learning_candidate_approved` |
| Reject | `rejectCandidate` | `aos_learning_candidate_rejected` |
| Defer | `deferCandidate` | `aos_learning_candidate_deferred` |
| Supersede | `supersedeCandidate` | `aos_learning_candidate_superseded` |

AI cannot approve, reject, defer, supersede, or promote (LF-05).

---

## 8. Promotion Application Flow

`LearningPromotionApplicationService.promoteCandidate`:

```
load candidate
→ verify companyId
→ idempotent return if promotion record exists (LF-11)
→ verify expectedVersion (LF-14)
→ assertPromotionEligible (LF-06)
→ assertNonDestructivePromotionStrategy (LF-08)
→ evaluateUniversalGates (G-001–G-005)
→ assertTargetPromotionGatesPassed (GK/GM/GP/GB/GE)
→ buildLearningSourceRef + resolvePromotionWritePlan
→ createLearningPromotionRecord (LF-13)
→ LearningPromotionOrchestrator.executePromotionTransaction:
      audit (LF-07) + target write + promotion record + candidate promoted
→ return LearningPromotionResultDto
```

On failure: best-effort `promotion_failed` candidate state + `aos_learning_promotion_failed` audit.

---

## 9. Target Repository / Write Extensions

Each canonical repo gained `publishFromPromotion`:

- Creates new versioned document (`{companyId}__{assetId}`)
- Marks prior asset stale/deprecated (non-destructive)
- Idempotent if target doc already exists (returns existing)

Orchestrator performs catalog + promotion + candidate + audit in **one Firestore transaction**.

---

## 10. Non-Destructive Version Strategy

| Strategy | Behavior |
|----------|----------|
| `create` | New catalog document, version 1 |
| `new_version` | New document ID with version suffix; prior marked stale |
| `supersede` | Same as new_version with explicit `supersedes*Id` link |

No physical deletion. Historical versions remain readable (LF-08). Verified in integration test M.

---

## 11. Idempotency / Concurrency Strategy

| Mechanism | Implementation |
|-----------|----------------|
| Deterministic promotion ID | `promo-{candidateId}` |
| Early duplicate guard | `getByCandidateId` before version/eligibility checks |
| Transaction existence check | Skip writes if promotion doc exists |
| Target write idempotency | Skip if catalog doc exists |
| Optimistic locking | `expectedVersion` on candidate save/promote |
| Concurrent attempts | Transaction conflict → single winner; one promotion record |

---

## 12. Promotion Record Schema / Behavior

Collection: `aosLearningPromotions` (append-only)

| Field | Purpose |
|-------|---------|
| `promotionId` | Deterministic `promo-{candidateId}` |
| `companyId` | Tenant scope |
| `candidateId` | Source candidate |
| `extractionRunId` | Extraction run |
| `promotedAssetKind` | Target kind enum |
| `promotedAssetId` | Resulting catalog ID |
| `promotedVersion` | Version label |
| `promotedAt` / `promotedBy` | Actor + timestamp |
| `sourceProvenance` | Phase E artifact IDs |
| `learningSourceRef` | Full backward trace (LF-13) |

Update/delete denied by Firestore rules (verified test L).

---

## 13. Audit Chain

Reconstructable chain:

```
Engagement → Retrospective → Extraction Run → Candidate
  → Approval (aos_learning_candidate_approved)
  → Promotion (aos_learning_candidate_promoted — in transaction before commit)
  → Organizational Asset Version
```

Gate blocks emit `aos_learning_gate_evaluated`. Failures emit `aos_learning_promotion_failed`.

---

## 14. Security / Permission Changes

No new collections. Existing rules sufficient:

- `aosLearningCandidates`: update preserves immutable fields (provenance, fingerprint)
- `aosLearningPromotions`: create-only; update/delete denied
- Company isolation enforced on all reads/writes

Application layer rejects cross-company promotion (test K). AI actor rejected at service boundary.

---

## 15. Candidate Lifecycle Verification

| Status | Can Promote? | Verified |
|--------|--------------|----------|
| `pending_review` | No | Test A |
| `approved` | Yes (with gates) | Test B |
| `rejected` | No | Test D |
| `gate_deferred` | No | Test E |
| `promoted` | Idempotent return | Test I/J |
| `promotion_failed` | Retry allowed | Domain rules |

Illegal transitions fail deterministically via F1 lifecycle rules (unchanged).

---

## 16. Emulator Integration Coverage

File: `learningPromotion.integration.test.ts` (16 tests)

| ID | Requirement | Test |
|----|-------------|------|
| A | Pending cannot promote | ✓ |
| B | Approved promotes to canonical target | ✓ |
| C | AI cannot approve/promote | ✓ |
| D | Rejected cannot promote | ✓ |
| E | Deferred cannot promote | ✓ |
| F | Universal gate blocks | ✓ |
| G | Target gate blocks (GK-004 duplicate) | ✓ |
| H | Exactly one promotion record | ✓ |
| I/J | Retry/concurrent idempotent | ✓ |
| K | Cross-company rejected | ✓ |
| L | Promotion record immutable | ✓ |
| M | Historical version after supersede | ✓ |
| N | Provenance chain survives reload | ✓ |
| O | Promoted only after target write | ✓ |
| P | Failed promote doesn't mark promoted | ✓ |
| Q | Audit chain approval + promotion | ✓ |

---

## 17. LF-01 through LF-15 Matrix

| ID | Status | Evidence |
|----|--------|----------|
| LF-01 | **PASS** | Provenance on candidates + promotion records; test N |
| LF-02 | **PASS** | Cross-company rejection; F2 security + test K |
| LF-03 | **PASS** | F2 idempotent extraction (unchanged) |
| LF-04 | **PASS** | F2 post-commit hook (unchanged) |
| LF-05 | **PASS** | AI rejected; test C + domain tests |
| LF-06 | **PASS** | `assertPromotionEligible`; tests A, D, E |
| LF-07 | **PASS** | Audit in promotion transaction; test Q |
| LF-08 | **PASS** | Non-destructive versioning; test M |
| LF-09 | **PASS** | G-003/GK-003; test F |
| LF-10 | **PASS** | F2 provenance from immutable versions (unchanged) |
| LF-11 | **PASS** | Idempotent promotion; tests H, I/J |
| LF-12 | **PASS** | F2 gate_blocked queue exclusion (unchanged) |
| LF-13 | **PASS** | `learningSourceRef` on records + catalog; test N |
| LF-14 | **PASS** | Optimistic version + transaction; test P |
| LF-15 | **PASS** | Centralized audit taxonomy; test Q |

**All LF-01…LF-15 green.**

---

## 18. Architecture Compliance Audit

| Constraint | Status |
|------------|--------|
| LE ≠ KE ≠ Registry ≠ Prompt Version store | ✓ |
| ADR-009 human approves promotion | ✓ |
| Domain owns gates/rules | ✓ |
| Application orchestrates only | ✓ |
| Infrastructure persists/maps | ✓ |
| No F4 UI | ✓ |
| No F5 real AI | ✓ |
| No KIL | ✓ |
| No ADR rewrites | ✓ |
| Append-only promotion history | ✓ |

---

## 19. Exact Regression Results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run test:aos` | **131 passed** |
| `npm run test:aos:integration` | **70 passed** (16 new promotion tests) |
| `npm run aos:validate` | **PASS** (12 checks) |
| `npm run aos:import-boundaries` | **PASS** |
| `npm run aos:security` | **PASS** (16 collections) |

---

## 20. Defects Discovered / Fixed

| Defect | Fix |
|--------|-----|
| Firestore rejected `undefined` supersession fields | `deepOmitUndefinedFields` in orchestrator catalog writes |
| Idempotent retry failed version check | Check existing promotion before version validation |
| Integration test queried promotions without `companyId` | Added tenant filter per security rules |

---

## 21. Technical Debt Intentionally Deferred

| Item | Rationale |
|------|-----------|
| F4 Learning Review Queue UI | Explicit F3 stop |
| F5 real AI extraction/promotion | Out of scope |
| KIL graph ingestion | Out of scope |
| Dedicated Evaluation Rubric repository | Rubrics via Playbook per frozen architecture |
| ERP permission keys for learning governance | Scope + domain actor + Firestore rules sufficient for V1 |
| `promotion_attempted` dedicated audit type | Reused `gate_evaluated` / `promotion_failed` taxonomy |
| Cross-service distributed transactions | Single Firestore transaction + idempotent recovery |

---

## 22. F4 Prerequisites

F4 may begin when explicitly authorized. Prerequisites satisfied:

1. `LearningGovernanceApplicationService` with approve/reject/defer/supersede APIs
2. `LearningPromotionApplicationService.promoteCandidate`
3. F4-ready DTOs in `learningGovernanceDtos.ts`
4. `listByStatus(companyId, "pending_review")` for review queue data
5. All LF invariants green with emulator evidence
6. Audit chain complete for UI traceability panels

---

## 23. GO / NO-GO Recommendation for F4

### **GO**

F3 acceptance criteria are satisfied:

- Governed promotion pipeline implemented end-to-end
- Human approval mandatory; AI blocked
- Target-specific + universal gates enforced in domain
- Non-destructive catalog versioning with supersession
- Idempotent promotion with persistence proof
- Full audit chain (LF-07)
- All regression suites pass
- No scope creep (no UI, no AI, no KIL)

**STOP — awaiting explicit authorization before F4 Learning Review Queue UI.**
