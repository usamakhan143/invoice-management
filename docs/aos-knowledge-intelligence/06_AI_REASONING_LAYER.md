# 06 — AI Reasoning Layer

**Stage D2.6 — Knowledge Intelligence Layer**

---

## Purpose

Document how **future AI** should reason over the Organizational Knowledge Graph — using relationships, confidence, evidence, metrics, and decision trace — instead of keyword search or unconstrained retrieval-augmented generation.

This is architectural specification only. **No implementation**, models, or prompts in this sprint.

---

## Problem with Keyword Search

| Limitation | Consequence over 10 years |
|------------|---------------------------|
| Lexical mismatch | Misses "tenant scoping" vs "multi-tenancy" |
| No evidence ranking | Returns stale pattern same as canonical |
| No impact analysis | Cannot answer "what breaks if…" |
| No conflict detection | Surfaces contradicting guidance together |
| No provenance | Cannot explain why pattern exists |
| Context stuffing | Exceeds budget with irrelevant hits |
| Privacy risk | Client terms in keyword index |

The AI Reasoning Layer uses **graph traversal + evidence aggregation + governance constraints** as the retrieval and inference substrate.

---

## Reasoning Architecture (Future)

```
┌─────────────────────────────────────────────────────────────┐
│                    AI REASONING LAYER                        │
│                                                              │
│  Query → Intent classification → Graph plan → Traversal     │
│       → Evidence aggregation → Confidence scoring            │
│       → Constraint check → Grounded response / event         │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   OKG (doc 01)      Relationships (doc 02)   Health (doc 04)
   Domains (doc 05)  Decision Trace            Metrics
   Confidence        External Change           Rubrics
```

---

## Reasoning Inputs

| Input | Role in reasoning |
|-------|-------------------|
| **Knowledge Graph** | Structure — what connects to what |
| **Confidence levels** | Rank and filter (`validated`+ for auto-injection) |
| **Relationships** | Traversal paths — provenance, impact, conflict |
| **Evidence nodes** | Evaluations, Records, Cursor sessions — grounding |
| **Metrics** | Health signals — prefer fresh, accurate subgraph |
| **Decision Trace** | Governance — who approved, when, why |
| **Domain taxonomy** | Scope reduction |
| **Agency type** | Filter applicability |
| **External Change Events** | Deprioritize stale; prioritize mitigations |

---

## Reasoning Patterns

### Pattern 1 — Grounded answer

**Query:** "What should we know about Stripe webhooks for SaaS?"

**Plan:**

1. Classify intent: `retrieval + guidance`
2. Filter: domain=Backend, agencyType=SaaS, tags~Stripe
3. Traverse: active Knowledge Patterns → `validated_by` Evaluations
4. Rank: confidence × accuracy × freshness
5. Exclude: stale, contradicts unresolved, hypothesis
6. Output: Answer + cited node IDs + traversal path

**Constraint:** No node ID → no claim in answer.

---

### Pattern 2 — Impact analysis

**Query:** "Impact of deprecating module X?"

**Plan:**

1. Classify intent: `impact`
2. Start node: Module Registry Entry X
3. Traverse downstream: `referenced_in`, `depends_on`, `supports` (depth 3)
4. Cross-check: External Change Events via `affected_by`
5. Aggregate: affected prompts, patterns, engagements (counts)
6. Output: Impact report — **no mutation**

---

### Pattern 3 — Conflict resolution assist

**Query:** "Do we have conflicting auth guidance?"

**Plan:**

1. Classify intent: `conflict_detection`
2. Subgraph: domain=Security OR Architecture
3. Find: `contradicts` edges where both nodes active
4. For each pair: load `validated_by` evals, `derived_from` records
5. Output: Conflict brief with evidence side-by-side — human decides

---

### Pattern 4 — Gap detection

**Query:** "What's missing for mobile store submission?"

**Plan:**

