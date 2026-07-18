# 11 — Roadmap

Five-phase roadmap for AOS implementation. Phases are **capability milestones**, not time estimates. No implementation details — strategic sequencing only.

**Grounding:** ERP readiness ~55% (Discovery §11), BOS Phase 1 complete, 0% existing AOS infrastructure.

---

## Phase Overview

| Phase | Name | Core question answered |
|-------|------|----------------------|
| **Phase 1** | Foundation | Can we open a delivery engagement linked to ERP/BOS? |
| **Phase 2** | Requirements & Reuse | Can we analyze requirements and identify reuse? |
| **Phase 3** | Prompt & Cursor | Can we generate, execute, and evaluate prompts? |
| **Phase 4** | Knowledge & Learning | Does every engagement make the next one better? |
| **Phase 5** | Orchestration & Scale | Can AOS run delivery with minimal manual overhead? |

---

## Phase 1 — Foundation

**Goal:** Establish AOS as a bounded context with delivery engagements linked to ERP customers.

### Capabilities delivered
- AOS folder structure following BOS pattern (`aos/application/`, `aos/domain/`, `aos/infrastructure/`, `aos/integration/`)
- Delivery Engagement entity and lifecycle states
- ERP read ports: customers, users (minimum viable set)
- BOS read ports: initiatives (optional link)
- AOS permission keys in `config/permissions.ts`
- Working feature flags from day one
- AOS routes in `App.tsx` + sidebar nav group
- Module Registry seeded from ERP Discovery docs
- ActivityLogger extended with AOS event types
- AOS collections included in backup plan (don't repeat BOS debt)

### Explicitly NOT in Phase 1
- AI orchestration
- Prompt generation
- Cursor integration beyond manual
- Knowledge Engine beyond seed import
- Evaluation Engine

### Success criteria
- Delivery lead can open engagement linked to ERP customer
- Engagement visible in AOS UI with lifecycle state
- BOS initiative optionally linked (read-only)
- Module Registry searchable with ERP Discovery seed data
- Permissions enforce access
- Removing AOS doesn't break ERP or BOS

### Dependencies resolved
- Single permission registry (AOS keys added properly)
- Layer discipline established
- Sidecar law enforced
- Backup includes AOS data

---

## Phase 2 — Requirements & Reuse

**Goal:** Structure requirements and systematically identify reusable modules.

### Capabilities delivered
- Requirements Domain: capture, structure, approve requirement sets
- Matching Engine: query Module Registry against requirements
- Reuse assessment report per engagement
- Agency-type profile selection (web/mobile/AI/SaaS)
- Delivery templates (checklists, not PM boards)
- Additional ERP read ports: leads, invoices, products
- Engagement intake workflow (Stage 0–2 of lifecycle)

### Explicitly NOT in Phase 2
- AI-generated requirements analysis (manual + template)
- Automated prompt generation
- Cursor session capture
- Evaluation Engine

### Success criteria
- Requirements captured and approved for an engagement
- Matching Engine returns reuse recommendations from registry
- Reuse assessment shows ERP modules that prevent duplication
- Agency-type template applied to engagement
- Gap analysis identifies net-new work clearly

---

## Phase 3 — Prompt & Cursor

**Goal:** Generate structured prompt artifacts, execute in Cursor, and evaluate outputs.

### Capabilities delivered
- Prompt Engine: artifact creation, lifecycle, prompt packs
- AI Orchestration: context assembly, draft generation (requires server-side planning)
- Cursor Integration Level 1–2: handoff + structured capture
- Evaluation Engine: rubric-based scoring
- Revision workflow: failed evaluation → improved prompt
- Cursor session records linked to prompt artifacts

### Infrastructure decision required
- Server-side tier for AI orchestration (ERP has 0% server-side today)
- File storage for transcripts/evidence (ERP has none today)

### Explicitly NOT in Phase 3
- Fully automated Cursor integration (Level 3)
- Documentation auto-generation
- Continuous learning flywheel (manual retrospective only)

### Success criteria
- Approved prompt pack generated for an engagement
- Developer executes prompts in Cursor with capture
- Evaluation scores outputs against rubrics
- Failed evaluations trigger revision prompts
- 100% of code changes trace to approved prompt artifacts

---

## Phase 4 — Knowledge & Learning

**Goal:** Every completed engagement improves the agency's delivery intelligence.

### Capabilities delivered
- Knowledge Engine: ingestion, classification, retrieval
- Continuous Learning flywheel operational
- Retrospective workflow with promotion decisions
- Prompt template auto-improvement from evaluation data
- Module Registry quality scoring and auto-update
- Documentation generation from engagement artifacts
- Estimation calibration (planned vs actual)
- Quarterly learning review process

### Success criteria
- Retrospective captures lessons for every closed engagement
- At least one lesson promoted to agency pattern per engagement
- Prompt templates updated based on evaluation data
- Reuse rate measurable and trending upward
- Module Registry quality scores reflect usage outcomes
- Handoff documentation generated automatically

---

## Phase 5 — Orchestration & Scale

**Goal:** AOS operates delivery with minimal manual overhead across agency types.

### Capabilities delivered
- Cursor Integration Level 3: orchestrated push/pull
- Full AI Orchestration with server-side processing
- Automated context assembly at scale
- Cross-engagement analytics dashboard
- Agency-type template marketplace (internal)
- Stale knowledge detection and refresh
- Optional: client portal for delivery visibility
- Optional: cross-agency pattern sharing

### Infrastructure required
- Production server-side orchestration
- Cloud file storage
- Background job processing
- Cost monitoring for AI calls

### Success criteria
- End-to-end delivery managed through AOS with <20% manual overhead
- First-pass evaluation rate >70%
- Reuse rate >50% for enhancement engagements
- Development time per feature class decreasing quarter over quarter
- Knowledge Engine retrieval enriches every new engagement's planning

---

## Phase Dependencies

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Requirements & Reuse)
    │
    ▼
Phase 3 (Prompt & Cursor) ← requires server-side decision
    │
    ▼
Phase 4 (Knowledge & Learning)
    │
    ▼
Phase 5 (Orchestration & Scale) ← requires infrastructure investment
```

Phases are sequential. Each builds on the previous. No skipping.

---

## Parallel Workstreams (Non-AOS)

These ERP/BOS improvements should happen alongside AOS but are not AOS phases:

| Workstream | Owner | Why parallel |
|------------|-------|-------------|
| BOS backup inclusion | BOS | Critical debt; AOS must not repeat |
| BOS feature flag wiring | BOS | Anti-pattern AOS must avoid |
| ERP port creation (customers, users) | Shared | AOS Phase 1 depends on these |
| BOS permission registry consolidation | Shared | Single registry principle |
| ERP test coverage | ERP | Reduces AOS regression risk |

---

## What Success Looks Like at Each Phase

| Phase | User story |
|-------|-----------|
| 1 | "I opened a delivery project for Acme Corp linked to their customer record" |
| 2 | "AOS told me we already have 12 modules that cover 60% of this scope" |
| 3 | "I executed 8 prompts in Cursor, all passed evaluation, zero rework" |
| 4 | "Our last 5 projects made prompt templates better — this one started 40% pre-built" |
| 5 | "AOS planned, prompted, evaluated, and documented this project with me approving gates" |

---

## Explicit Non-Goals (All Phases)

- Replace ERP CRM, finance, or invoicing
- Replace BOS strategic planning
- Become a task management / kanban tool
- Build a client-facing SaaS product (unless Phase 5 optional portal)
- Support non-software agencies
- Real-time collaboration / chat
- Replace git or CI/CD tooling
