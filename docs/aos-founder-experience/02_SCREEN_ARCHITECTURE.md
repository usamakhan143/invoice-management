# 02 — Screen Architecture

**Stage D0 — FXD**  
**Grounding:** `aos/config/routes.ts`, frozen domain model, ADR-012

Architecture definitions only — no wireframes, no components, no CSS.

---

## Screen Model

AOS uses two navigation tiers:

1. **Global modules** — sidebar destinations (Dashboard, Delivery, Registry, …)
2. **Engagement hub** — contextual workspace inside a Delivery Engagement (not a sidebar item)

The founder spends most time in the **Engagement Hub**. Global modules provide cross-engagement queues and agency-wide assets.

---

## Screen 1 — Founder Dashboard

**Route:** `/aos`  
**Purpose:** Answer “what needs me now?” across all engagements.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Attention queue (approvals, blocks, waiting states); single recommended next action per hot engagement |
| **Secondary information** | Active engagement count by lifecycle phase; reuse opportunities this week; delivery risks (failed evaluations, stale sessions) |
| **Actions** | Open attention item; jump to engagement; dismiss non-blocking FYI (rare) |
| **AI assistance** | Prioritize attention queue; explain why each item matters; suggest daily focus |
| **Navigation** | Entry point; links to Delivery list and specific engagement hubs |
| **Relationships** | Reads all engagements; no editing — drill-down only |

**Excluded:** Velocity charts, sprint burndown, task counts, story points.

---

## Screen 2 — Delivery List

**Route:** `/aos/delivery`  
**Purpose:** Browse and open engagements — the portfolio view.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Engagement title, client (ERP name), lifecycle state, delivery lead, last activity |
| **Secondary information** | Agency type, engagement type, BOS initiative link, pause/cancel indicators |
| **Actions** | Open engagement; create engagement; filter by state/customer/lead |
| **AI assistance** | “Stalled” detection; suggest engagements needing founder attention |
| **Navigation** | → Engagement Hub; → ERP customer (read-only link out) |
| **Relationships** | One row per Delivery Engagement aggregate |

---

## Screen 3 — Create Engagement

**Route:** `/aos/delivery/new` (architectural — modal or page TBD in UI stage)  
**Purpose:** Intake new delivery work after ERP customer exists.

| Aspect | Definition |
|--------|------------|
| **Primary information** | ERP customer selector; scope summary; agency/engagement type |
| **Secondary information** | Lead origin; BOS initiative picker; template suggestion |
| **Actions** | Create; cancel |
| **AI assistance** | Pre-fill from ERP/BOS context; template recommendation |
| **Navigation** | → Engagement Hub on success |
| **Relationships** | Creates Delivery Engagement in `draft` |

---

## Screen 4 — Engagement Hub (Overview)

**Route:** `/aos/delivery/:engagementId`  
**Purpose:** Single pane of truth for one delivery — the founder’s mission control.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Lifecycle state (factual); **next action** banner; blockers; pending approvals |
| **Secondary information** | Client, lead, initiative links; delivery lead; key dates; template applied |
| **Actions** | Advance lifecycle (when gates pass); pause; resume; cancel; link/unlink BOS initiative |
| **AI assistance** | State explanation; gate checklist; risk summary for this engagement |
| **Navigation** | Tabs to Requirements, Reuse, Prompts, Cursor, Evaluation, QA, Retrospective |
| **Relationships** | Aggregate root — all engagement artifacts hang here |

---

## Screen 5 — Engagement Requirements

**Route:** `/aos/delivery/:engagementId/requirements`  
**Purpose:** Capture, refine, and approve requirements.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Current Requirement Set (draft or approved); requirement items with acceptance criteria |
| **Secondary information** | Version history; AI clarification threads; coverage vs scope summary |
| **Actions** | Add/edit (draft only); request AI analysis; approve set; supersede (new version) |
| **AI assistance** | Decomposition; ambiguity detection; acceptance criteria generation; approval readiness score |
| **Navigation** | ← Engagement Hub; → Reuse (after approval) |
| **Relationships** | Requirements Domain; immutable approved versions |

---

## Screen 6 — Engagement Reuse

