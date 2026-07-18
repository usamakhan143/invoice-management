# 01 — Founder Journey

**Stage D0 — FXD**  
**Grounding:** `docs/aos-domain-model/01_DELIVERY_DOMAIN.md`, `docs/aos-architecture/04_PROJECT_LIFECYCLE.md`, ADR-003, ADR-012

---

## Journey Overview

The founder journey is **engagement-centric**, not task-centric. Every step produces **evidence, artifacts, or decisions** — never a generic “done” checkbox.

```
Lead Closed (ERP)
    → Delivery Engagement Created (AOS)
    → Requirements Added
    → Requirements Approved
    → Reuse Analysis
    → Module Suggestions
    → Prompt Pack Generation
    → Cursor Execution
    → Cursor Review
    → Evaluation
    → Iteration
    → QA
    → Delivery
    → Retrospective
    → Knowledge Promotion
    → Module Registry Improvement
    → Project Closed
```

ERP owns the first event. AOS owns everything from engagement creation forward.

---

## Stage 0 — Lead Closed (ERP)

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Confirm the deal is real; know who the client is and what was sold at a high level |
| **System objective** | ERP records Won status, customer entity, optional deposit invoice |
| **AI objective** | None in ERP — optional AOS pre-read when engagement is opened |
| **Required decisions** | None in AOS (sales/ERP decisions already made) |
| **Expected outputs** | ERP customer record, lead history, team context |

**AOS trigger:** Founder or delivery lead opens a Delivery Engagement linked to `erpCustomerId`.

---

## Stage 1 — Delivery Engagement Created

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Formalize “we are building something for this client” with correct scope profile |
| **System objective** | Create aggregate root in `draft` → advance to `intake`; link ERP customer, optional lead/BOS initiative |
| **AI objective** | Summarize ERP customer + lead history; suggest agency type and engagement type; flag repeat client |
| **Required decisions** | Agency type (web/mobile/AI/SaaS); engagement type; delivery lead; optional BOS link; scope summary |
| **Expected outputs** | Delivery Engagement record; intake checklist started; template candidate identified |

**Lifecycle state:** `draft` → `intake`  
**Domain gate:** Valid ERP customer, delivery lead, company tenancy (Sidecar Law).

---

## Stage 2 — Requirements Added

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Ensure client need is captured precisely enough to plan and evaluate |
| **System objective** | Open Requirement Set; move engagement toward `discovery` |
| **AI objective** | Decompose vague scope; propose acceptance criteria; identify ambiguities; suggest clarification questions |
| **Required decisions** | Which requirements are in scope; priority of clarification |
| **Expected outputs** | Draft Requirement Set with functional/technical/constraint items |

**Lifecycle state:** `intake` → `discovery`  
**Anti-pattern:** Starting Cursor before requirements exist.

---

## Stage 3 — Requirements Approved

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Lock “what we agreed to build” — the contract for all downstream AI and Cursor work |
| **System objective** | Approve Requirement Set version (immutable); enable planning transition |
| **AI objective** | Final consistency check; risk summary; coverage gaps vs scope summary |
| **Required decisions** | Approve, request revision, or reject requirement set |
| **Expected outputs** | Approved Requirement Set version; engagement references `currentApprovedRequirementSetId` |

**Lifecycle state:** `discovery` → `planning` (on `approve_requirements`)  
**Domain gate:** BR — cannot exit discovery without approved requirement set (ADR-004).

---

## Stage 4 — Reuse Analysis

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Minimize net-new work; understand what the agency already owns |
| **System objective** | Run Reuse Assessment against Module Registry + ERP component inventory (read-only) |
| **AI objective** | Match requirements to registry entries; score fit; estimate adaptation effort; flag duplication risk |
| **Required decisions** | Accept reuse recommendations, override with justification, or approve net-new |
| **Expected outputs** | Reuse Assessment report; reuse rate baseline for engagement |

**Lifecycle alignment:** During `planning` (recommended before prompt pack)  
**ADR-010:** Reuse-first is mandatory philosophy; net-new requires justification.

---

## Stage 5 — Module Suggestions

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Choose proven building blocks over reinventing |
| **System objective** | Present ranked module candidates with metadata, version, prior usage |
| **AI objective** | Explain why each module fits; warn on deprecated modules; suggest composition patterns |
| **Required decisions** | Select modules for this engagement; defer or reject suggestions |
| **Expected outputs** | Reuse recommendations linked to engagement; updated plan context |

**Relationship:** Sub-stage of reuse analysis — surfaced prominently in Registry + Engagement Reuse panel.

---

## Stage 6 — Prompt Pack Generation

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Convert approved requirements into executable, evaluable Cursor instructions |
| **System objective** | Generate Prompt Pack draft from template + context assembler |
| **AI objective** | Sequence prompts; attach acceptance criteria; inject reuse references; respect context budget |
| **Required decisions** | Review draft pack; edit artifacts; approve or send back for regeneration |
| **Expected outputs** | Prompt Pack (draft) → approved Prompt Pack version |

**Lifecycle state:** Remains `planning` until pack approved → `building`  
**ADR-005:** Prompt Pack / Prompt Artifact architecture.

---

