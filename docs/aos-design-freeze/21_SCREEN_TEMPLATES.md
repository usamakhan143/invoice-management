# 21 — Screen Templates

**Stage D1.5 — AOS Design Freeze**  
**Status:** Frozen — permanent screen blueprints  
**Grounding:** FXD Screen Architecture, Design System v1.0, `aos/config/routes.ts`

Every major AOS screen uses this blueprint schema. Implementation must map 1:1 — no invented regions.

---

## Universal Screen Schema

| Field | Definition |
|-------|------------|
| **Purpose** | Why the screen exists (founder outcome) |
| **Primary decision** | The one judgment this screen enables |
| **Information hierarchy** | Ordered list: what the eye reads first → last |
| **Regions** | Named layout slots from [Layout System](../aos-design-system/03_LAYOUT_SYSTEM.md) |
| **Allowed components** | Catalog IDs (C-xxx) permitted |
| **Forbidden components** | ADR-012 and design-system exclusions |
| **Loading** | Skeleton vs spinner; region scope |
| **Empty** | EmptyState copy pattern + action |
| **Error** | ErrorState scope + retry |
| **Permission states** | Hidden vs disabled vs LockedOverlay |
| **Feature flag states** | Route hidden; tab hidden |
| **Responsive behavior** | md / lg breakpoints |
| **AI behavior** | What AI may suggest; what it may not auto-apply |
| **Navigation behavior** | Entry, exit, deep links |
| **Examples** | Narrative walkthrough |
| **Future extension notes** | Explicit deferrals only |

---

## Screen Template Index

| ID | Screen | Route |
|----|--------|-------|
| ST-01 | Founder Dashboard | `/aos` |
| ST-02 | Delivery List | `/aos/delivery` |
| ST-03 | Create Engagement | `/aos/delivery/new` |
| ST-04 | Engagement Hub — Overview | `/aos/delivery/:engagementId` |
| ST-05 | Engagement — Requirements | `…/requirements` |
| ST-06 | Engagement — Reuse | `…/reuse` |
| ST-07 | Engagement — Prompts | `…/prompts` |
| ST-08 | Engagement — Cursor | `…/cursor` |
| ST-09 | Engagement — Evaluation | `…/evaluation` |
| ST-10 | Engagement — QA & Handoff | `…/qa` |
| ST-11 | Engagement — Retrospective | `…/retrospective` |
| ST-12 | Global Requirements Queue | `/aos/requirements` |
| ST-13 | Global Prompts Queue | `/aos/prompts` |
| ST-14 | Global Cursor Queue | `/aos/cursor` |
| ST-15 | Global Evaluation Queue | `/aos/evaluation` |
| ST-16 | Module Registry | `/aos/registry` |
| ST-17 | Module Detail | `/aos/registry/:moduleId` |
| ST-18 | Knowledge Library | `/aos/knowledge` |
| ST-19 | Delivery Playbook | `/aos/playbook` |
| ST-20 | Delivery Templates | Embedded in Registry / Playbook |

---

## ST-01 — Founder Dashboard

### Purpose
Answer “what needs me now?” across all engagements — decision surface, not analytics.

### Primary decision
Which attention item to act on first.

### Information hierarchy
1. Attention Queue (actionable items)  
2. Next Best Action (single hot engagement, if surfaced)  
3. Risk Panel (agency-wide, max 3)  
4. Active engagement counts by lifecycle phase (caption row — not charts)  
5. Reuse opportunities (compact KnowledgeCard / RegistryCard row)

### Regions
PageShell → PageHeader (“Dashboard”) → ContentGrid: AttentionQueue full width → NextBestActionCard → 2-col RiskPanel + Reuse strip

### Allowed components
C-020, C-021, C-022, C-024, C-044, C-045, C-050, C-051, C-080, C-081, C-083, C-090, C-091

### Forbidden components
Charts, kanban, task lists, velocity widgets, DataTable as primary (queues live in sidebar)

### Loading
Skeleton: AttentionQueue (5 rows), NBA card, RiskPanel (3 lines)

### Empty
AttentionQueue EmptyState: “Nothing needs your attention” + LinkButton “View deliveries”

### Error
Per-widget ErrorState — dashboard never fully blank; partial failure isolated

