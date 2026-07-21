# 06 — Persistence, Security, and Audit

---

## 1. Proposed Firestore Collections (NOT CREATED YET)

### 1.1 `aosLearningExtractionRuns`

| Aspect | Value |
|--------|-------|
| Doc ID | Deterministic `extractionRunId` |
| Scope | `companyId` |
| Mutable | status, candidateIds, timestamps, failureReason |
| Immutable after complete | provenance snapshot, retrospectiveId |
| Indexes | `(companyId, status)`, `(companyId, engagementId)` |
| Retention | Permanent (doc 19 alignment) |

### 1.2 `aosLearningCandidates`

| Aspect | Value |
|--------|-------|
| Doc ID | Deterministic `candidateId` |
| Scope | `companyId` |
| Mutable | status, gateResult, approval, promotion, supersession |
| Immutable | provenance, extractionRunId, createdAt, sourceFingerprint |
| Indexes | `(companyId, status)`, `(companyId, engagementId)`, `(companyId, candidateType, status)` |
| Retention | Permanent |

### 1.3 `aosLearningPromotions`

| Aspect | Value |
|--------|-------|
| Doc ID | Random UUID `promotionId` |
| Scope | `companyId` |
| Immutable | All fields after write |
| Indexes | `(companyId, candidateId)` unique logical |
| Retention | Permanent |

**Decision:** Three collections sufficient for Phase F. No separate gate-result or AI-job collections — embedded on run/candidate.

---

## 2. Security Rules (Future F2 Requirements)

All collections:

```
request.auth != null
resource.data.companyId == request.auth.token.companyId
request.resource.data.companyId == request.auth.token.companyId
```

| Operation | Rule |
|-----------|------|
| Read | Same company only |
| Create candidate/run | System role OR authenticated app user same company |
| Update candidate status | Same company; field-level: provenance immutable |
| Promote | Application service account or privileged role |
| Delete | **Denied** (append-only lifecycle) |

**Cross-company evidence:** Application validates all provenance IDs belong to `companyId` before write. Rules cannot join — validation in application + integration tests.

**Promoted catalog writes:** Extend existing `aosKnowledgePatterns`, `aosModuleRegistry`, `aosPlaybookEntries` rules with learning-metadata create path — same company, no cross-ref.

---

## 3. Audit Architecture

**Owner:** `aosAuditEvents` (existing). Extend taxonomy — no second audit system.

### Learning event types (frozen)

| Event type | When |
|------------|------|
| `aos_learning_extraction_started` | Run begins |
| `aos_learning_extraction_completed` | Run completes |
| `aos_learning_extraction_failed` | Run fails |
| `aos_learning_extraction_retriggered` | Manual retry |
| `aos_learning_candidate_created` | Each candidate persisted |
| `aos_learning_gate_evaluated` | Gate pass/block/defer |
| `aos_learning_candidate_approved` | Human approve |
| `aos_learning_candidate_rejected` | Human reject |
| `aos_learning_candidate_deferred` | Human defer |
| `aos_learning_candidate_superseded` | Amendment |
| `aos_learning_candidate_promoted` | Promotion success |
| `aos_learning_promotion_failed` | Promotion error |
| `aos_learning_promotion_rollback` | Manual correction |

### Required payload refs

```typescript
interface LearningAuditPayload {
  companyId: string;
  engagementId: string;
  retrospectiveId: string;
  extractionRunId?: string;
  candidateId?: string;
  candidateType?: string;
  promotionId?: string;
  promotedAssetKind?: string;
  promotedAssetId?: string;
  actorId?: string;
  reason?: string;
  provenance?: Partial<LearningProvenance>;
}
```

### Audit gate (LF-07)

Promotion transaction order:

1. Validate + prepare writes
2. Write target asset + promotion record + candidate update
3. Append audit event in same transaction (or fail all)

**ERP ActivityLogger:** Optional adapter in infrastructure F3+ — not blocking F1 domain/contracts.

---

## 4. Retention

Align `docs/aos-learning-engine/19_RETENTION_STRATEGY.md`:

- Candidates and runs: retain permanently
- Rejected/blocked: retain for calibration (AI rejection labels)
- No hard delete in Phase F

---

## 5. Indexes Summary (for `firestore.indexes.json` in F2)

```json
[
  { "collectionGroup": "aosLearningCandidates", "fields": ["companyId", "status", "createdAt"] },
  { "collectionGroup": "aosLearningCandidates", "fields": ["companyId", "engagementId", "createdAt"] },
  { "collectionGroup": "aosLearningExtractionRuns", "fields": ["companyId", "status"] }
]
```
