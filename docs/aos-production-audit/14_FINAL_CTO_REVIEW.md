# 14 — Final CTO Review

**Reviewer stance:** CTO approving architecture for 10-year horizon at enterprise scale (Stripe, Linear, Vercel, GitHub, Microsoft bar)  
**Subject:** AOS Stage D2 implementation in `aos/`  
**Date:** July 19, 2026

---

## Executive Question

> Would you approve this architecture for the next 10 years?

### Answer: **Not yet — but the foundation is worth preserving.**

I would **not** approve production deployment today. I **would** approve continued investment in this codebase **with mandatory conditions** because the delivery vertical slice demonstrates that the frozen architecture can be implemented correctly — the problem is completeness, not direction.

**Verdict: APPROVED WITH CONDITIONS**

---

## Strengths

### 1. Architectural Intent Is Real, Not Aspirational

The delivery domain (`entities → rules → lifecycle → aggregate → repository`) is implemented exactly as ADR-003 and the domain model specify. This is rare in greenfield projects where architecture docs are abandoned by sprint 3. **`DeliveryApplicationService` is reference-quality orchestration** — I would use it in an internal engineering standards doc.

### 2. PM Discipline Is Genuinely Enforced

ADR-012 compliance is the strongest finding in this audit. No kanban, no sprints, no velocity charts, no burndown. The founder dashboard is a decision surface. Queue screens are review queues, not task boards. **If you showed me only the presentation layer, I would believe the ADRs were written by the same team that wrote the code.** That alignment is worth protecting.

### 3. Automated Import Boundaries

`verifyAosImportBoundaries()` with zero violations is a mature engineering choice. Most Series B companies don't have this until after their first major layer violation incident. The checker has gaps vs. the full architecture doc, but the foundation is there.

### 4. Sidecar Law Is Correctly Implemented

ERP/BOS read adapters with company scoping, no cross-layer writes, delivery repos with mismatch rejection — this is how multi-tenant SaaS should work. **I would trust the delivery data path with real customer data today**, subject to Firestore rules verification.

### 5. Component Catalog Discipline

56 of 57 catalog components implemented with ~84% runtime reuse. Queue template pattern, engagement tab composition, and dashboard decision components show intentional design — not accretion. The UI contract from Stage D2 is **shippable as a product demo**.

### 6. Frozen Documentation Was Respected

Implementation did not silently redesign aggregates, lifecycles, or ownership. ADR-015 compliance is genuine. The team followed constraints when it would have been faster to cut corners. **That discipline is the primary reason I recommend continued investment rather than a rewrite.**

---

## Weaknesses

### 1. The Workflow Is a Facade

`EngagementWorkflowApplicationService` at 414 lines is the elephant in the room. It is not an application service — it is an **embedded domain model written in the wrong layer**. Requirements, prompts, cursor sessions, evaluations, and retrospectives exist as mutable DTO fields with boolean gate flags. **This is the single most dangerous piece of technical debt** because it looks complete while being structurally hollow.

If this ships to production as-is, you will spend 18 months migrating data out of a DTO that became the de facto schema. I have seen this movie at three companies. It does not end well.

### 2. 73% of the Domain Model Does Not Exist

Three of eleven frozen bounded contexts are implemented. The UI presents all eleven. **Users will assume the backend exists because the frontend is polished.** This is the most common failure mode in enterprise software: UI ahead of domain, domain never catches up.

### 3. In-Memory Stores Are Not "Temporary" Unless Governed

The memory store resets on refresh. Every engineer knows this. Every product demo hides this. **Without a hard deadline and governance, "temporary" stores become permanent.** The `EngagementWorkflowMemoryStore` importing application DTOs makes the wrong abstraction easy to copy for registry, knowledge, and playbook.

### 4. Presentation Bugs That Shouldn't Ship

Six screens pass `description=` to a component that accepts `subtitle=`. Subtitles silently don't render. Eight engagement tabs missing `role="tabpanel"`. These are not architectural issues — they are **quality gate failures** that suggest insufficient QA before declaring D2 complete.

### 5. Security Is UI-Deep

Route gates and permission gates are well-implemented on the client. I have no evidence of Firestore security rules enforcing the same boundaries. **At Stripe, this is an automatic production blocker.** Client-side permission checks are UX, not security.

---

## Risks