**Route:** `/aos/delivery/:engagementId/reuse`  
**Purpose:** Reuse analysis and module selection for this engagement.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Reuse Assessment results; ranked module matches; net-new justification area |
| **Secondary information** | Registry search; prior engagement reuse on same client |
| **Actions** | Run/rescan assessment; accept/reject module; document net-new decision |
| **AI assistance** | Match scoring; adaptation notes; duplication warnings |
| **Navigation** | ← Requirements; → Prompts |
| **Relationships** | Module Registry (read); Reuse Assessment artifacts |

---

## Screen 7 — Engagement Prompts

**Route:** `/aos/delivery/:engagementId/prompts`  
**Purpose:** Prompt Pack lifecycle — draft, review, approve.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Current Prompt Pack; sequenced Prompt Artifacts with objectives and acceptance criteria |
| **Secondary information** | Version history; context package preview; reuse references embedded |
| **Actions** | Generate draft; edit artifact; reorder (draft only); approve pack |
| **AI assistance** | Full pack generation; per-artifact refinement; constraint injection (Sidecar Law) |
| **Navigation** | ← Reuse; → Cursor (after approval) |
| **Relationships** | Prompt Domain; approval unlocks `building` |

---

## Screen 8 — Engagement Cursor

**Route:** `/aos/delivery/:engagementId/cursor`  
**Purpose:** Execution tracking — what ran, what’s running, what’s next.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Prompt artifact queue (approved); session status per artifact; capture completeness |
| **Secondary information** | Handoff copy block; files changed; transcript excerpt |
| **Actions** | Open/copy prompt; record session start; submit capture; mark ready for evaluation |
| **AI assistance** | “Next prompt ready”; capture completeness check; pre-review diff summary |
| **Navigation** | ← Prompts; → Evaluation |
| **Relationships** | Cursor Domain sessions linked to Prompt Artifacts |

---

## Screen 9 — Engagement Evaluation

**Route:** `/aos/delivery/:engagementId/evaluation`  
**Purpose:** Formal scoring and gate clearance.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Evaluations per session; pass/fail/partial; rubric dimensions |
| **Secondary information** | Failure reasons; iteration history; comparison to acceptance criteria |
| **Actions** | Run evaluation; accept; fail; request iteration |
| **AI assistance** | Auto-score; explain failures; suggest revision scope |
| **Navigation** | ← Cursor; → QA when phase complete |
| **Relationships** | Evaluation Domain; gates lifecycle transitions |

---

## Screen 10 — Engagement QA & Handoff

**Route:** `/aos/delivery/:engagementId/qa`  
**Purpose:** Quality verification and client delivery.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Requirement coverage matrix; QA checklist; Quality Report status |
| **Secondary information** | ERP invoice context (read-only); handoff documents draft |
| **Actions** | Complete QA items; approve quality report; confirm handoff |
| **AI assistance** | Coverage gaps; handoff doc draft |
| **Navigation** | ← Evaluation; → Retrospective |
| **Relationships** | Delivery Quality Report entity |

---

## Screen 11 — Engagement Retrospective

**Route:** `/aos/delivery/:engagementId/retrospective`  
**Purpose:** Close the learning loop for this engagement.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Retrospective draft (lessons, wins, failures); promotion candidates |
| **Secondary information** | Engagement timeline; evaluation stats; reuse rate achieved |
| **Actions** | Edit; approve retrospective; trigger knowledge/module promotion flows |
| **AI assistance** | Auto-draft from engagement evidence |
| **Navigation** | → Knowledge promotion; → Registry update; → Close engagement |
| **Relationships** | Required for `closed` state |

---

## Screen 12 — Global Requirements Queue

**Route:** `/aos/requirements`  
**Purpose:** Cross-engagement view of requirement work needing attention.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Engagements in `discovery` with draft sets pending approval |
| **Secondary information** | Recently approved sets; clarification flags |
| **Actions** | Jump to engagement requirements tab |
| **AI assistance** | Batch “ready for approval” ranking |
| **Navigation** | → Engagement Requirements |
| **Relationships** | Filtered Delivery + Requirements projection |

---

## Screen 13 — Global Prompts Queue

**Route:** `/aos/prompts`  
**Purpose:** Cross-engagement prompt packs awaiting founder/lead approval.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Draft packs; pending approvals; stalled generations |
| **Secondary information** | Approved packs recently; template used |
| **Actions** | Open engagement prompts tab |
| **AI assistance** | Approval readiness; risk flags in pack |
| **Navigation** | → Engagement Prompts |

---

## Screen 14 — Global Cursor Queue

