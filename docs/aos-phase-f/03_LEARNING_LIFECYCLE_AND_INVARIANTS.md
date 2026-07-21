# 03 — Learning Lifecycle and Invariants

---

## 1. Candidate Lifecycle States

| State | Meaning |
|-------|---------|
| `extracted` | Created by extraction; gates not yet run |
| `gate_blocked` | Failed automated quality gate — terminal for promotion path |
| `gate_deferred` | Insufficient evidence — watch list |
| `pending_review` | Gates passed — in human review queue |
| `approved` | Human approved — eligible for promotion |
| `rejected` | Human rejected — terminal |
| `promoted` | Promotion pipeline succeeded — terminal |
| `promotion_failed` | Approved but promotion error — retryable |
| `superseded` | Replaced by amendment or newer candidate — terminal |

### Extraction run lifecycle

| State | Meaning |
|-------|---------|
| `pending` | Queued |
| `running` | Evidence load + AI + candidate persist |
| `completed` | All candidates created and gated |
| `partial` | Some candidates created; recoverable |
| `failed` | Run-level failure; no new candidates |

---

## 2. Legal Transitions

```
extracted → gate_blocked | gate_deferred | pending_review
gate_deferred → pending_review (on re-extraction or evidence event) | superseded
pending_review → approved | rejected | gate_deferred (reviewer defer)
approved → promoted | promotion_failed | superseded
promotion_failed → promoted (retry) | rejected (human abort)
extracted | pending_review → superseded (amendment flow)
```

### Illegal transitions

- `promoted` → any other state (except audit correction event)
- `rejected` → `approved` without new candidate (amendment creates new candidate)
- `gate_blocked` → `approved` (must create amended candidate)
- AI service → `approved` or `promoted` directly

---

## 3. Terminal States

| State | Terminal? |
|-------|-----------|
| `gate_blocked` | Yes |
| `rejected` | Yes |
| `promoted` | Yes |
| `superseded` | Yes |
| `promotion_failed` | No — retry allowed |

---

## 4. Actor Permissions

| Transition | Actor |
|------------|-------|
| `extracted` → gate outcomes | **System** (domain gates) |
| → `pending_review` | **System** |
| → `approved` / `rejected` / defer | **Human** (delivery lead / founder) |
| → `promoted` | **System** (promotion orchestrator) after human approval |
| → `superseded` | **Human** or **System** (amendment pipeline) |
| AI classification | **AI recommends only** — writes `aiRecommendation` on candidate, never status ≥ `approved` |

**ADR-009:** Founder/delivery lead approval mandatory for all promotion types. No SLA auto-promote.

---

## 5. Amendment Flow

When reviewer requests changes (`09_APPROVAL_WORKFLOW.md`):

1. Mark original `superseded` with `supersession.supersededByCandidateId`
2. Create new candidate with `amendmentOfCandidateId` → starts at `pending_review`
3. Prior approval invalid for superseded version

---

## 6. Permanent Invariants (LF-01 … LF-15)

| ID | Invariant |
|----|-----------|
| **LF-01** | Every candidate MUST include immutable `LearningProvenance` with Phase E version IDs |
| **LF-02** | All learning records MUST be scoped by `companyId`; cross-company evidence refs rejected |
| **LF-03** | Extraction MUST be idempotent: one canonical run + deterministic candidate IDs per retrospective |
| **LF-04** | Retrospective approval MUST NOT fail if extraction fails |
| **LF-05** | AI MUST NOT transition candidate to `approved` or `promoted` |
| **LF-06** | Human approval MUST precede any promotion write |
| **LF-07** | Promotion MUST emit audit event before commit completes (or rollback) |
| **LF-08** | Promoted organizational assets MUST use new version / supersede — never destructive overwrite |
| **LF-09** | Client-specific facts MUST NOT appear in promotable fields without generalization |
| **LF-10** | Learning MUST NOT consume mutable draft artifacts when immutable approved versions exist |
| **LF-11** | Duplicate promotion of same approved candidate MUST be rejected (idempotent promotion) |
| **LF-12** | `gate_blocked` candidates MUST NOT enter approval queue |
| **LF-13** | Promotion MUST record backward trace to `candidateId`, `extractionRunId`, and provenance IDs |
| **LF-14** | Concurrent approve+promote MUST be transaction-safe or optimistic-lock safe |
| **LF-15** | Learning audit events MUST use centralized `aosAuditEvents` taxonomy |

See [12_PHASE_F_ACCEPTANCE_CRITERIA.md](./12_PHASE_F_ACCEPTANCE_CRITERIA.md) for test mapping.

---

## 7. Relationship to Delivery Lifecycle

Learning activates **after** gate `retrospectiveComplete`:

```
… → evaluation confirmed → QA → retrospective approved
                                        │
                                        ▼ (async, non-blocking)
                              learning extraction run
```

Delivery engagement remains **closed** regardless of extraction outcome.
