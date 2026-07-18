# 02 — Requirements Domain

Entities: **Requirement Set**, **Requirement**, **Requirement Attachment**, **Requirement Version**, **Reuse Assessment**, **Reuse Recommendation**

---

## 1. Requirement Set

### Purpose

The approved scope container for a delivery engagement — groups all requirements that define what must be built.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Delivery Engagement |

### Lifecycle

```
draft → in_review → approved → superseded
```

| State | Meaning |
|-------|---------|
| `draft` | Requirements being captured |
| `in_review` | Submitted for delivery lead approval |
| `approved` | Frozen scope baseline for planning |
| `superseded` | Replaced by newer approved set |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Engagement | many-to-one | **Required** |
| Requirement(s) | one-to-many | **Required** (≥1 before review) |
| Requirement Version | one-to-many | Auto on approve |
| Reuse Assessment | one-to-many | Recommended before approve |
| Prompt Pack | one-to-many | Created after approve |

### Invariants

1. At most one `approved` set per engagement at any time
2. Approved set cannot be edited — changes require new set or new version workflow
3. Must contain ≥1 Requirement before `in_review`
4. Same `companyId` as parent engagement

### Business Rules

| Rule | Description |
|------|-------------|
| BR-RS-01 | Scope change after approval creates new Requirement Set (prior → superseded) |
| BR-RS-02 | Minor clarifications may add Requirements to draft set only |
| BR-RS-03 | Approval requires delivery lead or `aos_requirements_approve` permission |

### Creation Rules

- Created when engagement enters `discovery`
- Linked to exactly one engagement
- Initial state: `draft`

### Update Rules

- Metadata editable in `draft` and `in_review`
- State transitions only via approval workflow
- `superseded` is terminal

### Deletion Rules

- **Physical delete forbidden** if ever approved
- Draft sets with zero requirements may be voided (soft cancel)

### Versioning Strategy

- On `approved`, system creates Requirement Version snapshot (frozen copy)
- Set points to `currentApprovedVersionId`

### Audit Requirements

`aos_requirement_set_created`, `aos_requirement_set_submitted`, `aos_requirement_set_approved`, `aos_requirement_set_superseded`

### Future Extensibility

- Diff view between versions
- Partial approval (phased scope) — deferred
- Import from external spec formats

### Cross-Layer Interaction

- Requirements may reference ERP product catalog items (read port) as context
- No ERP/BOS writes

---

## 2. Requirement

### Purpose

A single testable need, constraint, or acceptance criterion within a Requirement Set.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Requirement Set |

### Lifecycle

```
active → removed
```

Requirements do not have complex lifecycles individually — the Set lifecycle governs approval.

| State | Meaning |
|-------|---------|
| `active` | Part of current set |
| `removed` | Soft-removed from draft set before approval |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Requirement Set | many-to-one | **Required** |
| Requirement Attachment(s) | one-to-many | Optional |
| Reuse Recommendation(s) | one-to-many | Optional (via assessment) |
| Prompt Artifact(s) | many-to-many | Optional (traceability) |
| Evaluation(s) | many-to-many | Optional (coverage mapping) |

### Invariants

1. Must have non-empty title and description
2. Must have category: functional / technical / constraint / acceptance / non_functional
3. Priority: must_have / should_have / could_have / wont_have (MoSCoW — not story points)
4. Cannot exist outside a Requirement Set
5. Immutable after parent Set approved (captured in Version snapshot)

### Business Rules

| Rule | Description |
|------|-------------|
| BR-R-01 | Each requirement must have ≥1 acceptance criterion before set submission |
| BR-R-02 | Requirements traceable to evaluations (coverage matrix) |
| BR-R-03 | Duplicate detection warns on similar titles within set |

### Creation Rules

- Created within draft Requirement Set
- Creator: any engagement team member with `aos_requirements_edit`

### Update Rules

- Editable while parent Set is `draft`
- Locked when parent Set is `in_review` or `approved`

### Deletion Rules

- Soft-remove (`removed`) in draft only
- Approved requirements preserved in Version snapshot forever