### Permission states
`DASHBOARD_VIEW` required; queue items filtered server-side; items user cannot act on omit action affordance

### Feature flag states
`MODULE_ENABLED` off → entire AOS module hidden in ERP nav

### Responsive behavior
lg: 2-col reuse+risks; md/sm: stack all regions; AttentionQueue always first

### AI behavior
AI may rank AttentionQueue (sorted input from application layer); AI may explain item in SidePanel on “Why?” — never auto-dismiss items

### Navigation behavior
Item click → engagement tab + scroll target; Dashboard always 1 click from sidebar

### Examples
Founder opens dashboard → sees “Approve requirement set v2 — Acme Corp” → clicks → Requirements tab with AiDraftPanel focused

### Future extension notes
Optional “weekly focus” AI summary — collapsed card below NBA, Phase 2

---

## ST-02 — Delivery List

### Purpose
Portfolio view — browse and open engagements.

### Primary decision
Which engagement to enter.

### Information hierarchy
1. PageHeader + “Create engagement” primary  
2. FilterBar (lifecycle, lead, customer)  
3. DataTable rows (client, title, state, lead, updated)  
4. Pagination / load more

### Regions
PageShell → PageHeader → TableToolbar (C-013) → DataTable

### Allowed components
C-001, C-009, C-012–C-016, C-050, C-051, C-080–C-082, C-004 (Sidecar customer link in row meta)

### Forbidden components
Kanban columns, bulk edit, assignee avatars, story points

### Loading
Skeleton rows (8)

### Empty
EmptyState: “No engagements yet” + Primary “Create engagement”

### Error
ErrorState replaces table; Retry preserves filters

### Permission states
Create hidden without `delivery.create`; row open always allowed with `engagements.view`

### Feature flag states
`DELIVERY` flag off → nav item hidden

### Responsive behavior
md: hide agency type column; sm: card-list variant of row (engagement title, client, LifecycleBadge, chevron)

### AI behavior
Optional “Stalled” StatusChip on row — AI-detected, caption only

### Navigation behavior
Row click → ST-04; Create → ST-03

### Examples
Filter lifecycle = `discovery` → open engagement needing requirements

### Future extension notes
Saved filter views — Phase 2

---

## ST-03 — Create Engagement

### Purpose
Intake new delivery after ERP customer exists.

### Primary decision
Confirm scope and customer binding before aggregate creation.

### Information hierarchy
1. Form title  
2. ERP customer Select (required)  
3. Title, delivery lead, agency/engagement type  
4. Optional: lead, initiative, template  
5. StickyFooterBar: Create / Cancel

### Regions
PageShell → PageHeader → Form sections → StickyFooterBar

### Allowed components
C-005–C-011, C-001, C-032 (context preview), Sidecar LinkButton to ERP customer

### Forbidden components
Inline customer create (ERP owns customers); wizard with 5+ steps

### Loading
Customer Select async skeleton; submit button loading

### Empty
N/A — form always has structure

### Error
Inline field errors + ErrorState on ERP read port failure for customer list

### Permission states
Route unreachable without `delivery.create` — redirect to Delivery List

### Feature flag states
Same as ST-02

### Responsive behavior
Single column all breakpoints; StickyFooterBar full-width buttons on sm

### AI behavior
AI may pre-fill scope summary and suggest template — fields remain editable; label “AI suggested”

### Navigation behavior
Success → ST-04 Overview; Cancel → ST-02

### Examples
Select Acme Corp → AI suggests “Website Redesign Template” → Create → lands on Overview with NBA “Complete requirements”

### Future extension notes
Modal vs full page — **locked: full page** for Phase 1 (evidence and ERP context need space)

---

## ST-04 — Engagement Hub — Overview

### Purpose
Mission control for one Delivery Engagement — single pane of truth.

### Primary decision
What to do next on this engagement.

### Information hierarchy
1. PageHeader: title + LifecycleBadge + secondary Pause/Cancel  
2. ContextBanner: client, lead, initiative Sidecar links, delivery lead  
3. EngagementTabBar  
4. NextBestActionCard (hero)  
5. GateChip row (requirements, prompts, evaluation gates)  
6. WaitingStatePanel OR RiskPanel (mutually exclusive prominence)  
7. Timeline (collapsed, last 5 events) + “View full timeline” on Retrospective tab

