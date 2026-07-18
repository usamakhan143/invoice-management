# 01 — AOS Vision

**Status:** Architecture Phase 0 — documentation only  
**Audience:** Founders, architects, delivery leads  
**Grounding:** ERP Discovery Audit (`docs/erp-discovery/`), BOS architecture (`bos/docs/`)

---

## What AOS Is

The **Agency Operating System (AOS)** is an **AI-first Development Operating System** — the operating layer that sits above the existing ERP and BOS to govern **how software agencies plan, build, evaluate, document, and improve delivery**.

AOS is **not** a project management tool. It is **not** Jira, ClickUp, Monday, or Asana. It does not optimize for task boards, sprint ceremonies, or generic workflow automation.

AOS optimizes for:

- **Dramatically reduced development time** through intelligent reuse and AI-assisted planning
- **Maximized code reuse** across client projects without duplicating ERP business modules
- **Higher-quality Cursor prompting** through structured context assembly and evaluation
- **Automatic organizational knowledge capture** so learnings survive team turnover
- **Continuous improvement** so every completed engagement makes the next one faster

---

## What AOS Is Not

| AOS is NOT | Why |
|------------|-----|
| A replacement for ERP CRM, finance, or invoicing | ERP Discovery confirms these modules are mature (~90% reusable). AOS consumes them. |
| A replacement for BOS strategic planning | BOS owns founder strategy (ventures, initiatives, investment). AOS owns delivery execution. |
| A generic project management system | PM tools optimize task tracking. AOS optimizes **software delivery intelligence**. |
| An AI code generator | AOS orchestrates humans + Cursor; it does not replace engineering judgment. |
| A client-facing portal (initially) | Client records live in ERP `customers`. Portal is a future AOS capability, not Phase 1. |

---

## Three-Layer Platform Model

The platform stack is already established by ERP and BOS. AOS completes it:

```
┌─────────────────────────────────────────────────────────┐
│  AOS — Software Delivery                                │
│  Projects · AI planning · Prompts · Cursor · Knowledge  │
├─────────────────────────────────────────────────────────┤
│  BOS — Founder Strategy                                 │
│  Ventures · Initiatives · Milestones · Decisions · ROI    │
├─────────────────────────────────────────────────────────┤
│  ERP — Business Operations                              │
│  Leads · Customers · Invoices · Expenses · Team · Reports│
└─────────────────────────────────────────────────────────┘
```

| Layer | Owns | Does NOT own |
|-------|------|--------------|
| **ERP** | Business data: clients, money, leads, team identity | Delivery methodology, AI prompts, code reuse |
| **BOS** | Strategic bets: where to invest, why, expected ROI | Day-to-day development workflow, Cursor sessions |
| **AOS** | Delivery execution: how work gets built, evaluated, reused | Client billing records, lead pipeline, bank balances |

This separation is justified by existing architecture:

- BOS already enforces **sidecar law** — it never writes ERP collections (`bos/constants/index.ts`, `SIDECAR_LAW_ERP_COLLECTIONS`)
- ERP pages contain **zero BOS imports** (ERP Discovery §07)
- BOS uses **read ports** for ERP data (`bos/integration/ports/*`)
- AOS must inherit this pattern, not invent a fourth data silo

---

## Target Agencies

AOS must serve **software development agencies** across specializations without collapsing into generic PM:

| Agency type | AOS specialization (examples) |
|-------------|------------------------------|
| **Web agencies** | Component reuse from ERP library; SSR/SPA delivery patterns; deployment checklists |
| **Mobile agencies** | Platform-specific module registry; store submission workflows; device QA rubrics |
| **AI agencies** | Prompt template libraries; model evaluation criteria; RAG/integration patterns |
| **SaaS agencies** | Multi-tenant patterns (already in ERP); subscription/billing handoff to ERP invoices; release cadence |

Specialization is achieved through **delivery templates, prompt packs, module catalogs, and quality rubrics** — not through separate products or duplicate ERP modules.

---

## Core Problem AOS Solves

The ERP Discovery Audit identified a **~55% reuse foundation** with critical gaps:

| Gap (from readiness report) | AOS addresses |
|----------------------------|---------------|
| No project/task management | Delivery engagements (AOS-owned, not ERP tasks) |
| No server-side logic | Planned in later phases; AOS architecture must account for it |
| Monolithic ERP pages (3,000+ lines) | Module registry + reuse engine guides teams away from re-building |
| BOS milestones = strategic outcomes, not dev tasks | AOS distinguishes **delivery work units** from **BOS business milestones** |
| No knowledge capture system | Knowledge Engine accumulates prompts, decisions, lessons |
| Cursor used ad hoc | Prompt Engine + Cursor Integration provide structured workflow |
| Feature flags defined but unused in BOS | AOS must not repeat this anti-pattern |

---

## Long-Term Vision (5-Year Horizon)

### Year 1 — Foundation
AOS governs delivery for one agency on top of existing ERP/BOS. First delivery engagements linked to ERP customers and BOS initiatives. Prompt packs and module registry seeded from ERP/BOS discovery artifacts.

### Year 2 — Intelligence
Every completed project feeds the Knowledge Engine. Reuse rate measurable. Cursor sessions evaluated against requirements automatically. New projects start with AI-generated delivery plans grounded in agency history.

### Year 3 — Multi-Agency Patterns
Delivery templates for web, mobile, AI, and SaaS mature. Module registry spans internal and client projects. Cross-project learning without client data leakage.

### Year 4 — Operating System Maturity
AOS becomes the default interface for "how we build software" — not where we track tasks. ERP remains financial truth. BOS remains strategic truth. AOS becomes delivery truth.

### Year 5 — Continuous Learning Flywheel
Organizational knowledge compounds: prompts improve, modules stabilize, estimation accuracy increases, Cursor evaluation catches regressions earlier. Development time per feature class measurably decreases quarter over quarter.

---

## Success Metrics (Conceptual)

These are **outcome measures**, not implementation targets:

| Metric | Meaning |
|--------|---------|
| **Reuse rate** | % of delivery work satisfied by existing modules vs net-new code |
| **Prompt quality score** | Evaluated Cursor outputs vs stated requirements |
| **Time-to-first-shippable** | From engagement start to first client-reviewable deliverable |
| **Knowledge capture rate** | % of delivery decisions/prompts/lessons recorded automatically |
| **Estimation accuracy** | Planned vs actual effort (fed by retrospectives) |
| **Regression rate** | Quality issues found post-delivery vs caught in AOS evaluation |

---

## Relationship to Existing Documentation

| Document set | Role relative to AOS |
|--------------|---------------------|
| `docs/erp-discovery/` | **Foundation audit** — what exists, what to reuse, what not to duplicate |
| `bos/docs/` | **Architectural precedent** — layering, sidecar law, ports, application services |
| `docs/business/08_Delivery_Playbook.md` | **Business process template** — AOS operationalizes this playbook |
| `docs/business-operating-system/` | **BOS business blueprint** — AOS extends delivery beyond founder strategy |

---

## Vision Statement

> **AOS is the AI-first operating system for software agency delivery — turning every client project into a reusable asset for the next one, while ERP keeps the business honest and BOS keeps the strategy focused.**