### Versioning Strategy

- Individual requirements versioned only via Requirement Version snapshots (not per-requirement versioning)

### Audit Requirements

`aos_requirement_added`, `aos_requirement_updated`, `aos_requirement_removed`

### Future Extensibility

- Requirement linking (depends-on / blocks)
- AI-generated requirement suggestions (flagged as `source: ai_draft`)

### Cross-Layer Interaction

- May cite ERP customer business context (read-only summary)
- May align to BOS initiative success criteria (read-only reference field)

---

## 3. Requirement Attachment

### Purpose

Supplementary material linked to a requirement — client briefs, wireframe references, API docs, meeting notes. Metadata and reference only (storage mechanism deferred).

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Requirement |

### Lifecycle

```
active → archived
```

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Requirement | many-to-one | **Required** |
| Delivery Engagement | many-to-one | Denormalized for query |

### Invariants

1. Must have attachment type: document / url / image / spec / other
2. URL attachments must be valid URL format
3. Same `companyId` as requirement
4. Cannot attach to requirement in approved set (add to new draft set instead)

### Business Rules

| Rule | Description |
|------|-------------|
| BR-RA-01 | Attachments excluded from cross-project knowledge promotion |
| BR-RA-02 | Client-confidential attachments flagged `confidential: true` |

### Creation Rules

- While parent Requirement Set is `draft`
- Uploader recorded as ERP user

### Update Rules

- Label/description editable in draft
- Archive only after set approval

### Deletion Rules

- Archive, not physical delete (audit trail)

### Versioning Strategy

- Attachments snapshotted in Requirement Version on approve

### Audit Requirements

`aos_requirement_attachment_added`, `aos_requirement_attachment_archived`

### Future Extensibility

- File storage integration (Firebase Storage or equivalent)
- OCR / AI summarization of attached documents

### Cross-Layer Interaction

- None with ERP/BOS data stores

---

## 4. Requirement Version

### Purpose

Immutable frozen snapshot of an approved Requirement Set at a point in time.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Requirement Set |

### Lifecycle

```
published (only state — immutable from creation)
```

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Requirement Set | many-to-one | **Required** |
| Requirement(s) | one-to-many | **Embedded snapshot** |
| Requirement Attachment(s) | one-to-many | **Embedded snapshot** |
| Delivery Engagement | many-to-one | Denormalized |
| Prompt Pack(s) | one-to-many | Packs reference version |

### Invariants

1. **Immutable after creation** — no updates ever
2. Monotonic `versionNumber` per Requirement Set (1, 2, 3…)
3. Snapshot includes all active requirements and attachments at approval moment
4. Must record `approvedByUserId` and `approvedAt`

### Business Rules

| Rule | Description |
|------|-------------|
| BR-RV-01 | Prompt Packs must reference a Requirement Version, not mutable draft |
| BR-RV-02 | Evaluations map coverage to Requirement Version items |
| BR-RV-03 | Diff between versions is derived, not stored |

### Creation Rules

- System-created only on Requirement Set approval
- No manual creation

### Update Rules

- **None** — immutable

### Deletion Rules

- **Forbidden** — permanent audit record

### Versioning Strategy

- This entity IS the version record

### Audit Requirements

`aos_requirement_version_published` (includes version number)

### Future Extensibility

- Computed diff against prior version
- Formal change log between versions

### Cross-Layer Interaction

- None

---

## 5. Reuse Assessment

### Purpose

Structured analysis of which existing modules can satisfy engagement requirements — the formal output of the Matching Engine query.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Delivery Engagement |

### Lifecycle

```
draft → finalized
```

| State | Meaning |
|-------|---------|
| `draft` | Recommendations being generated/reviewed |
| `finalized` | Accepted as input to planning |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Engagement | many-to-one | **Required** |
| Requirement Set | many-to-one | **Required** |
| Reuse Recommendation(s) | one-to-many | **Required** (≥0 recommendations valid — gaps are findings) |
| Module Registry Entry(s) | many-to-many | Via recommendations |
| Prompt Pack | many-to-one | Informs pack generation |