### Regions
PageShell → PageHeader → ContextBanner → TabBar → Main column

### Allowed components
C-022, C-023, C-024, C-050–C-054, C-032, C-033 (preview), C-001, C-071–C-073

### Forbidden components
Task boards, sprint widgets, editable lifecycle dropdown

### Loading
Tab shell skeleton; NBA + banner skeleton

### Empty
New engagement: NBA “Add requirements” — not empty page

### Error
ErrorState if engagement not found (404 copy); partial errors on ContextBanner Sidecar links

### Permission states
Pause/Cancel gated; read-only roles see full overview without destructive actions

### Feature flag states
Per-tab flags hide tabs in EngagementTabBar

### Responsive behavior
TabBar horizontal scroll sm; ContextBanner stacks; NBA sticky priority on sm

### AI behavior
NBA rationale may be AI-generated — labeled; gate checklist from domain, not invented by UI

### Navigation behavior
Deep link `/aos/delivery/:id` opens Overview tab; tabs sync URL

### Examples
State `discovery` → NBA “Approve requirement set” → links Requirements tab

### Future extension notes
Timeline on Overview stays condensed — full history on Retrospective tab only

---

## ST-05 — Engagement — Requirements

### Purpose
Capture, refine, approve requirement sets.

### Primary decision
Approve requirement set (D3) or continue drafting.

### Information hierarchy
1. Tab context (same header as ST-04)  
2. RequirementCard / version selector  
3. AiDraftPanel (body)  
4. ApprovalPanel + optional ContextPanel (right rail lg)  
5. Version history link (caption)

### Regions
Main + SidePanel (ContextPanel lg; sm: “View context” opens SidePanel)

### Allowed components
C-040, C-030, C-031, C-032, C-033, C-034, C-035, C-006–C-007, C-072, C-092

### Forbidden components
Backlog prioritization drag; story points; assignee columns

### Loading
AiDraftPanel skeleton; generation shows “Generating draft…” banner

### Empty
EmptyState: “No requirements yet” + “Start capture” / “Generate from scope”

### Error
Generation failure: ErrorState in panel + Retry; approval failure: inline in ApprovalPanel

### Permission states
ApprovalPanel → PermissionGate `requirements.approve`; draft edit without approve → LockedOverlay on approve only

### Feature flag states
AI generation hidden if flag off — manual TextArea path

### Responsive behavior
ApprovalPanel StickyFooterBar sm; ContextPanel → SidePanel

### AI behavior
Generate/regenerate creates draft version only; never auto-approve; AiExplainBlock for ambiguity flags

### Navigation behavior
From global queue ST-12 → lands here with draft focused

### Examples
Review AI draft → Request revision with note → draft stays editable → re-approve via ApprovalDialog

### Future extension notes
Inline diff between versions — SidePanel Phase 2

---

## ST-06 — Engagement — Reuse

### Purpose
Reuse assessment and module selection (ADR-010).

### Primary decision
Accept reuse vs document net-new (D4, D5).

### Information hierarchy
1. Assessment summary (reuse rate, last run)  
2. Ranked RegistryCard / KnowledgeCard list  
3. Net-new justification FormField  
4. Primary: “Record reuse decisions” / secondary Rescan

### Regions
Single column + SidePanel for RegistryCard detail

### Allowed components
C-045, C-044, C-030, C-031, C-033, C-063, C-009, C-071

### Forbidden components
One-click install; npm-style package manager UI

### Loading
Assessment running: LoadingState + polling (see Interaction System)

### Empty
EmptyState: “Run reuse assessment” after requirements approved

### Error
Registry read failure: ErrorState with Retry

### Permission states
Rescan requires `registry.reuse` or equivalent

### Feature flag states
`REGISTRY` off → tab hidden; show InAppAlert if mid-engagement dependency

### Responsive behavior
Cards stack sm; SidePanel full screen sm

### AI behavior
Match scores AI-generated — labeled; human accepts/rejects each module explicitly

### Navigation behavior
Requirements gate must pass — tab soft-disabled with tooltip if not

