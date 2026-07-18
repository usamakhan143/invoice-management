# 06 — Prompt Engine

Philosophy, lifecycle, and architecture of prompt generation within AOS. Prompts are **first-class delivery artifacts** — not ad hoc text pasted into Cursor.

---

## Why a Prompt Engine Exists

ERP Discovery and BOS architecture reviews reveal:

- Cursor is the team's execution environment but has **no structured integration** with ERP/BOS
- BOS feature flags and integration patterns exist but **prompt quality is not governed**
- 37 reusable components and 34 services exist but are **not indexed for prompt context**
- Monolithic ERP pages (3,000+ lines) suggest **inconsistent prompting leads to duplicated code**

The Prompt Engine solves: **how does the agency consistently produce high-quality, context-rich, evaluable Cursor prompts that maximize reuse and minimize rework?**

---

## Prompt Artifact Definition (Conceptual)

A **Prompt Artifact** is a structured, versioned delivery object — not a plain text string.

### Components of a prompt artifact

| Component | Purpose |
|-----------|---------|
| **Identity** | Unique reference, version number, engagement link |
| **Objective** | Single clear outcome this prompt must achieve |
| **Agency profile** | web / mobile / AI / SaaS — determines template baseline |
| **Context block** | Assembled from Requirements, Knowledge, Module Registry, ERP/BOS facts |
| **Constraints** | Hard rules: sidecar law, no ERP duplication, layer discipline, file boundaries |
| **Reuse directives** | Specific module registry entries to prefer |
| **Acceptance criteria** | Testable conditions for output evaluation |
| **Evaluation rubric** | Scoring dimensions and weights |
| **Sequence position** | Order within prompt pack; dependencies on prior prompts |
| **Context budget** | Maximum size guidance for context block |
| **Status** | draft → reviewed → approved → executed → evaluated → archived |

### What a prompt artifact is NOT

- A Jira ticket description
- A free-form chat message
- An entire project brief in one prompt
- A copy of ERP customer data (summaries only)

---

## Prompt Lifecycle

```
Requirements approved
        │
        ▼
┌───────────────┐
│  DRAFT        │  AI Orchestration generates from plan + context
└───────┬───────┘
        │ human review
        ▼
┌───────────────┐
│  REVIEWED     │  Delivery lead edits/constraints adjusted
└───────┬───────┘
        │ approval
        ▼
┌───────────────┐
│  APPROVED     │  Ready for Cursor execution
└───────┬───────┘
        │ developer executes in Cursor
        ▼
┌───────────────┐
│  EXECUTED     │  Execution record linked
└───────┬───────┘
        │ evaluation engine scores
        ▼
┌───────────────┐     fail    ┌──────────────┐
│  EVALUATED    │ ──────────→ │  REVISION    │ → new version → REVIEWED
└───────┬───────┘             └──────────────┘
        │ pass
        ▼
┌───────────────┐
│  ARCHIVED     │  Stored in Knowledge Engine as pattern
└───────────────┘
```

Every state transition is recorded. No prompt reaches Cursor without `approved` status.

---

## Context Assembly Strategy

The Prompt Engine's core intellectual work is **context assembly** — deciding what the AI/Cursor needs to know.

### Context layers (priority order)

| Priority | Layer | Source | Example |
|----------|-------|--------|---------|
| 1 | **Requirement context** | AOS Requirements Domain | "Build user profile page with PIN lock" |
| 2 | **Reuse context** | Module Registry | "`ScreenLockContext` + `screenPin.ts` exist — extend, don't rebuild" |
| 3 | **Architecture context** | AOS Core Principles | "Follow BOS layering; use read ports for ERP data" |
| 4 | **Codebase context** | Repository structure | "Flat root, no src/; services in `services/`; BOS in `bos/`" |
| 5 | **Agency template** | Delivery template pack | Web component patterns, file naming conventions |
| 6 | **Project history** | Knowledge Engine | "Similar profile page built in Engagement X — lessons Y" |
| 7 | **Client facts** | ERP read port (summary) | "Client: Acme Corp, SaaS, 3 prior invoices" |
| 8 | **Strategic constraints** | BOS read port (summary) | "Initiative budget: $15K, milestone: MVP by Q3" |

### Context budget rules

- Layers 1–4 are **mandatory** for every prompt
- Layers 5–8 are **included when relevant** and budget allows
- Full ERP documents are never embedded — summaries and references only
- Module Registry entries include file paths and usage notes, not full source code
- Prior prompt execution results included only when sequential dependency exists

