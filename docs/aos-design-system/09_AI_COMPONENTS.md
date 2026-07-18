# 09 — AI Components

**Stage D1 — AOS Design System**  
Domain: Prompt domain, Knowledge Engine, AI orchestration surfaces.

---

## C-020 AttentionQueue

### Purpose
Founder-facing prioritized list of items requiring human judgment — the operational heart of the dashboard.

### Responsibilities
- Surface gate blockers, stale drafts, failed evaluations, missing captures
- Sort by urgency (domain rules) — not user-defined priority scores
- Link each item to exact resolution screen/tab

### Allowed Usage
Founder Dashboard primary column; optional compact variant in engagement hub overview

### Forbidden Usage
Generic inbox; email-style threading; drag-to-reorder priority; task assignment

### States
Default, item hover, item selected (navigated), collapsed section headers

### Loading
Skeleton rows (3–5 AttentionItem skeletons)

### Empty
EmptyState: “No items need your attention” + secondary link to engagements list

### Disabled
N/A (queue itself always visible if dashboard accessible)

### Permission Locked
Hide items user cannot act on; or show with LockedOverlay on action only

### Feature Flag Locked
Entire queue section hidden if `dashboard.attentionQueue` flag off

### Success / Warning / Error
Item-level severity via left accent bar token: `color-accent-warning`, `color-accent-danger`, neutral default

### AI Generated
Items originating from AI draft show “AI draft” caption — not the whole row styled as AI

### Human Approved
Items about re-approval after change show “Revision pending” not “Approved”

### Sizing
Compact density; max visible 8 items before “View all in queue” link

### Spacing
`space-stack-sm` between items; section headers `space-stack-md` above

### Typography
Title: `font-size-body`, `font-weight-medium`; meta: `font-size-caption`

### Icons
Optional severity icon leading; chevron trailing on navigable items

### Interaction
Click item → navigate to engagement + tab + scroll target; keyboard: arrow keys between items

### Accessibility
`role="list"`; each AttentionItem `role="listitem"`; severity not color-only — text label included

### Examples
“Approve requirement set v3 — Acme Corp · Requirements tab”

### Anti-patterns
Showing 50 items without grouping; mixing ERP notifications into queue

### Future Extension
Filter by engagement — secondary toolbar only

---

## C-021 AttentionItem

### Purpose
Single row in AttentionQueue.

### Responsibilities
Show: action label, engagement name, client, domain tab target, time since trigger

### Forbidden Usage
Inline approve without navigation to full context panel

### States
Hover (subtle background), focus-visible, visited (optional muted chevron)

---

## C-024 RiskPanel

### Purpose
Summarize delivery risks — stale gates, repeated evaluation failures, long-running Cursor sessions.

### Responsibilities
List risks with evidence links; never invent risk scores without domain data

### Allowed Usage
Engagement hub overview; dashboard sidebar (max 3 risks)

### Forbidden Usage
RAG traffic-light matrix without explanation; PM risk register editing

### States
Default, expanded/collapsed, empty

### Loading
Skeleton lines (3)

### Empty
“No active risks identified” — caption explains data sources

### Warning / Error
Borderline items use Warning; blocked delivery uses Error accent on header only

### AI Generated
If risk inferred by AI, show AiExplainBlock — human must not see inference as fact without label

### Sizing
Max 5 visible risks; “View all evidence” link

### Examples
“Evaluation failed twice on Prompt Pack v2 — View evaluation”

### Anti-patterns
Risk panel larger than NextBestActionCard on dashboard

---

## C-030 AiDraftPanel

### Purpose
Display AI-generated content awaiting human review — requirements, prompts, summaries.

### Responsibilities
- Clearly label as draft
- Show version, model/run metadata (caption)
- Diff or section structure when comparing to prior version
- Never auto-apply on view

### Allowed Usage
Requirements tab, Prompt tab, Knowledge suggestions, Capture AI assist output

### Forbidden Usage
Showing draft without Approve/Reject path; editable body without “Edit creates new draft version” notice

### States
Default, expanded sections, comparing-to-approved, editing (creates draft)

### Loading
Skeleton paragraphs + shimmer on header

### Empty
“No AI draft for this artifact” — link to generate/trigger if permitted

### Disabled
Read-only when engagement terminal — show approved version only

### Permission Locked
View-only if `requirements.read` without `requirements.approve`

### Feature Flag Locked
Hidden if AI generation flag off — show manual entry path

### AI Generated
**Always** — top banner: “AI Draft · Not approved” with `color-surface-ai-draft`

### Human Approved
When viewing historical approved alongside draft — split panel: approved left (muted), draft right

### Sizing
Expanded density; min readable width 480px in side panel

### Spacing
`space-stack-md` between sections; banner `space-stack-sm` below header

### Typography
Body for prose; Mono for embedded IDs

### Icons
Spark/AI icon in banner (decorative with text label)

### Interaction
Scroll within panel; “Expand all sections” secondary action

