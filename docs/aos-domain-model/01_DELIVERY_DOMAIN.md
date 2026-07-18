# 01 — Delivery Domain

Entities: **Delivery Engagement**, **Delivery Template**, **Delivery Quality Report**

---

## 1. Delivery Engagement

### Purpose

The primary AOS container for all software delivery work on behalf of a client. Represents "how we build this piece of software" — distinct from ERP customer records and BOS strategic initiatives.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Client identity | ERP (referenced) |
| Strategic context | BOS (optional reference) |
| Delivery lead identity | ERP user (referenced) |

### Lifecycle

```
draft → intake → discovery → planning → building → evaluating → delivering → handoff → closed
                                                                          ↘ cancelled (from any active state)
                                                                          ↘ paused (from any active state except closed/cancelled)
```

| State | Meaning | Entry condition |
|-------|---------|-----------------|
| `draft` | Engagement being set up | Created |
| `intake` | Client linked, scope captured | Intake checklist started |
| `discovery` | Requirements in progress | Requirement Set opened |
| `planning` | Prompt pack being prepared | Requirement Set approved |
| `building` | Cursor execution underway | Prompt Pack approved |
| `evaluating` | Outputs under evaluation | All sessions submitted OR phase gate |
| `delivering` | QA and documentation | Evaluations passing |
| `handoff` | Client delivery in progress | QA complete |
| `closed` | Retrospective complete | Retrospective submitted |
| `paused` | Temporarily halted | Manual pause |
| `cancelled` | Terminated | Manual cancel with reason |

**Invariant:** State transitions are forward-only except `paused` ↔ previous active state and `cancelled` from any non-terminal state.

### Relationships

| Related entity | Cardinality | Required? | Notes |
|----------------|-------------|-----------|-------|
| ERP Customer | many-to-one | **Required** | `erpCustomerId` |
| ERP Lead | many-to-one | Optional | Origin lead if converted |
| BOS Initiative | many-to-one | Optional | Strategic alignment |
| BOS Venture | many-to-one | Optional | Denormalized from initiative for query |
| Delivery Template | many-to-one | Optional | Applied at intake |
| Requirement Set | one-to-one | Required before `discovery` exit | One active set per engagement |
| Prompt Pack(s) | one-to-many | Required before `building` | May have multiple packs per phase |
| Reuse Assessment(s) | one-to-many | Optional | At least one before planning recommended |
| Cursor Session(s) | one-to-many | Required during `building` | |
| Evaluation(s) | one-to-many | Required during `evaluating` | |
| Retrospective | one-to-one | Required before `closed` | |
| Delivery Quality Report | one-to-one | Optional | Generated at handoff/close |
| Architecture Decision Record(s) | one-to-many | Optional | |
| Delivery lead (ERP user) | many-to-one | **Required** | |
| Team members (ERP users) | many-to-many | Optional | References only |

### Invariants

1. `erpCustomerId` must resolve to same `companyId` as engagement
2. If `bosInitiativeId` set, initiative must belong to same `companyId`
3. BOS initiative ≠ delivery engagement (forbidden alias per BOS `relationships.ts`)
4. Cannot reach `building` without approved Requirement Set
5. Cannot reach `closed` without completed Retrospective
6. Cannot have two active (non-superseded) Requirement Sets simultaneously
7. Engagement title must be non-empty

### Business Rules

| Rule | Description |
|------|-------------|
| BR-DE-01 | One engagement may serve one ERP customer; one customer may have many engagements |
| BR-DE-02 | Agency type profile (web/mobile/AI/SaaS) set at intake; change requires audit note |
| BR-DE-03 | Engagement type (greenfield/enhancement/maintenance/migration) determines Delivery Template suggestions |
| BR-DE-04 | Paused engagements retain all artifacts; no state rollback of completed work |
| BR-DE-05 | Cancelled engagements preserve all artifacts for audit; no physical delete |
| BR-DE-06 | Retainer engagements use same entity with `engagementType = maintenance` and recurring quality reports |

### Creation Rules

- Creator must have `aos_engagements_manage` permission (conceptual key)
- `erpCustomerId` required and validated via ERP Customer read port
- `companyId` derived from actor scope, not user-supplied
- Initial state: `draft`
- `deliveryLeadUserId` defaults to creator unless specified

### Update Rules

- Metadata (title, scope summary, team) editable until `closed` or `cancelled`
- State transitions validated by lifecycle rules
- `erpCustomerId` immutable after `intake`
- `bosInitiativeId` may be set/unset until `planning`; after `planning` changes require audit note
- Agency type profile change after `discovery` requires delivery lead approval

### Deletion Rules

- **Physical delete forbidden**
- Cancelled engagements remain queryable
- Archive flag may be set after `closed` + retention period (future)

### Versioning Strategy

Engagement itself is not versioned. Child artifacts (requirements, prompts) carry their own versions. Engagement stores pointer to current approved versions.

### Audit Requirements

| Event | ActivityLogger type (conceptual) |
|-------|----------------------------------|
| Created | `aos_engagement_created` |
| State changed | `aos_engagement_state_changed` |
| Linked to BOS initiative | `aos_engagement_bos_linked` |
| Paused / resumed | `aos_engagement_paused` / `aos_engagement_resumed` |
| Cancelled | `aos_engagement_cancelled` |
| Closed | `aos_engagement_closed` |

