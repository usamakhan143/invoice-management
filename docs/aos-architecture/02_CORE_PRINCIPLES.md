# 02 — Core Principles

Operating laws, architectural rules, and anti-patterns for AOS. Each principle is grounded in ERP/BOS reality or explicit gaps identified in the ERP Discovery Audit.

---

## The Three Ownership Laws

### Law 1 — ERP Owns Business Data

**Statement:** All client identity, financial records, lead pipeline, team membership, and audit events remain in ERP collections and services.

**Justification:** ERP Discovery §11 lists 8 modules that must **never be rewritten** (auth, customers, invoices, expenses, banking, leads, tenancy). These are data-rich and deeply integrated.

**AOS rule:** AOS reads ERP via **read ports** (same pattern as `bos/integration/ports/*`). AOS never creates parallel `customers`, `invoices`, `leads`, or `expenses` collections.

**Test:** *If AOS were removed tomorrow, would the agency still invoice clients and manage leads?* → **Yes.**

---

### Law 2 — BOS Owns Founder Strategy

**Statement:** Strategic questions — where to invest, expected ROI, business milestones, founder decisions — remain in BOS.

**Justification:** BOS entities (`bosVentures`, `bosInitiatives`, `bosMilestones`, `bosDecisions`, `bosAttributions`) are complete for Phase 1. BOS forbids aliasing initiatives to campaigns or ventures to businesses (`bos/domain/relationships.ts`).

**AOS rule:** AOS may **link** delivery engagements to BOS initiatives for strategic context. AOS must not replace BOS milestones with dev task boards or conflate BOS decisions with code review comments.

**Test:** *Can a founder review portfolio ROI without opening AOS?* → **Yes.**

---

### Law 3 — AOS Owns Software Delivery

**Statement:** Everything about how software gets planned, prompted, built, evaluated, documented, and improved belongs to AOS.

**Justification:** ERP Discovery §11 identifies **0% existing coverage** for project execution, AI planning, prompt generation, Cursor orchestration, knowledge capture, and reusable module management. These are net-new AOS responsibilities.

**AOS rule:** Delivery methodology, prompt artifacts, Cursor session records, module registry entries, and quality evaluations live in AOS-owned storage (design TBD in later phases — not in Phase 0).

**Test:** *Can a delivery lead run a client project entirely within AOS without re-implementing CRM or invoicing?* → **Yes** (by consuming ERP/BOS).

---

## Architectural Operating Laws

### A-001 — Sidecar Law (Inherited from BOS)

BOS never writes ERP collections. AOS inherits this absolutely.

**Evidence:** `SIDECAR_LAW_ERP_COLLECTIONS` in `bos/constants/index.ts`; attribution writes go only to `bosAttributions`.

**AOS extension:** AOS writes only to `aos*` bounded context. ERP and BOS collections are read-only from AOS perspective.

---

### A-002 — Downstream Ignorance (Inherited from BOS)

ERP modules do not import BOS. BOS must not import AOS. Lower layers are unaware of upper layers.

**Evidence:** Zero `import …/bos` in ERP pages or services (ERP Discovery §07).

**AOS rule:** ERP and BOS code remain unchanged when AOS ships. AOS integrates upward through ports and UI routes, not downward through ERP modifications.

---

### A-003 — Layer Discipline (Inherited from BOS)

```
UI → Application Services → Domain Rules → Repositories / Read Ports → Firestore
```

**Evidence:** `bos/docs/INTEGRATION_LAYER.md` layer model; known violation in `initiativeMilestoneEngine.ts` calling adapter directly (ERP Discovery §10 — flagged as debt).

**AOS rule:** AOS must enforce this from day one. UI never calls repositories or ERP adapters directly.

---

### A-004 — Single Permission Registry

All permission keys — ERP, BOS, and AOS — extend the existing registry in `config/permissions.ts`.

**Evidence:** ERP Discovery §10 flags **dual BOS permission registries** (`config/permissions.ts` vs `bos/constants/permissionKeys.ts`) as high debt. 30+ BOS keys are unwired.

**AOS rule:** Do not create a third namespace. AOS keys are added to the existing ERP registry and surfaced in `RoleManagement.tsx`.

---

### A-005 — Feature Flags Must Work

BOS defines feature flags in `bos/config/featureFlags.ts` but `isBosFeatureEnabled()` has zero callers (ERP Discovery §07, §10).

**AOS rule:** Every AOS capability that spans multiple phases must be gated by a working feature flag from first implementation. Dead flags are an anti-pattern.

---

### A-006 — Company Tenancy

All AOS data is scoped by `companyId`, resolved via `resolveCompanyIdForUser()` / `useBosScope` pattern.

**Evidence:** ERP uses owner UID as companyId for self-signup; BOS reuses this via `hooks/useBosScope.ts`.

**AOS rule:** Agency = company. No cross-tenant reads. Same Firestore rules pattern as BOS (`bosCompanyReadOk` / `bosCompanyWriteOk`).

---

### A-007 — Backward Compatibility (Inherited from BOS Principle 1)

Removing AOS must not break ERP or BOS operation.

**Evidence:** BOS Core Principles — "If we removed the entire BOS layer tomorrow, would the business still operate exactly as it does today?"

