# 02 — Knowledge Promotion Rules

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define when and how **Knowledge Records** (engagement-scoped evidence) become **Knowledge Patterns** (agency-wide organizational learning).

Knowledge promotion is the primary mechanism for converting delivery experience into reusable guidance for Prompt Engine, Matching Engine, and future planning.

---

## Inputs

| Input | Source |
|-------|--------|
| Knowledge Candidates | Learning Extraction (post-retrospective) |
| Knowledge Records (draft/active) | Knowledge Engine |
| Retrospective lessons | Retrospective domain |
| Evaluation failure/success patterns | Evaluation Engine |
| Reuse rejection reasons | Reuse Assessment |
| Confidence scores | Classification pipeline |
| Duplication Report anti-patterns | Bootstrap corpus |
| BOS strategic lessons | BOS (read-only) |

---

## Outputs

| Output | Destination |
|--------|-------------|
| Knowledge Pattern (`proposed`) | Knowledge Engine |
| Updated Prompt Template references | Prompt Engine |
| Module Registry annotations | Module Registry |
| Cursor rule proposals | External (human commit) |
| Agency Playbook cross-links | Agency Playbook |
| Rejected promotion record | Audit trail |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| AOS Knowledge Engine | Storage, classification, retrieval |
| Delivery lead | Promotion approval |
| Learning Engine | Candidate generation and queue |
| ERP ActivityLogger | Audit events |

---

## Approval

| Transition | Approver | Evidence required |
|------------|----------|-------------------|
| Record `draft` → `active` | Any authorized team member | Source artifact link |
| Record → Pattern (`proposed`) | Delivery lead | ≥1 active record OR evaluation evidence |
| Pattern `proposed` → `active` | Delivery lead | Anonymization check passed |
| Pattern `active` → `deprecated` | Delivery lead | Supersession or invalidation reason |

**Forbidden:** Automatic promotion of AI-extracted lessons without human review (ADR-009 §16).

---

## Versioning

- Knowledge Records: point-in-time with amendment notes (no version chain).
- Knowledge Patterns: integer `patternVersion` with `predecessorPatternId` link.
- Promotion creates new pattern version when content materially changes; minor annotation appends note.

---

## Promotion Rules

### Eligibility matrix

| Knowledge type | Promotable? | Conditions |
|----------------|-------------|------------|
| `success_pattern` | Yes | ≥1 passing evaluation OR repeated observation |
| `failure_pattern` | Yes | ≥1 failed evaluation with root cause |
| `lesson` | Yes | Delivery lead confirms reusability |
| `observation` | Conditional | Requires confidence ≥ `validated` (see doc 11) |
| `client_preference` | **No** | Engagement-scoped forever (BR-KR-02) |
| `process_note` | Conditional | Must generalize beyond single client |

### Anonymization rules (mandatory)

Before promotion:

1. Strip client name, contact, domain-specific identifiers.
2. Strip engagement title if client-identifying.
3. Replace specific file paths with pattern descriptions where possible.
4. Flag `confidential: true` records — block promotion.

### Minimum evidence

| Confidence | Minimum supporting evidence |
|------------|----------------------------|
| `hypothesis` | Not promotable |
| `single_observation` | Not promotable (engagement record only) |
| `validated` | 1 human-confirmed record + source link |
| `repeated` | ≥2 engagements OR ≥3 evaluations same pattern |
| `canonical` | Bootstrap import OR ≥5 engagements + delivery lead sign-off |

### Promotion paths

```
Knowledge Record(s)
        │
        ▼
  Anonymization check ──fail──→ stay engagement-scoped
        │ pass
        ▼
  Dedup against active patterns ──match──→ merge/amend existing
        │ no match
        ▼
  Create Knowledge Pattern (proposed)
        │
        ▼
  Delivery lead approval
        │
        ▼
  Active pattern → feeds retrieval + templates
```

### Anti-pattern elevation

Duplication Report entries and repeated evaluation failures on same anti-pattern auto-create **high-priority** promotion candidates with `canonical` confidence target.

---

## Lifecycle

```
capture → draft → active → [promotion candidate] → proposed → active → stale → deprecated
```

| State | Learning Engine role |
|-------|---------------------|
| `draft` | Auto-capture from evaluation failures |
| `active` | Eligible for promotion candidate generation |
| `proposed` | In approval queue |
| `active` (pattern) | Consumed by future engagements |
| `stale` | Flagged; excluded from auto-injection until reviewed |
| `deprecated` | Historical only; superseded pattern linked |

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Promotion with client PII | Block; audit `aos_promotion_blocked_pii` |
| Insufficient evidence | Remain engagement-scoped; increment observation counter |
| Duplicate pattern | Merge evidence links; do not create duplicate active pattern |
| Contradicting active pattern | Escalate; require supersession not silent overwrite |
| Stale pattern promoted | Stale detection on next registry refresh |
| Review timeout | Candidate remains queued; no auto-promotion |

---

## Audit Requirements

- `aos_knowledge_record_created`
- `aos_knowledge_record_promoted`
- `aos_knowledge_record_archived`
- `aos_knowledge_pattern_promoted`
- `aos_knowledge_pattern_stale`
- `aos_knowledge_pattern_deprecated`
- `aos_knowledge_promotion_rejected` (with reason)

Each promotion record must retain bidirectional links: Pattern ↔ source Records ↔ source Retrospective ↔ source Evaluation(s).

---

## Related Documents

- [11_KNOWLEDGE_CONFIDENCE_LEVELS.md](11_KNOWLEDGE_CONFIDENCE_LEVELS.md)
- [08_QUALITY_GATES.md](08_QUALITY_GATES.md)
- `docs/aos-adr/ADR-009_KNOWLEDGE_ENGINE.md`