### Examples
Accept `auth-firebase-v2` → reject two modules → justify net-new admin UI → proceed to Prompts

### Future extension notes
Batch accept above 5 modules — rejected Phase 1 (one explicit decision per module)

---

## ST-07 — Engagement — Prompts

### Purpose
Prompt Pack lifecycle — draft, review, approve (D6).

### Primary decision
Approve prompt pack.

### Information hierarchy
1. PromptCard (current pack)  
2. AiDraftPanel (artifacts list + detail)  
3. ApprovalPanel  
4. Handoff Strip preview (read-only until approved)

### Allowed components
C-041, C-030, C-031, C-033, C-072, C-010 (reorder draft only — domain permitting)

### Forbidden components
Cursor launch from unapproved pack; artifact editing after approve

### Loading
Pack generation skeleton; per-artifact expand skeleton

### Empty
EmptyState: “Generate prompt pack from approved requirements”

### Error
Generation failed: ErrorState + Retry generation

### Permission states
Approve gated; view draft allowed with read role

### Feature flag states
`PROMPTS` off → tab hidden

### Responsive behavior
Artifact list accordion; ApprovalPanel sticky sm

### AI behavior
Full pack generation; Sidecar Law constraints injected — show in AiExplainBlock

### Navigation behavior
Reuse → Prompts; approve unlocks Cursor tab indicator dot

### Examples
Approve pack v1 → LifecycleBadge moves toward `building` → Cursor tab dot appears

### Future extension notes
Artifact sequence drag — draft only, if domain allows reorder API

---

## ST-08 — Engagement — Cursor

### Purpose
Execution tracking — sessions, captures, handoff (ADR-006).

### Primary decision
Submit capture and mark ready for evaluation.

### Information hierarchy
1. Approved prompt artifact queue  
2. CursorSessionCard list (per artifact)  
3. Handoff Strip (copy/open Cursor)  
4. Capture form access per session  
5. EvidencePanel (recent captures)

### Allowed components
C-042, C-041, C-033, C-006–C-007, C-071, C-001 Sidecar

### Forbidden components
Embedded IDE; auto-run Cursor without human copy step Phase 1

### Loading
Session list skeleton; active session shows WaitingStatePanel

### Empty
EmptyState: “Approve a prompt pack to begin Cursor work”

### Error
Capture validation errors inline on form

### Permission states
`cursor.execute` for handoff actions; view-only sessions otherwise

### Feature flag states
`CURSOR` off → tab hidden; global queue ST-14 hidden

### Responsive behavior
Handoff Strip monospace full width; session cards stack

### AI behavior
Capture completeness check — suggestions only; pre-review diff summary in SidePanel

### Navigation behavior
Prompts → Cursor; submit capture → ConfirmationDialog → Evaluation tab dot

### Examples
Copy prompt → external Cursor → Submit capture → evaluation triggered

### Future extension notes
Cursor SDK live status — extends CursorSessionCard active state Phase 2

---

## ST-09 — Engagement — Evaluation

### Purpose
Formal scoring and gate clearance (D7, ADR-007).

### Primary decision
Accept evaluation outcome or iterate.

### Information hierarchy
1. EvaluationCard (latest)  
2. Pass/fail banner (primary); score % caption (secondary) — **locked display rule**  
3. Rubric breakdown DataTable  
4. EvidencePanel  
5. Actions: Re-run (secondary), Proceed (primary if pass)

### Regions
Main column; SidePanel for criterion evidence

### Allowed components
C-043, C-033, C-012, C-024, C-034, C-035, C-075

### Forbidden components
Leaderboards; gamified scores

### Loading
Running evaluation: CursorSessionCard-style spinner on EvaluationCard

### Empty
EmptyState: “Complete a capture to run evaluation”

### Error
Evaluation service failure: ErrorState + Retry

### Permission states
Re-run requires `evaluation.run`

### Feature flag states
`EVALUATION` off → tab hidden

### Responsive behavior
Rubric table → stacked cards sm per criterion

### AI behavior
Auto-score displayed with “AI scored” label; human gate still required for lifecycle

### Navigation behavior
Fail → InAppAlert sticky + NBA on Overview; pass → QA tab unlock indicator