**Route:** `/aos/cursor`  
**Purpose:** Cross-engagement execution status — where Cursor work stands.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Sessions in progress; captures missing; prompts ready to execute |
| **Secondary information** | Recently completed sessions |
| **Actions** | Jump to engagement cursor tab |
| **AI assistance** | Stale session detection |
| **Navigation** | → Engagement Cursor |

---

## Screen 15 — Global Evaluation Queue

**Route:** `/aos/evaluation`  
**Purpose:** Cross-engagement evaluations needing review.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Failed/pending evaluations; overrides needed |
| **Secondary information** | Pass rate trends (light — not KPI dashboard) |
| **Actions** | Open evaluation detail |
| **AI assistance** | Cluster failure themes |
| **Navigation** | → Engagement Evaluation |

---

## Screen 16 — Module Registry

**Route:** `/aos/registry`  
**Purpose:** Agency-wide reusable module catalog.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Module list with agency type, status, version, usage count |
| **Secondary information** | Deprecation notices; registration source engagement |
| **Actions** | View module detail; register (from retrospective flow); deprecate |
| **AI assistance** | Search by natural language; suggest similar modules |
| **Navigation** | ↔ Engagement Reuse; ↔ Knowledge |
| **Relationships** | Module Registry Domain |

---

## Screen 17 — Module Detail

**Route:** `/aos/registry/:moduleId`  
**Purpose:** Deep view of one reusable module.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Name, version, API surface summary, agency applicability |
| **Secondary information** | Usage history; linked knowledge patterns |
| **Actions** | Copy reference for prompt; view source engagement |
| **AI assistance** | Integration guide generation |
| **Navigation** | ← Registry |

---

## Screen 18 — Knowledge Library

**Route:** `/aos/knowledge`  
**Purpose:** Agency delivery wisdom — patterns, lessons, anti-patterns.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Knowledge patterns by agency type; search |
| **Secondary information** | Source engagements; promotion date |
| **Actions** | View; edit (authorized); merge duplicates |
| **AI assistance** | Semantic search; related pattern suggestions |
| **Navigation** | ↔ Registry; ↔ Engagement retrospective |

---

## Screen 19 — Delivery Playbook

**Route:** `/aos/playbook`  
**Purpose:** Human-readable methodology aligned to AOS lifecycle — not executable workflow.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Phase descriptions matching Delivery Engagement states |
| **Secondary information** | Checklists; links to templates |
| **Actions** | Read; link template to new engagement |
| **AI assistance** | “Where am I in the playbook?” contextual help |
| **Navigation** | Reference from Engagement Hub help |

---

## Screen 20 — Delivery Templates

**Route:** Embedded in Registry or Playbook (architectural)  
**Purpose:** Agency-type delivery configuration — phase keys, not project plans.

| Aspect | Definition |
|--------|------------|
| **Primary information** | Template name, agency type, lifecycle phase keys, version |
| **Secondary information** | Active/deprecated status |
| **Actions** | Apply to engagement; edit draft template |
| **AI assistance** | Template fit for engagement type |
| **Relationships** | Delivery Template entity (domain) |

---

## Screens That Do NOT Exist (ADR-012)

| Excluded screen | Reason |
|-----------------|--------|
| Task board / Kanban | Generic PM — lifecycle states replace columns |
| Sprint planner | No sprint domain |
| Backlog groomer | Requirements Domain replaces backlog |
| Timesheet | ERP/expense domain |
| Gantt / timeline PM | Not delivery intelligence |
| Team workload grid | Optional future — not Phase 1 FXD |
| Client CRM | ERP owns customers |

---

## Screen Relationship Diagram

```
Dashboard ──→ Delivery List ──→ Engagement Hub
                    │                  ├── Requirements
                    │                  ├── Reuse
                    │                  ├── Prompts
                    │                  ├── Cursor
                    │                  ├── Evaluation
                    │                  ├── QA / Handoff
                    │                  └── Retrospective
                    │
Global Queues ←─────┴── Requirements / Prompts / Cursor / Evaluation
Registry ──→ Module Detail
Knowledge
Playbook
```

---

## Related Documents

- [03 Navigation Architecture](./03_NAVIGATION_ARCHITECTURE.md)
- [04 Dashboard Philosophy](./04_DASHBOARD_PHILOSOPHY.md)
- [11 User Flows](./11_USER_FLOWS.md)
