# 12 — Technical Debt Report

**Method:** Code inspection + cross-reference with Stage D2 implementation reports  
**Categories:** Critical → Low with impact estimates

---

## Critical (Production Blockers)

### TD-C01: In-Memory Workflow Store

| Attribute | Detail |
|-----------|--------|
| **Location** | `aos/infrastructure/memory/EngagementWorkflowMemoryStore.ts` |
| **Description** | All workflow artifacts (requirements, prompts, cursor, evaluation, QA, retrospective) stored in browser memory Map |
| **Why it exists** | Phase 1A UI contract — explicit deferral per M7–M12 implementation |
| **Impact** | Complete workflow data loss on page refresh; no multi-device sync; no audit trail |
| **Future cost** | 4–6 weeks engineering to implement domain entities + Firestore repos + migration |
| **Risk if ignored** | Workflow DTO becomes permanent domain; ADR-004/005/014 permanently violated |

---

### TD-C02: Missing Workflow Domain Model

| Attribute | Detail |
|-----------|--------|
| **Location** | Absent — logic in `EngagementWorkflowApplicationService.ts` (~414 LOC) |
| **Description** | 73% of frozen domain model unimplemented; business rules live in application layer |
| **Impact** | No testable domain invariants; gate logic cannot be audited independently |
| **Future cost** | 6–8 weeks to implement 8 bounded contexts with rules, aggregates, versioning |
| **Risk if ignored** | Every UI change risks breaking gate semantics; regression surface grows unbounded |

---

### TD-C03: No Persistence for Registry / Knowledge / Playbook

| Attribute | Detail |
|-----------|--------|
| **Location** | `moduleRegistrySeed.ts`, `knowledgeSeed.ts`, `playbookSeed.ts` |
| **Description** | Catalog data is static in-memory seed; not company-scoped |
| **Impact** | Cannot add/edit modules; knowledge not promoted from retrospectives; playbook not agency-configurable |
| **Future cost** | 2–3 weeks per repository + admin UI |
| **Risk if ignored** | Reuse-first (ADR-010) and Knowledge Engine (ADR-009) remain theatrical |

---

### TD-C04: Append-Only Audit Trail Missing

| Attribute | Detail |
|-----------|--------|
| **Location** | `workflow.timeline[]` — in-memory, mutable array |
| **Description** | ADR-014 requires append-only evidence; timeline is unshifted into DTO with no immutability |
| **Impact** | No compliance-grade audit; evidence can be overwritten in stub |
| **Future cost** | 2–3 weeks for event store + read model |
| **Risk if ignored** | Legal/compliance failure for agency delivery records |

---

## High

### TD-H01: Infrastructure → Application Dependency Inversion

| Attribute | Detail |
|-----------|--------|
| **Location** | `EngagementWorkflowMemoryStore.ts:1-2` |
| **Impact** | Repository substitution requires refactoring store port location |
| **Future cost** | 1–2 days if addressed during first repo implementation |
| **Risk** | Copy-paste pattern to future repos |

---

### TD-H02: PageHeader `description` Prop Bug

| Attribute | Detail |
|-----------|--------|
| **Location** | 6 screens pass `description=` to PageHeader which accepts `subtitle=` |
| **Impact** | User-visible subtitles missing on dashboard, catalogs, queues |
| **Future cost** | 30 minutes to fix |
| **Risk** | Founder experience docs promise subtitle context that users never see |

---

### TD-H03: Missing `role="tabpanel"` on Engagement Tabs

| Attribute | Detail |
|-----------|--------|
| **Location** | 8 active tab screens; only dead placeholder has correct role |
| **Impact** | WCAG tab pattern incomplete; screen reader users get degraded experience |
| **Future cost** | 1 hour |
| **Risk** | Accessibility compliance failure in enterprise procurement |

---

### TD-H04: Firestore Security Rules Unverified

