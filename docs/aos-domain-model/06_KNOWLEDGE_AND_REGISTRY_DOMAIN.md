# 06 — Knowledge & Registry Domain

Entities: **Knowledge Record**, **Knowledge Pattern**, **Retrospective**, **Agency Playbook**, **Architecture Decision Record**, **Module Registry Entry**, **Module Version**

---

## 1. Knowledge Record

### Purpose

A captured insight, lesson, observation, or fact from delivery work — raw material for the Knowledge Engine before promotion to patterns.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Scope | Engagement-scoped or company-scoped |

### Lifecycle

```
draft → active → promoted → archived
```

| State | Meaning |
|-------|---------|
| `draft` | Captured but unverified |
| `active` | Verified by team member |
| `promoted` | Elevated to Knowledge Pattern |
| `archived` | No longer relevant |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Engagement | many-to-one | Optional (engagement-scoped) |
| Retrospective | many-to-one | Optional |
| Evaluation | many-to-one | Optional (source) |
| Cursor Session | many-to-one | Optional |
| Knowledge Pattern | many-to-one | After promotion |
| Company | many-to-one | **Required** |

### Invariants

1. Must have `knowledgeType`: lesson / observation / failure_pattern / success_pattern / client_preference / process_note
2. Must have `scope`: engagement / company
3. Company-scoped records must not contain client-identifying information unless `confidential: true` and engagement-scoped
4. Promotion requires delivery lead approval

### Business Rules

| Rule | Description |
|------|-------------|
| BR-KR-01 | Auto-capture from failed evaluations creates draft records |
| BR-KR-02 | Client preferences stay engagement-scoped; never promoted |
| BR-KR-03 | ERP Discovery docs imported as seed Knowledge Records at bootstrap |

### Creation Rules

- Manual, retrospective, or system-triggered (evaluation failure)
- Creator recorded as ERP user

### Update Rules

- Editable in `draft`
- Active records: append notes only
- Promoted records immutable

### Deletion Rules

- Archive only; never hard delete promoted records

### Versioning Strategy

- Records are point-in-time; edits create amendment notes, not versions

### Audit Requirements

`aos_knowledge_record_created`, `aos_knowledge_record_promoted`, `aos_knowledge_record_archived`

### Future Extensibility

- AI summarization of session transcripts into records
- Semantic search retrieval

### Cross-Layer Interaction

- May reference BOS initiative lessons (read-only) as related context

---

## 2. Knowledge Pattern

### Purpose

Agency-wide reusable pattern promoted from Knowledge Records — feeds Prompt Templates, Module Registry, and Matching Engine.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Scope | Company-wide |

### Lifecycle

```
proposed → active → stale → deprecated
```

| State | Meaning |
|-------|---------|
| `proposed` | Promotion candidate |
| `active` | Used in retrieval and templates |
| `stale` | Flagged for review (codebase changed) |
| `deprecated` | Superseded or invalid |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Knowledge Record(s) | many-to-many | **Required** (source evidence) |
| Prompt Template(s) | many-to-many | Updated by pattern |
| Module Registry Entry(s) | many-to-many | Annotated by pattern |
| Agency Playbook | many-to-one | Optional section |
| Company | many-to-one | **Required** |

### Invariants

1. Must be anonymized — no client names or engagement-specific identifiers
2. Must have `domain` tag: architecture / prompting / reuse / quality / deployment / agency_type
3. Must have `agencyType` applicability
4. Active patterns must have ≥1 supporting Knowledge Record
5. Cannot promote without delivery lead approval

### Business Rules

| Rule | Description |
|------|-------------|
| BR-KP-01 | Patterns feed Prompt Engine context assembly |
| BR-KP-02 | Stale detection when referenced modules deprecated |
| BR-KP-03 | Duplication Report anti-patterns exist as permanent active patterns |

### Creation Rules

- Created via promotion workflow from Knowledge Record(s)
- Initial state: `proposed`

### Update Rules

- Active patterns: content updates create new pattern version with predecessor link
- Stale → active requires re-validation

### Deletion Rules

- Deprecate only

### Versioning Strategy

- `patternVersion` integer
- Predecessor link chain

### Audit Requirements

`aos_knowledge_pattern_promoted`, `aos_knowledge_pattern_stale`, `aos_knowledge_pattern_deprecated`

### Future Extensibility

- Pattern effectiveness scoring
- Cross-agency pattern sharing

### Cross-Layer Interaction

- Patterns may document ERP/BOS consumption rules (reference, not copy)

---

## 3. Retrospective

### Purpose

Structured post-engagement review capturing lessons, metrics, and promotion decisions — closes the Continuous Learning loop.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Delivery Engagement |

