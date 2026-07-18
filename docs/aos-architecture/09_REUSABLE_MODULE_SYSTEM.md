# 09 — Reusable Module System

How reusable modules are cataloged, versioned, integrated, and improved across client projects. Architecture only — no registry schema, no code.

---

## Purpose

ERP Discovery identified significant reusable assets with **no cross-project index**:

| Asset class | Count | Indexed? |
|-------------|-------|----------|
| UI components | 37 | No |
| Services | 34 | No |
| Utilities | 19 | No |
| BOS domain patterns | ~139 files | No |
| Hooks | 7 | No |
| Config patterns | Multiple | No |

The Reusable Module System (RMS) is the **agency's internal catalog** of code, patterns, components, services, skills, and templates that future projects should prefer over net-new development.

This directly supports AOS Core Principle **D-003 — Reuse Before Build**.

---

## What Qualifies as a Module

A **module** is any reusable unit that reduces net-new development in a future engagement:

| Module type | Examples from current codebase |
|-------------|-------------------------------|
| **UI component** | `SearchableListSelect`, `BosModal`, `DashboardCard`, `CampaignTagPill` |
| **Service** | `invoiceService`, `leadService`, `activityLogger`, `permissionService` |
| **Utility** | `bosFormat.ts`, `exchangeRates.ts`, `screenPin.ts`, `csvExport.ts` |
| **Hook** | `useAuth`, `usePermissions`, `useBosScope` |
| **Domain pattern** | BOS entity + application service + repository + port layering |
| **Integration pattern** | ERP read port + Firestore adapter (sidecar law) |
| **Cursor skill** | Skills in `.cursor/skills-cursor/` |
| **Cursor rule** | Rules in `.cursor/rules/` |
| **Prompt template** | Agency-type prompt pack from Prompt Engine |
| **Delivery template** | Agency-type lifecycle checklist |
| **Client module** | Code extracted from a prior client project (future) |

---

## Module Registry Architecture (Conceptual)

```
┌─────────────────────────────────────────────────────────┐
│                  Module Registry (AOS)                   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Registration │  │ Version      │  │ Matching     │   │
│  │ Service      │  │ Tracker      │  │ Engine       │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                  │           │
│  ┌──────▼─────────────────▼──────────────────▼───────┐   │
│  │           Module Catalog (AOS-owned)              │   │
│  │  entries · versions · metadata · usage history     │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         ▲                    │                    ▲
         │                    ▼                    │
   Manual registration   Reuse assessment     Prompt Engine
   Post-project extract  (Requirements)       (context block)
   ERP Discovery seed    Evaluation Engine    Knowledge Engine
```

---

## Module Entry Metadata (Conceptual)

Each registry entry describes a reusable module without storing its source code:

| Metadata field | Purpose |
|----------------|---------|
| **Name** | Human-readable identifier |
| **Type** | component / service / utility / pattern / skill / template |
| **Location** | File path(s) in repository |
| **Description** | What it does, when to use |
| **Agency types** | web / mobile / AI / SaaS / all |
| **Dependencies** | Other modules it requires |
| **Integration notes** | How to wire it (permissions, ports, etc.) |
| **Anti-patterns** | When NOT to use |
| **Version** | Semantic version or commit reference |
| **Status** | active / deprecated / experimental |
| **Usage count** | Times referenced in engagements |
| **Last used** | Most recent engagement reference |
| **Quality score** | Based on evaluation outcomes when used |
| **Origin** | ERP built-in / BOS pattern / client extraction / manual |

---

## Bootstrap Seed (From ERP Discovery)

Phase 1 should seed the registry from ERP Discovery findings without manual cataloging:

| Discovery doc | Seed content |
|---------------|-------------|
| `05_REUSABLE_COMPONENTS.md` | 37 UI components with reuse classification |
| `06_REUSABLE_BUSINESS_LOGIC.md` | 34 services + 19 utilities |
| `08_AOS_INTEGRATION_POINTS.md` | Reuse/extend/observe classifications |
| `09_DUPLICATION_REPORT.md` | Anti-patterns (what NOT to rebuild) |
| `bos/docs/INTEGRATION_LAYER.md` | Domain pattern template |

This gives the registry **~90 initial entries** on day one.

---

## Module Lifecycle

```
Discovered (manual, extraction, or ERP Discovery import)
        │
        ▼
Registered (metadata captured, version set)
        │
        ▼
Active (available for reuse matching)
        │
        ├──→ Used in engagement → usage count++, quality score updated
        │
        ├──→ Improved (new version) → version tracker updates
        │
        └──→ Deprecated (superseded or codebase removed) → status change
```

---

## Versioning Philosophy

