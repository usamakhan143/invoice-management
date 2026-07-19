# AOS Learning Engine — Documentation Index

**Stage D2.5 — Learning Engine & Continuous Improvement Architecture**  
**Status:** Final documentation sprint (pre-implementation)  
**Date:** July 19, 2026

---

## Purpose

This folder defines the **permanent architecture** for the AOS Learning Engine — the system that converts completed engagements into **organizational learning**, not merely stored notes.

The Learning Engine activates **after Retrospective closure**. It is distinct from the Knowledge Engine (storage and retrieval) and from Continuous Learning (the compounding outcome). The Learning Engine is the **governed process** that extracts, classifies, approves, and promotes learning into reusable agency assets.

---

## Relationship to Frozen Architecture

| Document set | Role |
|--------------|------|
| `docs/aos-architecture/10_CONTINUOUS_LEARNING.md` | Flywheel outcome and philosophy |
| `docs/aos-architecture/08_KNOWLEDGE_ENGINE.md` | Knowledge taxonomy and retrieval |
| `docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md` | Frozen domain entities |
| `docs/aos-adr/ADR-009_KNOWLEDGE_ENGINE.md` | Promotion and privacy ADR |
| **This folder** | Operational Learning Engine architecture |

This folder **does not modify** any frozen document. It extends architecture with implementation-ready Learning Engine specifications.

---

## Document Catalog

| # | Document | Focus |
|---|----------|-------|
| 01 | [Learning Lifecycle](01_LEARNING_LIFECYCLE.md) | End-to-end learning process after retrospective |
| 02 | [Knowledge Promotion Rules](02_KNOWLEDGE_PROMOTION_RULES.md) | Record → Pattern promotion |
| 03 | [Module Promotion Rules](03_MODULE_PROMOTION_RULES.md) | Gap → Registry entry |
| 04 | [Prompt Evolution Rules](04_PROMPT_EVOLUTION_RULES.md) | Pack → Template improvement |
| 05 | [Playbook Evolution Rules](05_PLAYBOOK_EVOLUTION_RULES.md) | Retrospective → Agency Playbook |
| 06 | [AI Recommendation Rules](06_AI_RECOMMENDATION_RULES.md) | AI suggests; humans approve |
| 07 | [Continuous Learning Flywheel](07_CONTINUOUS_LEARNING_FLYWHEEL.md) | Compounding loop mechanics |
| 08 | [Quality Gates](08_QUALITY_GATES.md) | Evidence thresholds before promotion |
| 09 | [Approval Workflow](09_APPROVAL_WORKFLOW.md) | Human governance chain |
| 10 | [Versioning Strategy](10_VERSIONING_STRATEGY.md) | Learning artifact versioning |
| 11 | [Knowledge Confidence Levels](11_KNOWLEDGE_CONFIDENCE_LEVELS.md) | Evidence strength taxonomy |
| 12 | [Learning Metrics](12_LEARNING_METRICS.md) | Organizational learning KPIs |
| 13 | [Reuse Metrics](13_REUSE_METRICS.md) | Reuse-first measurement |
| 14 | [Delivery Intelligence Metrics](14_DELIVERY_INTELLIGENCE_METRICS.md) | Planning and execution intelligence |
| 15 | [Prompt Quality Metrics](15_PROMPT_QUALITY_METRICS.md) | Prompt effectiveness |
| 16 | [Module Quality Metrics](16_MODULE_QUALITY_METRICS.md) | Registry asset quality |
| 17 | [Decision Traceability](17_DECISION_TRACEABILITY.md) | Link decisions to evidence |
| 18 | [Learning Audit Trail](18_LEARNING_AUDIT_TRAIL.md) | Append-only learning history |
| 19 | [Retention Strategy](19_RETENTION_STRATEGY.md) | Lifecycle of learning data |
| 20 | [Future AI Training Strategy](20_FUTURE_AI_TRAINING_STRATEGY.md) | Long-term model improvement |

**Final report:** [LEARNING_ENGINE_FINAL_REPORT.md](LEARNING_ENGINE_FINAL_REPORT.md)

---

## Standard Document Schema

Every document in this folder defines:

- **Purpose**
- **Inputs**
- **Outputs**
- **Ownership**
- **Approval**
- **Versioning**
- **Promotion Rules**
- **Lifecycle**
- **Failure Cases**
- **Audit Requirements**

---

## Trigger Point

```
Delivery Engagement (closed retrospective)
        │
        ▼
┌───────────────────────────────────────┐
│         LEARNING ENGINE START          │
│  (this documentation folder)           │
└───────────────────────────────────────┘
        │
        ▼
Future Engagements (richer context, higher reuse, better prompts)
```

---

## Implementation Boundary

**This sprint produces documentation only.**

No domain, application, infrastructure, Firestore, UI, routes, or code changes are permitted until post-D2.5 implementation resumes.