| Risk | Probability | Impact | Time horizon |
|------|:-----------:|:------:|:------------:|
| DTO becomes permanent schema | High | Critical | 6 months |
| Domain never catches up to UI | Medium | Critical | 12 months |
| Cross-tenant leak via missing rules | Medium | Critical | Production launch |
| Performance collapse at 200+ engagements | High | High | First real customer |
| Engineer confusion about rule location | High | Medium | Immediate |
| Accessibility procurement failure | Medium | Medium | Enterprise sales |
| AI orchestration bolted on wrong layer | Medium | High | Phase 2 |

---

## Future Scaling Concerns

### Year 1–2: Data Layer

Workflow, registry, knowledge, and playbook must move to Firestore (or equivalent) with proper domain entities. Queue projections should become server-side read models — client-side aggregation of all company workflows will not scale past ~50 active engagements.

### Year 2–3: Multi-Agency Operations

Global seed data must become company-scoped with admin configuration. Playbook and registry need versioning and approval workflows. Knowledge promotion pipeline must be automated, not manual seed curation.

### Year 3–5: AI Integration

Prompt pack composition, evaluation scoring, and requirement generation need backend AI orchestration ports — not inline application service stubs. The UI components (C-030–035) are ready; the backend is not.

### Year 5–10: Platform Evolution

If AOS becomes a platform (multiple agency types, white-label, API access), the current ERP-coupled auth and monolithic SPA wiring will need extraction. The delivery domain and contracts layer are the assets to preserve; the composition root and ERP hook bypasses are the coupling to plan for.

---

## Suggested Improvements (Post-Audit — Not Authorized Now)

These are recommendations for future phases, not audit actions:

1. **Implement workflow domain before any new UI** — entities, gates, versioning per ADR-004/005
2. **Move store ports to contracts/** — fix inversion before second repository
3. **Fix PageHeader prop bug and tabpanel roles** — before any external demo
4. **Extend import boundary rules** — screens→application, hooks→providers, infra→application
5. **Add Firestore security rules test suite** — parallel to converter checks
6. **Extract CatalogScreenTemplate** — reduce 700 LOC duplication before it spreads
7. **Implement E2E-01 through E2E-05** — gate progression is the core product promise
8. **Server-side dashboard read model** — before second agency onboarded
9. **Consolidate deliveryState** — single source of truth
10. **Governance: hard deadline on memory store removal** — with explicit milestone

---

## Conditions for Production Approval

| # | Condition | Owner |
|---|-----------|-------|
| 1 | Workflow domain implemented with Firestore persistence | Backend |
| 2 | Firestore security rules verified for all AOS collections | Security |
| 3 | PageHeader and tabpanel a11y fixes shipped | Frontend |
| 4 | E2E founder journey tests passing in CI | QA |
| 5 | Registry, knowledge, playbook repositories live | Backend |
| 6 | Append-only audit event store (ADR-014) | Backend |
| 7 | Import boundary rules extended per audit findings | Architecture |
| 8 | Performance test with 200+ engagements | Engineering |

---

## Final Scores

| Metric | Value |
|--------|------:|
| **Overall Grade** | **B−** |
| **Production Readiness** | **48%** |
| **Architecture Quality** | **74%** |
| **Maintainability** | **67%** |
| **Scalability** | **52%** |
| **Future AI Readiness** | **61%** |
| **Technical Debt (burden)** | **38%** |

### Grade Justification

- **A-range blocked by:** missing domain (73%), in-memory persistence, workflow logic in wrong layer
- **B-range earned by:** delivery vertical quality, ADR-012/015 compliance, catalog discipline, automated boundaries
- **Not C-range because:** this is not a mess — it is an incomplete execution of a sound design

---

## Final Verdict

# APPROVED WITH CONDITIONS

**Approve:** Architecture direction, delivery domain implementation, presentation layer contract, component catalog, sidecar law, PM discipline, continued Phase 1B investment.

**Do not approve:** Production deployment, external customer onboarding, sales demos without "prototype" disclaimer, treating D2 as "done."

The team built the right thing partially. **Finish the domain, fix the persistence, and this becomes a B+ architecture worth maintaining for 10 years.** Ship it today and you will rewrite the workflow layer within two years.

---

*This review is based entirely on source inspection of `aos/` and cross-reference with frozen architecture documents. No code was modified during this audit.*