---

## Prompt Packs

A **Prompt Pack** is an ordered sequence of prompt artifacts that together deliver a requirement set.

### Pack design principles

| Principle | Rationale |
|-----------|-----------|
| **One objective per prompt** | Enables precise evaluation |
| **Sequential dependencies explicit** | Prompt 3 may depend on Prompt 2 output |
| **Incremental delivery** | Each prompt produces a reviewable increment |
| **Reuse-first ordering** | Early prompts wire existing modules; later prompts build net-new |
| **Evaluation between prompts** | No prompt N+1 until prompt N passes |
| **Architecture prompts first** | Structure before features (ports, entities, then UI) |

### Example pack structure (conceptual — web agency)

| # | Objective | Type |
|---|-----------|------|
| 1 | Define domain entities and repository contracts | Architecture |
| 2 | Implement Firestore repository with domain rules | Infrastructure |
| 3 | Create application service with ERP read port | Application |
| 4 | Build UI page using existing components | UI |
| 5 | Wire permissions and feature flag | Integration |
| 6 | Add unit tests following BOS test pattern | Quality |

This mirrors BOS's own implementation order (`bos/docs/INTEGRATION_LAYER.md`).

---

## Agency-Type Prompt Templates

Templates are **starting configurations** for prompt packs, not rigid scripts.

### Web Agency Template Pack
- Component reuse from `components/` inventory
- Page patterns from existing `pages/app/*` structure
- Tailwind styling conventions
- `SearchableListSelect`, `BosModal`, `DashboardCard` as preferred components

### Mobile Agency Template Pack
- Platform abstraction prompts
- Offline/sync pattern prompts
- Store submission checklist prompts
- Device matrix evaluation rubrics

### AI Agency Template Pack
- Model selection decision prompts
- Prompt engineering for LLM features (meta-prompting)
- RAG pipeline architecture prompts
- Evaluation dataset design prompts

### SaaS Agency Template Pack
- Multi-tenancy prompts referencing ERP `companyId` pattern
- Billing integration prompts referencing ERP `invoiceService` (consume, not rebuild)
- Role/permission prompts referencing ERP `config/permissions.ts` pattern
- Feature flag prompts (working flags, not BOS dead-flag anti-pattern)

---

## Prompt Quality Dimensions

How the Prompt Engine measures its own output quality (meta-quality):

| Dimension | Measure |
|-----------|---------|
| **Specificity** | Are acceptance criteria testable? |
| **Reuse ratio** | What % of context references existing modules? |
| **Constraint clarity** | Are anti-patterns explicitly forbidden? |
| **Context efficiency** | Is context block within budget with no redundancy? |
| **Sequencing logic** | Are dependencies correctly ordered? |
| **Evaluation completeness** | Does every prompt have a rubric? |
| **Historical accuracy** | Do lessons from Knowledge Engine appear when relevant? |

Prompt quality improves over time via Continuous Learning (see `10_CONTINUOUS_LEARNING.md`).

---

## Prompt Engine vs Other Systems

| System | Relationship |
|--------|-------------|
| **Cursor rules (.cursor/rules)** | AOS prompt constraints may reference existing rules; AOS captures which rules were applied |
| **Cursor skills (SKILL.md)** | Module Registry may catalog skills; Prompt Engine references relevant skills in context |
| **BOS milestone completion forms** | Different domain — BOS milestones are business outcomes; prompt artifacts are dev execution units |
| **ERP activity log** | Prompt approvals logged as activity events |
| **Generic prompt libraries (ChatGPT etc.)** | AOS prompts are context-grounded in THIS codebase and THIS engagement |

---

## Governance

| Rule | Enforcement |
|------|-------------|
| No unapproved prompts in Cursor | Application service gate |
| Version immutability | Approved prompts are never edited — new version created |
| Client isolation | Context assembler never mixes client data across engagements |
| Architecture constraints in every pack | Core Principles embedded in constraints block |
| Retrospective feeds templates | Template packs updated only through Continuous Learning process |

---

## Phase Introduction

| Phase | Prompt Engine capability |
|-------|-------------------------|
| Phase 1 | Manual prompt artifact creation with structured template |
| Phase 2 | AI-assisted draft generation from requirements |
| Phase 3 | Full context assembly + pack generation |
| Phase 4 | Meta-quality scoring + template auto-improvement |
| Phase 5 | Cross-agency template marketplace (optional) |
