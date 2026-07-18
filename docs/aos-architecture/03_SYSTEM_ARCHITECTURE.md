# 03 — System Architecture

High-level architecture for AOS as the third layer above ERP and BOS. Conceptual only — no schemas, no UI, no implementation code.

---

## Platform Context

```
                    ┌──────────────────────┐
                    │   Human Operators    │
                    │ Founder · Lead · Dev   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │     AOS Layer          │
                    │  (Software Delivery)   │
                    └──────────┬───────────┘
                               │ read ports
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼────────┐ ┌────▼─────┐ ┌───────▼────────┐
    │   BOS Layer      │ │ ERP Read │ │  Module/Knowledge│
    │  (Strategy)      │ │  Ports   │ │  (AOS-owned)     │
    └─────────┬────────┘ └────┬─────┘ └────────────────┘
              │               │
    ┌─────────▼───────────────▼─────────┐
    │         ERP Layer (Business)       │
    │  Firestore · Auth · Permissions    │
    └────────────────────────────────────┘
```

**Deployment context (from ERP Discovery §01):** Single React SPA (Vite, HashRouter), Firebase Auth + Firestore, client-side business logic, no Cloud Functions in repo today.

AOS ships as a **new bounded context** within the same SPA — same pattern as BOS (`pages/app/bos/*` + `bos/*` module).

---

## AOS Bounded Context — Conceptual Domains

AOS is composed of seven conceptual domains. These are **architectural areas**, not implementation modules.

### 1. Delivery Domain

Governs the lifecycle of a **delivery engagement** — the AOS container for all work to build software for a client.

**Consumes from ERP:**
- Customer identity (`customers`, `businesses`) via read port
- Lead context if engagement originated from CRM (`leads`) via read port
- Team members (`users`, `companyUsers`) for assignment context

**Consumes from BOS (optional):**
- Initiative link for strategic alignment (`bosInitiatives`)
- Investment context via attributions (`bosAttributions` + expense read port)

**Does NOT duplicate:** ERP project folders, CRM pipelines, or BOS milestone boards.

---

### 2. Requirements Domain

Captures and structures what must be built — from client intake through analyzed, decomposed requirements ready for AI planning.

**Relationship to ERP:** Engagement links to ERP customer. Requirements reference client facts from ERP but live in AOS.

**Relationship to BOS:** If engagement aligns to a BOS initiative, requirements may reference initiative hypothesis and budget constraints (read-only).

---

### 3. AI Orchestration Domain

Coordinates AI participation across the delivery lifecycle — planning assistance, requirement analysis, documentation drafts, evaluation.

**Not a code generator.** Orchestration means: assemble context, invoke AI with structured inputs, capture outputs, route for human review.

**Infrastructure note:** ERP has 0% server-side logic (ERP Discovery §10). AOS architecture must plan for AI orchestration infrastructure (likely server-side) in later phases without specifying implementation here.

---

### 4. Prompt Engine Domain

First-class **prompt artifacts** — structured, versioned, evaluable inputs for Cursor and other AI tools.

**Inputs assembled from:**
- Requirements domain (what to build)
- Knowledge Engine (agency patterns, past lessons)
- Reusable Module System (what exists to reuse)
- ERP/BOS context (client name, strategic constraints — read-only summaries)
- Agency-type template (web/mobile/AI/SaaS prompt pack)

**Outputs:** Executable prompt packages with context budget, constraints, acceptance criteria, and evaluation rubric.

---

### 5. Cursor Integration Domain

Bridges AOS prompt artifacts to Cursor IDE execution and captures results back.

**Conceptual workflow:**
1. AOS produces approved prompt artifact
2. Human executes in Cursor (or future SDK automation)
3. Cursor output (diff summary, files changed, agent transcript) captured into AOS
4. Evaluation domain scores output against requirements
5. Knowledge Engine stores successful patterns

**Grounding:** Cursor is already the team's execution environment. ERP/BOS do not integrate with Cursor today. This is entirely net-new AOS responsibility.

---

### 6. Knowledge Engine Domain

Accumulates organizational knowledge across projects:

| Knowledge type | Source | Scope |
|----------------|--------|-------|
| **Agency patterns** | Retrospectives, evaluations | Company-wide |
| **Prompt templates** | Successful prompt artifacts | Company-wide |
| **Module documentation** | Module registry updates | Company-wide |
| **Project facts** | Delivery engagement records | Engagement-scoped |
| **Client context** | ERP customer data | Read from ERP; never duplicated |

**Relationship to ERP ActivityLogger:** ERP logs mutations (`activities` collection). AOS knowledge is richer — includes prompts, evaluations, reuse decisions. AOS may **extend** ActivityLogger with new event types but does not replace it.

**Relationship to BOS decisions:** BOS `bosDecisions` capture strategic choices. AOS captures **delivery decisions** (architecture, reuse, scope tradeoffs) separately.

---

### 7. Reusable Module System Domain

Catalog of reusable code, components, services, and patterns available for future projects.

**Seeded from ERP Discovery findings:**
- 37 UI components (`components/`)
- 34 services (`services/`)
- 19 utilities (`utils/`)
- BOS domain patterns (`bos/domain/`, `bos/application/`)
- Shared formatting (`utils/bosFormat.ts`)

