# 02 — Learning Candidate Model (Frozen)

Production model for a **Learning Candidate**: a proposed reusable lesson extracted from completed delivery evidence, pending human review and optional promotion.

---

## 1. Candidate Categories (Required)

Aligned with `docs/aos-learning-engine/01_LEARNING_LIFECYCLE.md` and promotion rules docs:

| `candidateType` | Promotion target | Authority doc |
|-----------------|------------------|---------------|
| `knowledge_pattern` | Knowledge Pattern (`aosKnowledgePatterns`) | 02_KNOWLEDGE_PROMOTION_RULES |
| `module` | Module Registry entry | 03_MODULE_PROMOTION_RULES |
| `prompt_improvement` | Org prompt template / playbook `prompt_template` | 04_PROMPT_EVOLUTION_RULES |
| `playbook_improvement` | Agency Playbook section | 05_PLAYBOOK_EVOLUTION_RULES |
| `evaluation_insight` | Rubric / evaluation config (playbook or future rubric store) | 08_QUALITY_GATES GP/GK eval sections |

**Not in Phase F scope:** New candidate types without LE doc authority.

**Deferred (optional Phase F5):** `registry_improvement` (score/annotate existing module) — can use `module` with `promotionAction: "annotate"`.

---

## 2. Core Entity: `LearningCandidate`

### Required fields

| Field | Type | Rule |
|-------|------|------|
| `candidateId` | string | Deterministic — see doc 04 |
| `companyId` | string | Tenant scope |
| `engagementId` | string | Source engagement |
| `retrospectiveId` | string | Trigger retrospective |
| `extractionRunId` | string | Parent extraction run |
| `candidateType` | enum above | |
| `title` | string | Human-readable |
| `summary` | string | Short description |
| `proposedContent` | object | Type-specific payload (see §4) |
| `status` | enum | See doc 03 |
| `confidence` | `ConfidenceSnapshot` | See doc 07 — not LLM-only |
| `promotionTarget` | `PromotionTargetRef` | Typed destination hint |
| `provenance` | `LearningProvenance` | Immutable evidence refs |
| `gateResult` | `GateResult \| null` | After gate evaluation |
| `createdAt` | ISO timestamp | |
| `createdBy` | `"system" \| userId` | Extraction = system |
| `sourceFingerprint` | string | Dedup within run |

### Optional fields

| Field | When |
|-------|------|
| `aiRecommendation` | When AI contributed proposal |
| `approval` | After human approve/reject/defer |
| `promotion` | After successful promotion |
| `supersession` | When replaced by newer candidate |
| `amendmentOfCandidateId` | Request-changes flow |
| `bundleId` | Group related candidates |
| `gateRuleSetVersion` | Which gate rules evaluated |
| `updatedAt` | Status transitions only |

### Forbidden on candidate document

- Client-identifying PII in `proposedContent` promotable fields (gate blocks)
- Direct writes to Knowledge/Registry/Playbook from candidate create

---

## 3. `LearningProvenance` (Immutable)

Minimum required references — all must resolve within same `companyId`:

```typescript
interface LearningProvenance {
  requirementVersionId: string;      // required
  promptVersionId: string;           // required
  cursorSessionId: string;           // required
  evaluationId: string;              // required
  retrospectiveId: string;           // required (duplicate of top-level for audit)
  rubricVersionId?: string;          // from traceabilityRefs when present
  cursorRevisionIds?: string[];      // when revisions exist
  sourceAuditEventIds: string[];     // retro approve + relevant workflow events
  reuseAssessmentSnapshotId?: string; // hash or workflow revision ref
}
```

**Law:** If Phase E `traceabilityRefs` exist on approved retrospective, extraction MUST copy them — never invent alternate IDs.

---

## 4. `proposedContent` by Type

### `knowledge_pattern`

```typescript
{
  patternName: string;
  category: string;           // matches KnowledgePattern taxonomy
  description: string;
  applicabilityTags: string[];
  antiPatternNotes?: string;
  generalizationNotes: string; // how client facts were removed
}
```

### `module`

```typescript
{
  moduleName: string;
  description: string;
  capabilityTags: string[];
  gapRationale: string;
  sidecarComplianceNotes: string;
  promotionAction: "new_module" | "annotate" | "deprecate_hint";
  targetModuleId?: string;    // for annotate
}
```

### `prompt_improvement`

```typescript
{
  targetTemplateId?: string;
  changeSummary: string;
  proposedTemplateDiff: string; // or structured sections
  failureClusterRef?: string;
  exemplarAnonymized: string;
}
```

### `playbook_improvement`

```typescript
{
  targetSectionId?: string;
  sectionTitle: string;
  proposedSectionBody: string;
  changeType: "add" | "amend" | "clarify";
}
```

### `evaluation_insight`

```typescript
{
  insightType: "rubric_calibration" | "constraint_addition" | "failure_pattern";
  description: string;
  proposedRubricChange?: object;
  linkedEvaluationOutcome: string;
}
```

---

## 5. `PromotionTargetRef`

```typescript
interface PromotionTargetRef {
  targetKind: "knowledge_pattern" | "module_registry" | "prompt_template" | "playbook" | "evaluation_rubric";
  targetId?: string;           // existing asset when updating
  expectedVersionStrategy: "new_version" | "supersede" | "annotate";
}
```

---

## 6. `ConfidenceSnapshot`

See doc 07. Stored at creation; updated only by gate pass/fail or human override — never raw LLM re-score alone.

```typescript
interface ConfidenceSnapshot {
  aiConfidence?: number;        // 0–1, untrusted input
  evidenceConfidence: "insufficient" | "single_engagement" | "multi_signal" | "validated";
  organizationalConfidence: "proposed" | "validated" | "proven"; // post-approval only
  promotionEligible: boolean;   // domain-computed, not AI
}
```

---

## 7. Supporting Entity: `LearningExtractionRun`

| Field | Required |
|-------|----------|
| `extractionRunId` | Deterministic from `retrospectiveId` |
| `companyId`, `engagementId`, `retrospectiveId` | Yes |
| `status` | `pending` \| `running` \| `completed` \| `failed` \| `partial` |
| `provenance` | Copy of retrospective traceabilityRefs at start |
| `candidateIds` | string[] |
| `startedAt`, `completedAt` | |
| `failureReason` | On failed |
| `aiJobMetadata` | Model id/version when AI used |
| `idempotencyKey` | Same as extractionRunId |

One canonical run per approved retrospective (retries update same run doc).

---

## 8. Supporting Entity: `LearningPromotionRecord`

Created on successful promotion (separate from candidate for audit clarity):

| Field | Purpose |
|-------|---------|
| `promotionId` | Unique |
| `candidateId`, `extractionRunId` | Source |
| `promotedAssetKind`, `promotedAssetId`, `promotedVersion` | Target |
| `promotedAt`, `promotedBy` | Human actor |
| `sourceProvenance` | Copy immutable |
| `rollbackOfPromotionId?` | If rollback implemented |

---

## 9. Knowledge Record (Phase F Decision)

LE docs reference engagement-scoped **Knowledge Records** pre-promotion.

**Freeze:** Phase F **does not require** a separate `KnowledgeRecord` collection for F1–F3. Candidate `proposedContent` + `provenance` satisfies evidence linkage. If gate GK-005 strictly requires Knowledge Record links, interpret as **Evaluation link OR retrospective observation text** until Knowledge Record entity is added in F5 or deferred.

**Amendment to LE doc interpretation** — see doc 13.
