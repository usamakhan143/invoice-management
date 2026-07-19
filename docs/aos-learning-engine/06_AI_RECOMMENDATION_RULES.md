# 06 — AI Recommendation Rules

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define how AI assists the Learning Engine — extraction, classification, deduplication, and recommendation — while preserving **human governance** as the permanent control plane.

AI accelerates organizational learning; it does not autonomously mutate agency-wide assets.

---

## Inputs

| Input | Source |
|-------|--------|
| Closed retrospective + engagement evidence bundle | AOS workflow artifacts |
| Knowledge corpus (read) | Knowledge Engine |
| Registry catalog (read) | Module Registry |
| Prompt templates (read) | Prompt Engine |
| Evaluation history | Evaluation Engine |
| Duplication Report / ADRs | Bootstrap governance corpus |
| BOS lessons (read-only) | BOS |

---

## Outputs

| Output | Type |
|--------|------|
| Learning Extraction Report | AI-generated, human-reviewed |
| Typed candidates (knowledge/module/prompt/playbook) | Recommendations only |
| Confidence scores | Machine-assigned |
| Anonymization suggestions | Machine-assigned, human-verified |
| Dedup/merge suggestions | Machine-assigned |
| Rejection reasons (on human reject) | Learning signal for model calibration |

**AI outputs are always `draft` or `proposed` until human approval.**

---

## Ownership

| Role | Responsibility |
|------|----------------|
| AI Orchestration layer | Model invocation (future implementation) |
| Learning Engine | Recommendation pipeline orchestration |
| Delivery lead | Final decision on all promotions |
| AOS governance | Model prompt/version registry (future) |

---

## Approval

| AI action | Human gate |
|-----------|------------|
| Extract candidates | Auto-run; human reviews queue |
| Assign confidence | Informational; human may override |
| Suggest promotion | Requires explicit approve |
| Suggest merge/dedup | Requires explicit confirm |
| Suggest template diff | Requires delivery lead approve |
| Auto-archive | **Forbidden** |
| Auto-promote | **Forbidden** (ADR-009 §16) |

---

## Versioning

- AI model/prompt version recorded on each extraction report.
- Recommendation id linked to model version for reproducibility.
- Human overrides stored as amendment without deleting AI original.

---

## Promotion Rules

### Recommendation quality tiers

| Tier | AI may suggest | Human required |
|------|----------------|----------------|
| T1 — Extraction | Candidate list, tags, summaries | Review all |
| T2 — Classification | Domain, agency type, target system | Confirm or edit |
| T3 — Promotion | Pattern text, template diff, module metadata | Approve/reject each |
| T4 — Activation | — | Human only |

### Evidence grounding rules

AI recommendations must cite source artifact IDs:

- `retrospectiveId`
- `evaluationId`
- `promptArtifactId`
- `cursorSessionId`
- `reuseAssessmentId`
- `knowledgeRecordId`

Recommendations without grounded citations are **invalid** and discarded by quality gate.

### Confidence calibration

AI-assigned confidence cannot exceed rules in [11_KNOWLEDGE_CONFIDENCE_LEVELS.md](11_KNOWLEDGE_CONFIDENCE_LEVELS.md). Machine `repeated` requires cross-engagement data access; single-engagement extraction capped at `validated`.

### Privacy rules for AI

- Client names redacted in model context where possible.
- Client preference type never suggested for promotion.
- PII scan on all AI-generated pattern text before queue display.

---

## Lifecycle

```
retrospective closed
        │
        ▼
AI extraction job (async)
        │
        ▼
grounded candidates + confidence
        │
        ▼
quality gates (doc 08)
        │
        ▼
human review queue
        │
        ├── approve → promotion pipelines
        └── reject → audit + optional feedback for calibration
```

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Ungrounded recommendation | Discard; log model failure |
| Hallucinated module reference | Reject; flag for prompt tuning |
| PII in output | Block display; re-run with stricter redaction |
| Model timeout | Retry; manual extraction fallback |
| Contradictory recommendations | Present both; human resolves |
| Over-confidence | Cap to `validated`; human must elevate |

---

## Audit Requirements

- `aos_ai_extraction_started` / `completed` / `failed`
- `aos_ai_recommendation_created`
- `aos_ai_recommendation_accepted`
- `aos_ai_recommendation_rejected` (with reason)
- `aos_ai_model_version` (metadata on each job)

Store: `modelId`, `promptVersion`, `inputTokenCount`, `outputCandidateCount`, `engagementId`.

---

## Related Documents

- [09_APPROVAL_WORKFLOW.md](09_APPROVAL_WORKFLOW.md)
- [08_QUALITY_GATES.md](08_QUALITY_GATES.md)
- `docs/aos-architecture/05_AI_ORCHESTRATION.md`
