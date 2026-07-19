# 08 — Quality Gates

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define **evidence thresholds** that must pass before learning candidates become promoted agency assets — preventing noise, privacy violations, and ungrounded AI suggestions from entering the organizational learning corpus.

---

## Inputs

| Input | Source |
|-------|--------|
| Learning candidates (all types) | Learning Extraction |
| Source artifact links | AOS domains |
| Confidence levels | Classification |
| Anonymization scan results | Privacy pipeline |
| Dedup check results | Knowledge + Registry |
| ADR/architecture rule set | Governance corpus |
| Active pattern/module catalog | AOS engines |

---

## Outputs

| Output | Meaning |
|--------|---------|
| `gate_passed` | Candidate enters approval queue |
| `gate_blocked` | Candidate rejected with reason code |
| `gate_deferred` | Insufficient evidence; watch list |
| Gate audit record | Traceability |

---

## Ownership

| Gate category | Owner |
|---------------|-------|
| Evidence gates | Learning Engine (automated) |
| Privacy gates | Learning Engine (automated) + human on edge cases |
| Architecture gates | Technical reviewer |
| Promotion gates | Delivery lead (human) |

---

## Approval

Quality gates are **automated preconditions**. Passing gates does not replace human promotion approval — it only qualifies candidates for the review queue.

---

## Versioning

Gate rule sets versioned (`gateRuleSetVersion`). Each candidate records which rule version evaluated it.

---

## Promotion Rules

### Universal gates (all candidate types)

| Gate ID | Rule | Fail action |
|---------|------|-------------|
| G-001 | Source `retrospectiveId` exists and `closed` | Block |
| G-002 | ≥1 grounded source artifact ID | Block |
| G-003 | No client PII in promotable text | Block |
| G-004 | AI recommendation has model version metadata | Block (AI only) |
| G-005 | Candidate type recognized | Block |

### Knowledge promotion gates

| Gate ID | Rule |
|---------|------|
| GK-001 | Not `client_preference` type |
| GK-002 | Confidence ≥ `validated` for promotion |
| GK-003 | Anonymization scan pass |
| GK-004 | No contradicting active pattern without supersession plan |
| GK-005 | ≥1 supporting Knowledge Record or Evaluation link |

### Module promotion gates

| Gate ID | Rule |
|---------|------|
| GM-001 | Evaluation pass for extracted code |
| GM-002 | Gap documented in Reuse Assessment |
| GM-003 | Sidecar law / no ERP duplication check |
| GM-004 | No duplicate active registry entry |
| GM-005 | Technical reviewer sign-off for `new_module` |

### Prompt promotion gates

| Gate ID | Rule |
|---------|------|
| GP-001 | ≥2 eval passes same structure OR validated fix for failure cluster |
| GP-002 | Exemplar anonymized |
| GP-003 | Template diff size within change budget |
| GP-004 | No rubric conflict without version bump |

### Playbook promotion gates

| Gate ID | Rule |
|---------|------|
| GB-001 | Process lesson generalizable |
| GB-002 | ADR compatibility check pass |
| GB-003 | Linked retrospective lesson ID |

### Evaluation insight gates

| Gate ID | Rule |
|---------|------|
| GE-001 | Pattern appears in ≥2 evaluations OR single critical failure |
| GE-002 | Root cause categorized |

---

## Lifecycle

```
candidate created
        │
        ▼
automated gate evaluation
        │
        ├── pass → approval queue
        ├── defer → watch list (evidence accumulation)
        └── block → rejection log + optional Knowledge Record (engagement-scoped)
```

Deferred candidates re-evaluated when new evidence arrives (next engagement or evaluation).

---

## Failure Cases

| Failure | Response |
|---------|----------|
| False block | Human override with audit justification |
| False pass (PII) | Emergency deprecate pattern; incident review |
| Gate rule conflict | Escalate to architecture owner |
| Missing gate version | Block all promotions until rules loaded |

---

## Audit Requirements

- `aos_quality_gate_evaluated` (candidateId, gateId, result, ruleSetVersion)
- `aos_quality_gate_override` (human override with reason)

Blocked candidates retain full gate result set for debugging.

---

## Related Documents

- [02_KNOWLEDGE_PROMOTION_RULES.md](02_KNOWLEDGE_PROMOTION_RULES.md)
- [06_AI_RECOMMENDATION_RULES.md](06_AI_RECOMMENDATION_RULES.md)
- [11_KNOWLEDGE_CONFIDENCE_LEVELS.md](11_KNOWLEDGE_CONFIDENCE_LEVELS.md)