### Invariants

1. One finalized assessment per Requirement Set version recommended (multiple drafts allowed)
2. Must record assessment timestamp and assessor (human or ai_assisted flag)
3. Gap count and reuse count are derived from recommendations

### Business Rules

| Rule | Description |
|------|-------------|
| BR-UA-01 | Every ERP-owned module in recommendation must be marked `action: consume` not `rebuild` |
| BR-UA-02 | Duplication Report anti-patterns auto-flag rebuild recommendations as errors |
| BR-UA-03 | Finalized assessment required before Prompt Pack generation (recommended gate) |

### Creation Rules

- Triggered manually or by AI Orchestration during discovery
- Requires draft Requirement Set with ≥1 requirement

### Update Rules

- Recommendations editable in `draft`
- Finalize locks assessment

### Deletion Rules

- Draft assessments may be voided
- Finalized assessments preserved

### Versioning Strategy

- New assessment per Requirement Set version
- Not versioned itself — linked to Requirement Version

### Audit Requirements

`aos_reuse_assessment_created`, `aos_reuse_assessment_finalized`

### Future Extensibility

- Automated re-assessment on registry changes
- Confidence scoring from Matching Engine

### Cross-Layer Interaction

- Reads Module Registry (AOS)
- Reads ERP Discovery seed classifications (initial bootstrap)

---

## 6. Reuse Recommendation

### Purpose

A single line item within a Reuse Assessment — match, partial match, or gap for one requirement against one module.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Reuse Assessment |

### Lifecycle

```
proposed → accepted → rejected
```

| State | Meaning |
|-------|---------|
| `proposed` | System or AI suggested |
| `accepted` | Delivery team confirms reuse |
| `rejected` | Team declines with reason |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Reuse Assessment | many-to-one | **Required** |
| Requirement | many-to-one | **Required** |
| Module Registry Entry | many-to-one | Optional (null = gap identified) |

### Invariants

1. Must have recommendation type: `direct_reuse` / `extend` / `pattern_only` / `gap`
2. `gap` type must have null module reference and non-empty gap description
3. Rejected recommendations must have rejection reason
4. Cannot recommend rebuilding ERP-owned modules (validation error)

### Business Rules

| Rule | Description |
|------|-------------|
| BR-RR-01 | Accepted recommendations flow into Prompt Pack reuse directives |
| BR-RR-02 | Rejected recommendations feed Continuous Learning (why wasn't module used?) |
| BR-RR-03 | Multiple recommendations per requirement allowed (ranked) |

### Creation Rules

- Created by Matching Engine or manually in draft assessment
- Rank order assigned

### Update Rules

- Status transitions: proposed → accepted/rejected
- No edit after accepted/rejected

### Deletion Rules

- Removable only while parent assessment is `draft`

### Versioning Strategy

- Snapshotted when assessment finalized

### Audit Requirements

`aos_reuse_recommendation_accepted`, `aos_reuse_recommendation_rejected`

### Future Extensibility

- Auto-accept above confidence threshold
- Cost/effort estimate per recommendation

### Cross-Layer Interaction

- Module Registry Entry may point to ERP/BOS codebase locations (metadata only)

---

## Requirements Domain — Relationship Summary

```
Delivery Engagement (1) ──→ (0..n) Requirement Set
Requirement Set (1) ──→ (1..n) Requirement
Requirement (1) ──→ (0..n) Requirement Attachment
Requirement Set (1) ──→ (0..n) Requirement Version [on approve]
Requirement Set (1) ──→ (0..n) Reuse Assessment
Reuse Assessment (1) ──→ (0..n) Reuse Recommendation
Reuse Recommendation (n) ──→ (0..1) Module Registry Entry
Reuse Recommendation (n) ──→ (1) Requirement
```

**Company isolation:** All entities carry `companyId` from parent engagement.

**ERP/BOS:** Read-only context on requirements; no FK writes to ERP/BOS collections.