### Lifecycle

```
draft → submitted → closed
```

| State | Meaning |
|-------|---------|
| `draft` | Being completed |
| `submitted` | Team submitted for review |
| `closed` | Delivery lead confirmed; promotions processed |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Engagement | one-to-one | **Required** |
| Knowledge Record(s) | one-to-many | **Required** (≥1 lesson) |
| Delivery Quality Report | many-to-one | Optional input |
| Module Registry Entry(s) | many-to-many | Extraction candidates |
| Prompt Template(s) | many-to-many | Improvement candidates |

### Invariants

1. One retrospective per closed engagement
2. Must include: lessons learned, estimation comparison, reuse rate, evaluation summary
3. Cannot close engagement without retrospective reaching `closed`
4. Must record facilitator (ERP user)

### Business Rules

| Rule | Description |
|------|-------------|
| BR-RT-01 | Retrospective triggers promotion workflow for eligible Knowledge Records |
| BR-RT-02 | Module extraction candidates identified here |
| BR-RT-03 | Estimation accuracy computed from engagement metadata vs actuals |

### Creation Rules

- Created when engagement enters `handoff` or `delivering`
- Required before engagement `closed`

### Update Rules

- Editable in `draft`
- Submitted locks content; closed is terminal

### Deletion Rules

- **Forbidden** after submitted

### Versioning Strategy

- Single record per engagement; not versioned

### Audit Requirements

`aos_retrospective_submitted`, `aos_retrospective_closed`

### Future Extensibility

- Team voting on promotion candidates
- Anonymous team feedback

### Cross-Layer Interaction

- May note BOS initiative outcome alignment (read-only comparison)

---

## 4. Agency Playbook

### Purpose

Top-level company-wide delivery knowledge container — organizes Delivery Templates, Prompt Templates, Rubrics, and Knowledge Patterns into coherent agency operating guides.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Scope | Company-wide |

### Lifecycle

```
draft → active → archived
```

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Template(s) | one-to-many | Optional |
| Prompt Template(s) | one-to-many | Optional |
| Evaluation Rubric(s) | one-to-many | Optional |
| Knowledge Pattern(s) | one-to-many | Optional |
| Company | one-to-one | **Required** (one active per company) |

### Invariants

1. One active playbook per company
2. Must specify supported agency types
3. Playbook sections map to delivery lifecycle phases

### Business Rules

| Rule | Description |
|------|-------------|
| BR-AP-01 | Seeded from ERP Discovery + AOS architecture docs |
| BR-AP-02 | Playbook is the "textbook" — templates are the "worksheets" |

### Creation Rules

- Company owner or admin at AOS bootstrap

### Update Rules

- Section content editable while active (with audit)
- Major restructure creates archived version + new active

### Deletion Rules

- Archive only

### Versioning Strategy

- Playbook version integer; archived versions preserved

### Audit Requirements

`aos_playbook_updated`, `aos_playbook_archived`

### Future Extensibility

- Multi-playbook for multi-brand agencies

### Cross-Layer Interaction

- Documents ERP/BOS consumption guidelines as playbook sections

---

## 5. Architecture Decision Record (ADR)

### Purpose

Permanent record of significant technical decisions made during delivery — distinct from BOS strategic decisions and ERP activity log entries.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Scope | Engagement-scoped or company-scoped |

### Lifecycle

```
proposed → accepted → superseded | deprecated
```

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Engagement | many-to-one | Optional |
| Cursor Session | many-to-one | Optional (decision during build) |
| Knowledge Pattern | many-to-one | Optional (promoted from ADR) |
| Company | many-to-one | **Required** |

### Invariants

1. Must follow ADR structure: context, decision, consequences, alternatives considered
2. Must have `decisionScope`: engagement / company
3. Accepted ADRs immutable
4. Supersession links to successor ADR

### Business Rules

| Rule | Description |
|------|-------------|
| BR-ADR-01 | Company-scoped ADRs promoted to Knowledge Patterns when reusable |
| BR-ADR-02 | ADRs distinct from BOS `bosDecisions` — delivery vs strategic |
| BR-ADR-03 | Sidecar law violations cannot be accepted as ADRs |

### Creation Rules

- Any engagement team member during delivery
- Delivery lead accepts

### Update Rules

- Editable in `proposed`
- Accepted → immutable; supersede creates new ADR

### Deletion Rules

- **Forbidden** after accepted

### Versioning Strategy

- Supersession chain, not inline versioning

### Audit Requirements

`aos_adr_proposed`, `aos_adr_accepted`, `aos_adr_superseded`

### Future Extensibility

