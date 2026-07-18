# Dependency Graph

Entity and domain dependency ordering for AOS implementation. Defines what must exist before what — not a sprint schedule.

---

## Domain Layer Dependencies

```
Layer 0 — Platform (exists today)
├── ERP: auth, users, customers, leads, permissions, activityLogger
├── BOS: initiatives, read ports (expense, invoice, lead)
└── AOS architecture docs + domain model (this sprint)

Layer 1 — AOS Foundation
├── Agency Playbook (bootstrap)
├── Delivery Template (seed)
├── Prompt Template (seed)
├── Evaluation Rubric (seed)
├── Module Registry Entry + Module Version (ERP Discovery seed)
└── ERP read ports: customer, user (new — prerequisite)

Layer 2 — Delivery Core
├── Delivery Engagement
└── Architecture Decision Record

Layer 3 — Requirements
├── Requirement Set
├── Requirement
├── Requirement Attachment
├── Requirement Version (depends on Set approval)
├── Reuse Assessment (depends on Requirements)
└── Reuse Recommendation (depends on Assessment + Module Registry)

Layer 4 — Prompting
├── Prompt Pack (depends on Requirement Version + Engagement)
├── Prompt Artifact (depends on Pack + Rubric)
└── Prompt Version (depends on Artifact approval)

Layer 5 — Execution
├── Cursor Session (depends on Prompt Version)
└── Cursor Revision (depends on Session + Evaluation failure)

Layer 6 — Quality
├── Evaluation (depends on Session + Rubric)
└── Delivery Quality Report (depends on Evaluations)

Layer 7 — Learning
├── Knowledge Record (depends on Evaluation / Retrospective)
├── Knowledge Pattern (depends on Knowledge Record promotion)
└── Retrospective (depends on Engagement completion)
```

---

## Entity Dependency DAG

```
Agency Playbook
    ├── Delivery Template ──────────────────────┐
    ├── Prompt Template ─────────────┐          │
    ├── Evaluation Rubric ─────┐     │          │
    └── Knowledge Pattern      │     │          │
                               │     │          │
Module Registry Entry          │     │          │
    └── Module Version         │     │          │
                               │     │          │
ERP Customer (read port)       │     │          │
ERP User (read port)           │     │          │
BOS Initiative (read port, opt)│     │          │
                               │     │          │
Delivery Engagement ◄──────────┴─────┴──────────┘
    │
    ├── Requirement Set
    │       ├── Requirement
    │       │       └── Requirement Attachment
    │       ├── Requirement Version [on approve]
    │       └── Reuse Assessment
    │               └── Reuse Recommendation ──→ Module Registry Entry
    │
    ├── Prompt Pack ◄── Requirement Version
    │       └── Prompt Artifact ◄── Evaluation Rubric
    │               └── Prompt Version
    │                       └── Cursor Session
    │                               ├── Evaluation
    │                               │       └── Knowledge Record
    │                               └── Cursor Revision
    │                                       └── Prompt Version (new)
    │
    ├── Architecture Decision Record
    ├── Delivery Quality Report ◄── Evaluation
    └── Retrospective
            └── Knowledge Record
                    └── Knowledge Pattern
                            └── Prompt Template (improvement)
                            └── Module Registry Entry (update)
```

---

## Creation Order (Implementation Sequence)

| Order | Entity | Depends on |
|-------|--------|------------|
| 1 | Agency Playbook | Platform |
| 2 | Evaluation Rubric | Agency Playbook |
| 3 | Prompt Template | Agency Playbook |
| 4 | Delivery Template | Agency Playbook |
| 5 | Module Registry Entry + Version | Bootstrap import |
| 6 | Delivery Engagement | ERP Customer port, ERP User port |
| 7 | Requirement Set | Delivery Engagement |
| 8 | Requirement | Requirement Set |
| 9 | Requirement Attachment | Requirement |
| 10 | Reuse Assessment | Requirement Set, Module Registry |
| 11 | Reuse Recommendation | Reuse Assessment, Requirement, Module Registry |
| 12 | Requirement Version | Requirement Set approval |
| 13 | Prompt Pack | Requirement Version, Engagement |
| 14 | Prompt Artifact | Prompt Pack, Evaluation Rubric |
| 15 | Prompt Version | Prompt Artifact approval |
| 16 | Cursor Session | Prompt Version |
| 17 | Evaluation | Cursor Session, Evaluation Rubric |
| 18 | Cursor Revision | Evaluation (fail), Prompt Artifact |
| 19 | Delivery Quality Report | Evaluations |
| 20 | Knowledge Record | Evaluation / manual / retrospective |
| 21 | Architecture Decision Record | Delivery Engagement |
| 22 | Retrospective | Delivery Engagement |
| 23 | Knowledge Pattern | Knowledge Record promotion |
| 24 | Module Version (update) | Module Registry Entry change |

---

## Read Dependency Matrix

Which entities **read** which other entities or external layers at query time:

| Consumer | Reads |
|----------|-------|
| Delivery Engagement | ERP Customer, Lead, Users; BOS Initiative |
| Requirement | ERP Products (optional context) |
| Reuse Assessment | Module Registry, Requirements |
| Reuse Recommendation | Module Registry, Requirement |
| Prompt Pack | Requirement Version, Reuse Assessment, ERP/BOS summaries |
| Prompt Artifact | Rubric, Module Registry, Requirements |
| Cursor Session | Prompt Version |
| Evaluation | Rubric, Module Registry (duplication check) |
| Delivery Quality Report | Evaluations, Sessions, Reuse Assessment |
| Knowledge Record | Evaluation, Session, Retrospective |
| Knowledge Pattern | Knowledge Records |
| Retrospective | Quality Report, Evaluations, Engagement metrics |
| Module Registry Entry | Knowledge Patterns (annotations) |

---

## Circular Dependency Check

**No circular dependencies exist** in the domain model.

Potential concern: Knowledge Pattern → Prompt Template improvement → Prompt Artifact → Evaluation → Knowledge Record → Knowledge Pattern.

**Resolution:** This is a **feedback loop**, not a creation dependency. Templates are updated asynchronously after pattern promotion; prompt artifacts clone from templates at creation time. The loop operates across engagement lifecycles, not within a single transaction.

---

## External Port Dependencies

| Port | Required by | Exists today? |
|------|------------|---------------|
| ERP Customer Read | Delivery Engagement | **No — must create** |
| ERP User Read | Delivery Engagement, Session | **No — must create** |
| ERP Lead Read | Delivery Engagement | Port exists (BOS), unused |
| ERP Invoice Read | Engagement context | Port exists (BOS), partial |
| ERP Product Read | Requirement context | **No — must create** |
| BOS Initiative Read | Delivery Engagement | **No — must create** |
| BOS Venture Read | Delivery Engagement | **No — must create** |
| BOS Attribution Read | Engagement investment context | Via existing BOS app service |

---

## Phase Alignment

| Implementation Phase (from architecture) | Domain entities unlocked |
|------------------------------------------|-------------------------|
| Phase 1 Foundation | 1–6, 18–19 (Engagement, Templates, Registry, Playbook, Rubric) |
| Phase 2 Requirements | 2–7, 11 (Requirement domain, Reuse) |
| Phase 3 Prompt & Cursor | 9–17 (Prompt, Session, Revision, Evaluation) |
| Phase 4 Knowledge | 16–17, 20–23 (Knowledge, Retrospective, Quality Report, ADR) |
| Phase 5 Scale | Feedback loops, automation enhancements |

Entity numbers refer to creation order table above.