| Attribute | Detail |
|-----------|--------|
| **Location** | Outside `aos/` — Firebase project config |
| **Impact** | Client-side gates bypassable without server rules |
| **Future cost** | 1–2 weeks security review + rules authoring |
| **Risk** | Cross-tenant data access in production |

---

### TD-H05: Duplicated Delivery State (Domain + Constants)

| Attribute | Detail |
|-----------|--------|
| **Location** | `domain/delivery/deliveryState.ts` + `constants/deliveryState.ts` |
| **Impact** | Enum drift between layers |
| **Future cost** | 1 day to consolidate with code generation or single source |
| **Risk** | UI shows stale lifecycle labels after domain evolution |

---

### TD-H06: No E2E Test Suite

| Attribute | Detail |
|-----------|--------|
| **Location** | Missing — referenced in D2 exit criteria (E2E-01 through E2E-05) |
| **Impact** | Founder journey not CI-verified |
| **Future cost** | 2–3 weeks Playwright/Cypress suite |
| **Risk** | Regression in gate progression undetected |

---

## Medium

### TD-M01: Screen → Application Direct Imports

9 screens import application DTOs/constants bypassing hook encapsulation. Increases coupling during repository substitution.

### TD-M02: Catalog Screen Duplication (~700 LOC)

Three catalog screens + SidePanel wrappers share structure but no template.

### TD-M03: Hooks → ERP Service Bypass

`useErpCustomersQuery` and `useAosScope` call ERP services directly.

### TD-M04: Main Bundle Size (1,189 kB)

AOS wiring eager-loads Firestore infrastructure into shared chunk.

### TD-M05: Dashboard/Queue URL Leakage in Application

Route strings in application services violate layer separation.

### TD-M06: Global Seed Data Without Company Scope

Registry/knowledge/playbook visible identically to all tenants.

### TD-M07: Limited Accessibility Test Coverage

1 axe test (Button) for 56 catalog components.

### TD-M08: Integration Tests Excluded from Default CI

`deliveryStack.integration.test.ts` not in `test:aos` command.

### TD-M09: No Virtualization for Lists

Acceptable now; required at scale.

### TD-M10: Workflow Gate / Lifecycle Desync Risk

Gates and delivery lifecycle updated in separate code paths.

---

## Low

### TD-L01: Dead placeholder components (~120 LOC)

`AosPlaceholderLayout`, `EngagementTabPlaceholder`, empty barrels.

### TD-L02: Duplicate import in wiring file

`createAosPresentationServices.ts` lines 11 and 24.

### TD-L03: `React.memo` unused

No component memoization — premature at current scale.

### TD-L04: Clipboard API may fail outside HTTPS

Cursor session copy feature — edge case.

### TD-L05: Double QueryClient provider possible

Nested providers mitigated by singleton services.

### TD-L06: Search utility duplication

3 near-identical search rank implementations.

### TD-L07: C-060 AosNavItem deferred

Sidebar uses raw NavLink — functional, not catalog-pure.

---

## Debt Summary

| Severity | Count | Estimated remediation |
|----------|------:|----------------------:|
| Critical | 4 | 14–20 weeks |
| High | 6 | 4–6 weeks |
| Medium | 10 | 3–4 weeks |
| Low | 7 | 1 week |

**Total technical debt burden:** ~38% of codebase carries known deferred or defective patterns relative to frozen architecture target state.

---

## Debt Heat Map

```
Delivery vertical     [████████░░] 80% complete
Workflow domain       [██░░░░░░░░] 20% complete
Catalog persistence   [███░░░░░░░] 30% complete
Audit/compliance      [█░░░░░░░░░] 10% complete
UI polish/a11y        [███████░░░] 70% complete
Test coverage         [█████░░░░░] 50% complete
Performance at scale  [████░░░░░░] 40% complete
```

---

## Verdict

Technical debt is **manageable and explicitly documented** for Phase 1A, but **four critical items block production**. The debt is architectural (missing domains/repos), not cosmetic — fixing it requires implementing frozen domain model, not patching UI.
