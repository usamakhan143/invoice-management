# 02 — Knowledge Relationships

**Stage D2.6 — Knowledge Intelligence Layer**

---

## Purpose

Document the **semantic relationship types** that connect artifacts in the Organizational Knowledge Graph — enabling traversal, conflict detection, impact analysis, and future AI reasoning.

Relationships are first-class intelligence. Storing patterns without edges produces a **flat library**, not organizational knowledge.

---

## Why Relationships Matter

| Without relationships | With relationships |
|----------------------|-------------------|
| Keyword search returns noise | Traversal returns evidence paths |
| Duplicate patterns undetected | `contradicts` / `duplicate_of` surfaces conflicts |
| Deprecation breaks unknown dependents | `depends_on` / `referenced_in` shows impact |
| Promotion lacks audit story | `derived_from` + `validated_by` chains explain why |
| External SDK change is manual grep | `affected_by` ripples through graph |
| AI hallucinates connections | Grounded edges constrain reasoning |

Relationships are **append-only** when created by promotion or evidence. Supersession adds new edges; old edges remain for traceability (ADR-014 aligned).

---

## Relationship Catalog

### Provenance & lineage

| Relationship | Direction | Meaning | Example |
|--------------|-----------|---------|---------|
| `originated_from` | Child → Source | First capture point | KR → Retrospective |
| `derived_from` | Asset → Evidence[] | Promotion lineage | KP → KR[] |
| `inspired` | Asset → Asset | Soft influence, not derivation | PT v2 inspired by KP-12 |
| `instantiates` | Instance → Template | Template usage | Prompt → Prompt Template |
| `traces` | Trace → Decision | Governance link | DT → KP promotion |

### Validation & confidence

| Relationship | Direction | Meaning | Example |
|--------------|-----------|---------|---------|
| `validated_by` | Claim → Evidence[] | Quality proof | KP → Evaluation[] |
| `confirmed_by` | Candidate → Human action | Human validation | Candidate → Approval event |
| `observed_in` | Pattern → Engagement[] | Occurrence (anonymized count) | KP → ENG[] (refs only) |
| `repeated_in` | Pattern → Engagement[] | Cross-engagement recurrence | Confidence elevation signal |

### Structural & workflow

| Relationship | Direction | Meaning | Example |
|--------------|-----------|---------|---------|
| `belongs_to` | Artifact → Engagement | Scope container | Prompt → ENG |
| `contains` | Engagement → Artifact[] | Inverse scope | ENG → Requirements |
| `informs` | Upstream → Downstream | Planning flow | REQ → Prompt |
| `executed_in` | Prompt → Cursor Session | Execution link | PRM → CUR |
| `scored_by` | Artifact → Evaluation | Quality link | CUR → EVA |
| `references` | Prompt → Module | Reuse directive | PRM → MR |
| `registered_from` | Module → Engagement | Extraction origin | MR → ENG |

### Support & dependency

| Relationship | Direction | Meaning | Example |
|--------------|-----------|---------|---------|
| `supports` | Asset → Need | Enables delivery | MR → Requirement category |
| `depends_on` | Asset → Asset | Hard dependency | Module A → Module B |
| `requires` | Pattern → Constraint | Mandatory rule | KP → Sidecar law ADR |
| `compatible_with` | Asset ↔ Asset | Safe combination | MR ↔ agency type |
| `incompatible_with` | Asset ↔ Asset | Must not combine | Pattern ↔ anti-pattern |

### Evolution & conflict

| Relationship | Direction | Meaning | Example |
|--------------|-----------|---------|---------|
| `supersedes` | New → Old | Replacement version | KP v2 → KP v1 |
| `deprecated_by` | Old → New | Deprecation pointer | MR v1 → MR v2 |
| `contradicts` | Asset ↔ Asset | Unresolved conflict | KP-31 ↔ KP-88 |
| `merged_into` | Old → Survivor | Dedup resolution | KP-a + KP-b → KP-c |
| `duplicate_of` | Copy → Canonical | Near-duplicate detection | KR → KR |

### Domain & taxonomy

