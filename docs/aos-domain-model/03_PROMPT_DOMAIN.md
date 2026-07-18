# 03 — Prompt Domain

Entities: **Prompt Pack**, **Prompt Artifact**, **Prompt Version**, **Prompt Template**

---

## 1. Prompt Pack

### Purpose

An ordered sequence of Prompt Artifacts that together deliver an approved Requirement Version. The unit of "what to build and in what order" for Cursor execution.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Delivery Engagement |

### Lifecycle

```
draft → in_review → approved → in_execution → completed → archived
```

| State | Meaning |
|-------|---------|
| `draft` | Artifacts being assembled |
| `in_review` | Submitted for delivery lead approval |
| `approved` | Ready for Cursor execution |
| `in_execution` | At least one session started |
| `completed` | All artifacts evaluated and passed |
| `archived` | Engagement moved on; pack frozen |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Engagement | many-to-one | **Required** |
| Requirement Version | many-to-one | **Required** |
| Reuse Assessment | many-to-one | Recommended |
| Prompt Artifact(s) | one-to-many | **Required** (≥1 before review) |
| Cursor Session(s) | one-to-many | During execution |
| Prompt Template | many-to-one | Optional (source template) |
| Evaluation(s) | one-to-many | Via sessions |

### Invariants

1. Artifacts have explicit `sequenceOrder` (unique within pack)
2. Cannot approve without ≥1 artifact
3. Cannot enter `in_execution` without `approved` state
4. Cannot `complete` until all artifacts have passing evaluations
5. Must reference Requirement Version, not draft Requirement Set
6. Sequential dependency: artifact N+1 blocked until artifact N evaluation passes

### Business Rules

| Rule | Description |
|------|-------------|
| BR-PP-01 | One active approved pack per engagement phase (multiple archived allowed) |
| BR-PP-02 | Pack must include architecture constraints block referencing AOS Core Principles |
| BR-PP-03 | Reuse directives from accepted Reuse Recommendations included in pack metadata |
| BR-PP-04 | Agency type determines default Prompt Template selection |

### Creation Rules

- Created after Requirement Set approved
- May be AI-assisted draft or manual
- Initial state: `draft`

### Update Rules

- Artifacts addable/reorderable in `draft`
- Locked on `approved` except via new pack creation
- State transitions enforce sequential execution gate

### Deletion Rules

- Draft packs with no sessions may be voided
- Approved/executed packs never deleted

### Versioning Strategy

- Pack itself has `packVersion` integer
- Significant replan creates new pack; old pack → `archived`
- Individual artifacts versioned via Prompt Version

### Audit Requirements

`aos_prompt_pack_created`, `aos_prompt_pack_approved`, `aos_prompt_pack_execution_started`, `aos_prompt_pack_completed`

### Future Extensibility

- Parallel artifact tracks (independent sequences) — deferred
- Pack templates from prior engagements

### Cross-Layer Interaction

- Context assembly reads ERP/BOS summaries (via ports) into pack metadata
- No ERP/BOS writes

---

## 2. Prompt Artifact

### Purpose

A single structured, evaluable Cursor input — one objective, one context block, one set of constraints and acceptance criteria.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Prompt Pack |

### Lifecycle

```
draft → reviewed → approved → executed → evaluated → archived
```

| State | Meaning |
|-------|---------|
| `draft` | Being authored |
| `reviewed` | Delivery lead reviewed |
| `approved` | Ready for Cursor |
| `executed` | Session recorded |
| `evaluated` | Evaluation complete |
| `archived` | Superseded or pack complete |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Prompt Pack | many-to-one | **Required** |
| Prompt Version(s) | one-to-many | **Required** (≥1 on approve) |
| Evaluation Rubric | many-to-one | **Required** |
| Cursor Session(s) | one-to-many | After execution |
| Evaluation(s) | one-to-many | After evaluation |
| Requirement(s) | many-to-many | Optional traceability |
| Module Registry Entry(s) | many-to-many | Optional reuse directives |

### Invariants

1. Must have: objective, constraints, acceptance criteria
2. Must have evaluation rubric assigned before approval
3. Must have `sequenceOrder` within pack
4. `approved` artifacts are immutable — changes create Prompt Version
5. Context block must respect context budget metadata (size guidance)
6. Cannot execute without `approved` state

### Business Rules

| Rule | Description |
|------|-------------|
| BR-PA-01 | One objective per artifact — no multi-objective prompts |
| BR-PA-02 | Constraints must include sidecar law reference for ERP-facing work |
| BR-PA-03 | Failed evaluation blocks next artifact in pack until revision passes |
| BR-PA-04 | Artifact type: architecture / infrastructure / application / ui / quality / integration |

