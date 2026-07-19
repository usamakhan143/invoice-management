# 10 — Versioning Strategy

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define how all Learning Engine artifacts version, supersede, and remain traceable — aligned with ADR-013 and ADR-014 append-only evidence policy.

Organizational learning must be **evolvable without erasing history**.

---

## Inputs

| Input | Source |
|-------|--------|
| Promotion approvals | Approval workflow |
| Source engagement artifacts | AOS domains |
| Prior versions of patterns/templates/modules | AOS stores |
| Supersession decisions | Human reviewers |
| Platform change events | ERP/BOS |

---

## Outputs

| Output | Characteristics |
|--------|-----------------|
| Versioned Knowledge Patterns | Integer version + predecessor |
| Versioned Prompt Templates | Integer version + changelog |
| Versioned Module Versions | Semver |
| Versioned Playbook sections | Section version + effective date |
| Immutable extraction reports | Point-in-time snapshot |
| Supersession links | Graph of obsoleted → current |

---

## Ownership

| Artifact | Version authority |
|----------|-------------------|
| Knowledge Pattern | AOS Knowledge Engine |
| Prompt Template | Prompt Engine |
| Module Version | Module Registry |
| Agency Playbook section | Agency Playbook |
| Learning Extraction Report | Learning Engine |
| Evaluation rubric | Evaluation Engine |

---

## Approval

Material version bumps (content change affecting future behavior) require same approval as initial promotion. Metadata-only annotations may append without version bump if explicitly marked non-behavioral.

---

## Versioning

### Version models by artifact

| Artifact | Model | Immutable? |
|----------|-------|------------|
| Learning Extraction Report | Single publish version | Yes after publish |
| Learning Candidate | Candidate version integer | Prior versions archived |
| Knowledge Record | Amendment notes only | Core immutable after `active` |
| Knowledge Pattern | `patternVersion` + predecessor | Prior versions read-only |
| Prompt Template | `templateVersion` + changelog | Prior versions read-only |
| Prompt Artifact | Per ADR-004 prompt version chain | Yes |
| Module Version | Semver | Prior versions read-only |
| Playbook section | `sectionVersion` | History retained |
| Evaluation | Append-only confirmed results | Yes |
| Retrospective | Append-only after `submitted` | Yes |

### Supersession rules

1. New version must link `supersedesId`.
2. Old version moves to `deprecated` or `stale`, not deleted.
3. Engagements reference versions active at their lifecycle phase for audit replay.

### Correction without rewrite

| Correction type | Mechanism |
|-----------------|-----------|
| Factual error in active pattern | New pattern version + deprecate old |
| Wrong promotion | Deprecate + audit correction note |
| Typo in playbook | Minor amendment OR section version bump |
| Evaluation dispute | New evaluation record; never edit confirmed |

---

## Promotion Rules

- Promotions always create or bump **forward** versions.
- Rollback permitted only to prior approved version (explicit `rollback` audit event).
- Bootstrap corpus versions tagged `canonical-v0` — superseded by promoted patterns, not deleted.

---

## Lifecycle

```
artifact v1 (active)
        │
        ▼
learning suggests change → candidate → approval
        │
        ▼
artifact v2 (active) ──supersedes──→ v1 (deprecated)
        │
        ▼
stale detection may flag v2 → review → v3 or re-validate v2
```

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Version fork (two active successors) | Block; require merge |
| Missing predecessor link | Block publication |
| Rollback without audit | Forbidden |
| In-place edit of append-only artifact | Forbidden (ADR-014) |

---

## Audit Requirements

- `aos_artifact_version_created`
- `aos_artifact_superseded`
- `aos_artifact_rollback`
- `aos_artifact_deprecated`

Metadata: `artifactType`, `artifactId`, `fromVersion`, `toVersion`, `actorUserId`, `reason`.

---

## Related Documents

- `docs/aos-adr/ADR-013_VERSIONING_POLICY.md`
- `docs/aos-adr/ADR-014_AUDIT_AND_APPEND_ONLY_POLICY.md`
- [18_LEARNING_AUDIT_TRAIL.md](18_LEARNING_AUDIT_TRAIL.md)