| Relationship | Direction | Meaning | Example |
|--------------|-----------|---------|---------|
| `classified_as` | Asset → Domain | Domain tag (see doc 05) | KP → Security |
| `related_to` | Asset ↔ Asset | Soft association | KP ↔ Playbook section |
| `annotates` | Pattern → Asset | Metadata enrichment | KP → MR |
| `applies_to` | Pattern → Agency type | Scope | KP → SaaS |

### External change (future)

| Relationship | Direction | Meaning | Example |
|--------------|-----------|---------|---------|
| `affected_by` | Asset → External Change | Platform impact | MR → React 19 release |
| `mitigated_by` | Change → Pattern | Fix guidance | Firebase advisory → KP |
| `triggers_review` | Change → Asset[] | Stale review queue | OS update → Playbook |

---

## Relationship Cardinality Rules

| Pattern | Allowed cardinality |
|---------|---------------------|
| `derived_from` | 1..N evidence nodes required for promotion |
| `validated_by` | 0..N (0 blocks promotion to active) |
| `supersedes` | 1:1 version chain |
| `contradicts` | N:M (must resolve to 0 active conflicts) |
| `belongs_to` | N:1 (artifact has one engagement root) |
| `contradicts` + both `active` | **Invalid state** — health alert |

---

## Relationship Lifecycle

```
1. STRUCTURAL — auto-created during workflow (belongs_to, executed_in, scored_by)
2. EVIDENCE — auto-created on capture (originated_from, observed_in)
3. PROMOTED — created on Learning Engine approval (derived_from, supersedes)
4. INTELLIGENCE — created by KIL analysis (contradicts, duplicate_of, affected_by)
5. RESOLVED — human action adds merged_into, deprecated_by, or supersedes
```

Structural edges are immutable. Conflict edges require resolution edge within SLA (operational target: 10 business days).

---

## Creation Authority

| Creator | Relationship types |
|---------|-------------------|
| Workflow (automatic) | Structural, evidence |
| Learning Engine (on promotion) | Provenance, supersedes, annotates |
| KIL analysis (automated) | contradicts, duplicate_of, affected_by, triggers_review |
| Human reviewer | merged_into, resolution of contradicts |

KIL **never** auto-creates `derived_from` or `supersedes` without Learning Engine promotion event.

---

## Traversal Patterns

### Upstream (why?)

Follow `derived_from`, `originated_from`, `validated_by` backward to evidence.

### Downstream (impact?)

Follow `depends_on`, `references`, `supports`, `instantiates` forward to dependents.

### Lateral (related?)

Follow `related_to`, `classified_as`, `applies_to` within domain subgraph.

### Temporal (when?)

Filter edges by `createdAt`; follow `supersedes` chain for version history.

---

## Why Each Relationship Category Exists

| Category | 10-year value |
|----------|---------------|
| Provenance | Trust — explain every agency rule |
| Validation | Quality — patterns backed by evals |
| Structural | Replay — reconstruct any engagement |
| Support/dependency | Reuse — know what enables what |
| Evolution | Safety — deprecate without breaking |
| Domain | Scale — navigate large corpus |
| External change | Survival — adapt to platform drift |

---

## Failure Cases

| Failure | Detection | Response |
|---------|-----------|----------|
| Missing `derived_from` on pattern | Integrity check | Block auto-retrieval |
| Active `contradicts` pair | Health metric | Resolution queue |
| Orphan `validated_by` target (deleted eval) | Graph audit | Tombstone reference |
| Over-linked `related_to` (spam) | Degree threshold | Prune suggestions |
| Client leak via `observed_in` | PII scan | Anonymize to count only |

---

## Boundaries vs Other Layers

| Layer | Relationship responsibility |
|-------|----------------------------|
| **Domain model** | Foreign keys within engagement |
| **Learning Engine** | Creates promotion edges on approve |
| **Knowledge Engine** | May store tags; not full graph semantics |
| **KIL (this doc)** | Defines edge types, traversal, conflict rules |

---

## Related Documents

- [01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md](01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md)
- [03_EXTERNAL_CHANGE_INTELLIGENCE.md](03_EXTERNAL_CHANGE_INTELLIGENCE.md)
- [04_KNOWLEDGE_HEALTH.md](04_KNOWLEDGE_HEALTH.md)
- `docs/aos-learning-engine/17_DECISION_TRACEABILITY.md`
