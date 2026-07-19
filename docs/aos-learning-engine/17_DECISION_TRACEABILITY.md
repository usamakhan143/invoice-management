# 17 — Decision Traceability

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Ensure every organizational learning outcome traces to **evidence, actors, and decisions** — making promotions auditable, disputes resolvable, and the flywheel trustworthy (ADR-014).

Decision traceability is the chain from retrospective lesson to active agency asset.

---

## Inputs

| Input | Source |
|-------|--------|
| All AOS workflow artifacts | Delivery pipeline |
| Approval decisions | Approval workflow |
| Promotion executions | Learning Engine |
| ADR references | Governance corpus |
| ERP ActivityLogger events | ERP |
| Version/supersession links | All engines |

---

## Outputs

| Output | Use |
|--------|-----|
| Trace graph per promotion | UI drill-down (future) |
| Evidence bundle export | Audit / dispute resolution |
| Decision lineage report | Quarterly review |
| Broken link alerts | Integrity monitoring |

---

## Ownership

| Layer | Responsibility |
|-------|----------------|
| Learning Engine | Maintains promotion trace graph |
| ERP ActivityLogger | Actor/timestamp authority |
| Each engine | Artifact version authority |
| Delivery lead | Human decision authority |

---

## Approval

Trace records are **system-generated** at promotion time. Human amendments add nodes; never delete nodes.

---

## Versioning

Trace graph append-only. Each node: `nodeId`, `nodeType`, `timestamp`, `actorUserId`, `artifactRef`, `parentNodeIds[]`.

---

## Promotion Rules

Every promotion must create trace chain minimum:

```
Retrospective (closed)
        → Learning Extraction Report
        → Candidate (version)
        → Quality gate results
        → Approval decision (reviewer)
        → Promotion execution
        → Target artifact version
        → Supersedes link (if applicable)
```

### Required links by candidate type

| Type | Required source IDs |
|------|---------------------|
| Knowledge Pattern | `retrospectiveId`, `knowledgeRecordId[]`, `approverId` |
| Module | `reuseAssessmentId`, `evaluationId`, `engagementId`, `approverId` |
| Prompt Template | `promptArtifactId[]`, `evaluationId[]`, `approverId` |
| Playbook | `retrospectiveId`, `lessonId`, `approverId` |
| Evaluation insight | `evaluationId[]`, `approverId` |

Broken chain blocks promotion (quality gate G-002).

---

## Lifecycle

Trace begins at retrospective close. Extends through asset lifetime including supersession and deprecation nodes.

Deprecated assets retain full trace — history explains why obsolete.

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Missing link in chain | Block promotion |
| Orphan promotion detected | Integrity alert + remediation |
| Actor unknown | Block until actor resolved |
| Retroactive trace edit | Forbidden; add amendment node only |

---

## Audit Requirements

All trace nodes emit ActivityLogger events. Graph export includes:

- Engagement context (non-client-leaking summary)
- Full artifact version refs
- AI model version (if AI involved)
- Gate results
- Approval/rejection rationale

Event: `aos_decision_trace_node_created`.

---

## Related Documents

- [18_LEARNING_AUDIT_TRAIL.md](18_LEARNING_AUDIT_TRAIL.md)
- [09_APPROVAL_WORKFLOW.md](09_APPROVAL_WORKFLOW.md)
- `docs/aos-adr/ADR-014_AUDIT_AND_APPEND_ONLY_POLICY.md`