- Link to code locations affected
- ADR templates by agency type

### Cross-Layer Interaction

- ADRs may document why ERP module was consumed vs rebuilt

---

## 6. Module Registry Entry

### Purpose

Catalog metadata for a reusable module — component, service, utility, pattern, skill, or template available for future projects.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Scope | Company-wide |

### Lifecycle

```
draft → active → deprecated → archived
```

| State | Meaning |
|-------|---------|
| `draft` | Being registered |
| `active` | Available for matching |
| `deprecated` | Codebase module removed or superseded |
| `archived` | No longer searchable |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Module Version(s) | one-to-many | **Required** (≥1) |
| Reuse Recommendation(s) | one-to-many | Referenced in assessments |
| Prompt Artifact(s) | many-to-many | Reuse directives |
| Knowledge Pattern(s) | many-to-many | Usage notes |
| Retrospective | many-to-one | Optional (extraction source) |
| Company | many-to-one | **Required** |

### Invariants

1. Must have `moduleType`: component / service / utility / hook / domain_pattern / integration_pattern / cursor_skill / cursor_rule / prompt_template / client_extraction
2. Must have `origin`: erp_builtin / bos_pattern / aos_builtin / client_extraction / manual
3. Must have non-empty description and location reference (file path or pattern description)
4. `erp_builtin` modules must not recommend rebuild (enforced in Matching Engine)
5. Active entries must have ≥1 active Module Version
6. Name unique within company + moduleType

### Business Rules

| Rule | Description |
|------|-------------|
| BR-MR-01 | Seeded from ERP Discovery §05/§06 at bootstrap (~90 entries) |
| BR-MR-02 | Quality score updated from evaluation outcomes when module used |
| BR-MR-03 | Client extraction requires IP clearance flag |
| BR-MR-04 | Registry stores metadata only — never source code copies |

### Creation Rules

- Manual registration, retrospective extraction, or bootstrap import
- Requires `aos_registry_manage` permission

### Update Rules

- Metadata editable while active (creates Module Version if significant)
- Deprecation requires reason and optional successor entry link

### Deletion Rules

- Deprecate/archive only; never delete (usage history preserved)

### Versioning Strategy

- See Module Version entity

### Audit Requirements

`aos_module_registered`, `aos_module_deprecated`, `aos_module_extracted`

### Future Extensibility

- Cross-repo module locations
- Dependency graph between modules
- Auto-registration from evaluation success

### Cross-Layer Interaction

- `origin: erp_builtin` entries reference ERP codebase paths
- `origin: bos_pattern` entries reference BOS architecture docs

---

## 7. Module Version

### Purpose

Version snapshot of a Module Registry Entry when metadata or location changes significantly.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Parent | Module Registry Entry |

### Lifecycle

```
published (immutable from creation)
```

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Module Registry Entry | many-to-one | **Required** |
| Reuse Recommendation(s) | one-to-many | Reference version used |
| Evaluation(s) | many-to-many | Quality signals |

### Invariants

1. **Immutable** after creation
2. Monotonic `versionNumber` per entry
3. Must snapshot: description, location, dependencies, integration notes at publish time
4. Must record `publishedAt` and change reason

### Business Rules

| Rule | Description |
|------|-------------|
| BR-MV-01 | Evaluations and recommendations reference version used |
| BR-MV-02 | Quality score computed per version from usage outcomes |
| BR-MV-03 | Stale detection compares version location against codebase |

### Creation Rules

- System or manual trigger on significant metadata change
- Initial version created on registration

### Update Rules

- **None**

### Deletion Rules

- **Forbidden**

### Versioning Strategy

- This entity is the version record

### Audit Requirements

`aos_module_version_published`

### Future Extensibility

- Automated version bump on codebase commit detection

### Cross-Layer Interaction

- Location references point to ERP/BOS/AOS codebase (paths only)

---

## Knowledge & Registry Domain — Relationship Summary

```
Delivery Engagement (1) ──→ (0..1) Retrospective
Retrospective (1) ──→ (1..n) Knowledge Record
Knowledge Record (n) ──→ (0..1) Knowledge Pattern [promotion]
Agency Playbook (1) ──→ (0..n) Delivery Template / Prompt Template / Rubric / Pattern
Delivery Engagement (1) ──→ (0..n) Architecture Decision Record
Module Registry Entry (1) ──→ (1..n) Module Version
Reuse Recommendation (n) ──→ (0..1) Module Registry Entry
```

**Company isolation:** All entities scoped by `companyId`. Knowledge Pattern promotion strips client identifiers.

**ERP/BOS:** Registry entries may reference ERP/BOS artifacts by path; no data duplication.