### Future Extensibility

- Recurring engagement cycles (retainer billing periods)
- Multi-repo delivery (client code in separate repositories)
- Client portal visibility flags
- SLA and deadline tracking (without becoming PM due dates)
- ERP invoice milestone linkage references

### Cross-Layer Interaction

| Layer | Interaction |
|-------|-------------|
| ERP | Read customer, lead, users, invoices; trigger activity log |
| BOS | Read initiative/venture; optional link; never write |
| AOS | Owns all engagement data |

---

## 2. Delivery Template

### Purpose

Agency-type-specific configuration for delivery lifecycle checklists, default rubrics, and prompt pack structure — not a project plan.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Scope | Company-wide (one agency) |

### Lifecycle

```
draft → active → deprecated
```

| State | Meaning |
|-------|---------|
| `draft` | Being authored |
| `active` | Available for engagement application |
| `deprecated` | Superseded; not selectable for new engagements |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Engagement | one-to-many | Applied optionally |
| Prompt Template(s) | many-to-many | Optional defaults |
| Evaluation Rubric(s) | many-to-many | Optional defaults |
| Agency Playbook | many-to-one | Optional parent |
| Company | many-to-one | **Required** (`companyId`) |

### Invariants

1. Exactly one `agencyType` per template (web/mobile/AI/SaaS)
2. Active templates must have at least one lifecycle phase defined
3. Template name unique within `companyId` + `agencyType`
4. Deprecated templates cannot be applied to new engagements

### Business Rules

| Rule | Description |
|------|-------------|
| BR-DT-01 | System seed templates (from architecture docs) imported as `draft`; agency activates |
| BR-DT-02 | Applying template to engagement copies configuration snapshot; template changes don't retroactively alter open engagements |
| BR-DT-03 | Enhancement vs greenfield variants may exist as separate templates within same agency type |

### Creation Rules

- Requires `aos_templates_manage` permission
- Authored by agency admin or delivery lead
- Initial state: `draft`

### Update Rules

- Editable while `draft`
- Active templates: new version created on significant change (see versioning)
- Minor label changes allowed in-place with audit

### Deletion Rules

- **Physical delete forbidden**
- Deprecate only

### Versioning Strategy

- Template carries `versionNumber` (integer, monotonic)
- Significant changes create new version; old version marked deprecated
- Engagements store `appliedTemplateVersion` at application time

### Audit Requirements

| Event | ActivityLogger |
|-------|---------------|
| Created | `aos_template_created` |
| Activated | `aos_template_activated` |
| Deprecated | `aos_template_deprecated` |
| Applied to engagement | `aos_template_applied` |

### Future Extensibility

- Template marketplace (cross-agency sharing — Phase 5)
- Client-type sub-templates (e-commerce, fintech, etc.)
- Compliance pack overlays (HIPAA, SOC2 checklists)

### Cross-Layer Interaction

- No ERP/BOS writes
- May reference BOS milestone **read** patterns for alignment checklists (conceptual, not FK)

---

## 3. Delivery Quality Report

### Purpose

Aggregated quality snapshot for an engagement at handoff or close — synthesis of evaluations, reuse metrics, and delivery outcomes. Not a generic status report.

### Ownership

| Aspect | Owner |
|--------|-------|
| Data | AOS |
| Subject | One Delivery Engagement |

### Lifecycle

```
generating → draft → approved → archived
```

| State | Meaning |
|-------|---------|
| `generating` | Being assembled from engagement artifacts |
| `draft` | Generated; pending review |
| `approved` | Delivery lead confirmed accuracy |
| `archived` | Engagement closed; report frozen |

### Relationships

| Related entity | Cardinality | Required? |
|----------------|-------------|-----------|
| Delivery Engagement | many-to-one | **Required** |
| Evaluation(s) | many-to-many | **Required** (source data) |
| Reuse Assessment | many-to-one | Optional |
| Cursor Session(s) | many-to-many | Optional (metrics) |
| Retrospective | many-to-one | Optional |

### Invariants

1. One approved report per engagement at handoff (multiple drafts allowed)
2. Report metrics derived from recorded evaluations — not manually inflated
3. Immutable after `approved`
4. Must belong to same `companyId` as engagement

### Business Rules

| Rule | Description |
|------|-------------|
| BR-DQR-01 | Report includes: evaluation pass rate, reuse rate, prompt revision count, requirement coverage |
| BR-DQR-02 | Client-identifying details optional in exported form |
| BR-DQR-03 | Generated automatically; human approves |

### Creation Rules

- Triggered at engagement transition to `handoff` or manually
- Requires at least one Evaluation record exists

### Update Rules

- Editable only in `draft` (summary notes)
- Approve transitions to immutable

### Deletion Rules

- **Physical delete forbidden**
- Regenerate creates new report; prior draft superseded

### Versioning Strategy

- Each generation attempt creates new report record
- Only one `approved` per engagement (latest wins; prior archived)

### Audit Requirements

| Event | ActivityLogger |
|-------|---------------|
| Generated | `aos_quality_report_generated` |
| Approved | `aos_quality_report_approved` |

### Future Extensibility

- Client-facing export format
- Comparison across engagements (anonymized benchmarks)
- ERP invoice milestone trigger reference

### Cross-Layer Interaction

- Read ERP customer name for report header (via port)
- No ERP/BOS writes
