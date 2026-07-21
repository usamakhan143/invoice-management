# 04 — Extraction Architecture

---

## 1. Trigger

**Canonical:** Retrospective **approved** (`approveRetrospective()` success).

Equivalent to LE doc "closed" — see doc 13.

** Preconditions (domain-enforced):**

- `retrospective.status === "approved"`
- `retrospective.traceabilityRefs` populated (Phase E)
- All traceability IDs resolve to immutable version documents in same tenant

---

## 2. Orchestration Model (Frozen)

**Choice: Post-commit application orchestration** (not synchronous in retrospective transaction).

```
approveRetrospective()     [existing Phase E transaction]
        │
        ├── persist workflow + audit retro.approved
        └── return success to UI
                │
                ▼ (after commit)
LearningExtractionApplicationService.scheduleExtraction(retrospectiveId)
        │
        ├── create/update extraction run (idempotent)
        ├── load immutable evidence bundle
        ├── invoke AI port (optional, failure-tolerant)
        ├── validate + persist candidates
        ├── run quality gates
        └── audit extraction completed/failed
```

**Rationale:**

- Matches existing `EngagementWorkflowApplicationService` orchestration style
- No new distributed job infrastructure required for F2
- Satisfies LF-04: retro approval independent of extraction
- Firestore `onWrite` triggers deferred to future if scale requires — not F2 default

---

## 3. Evidence Bundle (Application Layer)

Loaded read-only for extraction:

| Source | Loader |
|--------|--------|
| Retrospective + lessons | Workflow aggregate |
| RequirementVersion | `RequirementVersionRepository` |
| PromptVersion | `PromptVersionRepository` |
| CursorSession + Revisions | `CursorSessionRepository`, `CursorRevisionRepository` |
| Evaluation | `EvaluationRepository` |
| ReuseAssessment | Workflow head |
| QA report | Workflow head |
| Audit slice | `AuditRepository.listByEngagement` filtered to delivery events |

Domain validates bundle completeness before candidate creation.

---

## 4. Idempotency Strategy (Frozen)

### Extraction run ID

```
extractionRunId = `${companyId}_${engagementId}_${retrospectiveId}`
```

Document path: `aosLearningExtractionRuns/{extractionRunId}`

**Behavior:**

| Scenario | Behavior |
|----------|----------|
| First approve | Create run `pending` → `running` → `completed` |
| Retry after failure | Resume same run doc; skip existing candidate IDs |
| Duplicate schedule call | If `completed`, no-op; if `running`, no-op; if `failed`, retry policy |
| Manual retrigger | Allowed only if run `failed` or `partial`; audit `extraction_retriggered` |

### Candidate ID

```
candidateId = `${extractionRunId}_${candidateType}_${sourceFingerprint}`
```

`sourceFingerprint = hash(candidateType + normalizedTitle + promotionTarget.kind)`

**Same fingerprint → same ID → upsert no-op** (LF-03).

### Retrospective approval retry

Workflow approve is already idempotent on approved state; extraction schedule called once per successful transition to approved (application guard: only schedule when status **changed** to approved).

---

## 5. Failure / Retry

| Failure | Handling |
|---------|----------|
| AI unavailable | Run → `partial` or `completed` with zero AI candidates; deterministic candidates from retro lessons optional |
| Invalid AI JSON | Log + skip AI proposals; run continues |
| Evidence missing | Run → `failed`; audit; no candidates |
| Tenant mismatch | Run → `failed`; security alert |
| Firestore write fail | Retry with backoff (application); run stays `running` |
| Gate evaluation error | Candidate → `gate_blocked` with reason |

**Max retries:** 3 application-level for run persistence; human retrigger after.

---

## 6. Feature Flag

```
AOS_FEATURE_FLAG.LEARNING_ENGINE = "learning_engine"
```

Default **false** until F2 complete. When false, `scheduleExtraction` no-op.

Extraction hook lives in application layer only — domain pure.

---

## 7. Integration Point (Future Code — Not Implemented)

```typescript
// Application — after approveRetrospective succeeds
if (isLearningEngineEnabled() && statusChangedToApproved) {
  void learningExtractionService.scheduleExtraction({
    companyId, engagementId, retrospectiveId,
  });
}
```

No change to aggregate transaction in F2 without explicit approval.
