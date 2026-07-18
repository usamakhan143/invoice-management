# AOS Frontend Architecture — Index

**Stage D1.6 — Frontend Engineering Architecture Freeze**  
**Date:** July 18, 2026  
**Status:** Frozen — binds all Stage D2+ frontend implementation  
**Supersedes:** Ad-hoc frontend decisions  
**Subordinate to:** ADR-001–015, Design Freeze, Design System, FXD

---

## Purpose

This folder freezes **how** AOS UI is engineered — layers, folders, imports, state, data flow, performance, testing, errors, and implementation order. After D1.6, D2 implements; it does not architect.

---

## Document Map

| # | Document | Scope |
|---|----------|-------|
| 30 | [Frontend Architecture](./30_FRONTEND_ARCHITECTURE.md) | Layers, folders, import rules |
| 31 | [Component Architecture](./31_COMPONENT_ARCHITECTURE.md) | Atomic hierarchy, smart/dumb, ownership |
| 32 | [State Management](./32_STATE_MANAGEMENT.md) | Local, server, UI, form, cache, polling |
| 33 | [Data Flow](./33_DATA_FLOW.md) | End-to-end from Firestore to render |
| 34 | [Performance Guidelines](./34_PERFORMANCE_GUIDELINES.md) | Rendering, lazy load, virtualization |
| 35 | [Testing Strategy](./35_TESTING_STRATEGY.md) | Pyramid, a11y, coverage |
| 36 | [Error Handling](./36_ERROR_HANDLING.md) | Boundaries, retry, offline |
| 37 | [Implementation Sequence](./37_IMPLEMENTATION_SEQUENCE.md) | D2 order, milestones, acceptance |
| 38 | [Final Documentation Lock Report](./38_FINAL_DOCUMENTATION_LOCK_REPORT.md) | D1.6.1 lock verdict |
| — | [M0A Engineering Foundation Report](./M0A_ENGINEERING_FOUNDATION_REPORT.md) | D2 M0A implementation report |

---

## Relationship to Other Docs

| Layer | Folder | Role |
|-------|--------|------|
| **What it looks like** | `docs/aos-design-system/` | Components, tokens |
| **How it behaves** | `docs/aos-design-freeze/` | Screens, interactions |
| **How it is built** | `docs/aos-frontend-architecture/` | Engineering architecture |

Precedence: see [29 Implementation Contract](../aos-design-freeze/29_IMPLEMENTATION_CONTRACT.md) — frontend architecture is **rank 5** (engineering authority); design freeze is **rank 4** (UX authority).

---

## Stop Condition

D1.6 complete. D2 begins only per [37 Implementation Sequence](./37_IMPLEMENTATION_SEQUENCE.md) Milestone 0 entry criteria.