| Scenario | Versioning approach |
|----------|-------------------|
| ERP built-in module changes | Registry entry updated to match codebase commit |
| Client-extracted module | Independent semver; may diverge from origin |
| Prompt template | Version per Prompt Engine lifecycle |
| Domain pattern | Version when architectural rules change |
| Deprecated module | Old version kept for historical engagement reference |

Versioning tracks **metadata about the module**, not copies of source code. Source code lives in the repository (or client repo). Registry points to it.

---

## Matching Engine

During Requirements Domain reuse assessment (Lifecycle Stage 3), the Matching Engine queries the registry:

### Matching inputs
- Requirement descriptions
- Agency type profile
- Engagement type (greenfield/enhancement/maintenance)
- Technical constraints

### Matching outputs
- **Recommended modules** — high confidence match, use directly
- **Adaptable modules** — partial match, extend rather than rebuild
- **Gap identified** — no match, net-new development required

### Matching sources (priority)
1. Exact tag/type match in registry
2. Semantic similarity to module descriptions
3. Knowledge Engine patterns ("last time we needed X, we used Y")
4. ERP Discovery duplication report (hard anti-match for ERP modules)

---

## Integration Patterns

When a module is selected for reuse, AOS documents the integration approach:

| Pattern | When | Example |
|---------|------|---------|
| **Direct import** | UI component or utility | Import `SearchableListSelect` in new page |
| **Service call** | ERP service | Call `customerService.getCustomer()` via existing service |
| **Read port** | Cross-bounded-context data | Use `ErpCustomerReadPort` (future) |
| **Pattern replication** | Architectural pattern | New module follows `bos/` folder structure |
| **Sidecar extension** | Link to ERP/BOS entity | New AOS record references ERP customer ID |
| **Template instantiation** | Prompt or delivery template | Apply SaaS agency prompt pack |
| **Skill invocation** | Cursor skill | Reference create-rule skill in prompt |

Each pattern maps to AOS Core Principles (especially sidecar law and layer discipline).

---

## Client Module Extraction

When a client project produces reusable code, AOS supports **extraction into the registry**:

### Extraction criteria
- Code is not client-specific (no client branding, secrets, or unique business logic)
- Code follows AOS architecture principles (passed evaluation)
- Code generalizes to agency-type pattern
- Client IP agreement allows reuse

### Extraction process (conceptual)
1. Retrospective identifies reusable code from engagement
2. Delivery lead marks code for extraction
3. Client-specific elements stripped
4. Module registered with origin = client extraction
5. Knowledge Engine records extraction lesson
6. Prompt templates updated to reference new module

---

## Module Quality Tracking

Quality score evolves based on evaluation outcomes:

| Signal | Effect on score |
|--------|----------------|
| Used in engagement, all evaluations pass | Score increases |
| Used in engagement, evaluation failures | Score decreases |
| Used across multiple engagements successfully | Score increases (confidence) |
| Codebase module removed/deprecated | Status → deprecated |
| Stale (not used in N engagements) | Flagged for review |

High-quality modules are prioritized in Matching Engine results and Prompt Engine context blocks.

---

## Relationship to ERP/BOS Modules

| Layer | Module examples | Registry treatment |
|-------|----------------|-------------------|
| ERP components | `Sidebar`, `PaymentTrackingModal` | Register as `erp-built-in`, location in repo |
| ERP services | `invoiceService`, `leadService` | Register as `erp-built-in`, consume not rebuild |
| BOS patterns | Application service + repo + port | Register as `domain-pattern`, replication guide |
| BOS UI | `BosModal`, `BosFormFieldLabel` | Register as `erp-built-in` (BOS UI in same repo) |
| AOS (future) | AOS components/services | Register as `aos-built-in` |
| Client extracted | Client project code | Register as `client-extraction`, semver independent |

**Critical rule (from Duplication Report):** Registry entries for ERP modules exist to **prevent rebuilding them**, not to copy them. Matching Engine should never recommend "build new customer service" when `customerService.ts` exists.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|-------------|-----------------|
| Rebuilding ERP module because dev didn't know it exists | Registry + Matching Engine surface it |
| Registering module without integration notes | Every entry must explain how to use |
| Copying source code into registry | Registry stores metadata + location only |
| Client-specific code registered as agency module | Strip client identifiers first |
| Module used but not registered | Post-engagement extraction process |
| Registry not updated when codebase changes | Stale detection in Knowledge Engine |

---

## Phase Introduction

| Phase | RMS capability |
|-------|---------------|
| Phase 1 | Seed from ERP Discovery; manual registration; basic search |
| Phase 2 | Matching Engine for reuse assessment; usage tracking |
| Phase 3 | Quality scoring; version tracking; client extraction |
| Phase 4 | Automatic registration from evaluation outcomes |
| Phase 5 | Cross-agency module sharing (optional) |
