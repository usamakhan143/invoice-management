# AOS Founder Experience Architecture (FXD) — Index

**Stage:** AOS Phase 1, Stage D0  
**Status:** Architecture documentation only — no implementation  
**Architecture lock:** AOS v1.0 (July 17, 2026) — ADR-001 through ADR-015  
**Audience:** Founders, product, delivery leads, UI implementers (future stages)

---

## Purpose

This folder defines the **Founder Experience** for AOS before any UI implementation. It translates frozen domain architecture into founder-facing product design: journeys, screens, decisions, AI touchpoints, and UX philosophy.

FXD does **not** redesign the domain, invent bounded contexts, or introduce generic project management.

---

## Document Map

| # | Document | Scope |
|---|----------|-------|
| 01 | [Founder Journey](./01_FOUNDER_JOURNEY.md) | End-to-end delivery journey from lead closed to project closed |
| 02 | [Screen Architecture](./02_SCREEN_ARCHITECTURE.md) | Every AOS screen — purpose, information, actions, AI, navigation |
| 03 | [Navigation Architecture](./03_NAVIGATION_ARCHITECTURE.md) | Sidebar hierarchy, screen rationale, excluded PM concepts |
| 04 | [Dashboard Philosophy](./04_DASHBOARD_PHILOSOPHY.md) | Founder command center — attention, blocks, approvals, risks |
| 05 | [AI Touchpoints](./05_AI_TOUCHPOINTS.md) | Every AI value moment across the lifecycle |
| 06 | [Cursor Workflow](./06_CURSOR_WORKFLOW.md) | Prompt → execution → evaluation → learning lifecycle |
| 07 | [Decision Map](./07_DECISION_MAP.md) | Every founder/delivery-lead decision with inputs and evidence |
| 08 | [Notification Philosophy](./08_NOTIFICATION_PHILOSOPHY.md) | Meaningful alerts only — no spam |
| 09 | [UX Principles](./09_UX_PRINCIPLES.md) | Cross-cutting interaction rules |
| 10 | [Product Philosophy](./10_PRODUCT_PHILOSOPHY.md) | Why AOS is not Jira/ClickUp/Monday/Asana/Linear |
| 11 | [User Flows](./11_USER_FLOWS.md) | Primary flows as architecture diagrams |
| 12 | [Final FXD Report](./12_FINAL_FXD_REPORT.md) | Summary, compliance, readiness for UI stage |

---

## Architectural Anchors (Non-Negotiable)

1. **Delivery Engagement** is the aggregate root for engagement-scoped work (ADR-003).
2. **No generic PM** — no tasks, sprints, kanban, story points (ADR-012).
3. **Sidecar Law** — ERP/BOS read-only; AOS never writes business records (ADR-011).
4. **Reuse-first** before net-new development (ADR-010).
5. **Evaluation gate** before dependent progression (ADR-007).
6. **Approved requirements and prompts are immutable versions** (ADR-004, ADR-005, ADR-013).
7. **Cursor executes; AOS governs, captures, evaluates, learns** (ADR-006).
8. **Append-only evidence** — cancelled/deprecated preserved (ADR-014).

---

## Relationship to Implementation

| Layer | FXD role |
|-------|----------|
| Domain | **Reference only** — frozen |
| Application | **Reference only** — C1 complete |
| Infrastructure | **Reference only** — C2/C3 complete |
| Presentation | **Defined here** — implemented in future UI stages |

---

## Glossary (FXD)

| Term | Meaning in founder experience |
|------|----------------------------|
| **Founder** | Agency owner or executive accountable for delivery outcomes |
| **Delivery lead** | ERP user who runs the engagement day-to-day; may be founder |
| **Attention item** | Something requiring human judgment before progress continues |
| **Evidence** | Evaluation, approval record, or capture that proves a gate passed |
| **Next action** | Single recommended step derived from lifecycle state + blockers |
