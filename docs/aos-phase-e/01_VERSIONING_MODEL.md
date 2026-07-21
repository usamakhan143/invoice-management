# Phase E — Versioning Model

Maps frozen ADR-004/005/006/007 + ADR-013 to implementation-level entities.

---

## 1. Versioned Artifacts (Exact Set)

Phase E implements **only** artifacts explicitly governed by ADR-004 through ADR-007. No additional versioned entities are introduced.

| # | Mutable head | Immutable published version | ADR |
|---|--------------|----------------------------|-----|
| 1 | **Requirement Set** | **Requirement Version** | ADR-004 |
| 2 | **Prompt Pack** + **Prompt Artifact** | **Prompt Version** (per artifact) | ADR-005 |
| 3 | — | **Cursor Session** (append-only record) | ADR-006 |
| 4 | — | **Cursor Revision** (append-only link) | ADR-006 |
| 5 | — | **Evaluation** (append-only after confirm) | ADR-007 |

**Linked but not independently versioned in Phase E:**

| Entity | Behavior |
|--------|----------|
| **Reuse Assessment** | New assessment per Requirement Set version; stores `requirementVersionId` |
| **Evaluation Rubric** | Governed asset with `rubricVersion`; evaluations store `rubricVersionId` + snapshot |
| **Retrospective** | Remains workflow head artifact; gains trace refs to version IDs in E3 |

---

## 2. Per-Artifact Specification

### 2.1 Requirement Set + Requirement Version (ADR-004)

| Aspect | Rule |
|--------|------|
| **Domain owner** | Requirements bounded context (`aos/domain/requirements/` — new module split from workflow) |
| **Mutable head** | `RequirementSet` — draft / in_review / approved / superseded |
| **Snapshot trigger** | `approveRequirements` → publish **RequirementVersion** |
| **Version numbering** | Monotonic integer per set: 1, 2, 3… never reused |
| **Immutable after publish** | Full snapshot: items, attachments refs, title, acceptance criteria |
| **Active pointer** | `RequirementSet.currentApprovedVersionId` + `currentApprovedVersionNumber` |
| **Superseded** | Prior set → `superseded`; prior versions remain readable |
| **Approval** | Applies to specific version at publish moment |
| **Audit** | `aos_requirement_version_published` (+ existing D4 workflow audit types during transition) |
| **Engagement** | `engagementId` + `companyId` on all records |
| **Tenant** | `companyId` immutable; all reads/writes company-scoped |
| **Deletion** | Published versions: **never**; set: soft supersede only |
| **History retrieval** | List versions by `requirementSetId`; get by `requirementVersionId` |

**Draft behavior:** `updateRequirementDraft` mutates head only while `status ∈ {draft, in_review}` and no publish in flight.

**Post-approval change:** Material scope change → new Requirement Set (BR-RS-01) or new version workflow within set per domain rules — **never in-place edit of published version**.

---

### 2.2 Prompt Pack + Prompt Version (ADR-005)

| Aspect | Rule |
|--------|------|
| **Domain owner** | Prompt bounded context (`aos/domain/prompt/`) |
| **Mutable head** | `PromptPack` (pack-level `packVersion` integer) + `PromptArtifact` drafts |
| **Snapshot trigger** | `approvePromptPack` / `approvePromptArtifact` → **PromptVersion** per artifact |
| **Version numbering** | Monotonic per **Prompt Artifact** (not per pack) |
| **Requirement link** | Pack MUST reference `requirementVersionId` (published, not draft set) |
| **Immutable after publish** | Full artifact body, constraints, acceptance criteria, rubric ref |
| **Active pointer** | `PromptArtifact.currentApprovedVersionId` |
| **Pack replan** | Significant replan → new pack (`packVersion++`); old pack → `archived` |
| **Sequencing** | Artifact N+1 blocked until Artifact N evaluation passes (domain rule; E2+) |
| **Audit** | `aos_prompt_version_published`, `aos_prompt_pack_approved` |
| **Deletion** | Published prompt versions: **never** |

**D4 gap:** Current `PromptPack.version` is hardcoded `1` with no `requirementVersionId`. Phase E adds both.

---

### 2.3 Cursor Session + Cursor Revision (ADR-006)

| Aspect | Rule |
|--------|------|
| **Domain owner** | Cursor bounded context (`aos/domain/cursor/`) |
| **Record type** | Append-only **CursorSession** (not a version chain of a head) |
| **Creation trigger** | `startCursorSession` |
| **Required refs** | `promptVersionId` (exact published version), `promptArtifactId`, `promptPackId`, `engagementId`, `companyId` |
| **Mutability** | Pre-submit: capture fields only; post-`passed`/`failed`: immutable |
| **Revision** | Failed session → **CursorRevision** → new draft Prompt Version → human approve → re-execute |
| **Audit** | `aos_cursor_session_started`, `_captured`, `_passed`, `_failed`; revision events |
| **Deletion** | **Never** (ADR-006, ADR-014) |

**D4 gap:** Sessions reference `promptPackId` only; no `promptVersionId`.

---

### 2.4 Evaluation (ADR-007)

