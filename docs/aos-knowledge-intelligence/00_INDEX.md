# AOS Knowledge Intelligence Layer — Documentation Index

**Stage D2.6 — Knowledge Intelligence Layer**  
**Status:** Final documentation sprint (pre-implementation)  
**Date:** July 19, 2026

---

## Purpose

This folder defines the **Knowledge Intelligence Layer (KIL)** — an architectural layer that sits **above** the Learning Engine and Knowledge Engine to coordinate, connect, reason about, measure, and evolve **organizational intelligence** over a 10+ year horizon.

| Layer | Role | Analogy |
|-------|------|---------|
| **Continuous Learning** | Outcome — compounding delivery advantage | Business result |
| **Learning Engine** | Process — extract, approve, promote after retrospective | Manufacturing line |
| **Knowledge Engine** | Corpus — ingest, classify, store, retrieve | Library |
| **Knowledge Intelligence Layer** | Connect, reason, measure, evolve the whole | Nervous system + strategic brain |

The KIL is **not another engine**. It does not replace ingestion, promotion, or retrieval. It provides the **organizational knowledge graph**, semantic relationships, health intelligence, external change awareness, domain taxonomy, and future AI reasoning substrate.

---

## Relationship to Existing Documentation

| Document set | Role | Overlap with KIL |
|--------------|------|------------------|
| `docs/aos-architecture/08_KNOWLEDGE_ENGINE.md` | Corpus architecture | **None** — KIL reads corpus; KE owns storage/retrieval |
| `docs/aos-architecture/10_CONTINUOUS_LEARNING.md` | Flywheel philosophy | **None** — KIL measures flywheel health |
| `docs/aos-learning-engine/` | Promotion process & metrics | **None** — LE produces learning; KIL connects outcomes |
| `docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md` | Frozen entities | **Reference only** — KIL adds graph edges, not entities |
| `docs/aos-adr/ADR-009_KNOWLEDGE_ENGINE.md` | Governance | **Complied with** — not modified |

This folder **does not modify** any existing document. Cross-references point outward only.

---

## Document Catalog

| # | Document | Focus |
|---|----------|-------|
| 01 | [Organizational Knowledge Graph](01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md) | Nodes, edges, traversal, future reasoning |
| 02 | [Knowledge Relationships](02_KNOWLEDGE_RELATIONSHIPS.md) | Semantic edge types and governance |
| 03 | [External Change Intelligence](03_EXTERNAL_CHANGE_INTELLIGENCE.md) | Platform/SDK/framework change impact |
| 04 | [Knowledge Health](04_KNOWLEDGE_HEALTH.md) | Organization-wide health metrics |
| 05 | [Knowledge Domains](05_KNOWLEDGE_DOMAINS.md) | Domain taxonomy and retrieval advantages |
| 06 | [AI Reasoning Layer](06_AI_REASONING_LAYER.md) | Graph-based reasoning (future) |
| 07 | [Intelligence Roadmap](07_INTELLIGENCE_ROADMAP.md) | Phases 1–5 for organizational intelligence |
| 08 | [Final Intelligence Report](08_FINAL_INTELLIGENCE_REPORT.md) | Architecture audit and readiness |

---

## Layer Position

```
┌─────────────────────────────────────────────────────────────┐
│           KNOWLEDGE INTELLIGENCE LAYER (this folder)         │
│   Graph · Relationships · Health · External Change · Reason  │
└───────────────────────────┬─────────────────────────────────┘
                            │ reads / measures / connects
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Learning      │   │ Knowledge     │   │ Other AOS     │
│ Engine        │   │ Engine        │   │ Engines       │
│ (process)     │   │ (corpus)      │   │ Prompt·Eval·  │
└───────────────┘   └───────────────┘   │ Module·Cursor │
                                          └───────────────┘
```

---

## Implementation Boundary

**Documentation only.** No domain, application, infrastructure, Firestore, UI, routes, or code changes until post-D2.6 implementation resumes.

---

## Standard Concepts

Documents in this folder use:

- **Node** — An artifact in the organizational knowledge graph (engagement, pattern, module, etc.)
- **Edge** — A typed semantic relationship between nodes (see doc 02)
- **Health signal** — A computed metric about corpus or graph quality (see doc 04)
- **Intelligence event** — A detected condition requiring human or AI attention (stale, contradict, external change)
- **Reasoning query** — A graph traversal + evidence aggregation request (future, doc 06)

---

## Related Paths

- Learning Engine: `docs/aos-learning-engine/`
- Knowledge Engine: `docs/aos-architecture/08_KNOWLEDGE_ENGINE.md`
- Continuous Learning: `docs/aos-architecture/10_CONTINUOUS_LEARNING.md`
