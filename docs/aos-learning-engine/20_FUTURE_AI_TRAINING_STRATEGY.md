# 20 — Future AI Training Strategy

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define a long-term strategy for using AOS organizational learning to improve AI assistance **without** violating privacy, audit integrity, or human-governance requirements — planning for model fine-tuning, RAG corpora, and evaluation feedback loops as optional future phases.

This is strategic architecture only — no training implementation in D2.5.

---

## Inputs

| Input | Source |
|-------|--------|
| Promoted Knowledge Patterns (anonymized) | Knowledge Engine |
| Prompt Template evolution history | Prompt Engine |
| Evaluation outcomes (aggregate) | Evaluation Engine |
| Rejection reasons from approval workflow | Learning Engine |
| Decision trace graphs | Traceability |
| AI extraction job outcomes | AI Orchestration |
| Bootstrap governance corpus | ADRs, Discovery |

---

## Outputs

| Output | Future use |
|--------|------------|
| Curated training corpus (anonymized) | Fine-tuning / RAG |
| Hard negative examples (rejections) | Model calibration |
| Prompt structure exemplars | Template generation models |
| Evaluation prediction features | Pre-eval scoring assist |
| Model performance benchmarks | Regression testing |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| Agency owner | Training policy approval |
| Delivery lead | Corpus quality gate |
| AOS governance | PII review before any export |
| External model providers | Contractual DPAs (if cloud) |

---

## Approval

| Action | Approver |
|--------|----------|
| Export corpus for training | Agency owner + delivery lead |
| Include engagement data in corpus | Explicit per-batch review |
| Deploy fine-tuned model to production | Agency owner |
| Auto-training pipeline activation | **Forbidden** without Phase 5+ explicit ADR |

Human-governed promotion remains mandatory regardless of model improvements (ADR-009).

---

## Versioning

Training datasets versioned as immutable snapshots (`corpusVersion`). Model versions linked to corpus version and evaluation benchmark results.

---

## Promotion Rules

### Corpus eligibility

| Data type | Trainable? | Conditions |
|-----------|------------|------------|
| Canonical Knowledge Patterns | Yes | Already anonymized |
| Approved prompt exemplars | Yes | Client stripped |
| Rejected AI extractions | Yes (negative) | With rejection reason |
| Client preferences | **No** | Never |
| Raw Cursor transcripts | Conditional | PII scrub + human review batch |
| Evaluation rubrics | Yes | Aggregate labels |
| Individual developer identifiers | **No** | Never |

### Phased approach

| Phase | Capability |
|-------|------------|
| Phase 1–2 | RAG over promoted patterns only |
| Phase 3 | Extraction model calibration from rejections |
| Phase 4 | Domain fine-tune on anonymized corpus |
| Phase 5 | Predictive planning assist (with human gate) |

### Feedback loop

```
production AI extraction
        │
        ▼
human approve/reject
        │
        ▼
labeled example appended to corpus snapshot (quarterly)
        │
        ▼
offline benchmark regression test
        │
        ▼
model version promotion (human approved)
```

---

## Lifecycle

Corpus snapshots quarterly. Models evaluated against held-out engagement bundles before deployment. Rollback to prior model version on regression.

---

## Failure Cases

| Failure | Response |
|---------|----------|
| PII leak into corpus | Halt export; scrub; incident review |
| Model regression in production | Rollback model version |
| Overfitting to single agency type | Stratify training data |
| Training on unapproved promotions | Invalid corpus; rebuild |
| Surveillance model (individual ranking) | **Forbidden** — disable feature |

---

## Audit Requirements

- `aos_ai_corpus_snapshot_created`
- `aos_ai_corpus_export_approved`
- `aos_ai_model_version_deployed`
- `aos_ai_model_rollback`
- `aos_ai_benchmark_regression_detected`

Each includes: `corpusVersion`, `modelId`, `benchmarkScores{}`, `approverIds[]`.

---

## Related Documents

- [06_AI_RECOMMENDATION_RULES.md](06_AI_RECOMMENDATION_RULES.md)
- [19_RETENTION_STRATEGY.md](19_RETENTION_STRATEGY.md)
- `docs/aos-adr/ADR-009_KNOWLEDGE_ENGINE.md`
- `docs/aos-architecture/05_AI_ORCHESTRATION.md`
