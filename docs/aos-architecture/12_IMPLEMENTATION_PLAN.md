# 12 — Implementation Plan

Recommended implementation order for AOS. Sequenced by dependency, risk reduction, and value delivery. **Architecture guidance only — not a sprint plan, not code tasks.**

---

## Pre-Implementation Prerequisites

Resolve these before writing AOS production code (identified in ERP Discovery §10 and AOS architecture docs):

| # | Prerequisite | Source | Blocks |
|---|-------------|--------|--------|
| P-01 | Document AOS layer rules (UI → app service → repo/port) | BOS precedent + ERP debt | All phases |
| P-02 | Decide AOS permission key namespace (extend `config/permissions.ts`) | ERP Discovery §10 dual registry | Phase 1 |
| P-03 | Plan AOS collection backup inclusion | BOS backup exclusion debt | Phase 1 |
| P-04 | Design ERP read ports for customers + users | ERP Discovery §08 — no ports exist | Phase 1 |
| P-05 | Design BOS read ports for initiatives | New requirement | Phase 1 |
| P-06 | Seed Module Registry from ERP Discovery docs | `09_REUSABLE_MODULE_SYSTEM.md` | Phase 1 |
| P-07 | Decide server-side strategy (before Phase 3) | ERP 0% server-side | Phase 3 |
| P-08 | Decide file storage strategy (before Phase 3) | ERP 0% file storage | Phase 3 |

---

## Implementation Order

### Stage A — AOS Bounded Context Scaffold (Phase 1 start)

**Purpose:** Create the AOS module structure mirroring BOS.

| Order | Deliverable | Pattern source |
|-------|------------|---------------|
| A-1 | `aos/` folder structure (domain, application, contracts, infrastructure, integration, config, constants) | `bos/` layout |
| A-2 | AOS collection name constants | `bos/infrastructure/firestore/collections.ts` |
| A-3 | AOS actor scope type (companyId + actorUserId) | BOS `BosActorScope` |
| A-4 | AOS feature flags with working enforcement | Fix BOS dead-flag anti-pattern |
| A-5 | AOS permission keys + definitions | Extend `config/permissions.ts` |
| A-6 | AOS route constants + navigation config | `bos/config/routes.ts`, `bos/config/navigation.ts` |
| A-7 | AOS routes registered in `App.tsx` | BOS route registration pattern |
| A-8 | AOS sidebar nav group | BOS Strategy group pattern |

**Gate:** AOS appears in app navigation with permission gating. No functional features yet.

---

### Stage B — Delivery Engagement Core (Phase 1 core)

**Purpose:** Minimum viable AOS — open and manage delivery engagements.

| Order | Deliverable | Dependencies |
|-------|------------|-------------|
| B-1 | Delivery Engagement domain entity + lifecycle rules | A-1 |
| B-2 | Delivery Engagement repository contract + Firestore implementation | A-2, B-1 |
| B-3 | Delivery Engagement application service | B-2 |
| B-4 | ERP Customer read port + adapter | P-04, A-1 |
| B-5 | ERP User read port + adapter | P-04, A-1 |
| B-6 | BOS Initiative read port + adapter (optional link) | P-05, A-1 |
| B-7 | Engagement create/list/detail application flows | B-3, B-4, B-5, B-6 |
| B-8 | AOS UI pages (engagement list, detail, create) | B-7, A-7 |
| B-9 | ActivityLogger AOS event types | A-5 |
| B-10 | Backup plan includes AOS collections | P-03 |

**Gate:** Delivery lead creates engagement linked to ERP customer. Lifecycle states work. BOS initiative optionally linked.

---

### Stage C — Module Registry Bootstrap (Phase 1 + Phase 2 start)

**Purpose:** Catalog existing reusable assets.

| Order | Deliverable | Dependencies |
|-------|------------|-------------|
| C-1 | Module Registry domain entity | A-1 |
| C-2 | Module Registry repository + application service | C-1 |
| C-3 | Import ERP Discovery seed data (~90 entries) | P-06, C-2 |
| C-4 | Module Registry search/browse UI | C-3, B-8 |
| C-5 | Manual module registration flow | C-2 |

