# 10 — Cursor Components

**Stage D1 — AOS Design System**  
Domain: Cursor domain, ADR-006 Cursor Execution Model.

---

## C-041 PromptCard

### Purpose
Represent a Prompt Pack or individual prompt artifact in lists and engagement hub.

### Responsibilities
- Show pack name, version, approval state, artifact count
- Link to prompt detail and Cursor handoff
- Surface gate status (draft / approved / superseded)

### Allowed Usage
Prompt tab list, global Prompt queue table, dashboard attention items

### Forbidden Usage
Inline execution of Cursor from card without session context; editing approved pack in place

### States
Default, hover (elevated border), selected, superseded (muted)

### Loading
Card skeleton with header + 2 lines

### Empty
N/A at card level — list uses EmptyState

### Disabled
Terminal engagement — view only, no “Run in Cursor” action

### Permission Locked
Hide “Copy prompt” / “Open in Cursor” if lacking `cursor.execute`

### Feature Flag Locked
Hide Cursor actions if `cursor.integration` off — show prompt read-only

### Success
Approved pack shows Approved accent + version lock icon

### Warning
Draft awaiting approval

### Error
Pack rejected or failed validation — Error chip

### AI Generated
Draft packs show AI banner on card body preview

### Human Approved
“Approved v2” chip — immutable label

### Sizing
Min height for list consistency; compact in tables (row form), card in grid/list

### Spacing
Header `space-stack-sm`; actions in CardFooter

### Typography
Title: `font-size-heading`; version: `font-size-caption` mono

### Icons
Cursor logo/icon on primary action only; copy icon on secondary

### Interaction
Primary: “Review & Approve” or “Open Session”; secondary: Copy artifact

### Accessibility
Card is article or listitem; actions are buttons not whole-card click for approve

### Examples
“Feature Auth Pack v2 · 4 artifacts · Draft · Approve”

### Anti-patterns
Prompt card with task checklist; sprint assignment fields

### Future Extension
Multi-artifact expand inline — prefer navigation to detail

---

## C-042 CursorSessionCard

### Purpose
Track a Cursor execution session linked to an engagement artifact.

### Responsibilities
- Session ID, status (active, completed, abandoned), linked prompt artifact
- Capture status (pending, submitted, validated)
- Handoff links (open Cursor, view capture)

### Allowed Usage
Cursor tab, global Cursor queue, AttentionQueue items

### Forbidden Usage
Session as generic “task”; manual status override outside domain

### States
**Active** (pulse optional on status dot — subtle), **Completed**, **Abandoned**, **Awaiting capture**

### Loading
Skeleton header + status line

### Empty
EmptyState on tab: “No Cursor sessions — Approve a prompt pack to begin”

### Disabled
Cannot start new session if prompt not approved — action disabled with tooltip

### Permission Locked
View sessions read-only; execute actions gated

### Warning
Session active > SLA threshold (RiskPanel may duplicate)

### Error
Capture validation failed

### AI Generated
Capture body labeled when AI-assisted parsing applied

### Human Approved
Capture marked validated by human — distinct from session completed

### Sizing
Comfortable card; table row variant in queue

### Interaction
“Submit Capture” navigates to capture form; “View diff” opens EvidencePanel

### Examples
“Session #1042 · Active · Prompt: Auth Pack v2 · Capture pending”

### Anti-patterns
Embedding full IDE in card; session card without artifact linkage

### Future Extension
Live session heartbeat indicator — requires Cursor SDK integration

---

## Cursor-Specific Patterns

### Handoff Strip
Below PromptCard detail: monospace artifact ID, “Copy for Cursor” primary, “Open Cursor” secondary (Sidecar/external)

### Capture Form Affordance
Linked from session card — StickyFooterBar submit; EvidencePanel preview after submit

### Session Timeline Hook
Each session card links to Timeline events — `CursorSessionStarted`, `CaptureSubmitted`

---

## Related Documents
[09 AI Components](./09_AI_COMPONENTS.md), [11 Evaluation Components](./11_EVALUATION_COMPONENTS.md), [06 Form System](./06_FORM_SYSTEM.md)