### Examples
Failed 62% → 3 rubric rows failed → View evidence → fix capture → Re-run

### Future extension notes
Compare evaluations across versions — SidePanel Phase 2

---

## ST-10 — Engagement — QA & Handoff

### Purpose
Quality verification and client delivery.

### Primary decision
Approve quality report and confirm handoff.

### Information hierarchy
1. Requirement coverage matrix (read-only DataTable)  
2. QA checklist (Checkbox list)  
3. Quality Report status Card  
4. ERP invoice Sidecar link (read-only)  
5. Handoff document AiDraftPanel  
6. ApprovalPanel for quality report

### Allowed components
C-012, C-010, C-030, C-031, C-033, C-004 Sidecar, C-072

### Forbidden components
Invoice editing; ERP write actions

### Loading
Checklist skeleton; coverage matrix skeleton

### Empty
Blocked until evaluation pass — WaitingStatePanel, not EmptyState

### Error
ERP read port failure on invoice link — degrade gracefully, show caption

### Permission states
Handoff approve gated

### Feature flag states
N/A dedicated — follows engagement access

### Responsive behavior
Checklist single column; matrix horizontal scroll last resort

### AI behavior
Coverage gap suggestions in AiExplainBlock; handoff doc draft

### Navigation behavior
Evaluation pass required; → Retrospective after handoff confirm

### Examples
Complete QA items → approve quality report → confirm handoff → retrospective NBA

### Future extension notes
Client portal handoff — out of scope Phase 1

---

## ST-11 — Engagement — Retrospective

### Purpose
Close learning loop — lessons, promotion candidates.

### Primary decision
Approve retrospective and trigger knowledge/module promotion.

### Information hierarchy
1. Retrospective AiDraftPanel  
2. Timeline (full C-053)  
3. Evaluation stats caption row  
4. Promotion candidates: KnowledgeCard + RegistryCard  
5. ApprovalPanel  
6. Primary: Close engagement (after retrospective approved)

### Allowed components
C-053, C-054, C-030, C-031, C-044, C-045, C-073, C-072

### Forbidden components
Team performance ratings; individual blame UI

### Loading
AI draft retrospective skeleton

### Empty
EmptyState rare — “Generate retrospective from engagement evidence”

### Error
Promotion failure: Toast error + Retry

### Permission states
Close engagement requires `delivery.close` or equivalent

### Feature flag states
Knowledge promotion requires `KNOWLEDGE` flag

### Responsive behavior
Timeline vertical always; promotion cards stack

### AI behavior
Auto-draft from Timeline evidence — labeled; human must approve retrospective

### Navigation behavior
Required for `closed` state; links to Knowledge / Registry on promotion

### Examples
Approve retro → promote pattern to Knowledge → register module → Close engagement DangerDialog N/A (Close uses ConfirmationDialog unless cancel semantics)

### Future extension notes
Split retrospective sections — Phase 2 editorial

---

## ST-12 — Global Requirements Queue

### Purpose
Cross-engagement requirement approval debt.

### Primary decision
Which engagement requirements to review next.

### Primary decision (locked)
Same as ST-05 but index view — **no inline approve**.

### Information hierarchy
PageHeader → FilterBar → DataTable → row → navigate

### Regions
Queue layout (PageHeader + TableToolbar + DataTable)

### Allowed components
C-012–C-016, C-040 meta in row, C-051, C-076 on nav (badge)

### Forbidden components
Bulk approve; inline AiDraftPanel

### Loading / Empty / Error
Standard queue patterns — EmptyState: “No requirements awaiting review”

### Permission / Feature flag
`REQUIREMENTS` flag; `requirements.view`

### Responsive / AI / Navigation
Row click → ST-05; AI may sort “ready for approval” — server-side

### Examples
See ST-05 entry from queue

### Future extension notes
None Phase 1

---

## ST-13 — Global Prompts Queue

Same queue template as ST-12 for prompt packs pending approval.

**Route:** `/aos/prompts`  
**Navigate to:** ST-07  
**Empty:** “No prompt packs awaiting approval”  
**Columns (locked):** Engagement, Client, Pack version, Status, Artifacts, Updated, Action

---

## ST-14 — Global Cursor Queue