### Creation Rules

- Created within draft Prompt Pack
- May clone from Prompt Template
- Rubric defaults from Delivery Template

### Update Rules

- Editable in `draft` and `reviewed`
- Approve creates Prompt Version snapshot
- Post-approve changes require new Prompt Version

### Deletion Rules

- Removable from draft pack only
- Approved artifacts never deleted

### Versioning Strategy

- Mutable head until approved
- Each approval creates Prompt Version (immutable)
- Revisions after failed evaluation create new Prompt Version

### Audit Requirements

`aos_prompt_artifact_created`, `aos_prompt_artifact_approved`, `aos_prompt_artifact_executed`

### Future Extensibility

- AI-generated draft artifacts
- Context block auto-assembly from Knowledge Engine

### Cross-Layer Interaction

- Reuse directives reference Module Registry (AOS)
- Constraints cite ERP/BOS rules by reference, not data copy

---

## 3. Prompt Version

### Purpose

Immutable snapshot of an approved Prompt Artifact at a specific point — including all content fields and rubric reference.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Prompt Artifact |

### Lifecycle

```
published (immutable from creation)
```

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Prompt Artifact | many-to-one | **Required** |
| Cursor Session | one-to-many | Sessions reference version executed |
| Evaluation | one-to-many | Evaluations reference version scored |

### Invariants

1. **Immutable** — no updates
2. Monotonic `versionNumber` per Prompt Artifact
3. Must record `publishedAt` and `publishedByUserId`
4. Full content snapshot embedded (objective, context, constraints, criteria)

### Business Rules

| Rule | Description |
|------|-------------|
| BR-PV-01 | Cursor Session must reference exact Prompt Version executed |
| BR-PV-02 | Evaluation compares output against this version's acceptance criteria |
| BR-PV-03 | Failed evaluation → new version created for revision, not edit of existing |

### Creation Rules

- System-created on artifact approval or revision
- No manual creation

### Update Rules

- **None**

### Deletion Rules

- **Forbidden**

### Versioning Strategy

- This entity is the version record

### Audit Requirements

`aos_prompt_version_published`

### Future Extensibility

- Diff between versions for revision tracking

### Cross-Layer Interaction

- None

---

## 4. Prompt Template

### Purpose

Company-wide reusable starting configuration for Prompt Artifacts — agency-type and artifact-type specific. Evolves through Continuous Learning.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Scope | Company-wide |

### Lifecycle

```
draft → active → deprecated
```

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Template | many-to-many | Optional |
| Agency Playbook | many-to-one | Optional |
| Prompt Artifact(s) | one-to-many | Cloned from template |
| Knowledge Pattern(s) | many-to-many | Source of improvements |
| Company | many-to-one | **Required** |

### Invariants

1. Must specify `agencyType` and `artifactType`
2. Template name unique within company + agencyType + artifactType
3. Active templates must include default constraints block
4. Cannot deprecate if sole active template for type without replacement

### Business Rules

| Rule | Description |
|------|-------------|
| BR-PT-01 | Seeded from architecture docs at bootstrap |
| BR-PT-02 | Improvements from Knowledge Pattern promotion update template (new version) |
| BR-PT-03 | Templates are starting points — artifacts customize per engagement |

### Creation Rules

- Admin or delivery lead with `aos_templates_manage`
- Initial state: `draft`

### Update Rules

- Draft editable freely
- Active template changes create new template version (see Module Version pattern)
- Deprecation requires replacement template exists

### Deletion Rules

- Deprecate only; never delete

### Versioning Strategy

- `templateVersion` integer on template head
- Significant changes: new version record or new template with predecessor link

### Audit Requirements

`aos_prompt_template_created`, `aos_prompt_template_activated`, `aos_prompt_template_deprecated`, `aos_prompt_template_improved`

### Future Extensibility

- Cross-agency template sharing
- Template effectiveness score from evaluation pass rates

### Cross-Layer Interaction

- Constraints may reference Cursor rules/skills by path (metadata, not copy)

---

## Prompt Domain — Relationship Summary

```
Delivery Engagement (1) ──→ (0..n) Prompt Pack
Requirement Version (1) ──→ (0..n) Prompt Pack
Prompt Pack (1) ──→ (1..n) Prompt Artifact [ordered]
Prompt Artifact (1) ──→ (1..n) Prompt Version
Prompt Artifact (n) ──→ (1) Evaluation Rubric
Prompt Template (1) ──→ (0..n) Prompt Artifact [clone source]
Cursor Session (n) ──→ (1) Prompt Version
```

**Company isolation:** All entities scoped by `companyId`.

**ERP/BOS:** Context summaries only; no writes.
