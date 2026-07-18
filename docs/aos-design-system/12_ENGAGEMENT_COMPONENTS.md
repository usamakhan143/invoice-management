# 12 — Engagement Components

**Stage D1 — AOS Design System**  
Domain: Delivery domain, ADR-003 Delivery Engagement Root.

---

## C-022 NextBestActionCard

### Purpose
Single recommended founder action for current engagement state — replaces generic “what’s next” widgets.

### Responsibilities
- One primary CTA derived from lifecycle + gates
- Short rationale (domain-driven copy, not AI fluff)
- Link to secondary path if primary not applicable

### Allowed Usage
Engagement hub overview (hero position); dashboard per active engagement summary (optional)

### Forbidden Usage
Multiple competing CTAs; task list; sprint planning prompts

### States
Default, loading (resolving action), completed (transient success then next action)

### Loading
Skeleton title + button

### Empty
Engagement terminal — “Engagement complete — View retrospective”

### Disabled
Waiting on external party — see WaitingStatePanel instead

### Permission Locked
CTA hidden; show “Waiting on {role}” if action requires other actor

### Success
Brief success message inline after action — auto-advance to new action

### Warning
Action optional but recommended — Warning caption

### Error
Last action failed — Error caption + retry

### Sizing
Prominent card — full content width; primary Button lg

### Examples
“Approve requirement set v2 to unlock Prompt Pack generation” → Button “Review Requirements”

### Anti-patterns
NBA card buried below fold; generic “Continue” label

---

## C-023 WaitingStatePanel

### Purpose
Explain blocking wait — Cursor running, evaluation processing, external approval.

### Responsibilities
Clear wait reason; expected next step; no fake progress bars without domain progress

### Allowed Usage
When NextBestActionCard cannot offer founder action

### Forbidden Usage
Indeterminate spinner as only content without explanation

---

## C-040 RequirementCard

### Purpose
Requirement set or individual requirement in lists.

### Responsibilities
Version, approval state, requirement count, AI draft indicator

### Allowed Usage
Requirements tab, Requirements queue

### Forbidden Usage
Story points; assignee avatars; drag reorder as priority

### States
Draft, In review, Approved, Superseded

### AI Generated / Human Approved
Same rules as AiDraftPanel / ApprovalPanel

### Interaction
Navigate to detail + AiDraftPanel

---

## C-045 RegistryCard

### Purpose
Module registry entry for reuse-first development (ADR-010).

### Responsibilities
Module ID, version, status (experimental, stable, deprecated), reuse count

### Similar to KnowledgeCard — RegistryCard is registry-specific with install/reuse actions

### Forbidden Usage
Editing module code from card

---

## C-050 LifecycleBadge

### Purpose
Display current `DeliveryState` for an engagement.

### Responsibilities
Exact domain enum label — no custom PM states

### Allowed Usage
Engagement header, table column, breadcrumb area

### Forbidden Usage
Manual dropdown to change state (transitions are gate-driven)

### States
One per domain lifecycle state — neutral badge default; terminal states muted

### Typography
`font-size-caption`, `font-weight-medium`, uppercase optional per FXD

### Examples
“REQUIREMENTS_APPROVED”, “IN_CURSOR”, “DELIVERED”

### Anti-patterns
Percent complete inside badge; emoji states

---

## C-051 StatusChip

### Purpose
Secondary status — draft, failed, active, pending — smaller than LifecycleBadge.

### Allowed Usage
Cards, table cells, attention items

### Variants
Neutral, Success, Warning, Error, AI, Approved

---

## C-052 GateChip

### Purpose
Show gate satisfaction — “Requirements gate: Approved”, “Evaluation gate: Blocked”.

### Responsibilities
Map to ADR-007 gates; link to resolving screen

### Forbidden Usage
Custom gates not in domain model

---

## C-053 Timeline

### Purpose
Evidence-based append-only history of engagement events — not a Gantt chart.

### Responsibilities
Show audit events: approvals, sessions, evaluations, state transitions

### Allowed Usage
Engagement hub Timeline tab; EvidencePanel condensed view

### Forbidden Usage
Drag scheduling; dependency arrows; sprint markers

### States
Default, filtered by event type, load-more pagination

### Loading
Skeleton events (5)

### Empty
“No events yet — Create engagement to begin history”

### Typography
Event title body; timestamp caption; actor caption

### Interaction
Click event → scroll to artifact or open SidePanel detail

---

## C-054 TimelineEvent

### Purpose
Single append-only audit row.

### Responsibilities
Icon by event type, title, actor, timestamp, optional link

### Event types (conceptual)
`EngagementCreated`, `RequirementApproved`, `PromptPackApproved`, `CursorSessionStarted`, `CaptureSubmitted`, `EvaluationCompleted`, `StateTransition`, `EngagementCancelled`

### AI Generated
Events triggered by AI note “via AI pipeline” in caption

### Human Approved
Approval events show approver name prominently

---

## Engagement Hub Tab Bar

See [13 Navigation Components](./13_NAVIGATION_COMPONENTS.md) — C-061 EngagementTabBar.

Tabs (FXD): Overview, Requirements, Prompts, Cursor, Evaluation, Registry, Knowledge, Timeline, Settings

---

## Related Documents
[03 Layout System](./03_LAYOUT_SYSTEM.md), [09 AI Components](./09_AI_COMPONENTS.md), [FXD Screen Architecture](../aos-founder-experience/02_SCREEN_ARCHITECTURE.md)