**Evolves through:** Manual registration, post-project extraction, continuous learning feedback.

---

## AOS Internal Layer Model

Mirrors proven BOS layering (`bos/docs/INTEGRATION_LAYER.md`):

```
AOS UI (future pages/app/aos/*)
        │
        ▼
AOS Application Services (future aos/application/*)
        │
        ├── AOS Domain (entities, rules, lifecycle)
        │
        ├── AOS Repository Contracts (future aos/contracts/*)
        │
        ├── AOS Firestore Repositories (future aos/infrastructure/*)
        │
        ├── ERP Read Ports (extend bos/integration pattern)
        │
        ├── BOS Read Ports (new — read initiatives, milestones, decisions)
        │
        └── External Tool Ports (Cursor, AI providers — future)
```

**Mandatory rule:** UI calls application services only. Same compliance standard as BOS, enforced from Phase 1.

---

## Integration Architecture

### ERP Integration (Read-Only)

Extend the existing BOS port/adapter pattern:

| ERP data | Existing port | AOS need |
|----------|--------------|----------|
| Expenses | `ErpExpenseReadPort` ✅ | Delivery cost context |
| Invoices | `ErpInvoiceReadPort` ✅ (partial) | Billing milestone linkage |
| Leads | `ErpLeadReadPort` ✅ (unused) | Engagement origin context |
| Customers | **No port** | Engagement client identity — **new port required** |
| Users/team | **No port** | Assignment context — **new port required** |
| Products | **No port** | Service catalog reference — **new port required** |
| Activities | **No port** | Optional audit cross-reference |

**Law:** AOS never writes ERP collections. Cost/revenue linking uses sidecar attribution (same as BOS `bosAttributions` pattern).

---

### BOS Integration (Read-Only + Optional Links)

| BOS data | AOS use |
|----------|---------|
| `bosInitiatives` | Optional parent link — "this delivery serves strategic initiative X" |
| `bosMilestones` | Read business milestones for alignment; AOS delivery milestones are separate |
| `bosDecisions` | Read strategic constraints affecting delivery |
| `bosAttributions` | Read investment summary for ROI context |
| `bosVentures` | Portfolio context for multi-venture agencies |

**Law:** AOS never writes BOS collections. Links are stored in AOS-owned records as foreign key references (initiativeId, etc.).

**Important distinction (from BOS `relationships.ts`):** BOS initiative ≠ AOS delivery engagement. An initiative may spawn zero or many engagements; an engagement may exist without an initiative.

---

## Cross-Cutting Concerns

### Authentication & Authorization

**Reuse directly (ERP Discovery §08):**
- `useAuth`, `TokenService`, `usePermissions`, `ProtectedComponent`
- `companyId` tenancy via `resolveCompanyIdForUser`

**Extend:**
- AOS permission keys in `config/permissions.ts`
- `usePermissions` helpers (`canViewAosEngagements`, etc.)
- Sidebar nav group (same pattern as BOS Strategy group in `bos/config/navigation.ts`)

---

### Activity & Audit

**Extend ERP ActivityLogger** with AOS event types (engagement created, prompt approved, evaluation completed, module registered). Do not create a parallel audit system.

---

### Data Backup

**Extend** `DatabaseMigrationService` to include AOS collections. ERP Discovery §10 flags BOS exclusion from backup as critical debt — AOS must not repeat this.

---

### Feature Flags

**Working flags from day one.** Pattern: `aos/config/featureFlags.ts` with runtime enforcement in application services and UI gates.

---

## What Lives Where — Summary

| Concern | ERP | BOS | AOS |
|---------|-----|-----|-----|
| Client identity | ✅ | — | reads |
| Lead pipeline | ✅ | — | reads |
| Invoicing/billing | ✅ | — | reads |
| Expenses/costs | ✅ | — | reads |
| Bank/finance | ✅ | — | reads |
| Team/users | ✅ | — | reads |
| Strategic initiatives | — | ✅ | reads (optional link) |
| Business milestones | — | ✅ | reads |
| Founder decisions | — | ✅ | reads |
| Investment/ROI | — | ✅ | reads |
| Delivery engagements | — | — | ✅ |
| Requirements | — | — | ✅ |
| Prompt artifacts | — | — | ✅ |
| Cursor sessions | — | — | ✅ |
| Module registry | — | — | ✅ |
| Knowledge records | — | — | ✅ |
| Quality evaluations | — | — | ✅ |

---

## Architecture Risks (Structural)

| Risk | Source | Mitigation (architectural) |
|------|--------|---------------------------|
| Client-side-only platform | ERP Discovery §10 | Plan server-side tier for AI orchestration before Phase 3 |
| No file storage | ERP Discovery §10 | Plan document/evidence storage before knowledge capture at scale |
| ERP service bypass in pages | ERP Discovery §03 | AOS must not copy this; enforce ports + services |
| BOS adapter bypass in UI | ERP Discovery §10 | AOS layer discipline from Phase 1 |
| Dual permission registries | ERP Discovery §10 | Single registry for AOS keys |
| BOS not in backup | ERP Discovery §10 | Include AOS in backup plan from Phase 1 |
