# 10 — Failure, Idempotency, and Concurrency

---

## 1. Failure Model

| Scenario | Behavior | User visibility |
|----------|----------|-----------------|
| AI unavailable | Run completes/partial; zero AI candidates | Extraction status on retro screen (F4) |
| Invalid AI response | Skip proposals; audit on run | Logged |
| Candidate validation failure | Skip candidate; continue run | Run `partial` |
| Evidence missing | Run `failed`; no candidates | Admin retrigger |
| Evidence tenant mismatch | Run `failed`; security audit | Alert |
| Duplicate extraction schedule | No-op if completed | None |
| Duplicate promotion | No-op if promotion record exists | None |
| Promotion target conflict | `promotion_failed`; reason stored | Review queue retry |
| Concurrent approvals | Optimistic lock on candidate version field | Second actor sees stale state error |
| Firestore transaction failure | Full rollback; retry | Transient error |
| Audit append failure | Rollback promotion (LF-07) | promotion_failed |

**No silent failure.** Every failure path emits audit or run `failureReason`.

---

## 2. Idempotency Summary

| Key | Formula |
|-----|---------|
| Extraction run | `${companyId}_${engagementId}_${retrospectiveId}` |
| Candidate | `${extractionRunId}_${type}_${fingerprint}` |
| Promotion | Unique `promotionId`; dedupe on `candidateId` |

Operations:

- `scheduleExtraction` — idempotent
- `createCandidate` — upsert by candidateId
- `promoteCandidate` — idempotent if already promoted

---

## 3. Concurrency

### Extraction

- Single run doc per retrospective — use Firestore transaction: `pending` → `running` with compare on status
- Second scheduler sees `running`/`completed` → exit

### Approval

- Candidate doc includes `version: number` (integer)
- Approve command: `if version !== expected → reject`
- Prevents double-approve race

### Promotion

- Firestore transaction: read candidate (approved) + write target + promotion + audit
- If candidate not `approved` → abort

---

## 4. Partial Promotion Prevention

Promotion orchestrator steps in **one transaction**:

1. Lock candidate status check
2. Write org asset (new version)
3. Write promotion record
4. Update candidate → promoted
5. Append audit

Any step fails → none committed.

---

## 5. Manual Retrigger Rules

| Run state | Allowed |
|-----------|---------|
| `failed` | Retrigger extraction |
| `partial` | Retrigger to fill gaps |
| `completed` | No auto retrigger; admin "regenerate" creates audit + new run suffix only if policy added in F5 |

Default: **no duplicate candidates** on completed retrigger.

---

## 6. Retry Policy

| Layer | Policy |
|-------|--------|
| Application schedule | 3x exponential backoff for transient Firestore errors |
| AI port | 1 retry on timeout; then empty proposals |
| Promotion | User-initiated retry from `promotion_failed` |

---

## 7. Integration Test Requirements (F2+)

- Duplicate scheduleExtraction → single run
- Approve race → one wins
- Promotion transaction rollback leaves candidate `promotion_failed`
- Cross-company provenance rejected
