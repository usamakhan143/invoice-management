# 28 — Design Decision Principles

**Stage D1.5 — AOS Design Freeze**  
**Status:** Permanent — every future feature must pass this gate

This document is the **constitutional test** for UI and UX proposals. If a feature fails **Reject** criteria, it must not ship without ADR amendment.

---

## The Eight Questions

Every feature, screen, or component proposal must answer:

| # | Question | Pass indicator |
|---|----------|----------------|
| Q1 | Does it **reduce founder thinking**? | Fewer decisions, clearer next step |
| Q2 | Does it **reduce clicks** to complete a gate? | Shorter path with **no loss of evidence** |
| Q3 | Does it **improve evidence**? | More traceability, audit, evaluation visibility |
| Q4 | Does it **improve AI transparency**? | Drafts labeled, approvals explicit, inference marked |
| Q5 | Can it **reuse existing components**? | Maps to C-xxx or ST-xx without new primitives |
| Q6 | Does it **introduce PM concepts**? | Must be **no** |
| Q7 | Does it **violate ADR**? | Must be **no** |
| Q8 | Does it **improve delivery intelligence**? | Better lifecycle/gate/reuse decisions |

**Final question:** **Should it be rejected?**

---

## Accept Principles

### A1 — Decision Surfaces Over Dashboards

**Accept** when a view answers a specific founder decision (D1–D20 from FXD Decision Map).

**Reason:** ADR-001 positions AOS as operating system for delivery judgment — not reporting.

**Example:** AttentionQueue (accept) vs velocity chart (reject).

---

### A2 — One Next Action

**Accept** when engagement context presents **one** primary recommended action via NextBestActionCard.

**Reason:** FXD cognitive load rule; Q1 reduce thinking.

**Example:** “Approve requirement set v2” (accept) vs checklist of 12 optional tasks (reject).

---

### A3 — Gates Are Frictionful By Design

**Accept** when approval requires review surface + explicit dialog + labeled artifact version.

**Reason:** ADR-004, ADR-007, ADR-014 — human accountability.

**Example:** ApprovalDialog (accept) vs one-click approve all (reject).

---

### A4 — Evidence Before Progress

**Accept** when lifecycle advancement requires visible evidence (evaluation, capture, approved version).

**Reason:** Delivery intelligence is evidenced progress — not status clicks.

**Example:** Evaluation gate blocking Prompts (accept) vs manual status dropdown (reject).

---

### A5 — Reuse Before Build

**Accept** when UI surfaces registry/knowledge before net-new justification.

**Reason:** ADR-010 reuse-first.

**Example:** Reuse tab before Prompts (accept) vs skip-to-code (reject).

---

### A6 — Sidecar Not Clone

**Accept** when ERP/BOS data appears as read-only links — not duplicated CRUD.

**Reason:** ADR-011 Sidecar Law.

**Example:** Customer Sidecar link (accept) vs AOS customer editor (reject).

---

### A7 — Compose, Don’t Invent

**Accept** when feature uses existing C-xxx components in ST-xx template.

**Reason:** Design system integrity; implementation velocity.

**Example:** New filter on queue via FilterBar (accept) vs custom filter drawer pattern (reject).

---

### A8 — Calm Professional Aesthetic

**Accept** when visual change uses semantic tokens and neutral lifecycle display.

**Reason:** Design language — agency founder trust.

---

### A9 — Append-Only Honesty

**Accept** when “delete” flows become cancel/supersede with reason and audit trail UI.

**Reason:** ADR-014.

---

### A10 — Scoped Search and Discovery

**Accept** when search narrows lists within domain rules — see [26 Search](./26_SEARCH_AND_DISCOVERY.md).

---

## Reject Principles

### R1 — PM Concept Introduction

**Reject** any UI containing: tasks, subtasks, sprints, backlog grooming, kanban, story points, epics, assignee workload, Gantt scheduling.

**Reason:** ADR-012 explicit exclusion.

**Even if:** users ask for “familiar project tool”.

---

### R2 — Silent AI Authority

**Reject** when AI output appears without draft labeling or auto-applies without human gate.

**Reason:** ADR-001, ADR-005, founder trust.

---

### R3 — Click Reduction That Removes Evidence

**Reject** when fewer clicks skip review surfaces (e.g., inline queue approve).

**Reason:** Q2 must not trade off Q3.

---

### R4 — New Component Without Doc

**Reject** when implementation introduces UI not in C-xxx catalog.

**Reason:** [29 Implementation Contract](./29_IMPLEMENTATION_CONTRACT.md).

---

### R5 — Analytics Hub Creep

**Reject** founder dashboards dominated by charts, KPIs, velocity, pass-rate trends beyond light caption.

**Reason:** FXD dashboard philosophy.

---

### R6 — Generic Admin Patterns

**Reject** Bootstrap-style dense tables with 12 action icons per row, rainbow status columns, modal-on-modal stacks.

**Reason:** Design language anti-patterns.

---

### R7 — Optimistic Gate Approval

**Reject** UI that shows approved state before server confirmation.

**Reason:** Audit integrity.

---

### R8 — Duplicate Domain Ownership

**Reject** AOS screens that edit ERP customers, BOS ventures, invoices, timesheets.

**Reason:** Sidecar Law + domain boundaries.

---

### R9 — Entertainment Motion

**Reject** confetti, bounce, celebration animations on approve.

**Reason:** Motion system — approval is serious.

---

### R10 — Bulk Human Gates

**Reject** bulk approve for requirements, prompts, evaluations Phase 1+ unless new ADR.

**Reason:** Each gate is evidenced judgment — Q1/Q3.

---

## Decision Matrix

| Proposal | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Verdict |
|----------|----|----|----|----|----|----|----|----|---------|
| AttentionQueue AI ranking | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Accept** |
| Sprint board view | ✗ | — | ✗ | — | ✗ | ✗ | ✗ | ✗ | **Reject** |
| Inline queue approve | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | **Reject** |
| Evaluation pass-rate chart | ✗ | — | ~ | — | ✓ | ✓ | ✓ | ✗ | **Reject** |
| Semantic knowledge search | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Accept** (with doc amend) |
| Custom “QuickSave” button | — | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | **Reject** |

---

## Escalation Path

1. Feature fails Reject rule → **do not implement**  
2. Strong business case → draft ADR amendment + design freeze doc update  
3. Architecture lock change → new ADR accepted before UI work resumes  

**UI cannot override ADR.**

---

## Related Documents

- [29 Implementation Contract](./29_IMPLEMENTATION_CONTRACT.md)
- [ADR-012 No Generic PM](../aos-adr/ADR-012_NO_GENERIC_PROJECT_MANAGEMENT.md)
- [FXD Product Philosophy](../aos-founder-experience/10_PRODUCT_PHILOSOPHY.md)