## Stage 7 — Cursor Execution

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Know implementation is progressing against approved prompts — not ad-hoc hacking |
| **System objective** | Track Cursor Session records per Prompt Artifact; enforce “approved prompts only” |
| **AI objective** | None during execution (Cursor agent runs); AOS may suggest “next prompt ready” |
| **Required decisions** | Developer/founder triggers session; selects which approved artifact to execute |
| **Expected outputs** | Cursor Session with capture (files changed, transcript excerpt, self-assessment) |

**Lifecycle state:** `building`  
**ADR-006:** Cursor executes; human triggers; AOS captures.

---

## Stage 8 — Cursor Review

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Sanity-check output before formal evaluation — catch obvious misses early |
| **System objective** | Present session capture vs prompt acceptance criteria side-by-side |
| **AI objective** | Pre-score against rubric; highlight diffs; flag constraint violations (Sidecar Law, no ERP writes) |
| **Required decisions** | Proceed to evaluation, request revision, or abort session |
| **Expected outputs** | Review notes; session marked ready for evaluation |

**Relationship:** Human gate before Evaluation Engine formal scoring.

---

## Stage 9 — Evaluation

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Objective proof that output meets bar — not “developer said it works” |
| **System objective** | Run Evaluation against rubric; record pass/fail/partial |
| **AI objective** | Score dimensions; explain failures; cite evidence from capture |
| **Required decisions** | Accept evaluation, override with audit note, or fail and iterate |
| **Expected outputs** | Evaluation record; gate clearance for next prompt or lifecycle advance |

**Lifecycle state:** `building` → `evaluating` → `delivering` (when gates pass)  
**ADR-007:** Evaluation mandatory before dependent progression.

---

## Stage 10 — Iteration

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Fix failures without losing traceability — never hide failed attempts |
| **System objective** | Generate revision prompt from failure analysis; append new session revision |
| **AI objective** | Root-cause analysis; targeted revision prompt; avoid full re-prompt waste |
| **Required decisions** | Approve revision prompt; re-execute in Cursor; re-evaluate |
| **Expected outputs** | New Prompt Version or revision artifact; linked evaluation chain (append-only) |

**Philosophy:** Iteration is **evidence accumulation**, not task rework.

---

## Stage 11 — QA

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Confirm deliverable quality before client handoff |
| **System objective** | QA checklist against requirements; quality report generation |
| **AI objective** | Map requirements to verification evidence; gap detection |
| **Required decisions** | Pass QA, fail with remediation list, or pause engagement |
| **Expected outputs** | Delivery Quality Report (draft → approved); `qaComplete` artifact flag |

**Lifecycle state:** `delivering`  
**Gate:** `complete_qa` → `handoff`

---

## Stage 12 — Delivery (Handoff)

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Client receives working software + documentation; agency closes the build loop |
| **System objective** | Handoff checklist; link ERP invoice milestones (read-only context) |
| **AI objective** | Draft handoff summary, release notes from requirements + evaluations |
| **Required decisions** | Confirm handoff complete; client sign-off recorded (external or note) |
| **Expected outputs** | Handoff record; engagement in `handoff` |

---

## Stage 13 — Retrospective

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Extract what worked, what failed, what to change next time |
| **System objective** | Capture Retrospective; block `closed` until complete |
| **AI objective** | Draft retrospective from engagement timeline, evaluations, reuse stats |
| **Required decisions** | Approve lessons; assign knowledge promotion candidates |
| **Expected outputs** | Completed Retrospective; `completedRetrospectiveId` on engagement |

**Lifecycle gate:** Required before `closed` (domain invariant).

---

## Stage 14 — Knowledge Promotion

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Turn one project’s lessons into agency-wide advantage |
| **System objective** | Promote patterns to Knowledge Engine; link to agency type |
| **AI objective** | Extract patterns; deduplicate existing knowledge; suggest merge vs new |
| **Required decisions** | Promote, edit, or reject each knowledge candidate |
| **Expected outputs** | Knowledge Pattern records; searchable for future engagements |

**ADR-009:** Knowledge Engine ownership.

---

## Stage 15 — Module Registry Improvement

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Make the next project faster via better reusable modules |
| **System objective** | Register or update module metadata from proven delivery |
| **AI objective** | Suggest module boundaries; document API surface; tag agency applicability |
| **Required decisions** | Register new module, bump version, deprecate, or skip |
| **Expected outputs** | Updated Module Registry entries |

**ADR-008:** Module Registry architecture.

---

## Stage 16 — Project Closed

| Dimension | Description |
|-----------|-------------|
| **Founder objective** | Clean closure; engagement remains auditable forever |
| **System objective** | Transition to `closed`; freeze metadata; preserve all evidence |
| **AI objective** | Final engagement summary; ROI hints vs BOS initiative (read-only) |
| **Required decisions** | Confirm closure; optional link to ERP final invoice (read-only) |
| **Expected outputs** | Terminal engagement state; full audit trail |

**ADR-014:** Append-only — closed engagements are never physically deleted.

---

## Journey Principles

1. **Every stage has a named artifact** — not a Kanban column.
2. **AI proposes at planning-heavy stages; humans approve at gates.**
3. **Cursor runs only on approved prompts.**
4. **Evaluation is the proof layer — not status changes.**
5. **Closure requires retrospective — not “mark complete.”**
6. **Learning is a first-class stage — not an afterthought meeting.**

---

## Related Documents

- [02 Screen Architecture](./02_SCREEN_ARCHITECTURE.md)
- [06 Cursor Workflow](./06_CURSOR_WORKFLOW.md)
- [07 Decision Map](./07_DECISION_MAP.md)