**AOS rule:** AOS is additive. ERP daily workflows (expenses, invoices, leads) remain unchanged for staff who never open AOS.

---

## Delivery Principles

### D-001 — Software Delivery, Not Task Management

AOS organizes work around **delivery outcomes** (shippable artifacts, evaluated prompts, documented decisions) — not arbitrary tasks with assignees and due dates.

**Anti-pattern:** Kanban boards as the primary interface. Sprint planning ceremonies. Story point poker.

**Correct pattern:** Requirement → AI-assisted plan → prompt pack → Cursor execution → evaluation → knowledge capture.

---

### D-002 — Human-in-the-Loop AI

AI assists planning, prompt generation, evaluation, and documentation. Humans approve requirements, prompts, and deliverables.

**Justification:** BOS decisions require explicit founder judgment (`BosDecision` entity). AOS extends this pattern — AI proposes, humans decide.

**Anti-pattern:** Fully autonomous code generation without evaluation gates.

---

### D-003 — Reuse Before Build

Before net-new development, AOS queries the **Reusable Module System** and ERP component inventory (ERP Discovery §05, §06).

**Evidence:** 37 reusable components, 34 services, BOS domain patterns — mostly unindexed for cross-project reuse today.

**AOS rule:** Every delivery plan includes a reuse assessment step.

---

### D-004 — Knowledge Capture by Default

Decisions, prompts, evaluations, and lessons are captured during delivery — not deferred to project end.

**Evidence:** ERP `activityLogger` exists but activity types are scattered string literals (ERP Discovery §10). BOS has decision timeline and initiative close lessons but no delivery knowledge system.

**AOS rule:** Capture is a side effect of normal workflow, not a separate documentation chore.

---

### D-005 — Agency-Type Awareness Without Fragmentation

Web, mobile, AI, and SaaS agencies share one AOS with **delivery templates and prompt packs** — not separate products.

**Justification:** ERP already supports multi-currency, multi-module agencies under one `companyId`. Same tenancy model applies.

---

## Anti-Patterns (Explicitly Forbidden)

| # | Anti-pattern | Why forbidden | Correct approach |
|---|-------------|---------------|------------------|
| AP-01 | Rebuild CRM in AOS | ERP leads/customers are 90% reusable | Consume via read ports |
| AP-02 | Rebuild invoicing in AOS | ERP invoice lifecycle is complete | Link delivery milestones to ERP invoices |
| AP-03 | Replace BOS milestones with dev tasks | BOS milestones = business outcomes | AOS owns delivery work units separately |
| AP-04 | AOS writes to ERP collections | Violates sidecar law | Sidecar + attribution pattern |
| AP-05 | Monolithic AOS pages (3,000+ lines) | ERP technical debt (ExpensesPage, LeadsPage) | BOS layering from day one |
| AP-06 | Third permission namespace | Already a BOS debt item | Extend `config/permissions.ts` |
| AP-07 | Dead feature flags | BOS anti-pattern proven | Wire flags at introduction |
| AP-08 | Generic PM features as core | Contradicts AOS vision | Delivery intelligence as core |
| AP-09 | Cursor as black box | No learning loop | Capture inputs/outputs/evaluations |
| AP-10 | Client data in cross-project learning | Privacy/trust violation | Agency-level patterns only; client facts stay scoped |

---

## Entity Boundary Rules

Derived from BOS forbidden aliases and ERP entity map:

| Concept | Owner | AOS relationship |
|---------|-------|------------------|
| Customer | ERP | Read via port; never duplicate |
| Business (under customer) | ERP | Read via port |
| Lead | ERP | Read via port; conversion stays in ERP |
| Invoice | ERP | Read via port; billing stays in ERP |
| Expense | ERP | Read via port; BOS attribution pattern extends to AOS cost linking |
| Campaign | ERP | Observe tagging patterns; AOS ≠ campaigns |
| BOS Venture | BOS | Optional strategic parent for delivery engagement |
| BOS Initiative | BOS | Optional strategic link; not the same as AOS delivery project |
| BOS Milestone | BOS | Business outcome; not a dev task |
| BOS Decision | BOS | Strategic decision; AOS captures delivery decisions separately |
| **AOS Delivery Engagement** | **AOS** | Primary delivery container (net-new) |
| **AOS Prompt Artifact** | **AOS** | Structured Cursor input (net-new) |
| **AOS Module Registry Entry** | **AOS** | Reusable code/module catalog (net-new) |
| **AOS Knowledge Record** | **AOS** | Captured learning (net-new) |

---

## Compliance Tests

Before any AOS phase ships, verify:

1. **Removal test:** Removing AOS does not break ERP or BOS daily operation
2. **Sidecar test:** No AOS write path touches ERP or BOS collections
3. **Layer test:** No UI file imports repositories or ERP adapters directly
4. **Duplication test:** No new collection mirrors an ERP entity (customers, invoices, leads, expenses)
5. **Permission test:** All AOS keys live in `config/permissions.ts` and appear in role management
6. **Flag test:** Every partial feature is behind a working feature flag
7. **Tenancy test:** All reads/writes scoped by `companyId`
8. **PM test:** Primary UX is not a task board — it is delivery intelligence