| Aspect | Rule |
|--------|------|
| **Domain owner** | Evaluation bounded context (`aos/domain/evaluation/`) |
| **Record type** | Append-only **Evaluation** per captured session |
| **Creation trigger** | `runEvaluation` / confirm flow |
| **Required refs** | `cursorSessionId`, `promptVersionId`, `requirementVersionId` (via prompt lineage), `rubricVersionId` + rubric snapshot |
| **Mutability** | Draft scoring editable until `confirmed`; after `confirmed`/`overridden`: immutable |
| **Re-score** | New evaluation record with `amendsEvaluationId` — no in-place edit |
| **Audit** | `aos_evaluation_scored`, `_confirmed`, `_overridden`, `_failed` |
| **Deletion** | **Never** |

**D4 gap:** Single mutable `evaluation` object replaced on re-run; always stub-pass; no rubric version.

---

## 3. Version Chain Invariants (Frozen)

These are implementation-level invariants derived from ADR-013/014 and domain model. **ADR wins** if any conflict arises.

| ID | Invariant |
|----|-----------|
| **V-01** | Published Requirement Versions, Prompt Versions, confirmed Evaluations, Cursor Sessions, Cursor Revisions are **never updated** |
| **V-02** | Published versions are **never deleted** |
| **V-03** | Editing an approved artifact creates a **new draft or new version** — never mutates published snapshot |
| **V-04** | Version numbers are **monotonic** within parent (set / artifact) and **never reused** |
| **V-05** | At most **one current approved** Requirement Version per active Requirement Set |
| **V-06** | At most **one current approved** Prompt Version per Prompt Artifact (head pointer) |
| **V-07** | Approval binds to a **specific version ID**, not abstract mutable state |
| **V-08** | Cursor Session references **exact Prompt Version executed** |
| **V-09** | Evaluation references **exact Cursor Session** and **exact Prompt Version** scored |
| **V-10** | Evaluation references **rubric version used at score time** (snapshot embedded) |
| **V-11** | `companyId` is immutable on all version records; tenant isolation preserved |
| **V-12** | Version publish emits **audit evidence** (append-only `aosAuditEvents` + domain audit type) |
| **V-13** | Supersession preserves **supersedesId / predecessorId** links for trace replay |
| **V-14** | Workflow **gates** derive from head pointers + version existence, not embedded mutable status alone |
| **V-15** | Historical retrieval returns **exact published content** — no merge with current draft |

**Explicitly NOT required in Phase E:**

- Version diff UI (ADR-004 §11 — future)
- Partial / phased approval (domain future extensibility)
- Parallel prompt artifact tracks (domain deferred)
- Automated Cursor SDK capture (ADR-006 Phase 4–5)

---

## 4. End-to-End Version Chain

```
Engagement (Delivery)
    │
    ├─ RequirementSet [mutable head]
    │       └─ approve → RequirementVersion vN [immutable]
    │               │
    │               ├─ ReuseAssessment (links requirementVersionId)
    │               │
    │               └─ PromptPack [mutable head, refs requirementVersionId]
    │                       └─ PromptArtifact[]
    │                               └─ approve → PromptVersion vM [immutable]
    │                                       │
    │                                       └─ CursorSession [append-only, refs promptVersionId]
    │                                               │
    │                                               └─ Evaluation [append-only, refs session + promptVersion + rubricVersion]
    │                                                       │
    │                                                       └─ fail → CursorRevision → new PromptVersion (revision)
    │
    └─ Retrospective [workflow head; refs version IDs for trace in E3]
```

---

## 5. Relationship to D4 Workflow Head

The existing `EngagementWorkflow` aggregate **remains the orchestration hub** for gates and UX flow. Phase E changes:

| Keeps | Adds |
|-------|------|
| `EngagementWorkflow` doc for gates, timeline, navigation | Separate immutable version collections |
| `EngagementWorkflowApplicationService` orchestration pattern | Version publish commands delegate to domain version aggregates |
| Append-only `aosAuditEvents` | Version-scoped audit payload fields (`versionId`, `versionNumber`) |
| D4 integration test scenarios | Version immutability + chain integration tests |

The embedded `requirementSet`, `promptPack`, `evaluation` fields become **projections of current head state** synced from version stores — or thin pointers (`currentRequirementSetId`, `currentApprovedRequirementVersionId`, etc.). Implementation detail in E2; see [03_PERSISTENCE_AND_SECURITY_PLAN.md](./03_PERSISTENCE_AND_SECURITY_PLAN.md).

---

## 6. Domain Module Split (E1)

| New / refactored module | Entities |
|-------------------------|----------|
| `aos/domain/requirements/` | RequirementSet, Requirement, RequirementVersion |
| `aos/domain/prompt/` | PromptPack, PromptArtifact, PromptVersion |
| `aos/domain/cursor/` | CursorSession, CursorRevision |
| `aos/domain/evaluation/` | Evaluation, EvaluationRubric (ref stub) |
| `aos/domain/workflow/` | EngagementWorkflow (head + gates only; delegates version rules) |

Layer rules unchanged: **domain owns invariants**; application orchestrates; infrastructure persists.