**Gate:** Registry populated with ERP/BOS assets. Searchable. Manual registration works.

---

### Stage D — Requirements & Reuse (Phase 2)

**Purpose:** Structure requirements and match against registry.

| Order | Deliverable | Dependencies |
|-------|------------|-------------|
| D-1 | Requirements domain entity | A-1 |
| D-2 | Requirements repository + application service | D-1, B-2 |
| D-3 | Agency-type profile on engagement | B-1 |
| D-4 | Delivery template configuration (web/mobile/AI/SaaS) | D-3 |
| D-5 | Matching Engine (registry query against requirements) | C-2, D-2 |
| D-6 | Reuse assessment report generation | D-5 |
| D-7 | Requirements capture + approval UI | D-2, B-8 |
| D-8 | Additional ERP read ports (leads, invoices, products) | A-1 |
| D-9 | Engagement intake workflow (Stages 0–2) | D-7, B-7, D-8 |

**Gate:** Requirements approved with reuse assessment showing matched modules and identified gaps.

---

### Stage E — Prompt Engine (Phase 3 start)

**Purpose:** Structured prompt artifacts and packs.

| Order | Deliverable | Dependencies |
|-------|------------|-------------|
| E-1 | Prompt Artifact domain entity + lifecycle | A-1 |
| E-2 | Prompt Pack domain entity (sequenced artifacts) | E-1 |
| E-3 | Prompt repository + application service | E-1, E-2 |
| E-4 | Prompt template configuration per agency type | D-4 |
| E-5 | Manual prompt artifact creation UI | E-3, B-8 |
| E-6 | Prompt pack assembly UI | E-5 |
| E-7 | Prompt approval workflow | E-3 |

**Gate:** Manual prompt pack created, approved, and ready for Cursor handoff.

---

### Stage F — AI Orchestration & Evaluation (Phase 3 core)

**Purpose:** AI-assisted generation and output evaluation.

| Order | Deliverable | Dependencies |
|-------|------------|-------------|
| F-0 | **Infrastructure decision:** server-side tier | P-07 |
| F-1 | Context Assembler service | D-2, C-2, B-6 |
| F-2 | AI Provider port (abstract, no vendor lock-in) | F-0 |
| F-3 | Orchestration Router (request types) | F-1, F-2 |
| F-4 | AI-assisted requirement analysis | F-3, D-2 |
| F-5 | AI-assisted prompt pack generation | F-3, E-3 |
| F-6 | Evaluation Engine domain + rubrics | A-1 |
| F-7 | Evaluation scoring service | F-6 |
| F-8 | Revision prompt generation on failure | F-5, F-7 |

**Gate:** AI generates draft prompt pack from requirements. Evaluation scores Cursor captures.

---

### Stage G — Cursor Integration (Phase 3 completion)

**Purpose:** Close the loop between AOS prompts and Cursor execution.

| Order | Deliverable | Dependencies |
|-------|------------|-------------|
| G-0 | **Infrastructure decision:** file storage for captures | P-08 |
| G-1 | Cursor Session Record domain entity | E-1 |
| G-2 | Session repository + application service | G-1 |
| G-3 | Prompt handoff UI (Level 1) | E-7, B-8 |
| G-4 | Structured capture template (Level 2) | G-3, G-0 |
| G-5 | Evaluation trigger on capture submission | G-4, F-7 |
| G-6 | Revision workflow UI | G-5, F-8 |
| G-7 | Prompt pack progression (block N+1 until N passes) | G-5, E-2 |

**Gate:** Full prompt → Cursor → capture → evaluate → revise/advance cycle works.

---

### Stage H — Knowledge & Learning (Phase 4)

**Purpose:** Compounding intelligence flywheel.

