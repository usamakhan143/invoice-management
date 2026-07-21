# 09 — Knowledge Intelligence Handoff

**Phase F does NOT implement Knowledge Intelligence Layer (KIL).**

This document freezes the **handoff contract** only.

---

## 1. Three-Layer Reminder

| Layer | Phase F role |
|-------|--------------|
| Learning Engine | Produces approved promotions with structural metadata |
| Knowledge Engine | Stores promoted patterns/modules/playbook |
| KIL | Consumes promotions + relationships — future |

---

## 2. Handoff Emission Point

On successful promotion (`aos_learning_candidate_promoted`), optional **KIL handoff payload** embedded on promotion record:

```typescript
interface KilHandoffRef {
  promotedAssetKind: "knowledge_pattern" | "module" | "playbook" | "prompt_template";
  promotedAssetId: string;
  promotedVersion: string;
  relationshipHints: KilRelationshipHint[];
  sourceEngagementId: string;
  sourceCandidateId: string;
}

interface KilRelationshipHint {
  relType: "derived_from" | "supersedes" | "related_module" | "related_pattern" | "evaluated_by";
  targetKind: string;
  targetId: string;
}
```

**Phase F scope:** Persist hints on `LearningPromotionRecord` only. No graph traversal, no vector index, no external change feeds.

---

## 3. Relationship Hints (Structural Only)

| Hint | Source |
|------|--------|
| `derived_from` → PromptVersion | prompt_improvement promotion |
| `derived_from` → Evaluation | evaluation_insight |
| `supersedes` → prior KnowledgePattern | knowledge promotion with predecessor |
| `related_module` | module candidate linked to reuse gap |

KIL future reads `aosLearningPromotions` + catalogs to build graph.

---

## 4. Explicitly NOT in Phase F

- Semantic graph reasoning
- Health scoring
- External change intelligence
- Vector embeddings
- AI organizational reasoning
- `docs/aos-knowledge-intelligence/*` implementation

---

## 5. Read API for KIL (Future)

KIL may query:

- `aosLearningPromotions` (company-scoped)
- `aosLearningCandidates` where `status === promoted`
- Promoted assets with `learningSource` metadata

No KIL-specific collections required in Phase F.
