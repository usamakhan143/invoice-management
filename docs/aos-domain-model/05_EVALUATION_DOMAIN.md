# 05 — Evaluation Domain

Entities: **Evaluation**, **Evaluation Rubric**

---

## 1. Evaluation

### Purpose

Structured scoring of a Cursor Session output against a Prompt Version's acceptance criteria and Evaluation Rubric — objective quality gate.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Subject | Cursor Session |

### Lifecycle

```
pending → scored → confirmed | overridden
```

| State | Meaning |
|-------|---------|
| `pending` | Awaiting Evaluation Engine |
| `scored` | Engine produced scores |
| `confirmed` | Human confirmed scores |
| `overridden` | Human changed scores with recorded reason |

Terminal: `confirmed`, `overridden`

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Cursor Session | one-to-one | **Required** |
| Evaluation Rubric | many-to-one | **Required** |
| Prompt Version | many-to-one | Denormalized |
| Prompt Artifact | many-to-one | Denormalized |
| Delivery Engagement | many-to-one | Denormalized |
| Cursor Revision | one-to-one | Created if outcome = fail |
| Requirement(s) | many-to-many | Coverage mapping |
| Knowledge Record | one-to-many | Created on failure patterns |

### Invariants

1. One primary evaluation per session (re-scores create amendment records)
2. Must have overall outcome: `pass` / `fail` / `conditional_pass`
3. Every rubric dimension must have score + evidence
4. `overridden` must include override reason and override user
5. Scores immutable after `confirmed` or `overridden`
6. Pass threshold defined on rubric, not per evaluation

### Business Rules

| Rule | Description |
|------|-------------|
| BR-EV-01 | Fail on sidecar law violation detected in output (automatic dimension) |
| BR-EV-02 | Fail on ERP module duplication detected (automatic dimension) |
| BR-EV-03 | Conditional pass allowed with documented follow-up items |
| BR-EV-04 | Evaluation Engine may assist; human confirmation required in Phase 3 |
| BR-EV-05 | Fail triggers Cursor Revision workflow automatically |

### Creation Rules

- System-created when Cursor Session moves to `captured`
- Rubric inherited from Prompt Artifact

### Update Rules

- Scores editable in `scored` (by engine re-run)
- Human confirmation locks record
- Override creates audit trail, not silent edit

### Deletion Rules

- **Append-only — never delete**

### Versioning Strategy

- Evaluations are point-in-time records
- Amendment evaluations linked to original via `amendsEvaluationId`

### Audit Requirements

`aos_evaluation_scored`, `aos_evaluation_confirmed`, `aos_evaluation_overridden`, `aos_evaluation_failed`

### Future Extensibility

- Fully automated pass/fail in Phase 5
- ML-based regression detection against prior engagements
- Client-specific rubric overlays

### Cross-Layer Interaction

- Sidecar/duplication checks reference ERP module inventory (read port / registry)
- ActivityLogger on fail/pass

---

## 2. Evaluation Rubric

### Purpose

Reusable scoring framework defining dimensions, weights, and pass thresholds for evaluating Cursor outputs.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Scope | Company-wide with agency-type variants |

### Lifecycle

```
draft → active → deprecated
```

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Prompt Artifact(s) | one-to-many | Assigned to artifacts |
| Delivery Template | many-to-many | Default rubrics |
| Evaluation(s) | one-to-many | Scoring instances |
| Agency Playbook | many-to-one | Optional parent |
| Company | many-to-one | **Required** |

### Invariants

1. Must define ≥1 scoring dimension with weight
2. Weights sum to 100 (or normalized equivalent)
3. Must define pass threshold (numeric)
4. Must specify `agencyType` applicability (or `all`)
5. Must include mandatory dimensions: `requirement_coverage`, `architecture_compliance`
6. Active rubric name unique within company + agencyType + artifactType

### Standard Dimensions (minimum set)

| Dimension | Weight (default) | Description |
|-----------|-----------------|-------------|
| `requirement_coverage` | 25 | Output addresses acceptance criteria |
| `reuse_compliance` | 20 | Used recommended modules |
| `architecture_compliance` | 20 | Layer discipline, sidecar law |
| `scope_discipline` | 15 | No scope creep beyond prompt |
| `quality` | 20 | Code quality, completeness |

Agency-type rubrics add specialized dimensions (e.g., `accessibility` for web, `model_accuracy` for AI).

### Business Rules

| Rule | Description |
|------|-------------|
| BR-ER-01 | Rubrics seeded at bootstrap with AOS architecture constraints |
| BR-ER-02 | Evaluations reference rubric version active at scoring time |
| BR-ER-03 | Rubric changes do not retroactively alter past evaluations |

### Creation Rules

- Admin or delivery lead with `aos_rubrics_manage`
- Initial state: `draft`

### Update Rules

- Draft editable
- Active rubric changes create new rubric version (new record with predecessor link)
- Deprecation requires successor

### Deletion Rules

- Deprecate only

### Versioning Strategy

- `rubricVersion` integer
- Evaluations store `rubricVersionId` used at score time

### Audit Requirements

`aos_rubric_created`, `aos_rubric_activated`, `aos_rubric_deprecated`

### Future Extensibility

- Custom dimensions per engagement type
- Rubric effectiveness analytics from evaluation outcomes

### Cross-Layer Interaction

- `architecture_compliance` dimension checks against documented ERP/BOS patterns

---

## Evaluation Domain — Relationship Summary

```
Evaluation Rubric (1) ──→ (0..n) Prompt Artifact
Evaluation Rubric (1) ──→ (0..n) Evaluation
Cursor Session (1) ──→ (1) Evaluation
Evaluation (1) ──→ (0..1) Cursor Revision [if fail]
Evaluation (1) ──→ (0..n) Knowledge Record [if pattern extracted]
```

**Company isolation:** All entities scoped by `companyId`.

**ERP/BOS:** Rubric dimensions may reference ERP/BOS compliance rules conceptually.
