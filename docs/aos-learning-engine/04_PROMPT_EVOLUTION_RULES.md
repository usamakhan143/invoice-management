# 04 — Prompt Evolution Rules

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define how completed engagements improve **Prompt Templates** and **Prompt Artifacts** — converting evaluation outcomes, reuse context, and retrospective lessons into better default prompts for future work.

Prompt evolution is organizational learning applied to **execution instructions**, not chat history archival.

---

## Inputs

| Input | Source |
|-------|--------|
| Prompt Improvement Candidates | Learning Extraction |
| Prompt Pack metadata | Prompt Engine |
| Evaluation scores per prompt | Evaluation Engine |
| Revision history | Cursor + Prompt domains |
| Knowledge Patterns (prompting domain) | Knowledge Engine |
| Agency type profile | Engagement metadata |
| Context budget usage | Prompt assembly metrics |
| Retrospective prompt lessons | Retrospective |

---

## Outputs

| Output | Destination |
|--------|-------------|
| Prompt Template version bump | Prompt Engine |
| Agency-type sub-template | Prompt Engine |
| Constraint additions | Template baseline |
| Reuse block templates | Prompt assembly |
| Rubric weight adjustments | Evaluation Engine |
| Anti-pattern constraints | All packs for agency type |
| Deprecated template marker | Prompt Engine archive |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| Prompt Engine | Template storage and assembly |
| Delivery lead | Template promotion approval |
| Learning Engine | Candidate identification |
| Evaluation Engine | Rubric calibration input |

---

## Approval

| Change type | Approver |
|-------------|----------|
| New agency-type sub-template | Delivery lead |
| Constraint added to all packs | Delivery lead |
| Template promoted from single engagement | Delivery lead + ≥2 eval passes OR repeated pattern |
| Rubric weight change | Delivery lead |
| Template deprecation | Delivery lead |

**Forbidden:** Auto-updating production templates from single failed prompt without review.

---

## Versioning

- **Prompt Template:** integer version + changelog entry per promotion.
- **Prompt Artifact:** immutable version chain per ADR-004/014.
- Template updates apply to **future** packs only; approved packs remain frozen.

---

## Promotion Rules

### Improvement triggers

| Signal | Template action |
|--------|-----------------|
| Prompt structure passes ≥3 evaluations same agency type | Promote to sub-template |
| Missing reuse context caused failures | Add reuse block to template |
| Context budget exceeded repeatedly | Adjust assembly priority rules |
| Constraint missing allowed ERP duplication | Add hard constraint to all templates |
| Agency-type failure cluster | Create specialized sub-template |
| Revision loop > N on same objective type | Add exemplar + rubric tightening |

### Promotion eligibility

```
Prompt Improvement Candidate
        │
        ▼
Evidence check ──≥2 successes OR repeated failure pattern with fix validated
        │
        ▼
Anonymize exemplar prompts (strip client context)
        │
        ▼
Diff against current template
        │
        ▼
Delivery lead approval
        │
        ▼
New template version (effective next engagement)
```

### What may evolve vs what may not

| Evolvable | Not evolvable retroactively |
|-----------|----------------------------|
| Default context blocks | Approved Prompt Pack for closed engagement |
| Constraint library | Executed Cursor session prompts |
| Rubric defaults | Confirmed evaluation scores |
| Sequence recommendations | Requirement versions |

---

## Lifecycle

```
prompt executed → evaluated → (pass|fail)
        │
        ▼
retrospective closed → extraction → Prompt Candidate
        │
        ▼
review → template version bump → active for assembly
        │
        ▼
measured via prompt quality metrics (doc 15)
        │
        ▼
stale template detection on agency-type rubric change
```

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Template change breaks pass rate | Rollback version; mark regression |
| Overfitting to one client | Block promotion; insufficient anonymization |
| Template bloat (context budget) | Reject; require compression strategy |
| Conflicting constraints | Human merge; supersede old constraint |
| Rubric change invalidates history | Version rubric; do not rewrite evaluations |

---

## Audit Requirements

- `aos_prompt_improvement_candidate_created`
- `aos_prompt_template_updated_from_learning`
- `aos_prompt_template_deprecated`
- `aos_prompt_rubric_adjusted_from_learning`
- `aos_prompt_template_rollback`

Links: `templateId`, `templateVersion`, `engagementId`, `sourcePromptArtifactIds[]`, `evaluationIds[]`.

---

## Related Documents

- [15_PROMPT_QUALITY_METRICS.md](15_PROMPT_QUALITY_METRICS.md)
- `docs/aos-architecture/06_PROMPT_ENGINE.md`
- `docs/aos-adr/ADR-005_PROMPT_PACK_ARCHITECTURE.md`