**Route:** `/aos/cursor`  
**Navigate to:** ST-08  
**Primary decision:** Which session needs capture  
**Empty:** “No active Cursor sessions”  
**Columns (locked):** Engagement, Artifact, Session status, Capture status, Updated, Action

---

## ST-15 — Global Evaluation Queue

**Route:** `/aos/evaluation`  
**Navigate to:** ST-09  
**Primary decision:** Which failed evaluation to resolve  
**Empty:** “No evaluations need review”  
**Columns (locked):** Engagement, Session, Result, Score, Updated, Action

---

## ST-16 — Module Registry

### Purpose
Agency-wide reusable module catalog.

### Primary decision
Which module to inspect or reference for reuse.

### Information hierarchy
SearchInput → FilterBar (agency type, status) → RegistryCard grid or DataTable → SidePanel detail

### Allowed components
C-045, C-012, C-009, C-014, C-015, C-063, C-051

### Forbidden components
Package publish pipeline UI; CI/CD visualizations

### Loading / Empty / Error
Standard; Empty: “No modules registered”

### Permission
`registry.view`; register from retrospective only Phase 1

### Feature flag
`REGISTRY`

### Responsive
Grid 2-col lg, 1-col sm

### AI
Natural language search Phase 1: keyword + metadata; semantic deferred (see Search doc)

### Navigation
→ ST-17 on detail route; ↔ ST-06 reuse tab

### Examples
Search “auth” → open SidePanel → copy reference for prompt

### Future extension
Register module from UI — retrospective flow only Phase 1

---

## ST-17 — Module Detail

**Route:** `/aos/registry/:moduleId`  
**Purpose:** Deep module view  
**Primary decision:** Whether module fits current engagement (informational)  
**Hierarchy:** PageHeader → RegistryCard expanded → usage history DataTable → Knowledge links  
**Allowed:** C-045, C-012, C-044, C-004, C-033  
**Forbidden:** In-place code edit  
**Navigation:** ← ST-16

---

## ST-18 — Knowledge Library

**Route:** `/aos/knowledge`  
**Purpose:** Agency delivery wisdom  
**Primary decision:** Find pattern for reuse or learning  
**Hierarchy:** Search → FilterBar (agency type) → KnowledgeCard list  
**Allowed:** C-044, C-009, C-014, C-063  
**Forbidden:** Wiki-style arbitrary pages  
**Empty:** “No knowledge patterns yet — complete retrospectives to populate”  
**Feature flag:** `KNOWLEDGE`  
**AI:** Related pattern suggestions in SidePanel — labeled

---

## ST-19 — Delivery Playbook

**Route:** `/aos/playbook`  
**Purpose:** Human-readable methodology aligned to lifecycle — not executable workflow  
**Primary decision:** None (reference) — contextual help only  
**Hierarchy:** Phase sections matching DeliveryState → checklists (read-only) → template links  
**Allowed:** Card, LinkButton, prose typography tokens — no C-030 unless AI help sidebar Phase 2  
**Forbidden:** Click-to-advance lifecycle; checklist as task completion tracking  
**Empty:** N/A — static content seeded  
**Navigation:** Linked from ContextBanner help icon on ST-04

---

## ST-20 — Delivery Templates

**Purpose:** Agency-type configuration — phase keys, not project plans  
**Embedding (locked):** Section within ST-19 Playbook + picker in ST-03 — no standalone sidebar route Phase 1  
**Primary decision:** Which template applies to new engagement  
**Allowed:** DataTable or Card list, Select in ST-03  
**Forbidden:** Gantt template editor; sprint duration fields

---

## Screens That Do Not Exist (Frozen)

Kanban, sprint planner, backlog, timesheet, Gantt PM, team workload grid, AOS settings, analytics hub — per ADR-012 and FXD. Implementation must not add routes without architecture amendment.

---

## Related Documents

- [22 Interaction System](./22_INTERACTION_SYSTEM.md)
- [29 Implementation Contract](./29_IMPLEMENTATION_CONTRACT.md)
- [FXD Screen Architecture](../aos-founder-experience/02_SCREEN_ARCHITECTURE.md)
- [Design System Layout](../aos-design-system/03_LAYOUT_SYSTEM.md)