### Accessibility
Banner `role="status"`; sections as headings hierarchy

### Examples
Requirement set draft with numbered requirements and acceptance criteria blocks

### Anti-patterns
Draft indistinguishable from approved; auto-scroll past approval buttons

### Future Extension
Inline comment threads on sections — deferred

---

## C-031 ApprovalPanel

### Purpose
Explicit human gate for approving, rejecting, or requesting revision on an artifact.

### Responsibilities
- Present immutable action buttons: Approve, Request Revision, Reject (where domain allows)
- Optional note field on approve/reject
- Show consequence copy (“Approving locks requirement set v3”)
- Record actor + timestamp on success

### Allowed Usage
Adjacent to AiDraftPanel or at bottom of artifact review screens

### Forbidden Usage
Checkbox “I approve”; implicit save-as-approve; bulk approve across engagements

### States
Default, submitting (buttons loading), success (transition to approved view), error

### Loading
Disable all actions; show spinner on clicked button only

### Empty
N/A — panel hidden if nothing to approve

### Disabled
When user lacks permission — show LockedOverlay + who can approve

### Permission Locked
Replace actions with “Contact {role}” if policy allows

### Success
Toast + panel replaced by approved state banner

### Warning
“Revision requested” state — yellow banner, draft remains editable

### Error
Inline error + retry; do not close panel

### AI Generated / Human Approved
After approve: panel becomes read-only Human Approved banner

### Sizing
Full width of content column; sticky bottom on mobile

### Interaction
Approve opens ConfirmationDialog if destructive downstream; keyboard shortcuts disabled (must click)

### Accessibility
Focus trap not used (not modal); actions are named buttons not icons

### Examples
“Approve Requirement Set v3” with optional note TextArea

### Anti-patterns
Approve button same color as generic Save; panel below fold on laptop

---

## C-032 ContextPanel

### Purpose
Show read-only context for AI and human decisions — engagement metadata, linked ERP entities, prior versions.

### Responsibilities
Aggregate sidecar read-port data without editing ERP

### Allowed Usage
Right rail on approval flows; expandable on mobile

### Forbidden Usage
Inline ERP editing; showing unrelated CRM fields

### Loading
Skeleton fields grouped by section

### Empty
“No additional context” — still show engagement core fields

### Sidecar links
Customer, Lead, Initiative — open ERP/BOS in new tab with icon

---

## C-033 EvidencePanel

### Purpose
Display proof artifacts — evaluation results, Cursor captures, approved versions, audit excerpts.

### Responsibilities
Chronological or grouped evidence; link to source domain object

### Allowed Usage
Evaluation detail, engagement overview, gate review

### Forbidden Usage
Evidence without source reference; anonymous blobs

### States
Default, item expanded (show full capture/evaluation body)

### Loading
Skeleton per evidence item

### Empty
“No evidence recorded yet” + next action to run evaluation or capture

### Typography
Mono for IDs; Body for capture text in inset surface

### Examples
List: “Evaluation #2 — Failed — Rubric 62% — View”

### Anti-patterns
Evidence panel as infinite scroll without grouping

---

## C-034 AiExplainBlock

### Purpose
Short AI-generated explanation of why something was flagged, scored, or suggested.

### Responsibilities
Label as AI inference; link to inputs used

### Forbidden Usage
Presenting as authoritative domain fact without “AI explanation” prefix

### AI Generated
Always — italic optional; border `color-border-ai`

---

## C-035 AiConfidenceIndicator

### Purpose
Optional numeric or tier display when evaluation/prompt domain exposes confidence.

### Responsibilities
Show tier (High/Medium/Low) or percentage with caption “Model confidence — not approval”

### Forbidden Usage
Confidence as substitute for human approval gate

### States
High (neutral), Medium (warning caption), Low (warning border)

---

## C-044 KnowledgeCard

### Purpose
Surface reusable module or knowledge artifact from Knowledge Engine / Module Registry.

### Responsibilities
Show module name, version, reuse recommendation, compatibility notes

### Allowed Usage
Registry browse, engagement “Suggested reuse” section

### Forbidden Usage
One-click install without review dialog

### States
Default, selected for reuse, deprecated (muted + warning)

### Loading / Empty / Disabled
Standard card patterns

### AI Generated
“AI suggested reuse” chip when recommendation is AI-driven

### Human Approved
“Verified module” when registry entry human-verified

### Interaction
Click → SidePanel detail; “Add to engagement” → ConfirmationDialog

### Examples
“auth-firebase-v2 · Used in 4 engagements · Compatible”

### Anti-patterns
Knowledge card styled identical to RequirementCard — use distinct iconography

---

## Related Documents
[10 Cursor Components](./10_CURSOR_COMPONENTS.md), [12 Engagement Components](./12_ENGAGEMENT_COMPONENTS.md), [14 Dialog Patterns](./14_DIALOG_PATTERNS.md)
