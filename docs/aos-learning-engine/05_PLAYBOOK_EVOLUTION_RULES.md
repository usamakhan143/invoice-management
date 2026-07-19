# 05 — Playbook Evolution Rules

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define how **Agency Playbooks** evolve from delivery experience — capturing process improvements, checklists, agency-type workflows, and deployment patterns as organizational learning rather than static documents.

Playbooks encode **how the agency delivers**, complementing Knowledge Patterns (what we learned) and Module Registry (what we reuse).

---

## Inputs

| Input | Source |
|-------|--------|
| Retrospective process lessons | Retrospective |
| Playbook update proposals | Learning Extraction |
| Evaluation insights (process domain) | Evaluation Engine |
| Agency type + engagement type | Engagement metadata |
| BOS delivery playbook | Bootstrap reference |
| Knowledge Patterns (process/deployment) | Knowledge Engine |
| Estimation vs actual variance | Engagement metrics |

---

## Outputs

| Output | Destination |
|--------|-------------|
| Agency Playbook section update | Agency Playbook entity |
| New checklist item | Playbook section |
| Revised estimation guidance | Playbook + metrics |
| Deprecated section marker | Playbook archive |
| Cross-link to Knowledge Pattern | Bidirectional reference |

---

## Ownership

| Role | Responsibility |
|------|----------------|
| Agency Playbook entity | AOS |
| Delivery lead | Section update approval |
| Agency owner | Strategic playbook changes |
| BOS | Strategic playbooks (read-only input) |

**Boundary:** BOS strategic lessons may inform AOS playbooks; AOS does not write to BOS automatically.

---

## Approval

| Change scope | Approver |
|--------------|----------|
| Section add/amend (tactical) | Delivery lead |
| Agency-type playbook restructure | Delivery lead + agency owner |
| Estimation calibration update | Delivery lead |
| Deprecate section | Delivery lead |
| Contradicts ADR/architecture | Architecture owner escalation |

---

## Versioning

- Playbook sections carry `sectionVersion` integer.
- Effective date recorded on activation.
- Prior section content retained in append-only history (ADR-014).
- Engagements reference playbook version active at intake for traceability.

---

## Promotion Rules

### Eligible playbook updates

| Lesson type | Playbook target |
|-------------|-----------------|
| Deployment missed step | Deployment checklist section |
| Agency-type specific process | Agency-type playbook |
| Intake estimation error | Estimation guidance section |
| QA/handoff gap | Handoff checklist |
| Client communication (generic) | Process section (no client names) |
| Tooling/workflow improvement | Tools & workflow section |

### Ineligible (never in playbook)

- Client-specific preferences → engagement-scoped only
- One-off shortcuts that violate ADRs
- Individual performance notes
- Unvalidated AI suggestions

### Promotion flow

```
Retrospective process lesson
        │
        ▼
Playbook Proposal Candidate
        │
        ▼
Generalization check (no client IDs)
        │
        ▼
ADR/architecture compatibility check
        │
        ▼
Delivery lead approval
        │
        ▼
Section version bump → effective next engagement intake
```

### Deviation learning

When team **successfully deviates** from playbook:

1. Record deviation in retrospective.
2. If deviation improves outcome → candidate to update playbook.
3. If deviation indicates playbook error → priority promotion candidate.

---

## Lifecycle

```
bootstrap (business playbook import)
        │
        ▼
active playbook sections
        │
        ▼
engagement deviations + retrospective lessons
        │
        ▼
proposed section updates
        │
        ▼
approved → new section version
        │
        ▼
stale section (platform change) → review queue
        │
        ▼
deprecated (superseded)
```

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Client name in playbook update | Block promotion |
| Playbook contradicts ADR | Escalate; hold activation |
| Section update without evidence | Require retrospective link |
| Playbook sprawl (unmaintained sections) | Quarterly review mandate |
| Duplicate checklist items | Merge on review |

---

## Audit Requirements

- `aos_playbook_proposal_created`
- `aos_playbook_section_updated`
- `aos_playbook_section_deprecated`
- `aos_playbook_deviation_recorded`

Links: `playbookId`, `sectionId`, `sectionVersion`, `retrospectiveId`, `engagementId`.

---

## Related Documents

- [02_KNOWLEDGE_PROMOTION_RULES.md](02_KNOWLEDGE_PROMOTION_RULES.md)
- `docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md` (Agency Playbook entity)
- `docs/business/08_Delivery_Playbook.md` (bootstrap)
