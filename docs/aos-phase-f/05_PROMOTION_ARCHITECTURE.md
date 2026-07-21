# 05 — Promotion Architecture

---

## 1. Promotion Pipeline Overview

```
approved candidate
        │
        ▼
PromotionEligibilityService (domain)
        │
        ▼
PromotionOrchestrator (application) — per target adapter
        │
        ├── create new versioned org asset
        ├── link sourceProvenance on asset metadata
        ├── write LearningPromotionRecord
        ├── emit aos_learning_candidate_promoted
        └── candidate.status → promoted
```

**Atomicity:** One Firestore transaction per promotion attempt: target write + promotion record + candidate update + audit append.

**Rollback:** Transaction failure → candidate stays `promotion_failed`; no partial target write.

---

## 2. Target Contracts

### 2.1 Knowledge Pattern

| Aspect | Rule |
|--------|------|
| Target collection | `aosKnowledgePatterns` |
| Required approval | Delivery lead (founder) |
| Version behavior | New doc OR `patternVersion++` with `predecessorPatternId` |
| Supersession | Active pattern superseded → status `superseded`, new active |
| Source refs on asset | `sourceCandidateId`, `sourceEngagementId`, provenance version IDs |
| Audit | `aos_learning_candidate_promoted` + optional `knowledge.pattern.created` |
| Rollback | Manual deprecation of new pattern + audit correction — no delete |

**Domain entity:** Extend `KnowledgePattern` metadata (F3) with optional `learningSource?: LearningSourceRef` — append-only field on create.

### 2.2 Module Registry

| Aspect | Rule |
|--------|------|
| Target | `aosModuleRegistry` |
| Required approval | Delivery lead + technical reviewer for `new_module` |
| Version behavior | Semver bump on module entry |
| Sidecar check | Domain gate GM-003 before orchestrator |
| Duplicate | Reject if active duplicate name without annotate intent |
| Source refs | Same as knowledge |

### 2.3 Prompt Template Evolution

| Aspect | Rule |
|--------|------|
| Target | `aosPlaybookEntries` where `type === "prompt_template"` OR future org template store |
| Required approval | Delivery lead |
| Version behavior | New playbook entry version with `effectiveFrom` |
| Constraint | MUST NOT mutate `aosPromptVersions` (delivery artifact) |
| Link | `derivedFromPromptVersionId` in metadata for traceability |

**Law:** Phase E `PromptVersion` = delivery immutable record. Organizational prompt templates are separate assets.

### 2.4 Agency Playbook

| Aspect | Rule |
|--------|------|
| Target | `aosPlaybookEntries` |
| Required approval | Delivery lead or agency owner |
| Version behavior | Section version + effective date |
| Supersession | Prior section marked `superseded` not deleted |

### 2.5 Evaluation / Rubric

| Aspect | Rule |
|--------|------|
| Target | Playbook entry `type: "evaluation_rubric"` (current stub pattern) |
| Required approval | Delivery lead |
| Version behavior | New rubric version document |
| Constraint | MUST NOT overwrite confirmed `aosEvaluations` |

---

## 3. `LearningSourceRef` (on promoted assets)

```typescript
interface LearningSourceRef {
  candidateId: string;
  extractionRunId: string;
  engagementId: string;
  retrospectiveId: string;
  requirementVersionId: string;
  promptVersionId: string;
  cursorSessionId: string;
  evaluationId: string;
  promotedAt: string;
  promotedBy: string;
}
```

---

## 4. Non-Destructive Versioning (LF-08)

| Asset type | Version owner | Phase E entity? |
|------------|---------------|-----------------|
| RequirementVersion | Delivery | Yes — DO NOT reuse |
| PromptVersion | Delivery | Yes — DO NOT reuse |
| KnowledgePattern.patternVersion | Organization | No |
| ModuleRegistry.semver | Organization | No |
| PlaybookEntry.sectionVersion | Organization | No |
| Org Prompt Template | Organization | No |

Backward trace: org asset → `LearningSourceRef` → Phase E version IDs → engagement.

---

## 5. Duplicate Promotion (LF-11)

- Candidate with `status: promoted` → reject re-promote
- Promotion record unique on `candidateId`
- Idempotent retry: if promotion record exists with same target IDs, return success no-op

---

## 6. Conflict Handling

| Conflict | Resolution |
|----------|------------|
| Active pattern contradicts new | Require supersession plan in candidate; human confirms |
| Duplicate module name | Block or route to annotate |
| Rubric conflict | Require version bump in proposed content |
| Concurrent promotions same target | Optimistic lock on target version field; second fails → `promotion_failed` |

---

## 7. Layer Ownership

| Concern | Layer |
|---------|-------|
| Eligibility, supersession rules | Domain |
| Transaction orchestration | Application |
| Firestore writes | Infrastructure |
| Review UI | Presentation (F4) |