1. Classify intent: `gap_analysis`
2. Load Playbook section (Mobile deployment)
3. Traverse: `supports` from Patterns/Modules to checklist items
4. Compare: checklist items without `supports` edge
5. Cross-ref: Coverage health metric for Mobile domain
6. Output: Gap list — candidates for Learning Engine, not auto-created patterns

---

### Pattern 5 — Temporal drift

**Query:** "What changed in our Firebase guidance since 2024?"

**Plan:**

1. Classify intent: `temporal`
2. Filter: tags~Firebase, time range
3. Follow: `supersedes` chains, `deprecated_by`
4. Include: External Change Events in range
5. Output: Version timeline — not single snapshot

---

## Confidence in Reasoning

| Stage | Confidence rule |
|-------|-----------------|
| Filter | Exclude below `validated` for production prompt injection |
| Rank | Weight `canonical` > `repeated` > `validated` |
| Propagate | Multi-path validation boosts rank (independent `derived_from` trees) |
| Decay | Stale flag × 0.5; no recent `validated_by` × 0.7 |
| Cap | AI reasoning confidence ≤ min(source node confidences) |

AI cannot **elevate** confidence — only humans via Learning Engine (doc 11 LE).

---

## Evidence Requirements

Every reasoning output tier:

| Tier | Use case | Evidence required |
|------|----------|-------------------|
| **R0 — Suggest** | Internal KIL alerts | Graph structure only |
| **R1 — Recommend** | Learning candidate draft | ≥1 source node |
| **R2 — Inject** | Prompt context assembly | ≥1 `validated_by` eval OR `canonical` |
| **R3 — Constrain** | Hard prompt constraint | `canonical` + no active contradicts |
| **R4 — Block** | Deprecate reuse recommendation | Impact traversal + eval history |

Promotion and injection tiers R2+ require Decision Trace availability for audit replay.

---

## Reasoning vs Learning Engine vs Knowledge Engine

| Action | AI Reasoning | Learning Engine | Knowledge Engine |
|--------|--------------|-----------------|------------------|
| Read graph | ✅ | ✅ (extraction input) | ✅ (retrieval) |
| Suggest candidate | ✅ | Receives suggestion | Stores if approved |
| Create pattern | ❌ | ✅ on human approve | Stores |
| Create edge (promotion) | ❌ | ✅ on approve | — |
| Create edge (structural) | ❌ | Workflow auto | — |
| Detect contradicts | ✅ alert | — | — |
| Keyword search fallback | ⚠️ Phase 1 only | — | ✅ legacy |

---

## Safety & Governance

| Rule | Rationale |
|------|-----------|
| Read-mostly graph access | ADR-009 human promotion |
| Client isolation in traversals | Privacy |
| No surveillance inference | Aggregate metrics only |
| Cite paths in outputs | Auditability |
| Human review for R3+ | Quality |
| Model version logged | Reproducibility (LE doc 20) |

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Ungrounded generation | Discard output; log reasoning failure |
| Over-broad traversal (timeout) | Domain scope + depth limit |
| Reasoning on stale subgraph | Freshness pre-check |
| Conflicting sources equal rank | Escalate to human — no tie-break auto |
| PII in traversal path | Redact before model context |

---

## Phase Introduction

See [07_INTELLIGENCE_ROADMAP.md](07_INTELLIGENCE_ROADMAP.md):

- Phase 1: Rule-based graph queries (no LLM)
- Phase 2: LLM summarization over fixed traversals
- Phase 3: Intent classification + dynamic graph plans
- Phase 4: Predictive gap and drift detection
- Phase 5: Continuous reasoning monitors

---

## Related Documents

- [01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md](01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md)
- [02_KNOWLEDGE_RELATIONSHIPS.md](02_KNOWLEDGE_RELATIONSHIPS.md)
- [05_KNOWLEDGE_DOMAINS.md](05_KNOWLEDGE_DOMAINS.md)
- `docs/aos-learning-engine/06_AI_RECOMMENDATION_RULES.md`
- `docs/aos-learning-engine/20_FUTURE_AI_TRAINING_STRATEGY.md`