| Order | Deliverable | Dependencies |
|-------|------------|-------------|
| H-1 | Knowledge Record domain entity | A-1 |
| H-2 | Knowledge repository + application service | H-1 |
| H-3 | Ingestion pipeline (workflow events → knowledge) | H-2, B-9 |
| H-4 | Classification and tagging service | H-2 |
| H-5 | Retrieval service (for Prompt Engine context) | H-4, F-1 |
| H-6 | Retrospective workflow | H-2, B-7 |
| H-7 | Promotion workflow (engagement → agency) | H-6 |
| H-8 | Prompt template auto-improvement | H-7, E-4 |
| H-9 | Module Registry quality scoring | H-7, C-2 |
| H-10 | Documentation generation service | H-5, D-2, G-2 |
| H-11 | Estimation calibration metrics | H-6, B-7 |

**Gate:** Closed engagement produces promoted lessons, updated templates, and improved registry.

---

### Stage I — Orchestration & Scale (Phase 5)

**Purpose:** Minimal-overhead delivery automation.

| Order | Deliverable | Dependencies |
|-------|------------|-------------|
| I-1 | Server-side orchestration production deployment | F-0 |
| I-2 | Cursor SDK/API integration (Level 3) | G-7, I-1 |
| I-3 | Automated context assembly | H-5, I-1 |
| I-4 | Cross-engagement analytics | H-11 |
| I-5 | Stale knowledge detection | H-4 |
| I-6 | Agency-type template marketplace | H-8, E-4 |
| I-7 | Optional: client delivery portal | I-4 |

**Gate:** End-to-end delivery with automated planning, prompting, evaluation, and learning.

---

## Critical Path

```
A (scaffold) → B (engagements) → C (registry) → D (requirements)
                                                      │
                                                      ▼
                                              E (prompt engine)
                                                      │
                                                      ▼
                                              F (AI + evaluation) ← F-0 server decision
                                                      │
                                                      ▼
                                              G (Cursor integration) ← G-0 storage decision
                                                      │
                                                      ▼
                                              H (knowledge + learning)
                                                      │
                                                      ▼
                                              I (orchestration + scale)
```

**Longest pole:** F-0 (server-side infrastructure decision) gates Phase 3.

---

## Risk-Mitigated Sequencing Rationale

| Decision | Rationale |
|----------|-----------|
| Engagements before prompts | Can't prompt without knowing what's being built |
| Registry before matching | Can't assess reuse without catalog |
| Manual prompts before AI prompts | Validates prompt artifact model before automation |
| Level 1 Cursor before Level 3 | Immediate value without infrastructure investment |
| Knowledge after evaluation | Need evaluation data to learn from |
| Server-side after manual workflow | Proves workflow before automating it |

---

## Testing Strategy (Architectural)

Follow BOS testing precedent:

| Layer | Test type | Pattern source |
|-------|----------|---------------|
| Domain rules | Unit tests (vitest) | `bos/application/milestoneCompletionForm.test.ts` |
| Application services | Unit tests with mocked repos | BOS application tests |
| Firestore repositories | Integration tests (emulator) | `bosRepositories.integration.test.ts` |
| ERP/BOS read ports | Integration tests with emulator | BOS adapter tests |
| UI | Manual testing initially | BOS Phase 1 approach |

AOS should have tests from Stage B onward. Do not repeat ERP's 0% test coverage.

---

## What NOT to Implement (Reminder)

At every stage, verify none of these are being built:

- ERP customer/invoice/lead/expense CRUD
- BOS initiative/milestone/decision CRUD (read-only ports only)
- Kanban boards or sprint management
- Time tracking (until explicitly scoped in later phase)
- Client portal (until Phase 5 optional)
- Generic workflow engine
- Duplicate permission system
- Dead feature flags

---

## First Action Items (When Implementation Begins)

When Phase 1 implementation starts (not now), the first concrete tasks are:

1. Create `aos/` folder structure mirroring `bos/`
2. Add AOS permission keys to `config/permissions.ts`
3. Create `aos/config/featureFlags.ts` with working enforcement
4. Create `aos/config/routes.ts` and `aos/config/navigation.ts`
5. Register AOS routes in `App.tsx`
6. Add AOS nav group to `Sidebar.tsx`
7. Implement Delivery Engagement domain entity
8. Implement ERP Customer read port (first new port)

These are listed for future reference only. **Phase 0 does not execute them.**
