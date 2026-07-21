# Phase E — Persistence & Security Plan

Firestore design for immutable version chains. **No schema changes in this planning sprint** — specification only.

---

## 1. Collection Strategy

**Principle:** Immutable published records live in **dedicated collections** with create-only rules after publish. Mutable heads remain on workflow doc or lightweight head collections.

### 1.1 New collections

| Collection | Doc ID | Contents | Mutability |
|------------|--------|----------|------------|
| `aosRequirementVersions` | `{companyId}__{setId}__v{versionNumber}` or UUID | Full requirement snapshot | **Immutable after create** |
| `aosPromptVersions` | `{companyId}__{artifactId}__v{versionNumber}` or UUID | Full prompt artifact snapshot + rubric ref | **Immutable after create** |
| `aosCursorSessions` | `{sessionId}` (UUID) | Session record + refs | **Append-only**; capture fields only pre-finalize |
| `aosCursorRevisions` | `{revisionId}` (UUID) | Revision link session → new prompt version | **Append-only** |
| `aosEvaluations` | `{evaluationId}` (UUID) | Score + rubric snapshot + refs | **Immutable after confirm** |

**ID strategy:** Prefer deterministic IDs for versions (`{companyId}__{parentId}__v{n}`) to enforce monotonic uniqueness at Firestore level. UUID suffix acceptable if composite uniqueness validated in domain transaction.

### 1.2 Existing collections (modified usage)

| Collection | Change |
|------------|--------|
| `aosEngagementWorkflows` | Retain `{companyId}__{engagementId}`. Embedded artifacts become **head projections** or **pointer fields** only |
| `aosAuditEvents` | **KEEP** append-only. Add optional fields: `versionId`, `versionNumber`, `artifactType` |
| `aosModuleRegistry`, `aosKnowledgePatterns`, `aosPlaybookEntries` | **KEEP** — no Phase E version chain |

### 1.3 Optional head collection (E2 decision)

If workflow doc size becomes a concern:

| Collection | Purpose |
|------------|---------|
| `aosRequirementSets` | Mutable requirement set head per engagement |

**Default for E2:** Keep requirement/prompt **heads embedded** in workflow doc for minimal migration risk; store **published versions** externally. Revisit split if document exceeds Firestore 1 MiB limit (unlikely in Phase E).

---

## 2. Parent IDs & Reference Fields

### Requirement Version document

```typescript
{
  companyId: string;           // immutable
  engagementId: string;
  requirementSetId: string;
  versionNumber: number;         // monotonic
  publishedAt: Timestamp;
  publishedByUserId: string;
  snapshot: {                    // frozen at publish
    title: string;
    items: RequirementItem[];
    attachmentRefs?: string[];
  };
  supersedesVersionId?: string;  // prior version in same set
}
```

### Workflow head pointers (on `aosEngagementWorkflows`)

```typescript
{
  // ... existing gates ...
  requirementSetHead: RequirementSet | null;  // mutable draft
  currentRequirementSetId?: string;
  currentApprovedRequirementVersionId?: string;
  currentApprovedRequirementVersionNumber?: number;

  promptPackHead: PromptPack | null;
  currentPromptPackId?: string;
  // per-artifact current version IDs stored on artifact head or map

  currentCursorSessionId?: string;
  currentEvaluationId?: string;
}
```

### Prompt Version document

```typescript
{
  companyId: string;
  engagementId: string;
  promptPackId: string;
  promptArtifactId: string;
  requirementVersionId: string;   // required (ADR-005)
  versionNumber: number;
  publishedAt: Timestamp;
  publishedByUserId: string;
  snapshot: {
    title: string;
    body: string;
    acceptanceCriteria?: string;
    rubricVersionId?: string;
  };
  supersedesVersionId?: string;
}
```

### Cursor Session document

```typescript
{
  companyId: string;
  engagementId: string;
  promptPackId: string;
  promptArtifactId: string;
  promptVersionId: string;        // exact executed version
  status: "active" | "captured" | "passed" | "failed";
  captureSummary?: string;
  startedAt: Timestamp;
  capturedAt?: Timestamp;
  finalizedAt?: Timestamp;
  executorUserId: string;
}
```

### Evaluation document

```typescript
{
  companyId: string;
  engagementId: string;
  cursorSessionId: string;
  promptVersionId: string;
  requirementVersionId: string;
  rubricVersionId: string;
  rubricSnapshot: { ... };        // frozen at score time
  status: "draft" | "confirmed" | "overridden";
  scorePercent: number;
  passed: boolean;
  criteria: EvaluationCriterion[];
  confirmedAt?: Timestamp;
  confirmedByUserId?: string;
  overrideReason?: string;
  amendsEvaluationId?: string;
}
```

---

## 3. Indexes (firestore.indexes.json)

| Collection | Fields | Purpose |
|------------|--------|---------|
| `aosRequirementVersions` | `companyId`, `engagementId`, `versionNumber` DESC | History list |
| `aosRequirementVersions` | `companyId`, `requirementSetId`, `versionNumber` DESC | Set history |
| `aosPromptVersions` | `companyId`, `promptArtifactId`, `versionNumber` DESC | Artifact history |
| `aosPromptVersions` | `companyId`, `requirementVersionId` | Trace prompt → requirement |
| `aosCursorSessions` | `companyId`, `engagementId`, `startedAt` DESC | Session list |
| `aosCursorSessions` | `companyId`, `promptVersionId` | Trace execution |
| `aosEvaluations` | `companyId`, `cursorSessionId` | 1:1 lookup |
| `aosEvaluations` | `companyId`, `engagementId`, `confirmedAt` DESC | Engagement eval history |

---

## 4. Repository Contract Changes

| New contract | Methods |
|--------------|---------|
| `RequirementVersionRepository` | `publish`, `getById`, `listBySet`, `listByEngagement`, `getLatestApproved` |
| `PromptVersionRepository` | `publish`, `getById`, `listByArtifact`, `getLatestApproved` |
| `CursorSessionRepository` | `create`, `updateCapture`, `finalize`, `getById`, `listByEngagement` |
| `CursorRevisionRepository` | `create`, `resolve`, `listBySession` |
| `EvaluationRepository` | `createDraft`, `confirm`, `override`, `getById`, `listBySession`, `listByEngagement` |

**EngagementWorkflowRepository** retains `get`, `getOrCreate`, `save`, `listByCompany` for head + gates.

All repositories accept `companyId` on every operation (D4 pattern).

---

## 5. Transactions & Concurrency

| Operation | Transaction scope |
|-----------|-------------------|
| Publish Requirement Version | Read head → validate draft → write version doc → update head pointers → append audit (single batch) |
| Publish Prompt Version | Same pattern |
| Start Cursor Session | Validate prompt version exists + approved → create session → update workflow pointer |
| Confirm Evaluation | Write evaluation final state → update gates → append audit |

**Concurrency:** Use Firestore transaction with read of head `updatedAt` or version counter. Reject publish if version number collision (domain error `VERSION_CONFLICT`).

**No distributed locks beyond Firestore transactions.**

---

## 6. Security Rules

Extend existing AOS tenant helpers (`aosCompanyGetOk`, `aosCompanyReadOk`, `aosCompanyWriteOk`).

### Immutable version collections

```
match /aosRequirementVersions/{versionId} {
  allow get, list: if aosCompanyReadOk(resource.data);
  allow create: if aosCompanyWriteOk(request.resource.data)
    && validRequirementVersionCreate(request.resource.data);
  allow update, delete: if false;
}

match /aosPromptVersions/{versionId} {
  allow get, list: if aosCompanyReadOk(resource.data);
  allow create: if aosCompanyWriteOk(request.resource.data)
    && validPromptVersionCreate(request.resource.data);
  allow update, delete: if false;
}

match /aosCursorSessions/{sessionId} {
  allow get, list: if aosCompanyReadOk(resource.data);
  allow create: if aosCompanyWriteOk(request.resource.data);
  allow update: if aosCompanyReadOk(resource.data)
    && aosCompanyWriteOk(request.resource.data)
    && cursorSessionUpdateAllowed(resource.data, request.resource.data);
  allow delete: if false;
}

match /aosEvaluations/{evaluationId} {
  allow get, list: if aosCompanyReadOk(resource.data);
  allow create: if aosCompanyWriteOk(request.resource.data);
  allow update: if aosCompanyReadOk(resource.data)
    && evaluationUpdateAllowed(resource.data, request.resource.data);
  allow delete: if false;
}
```

**Helper functions (E2):**

- `cursorSessionUpdateAllowed` — only pre-finalize capture fields
- `evaluationUpdateAllowed` — only draft → confirmed/overridden transitions; no field mutation after confirm
- `validRequirementVersionCreate` — requires monotonic versionNumber vs existing (or enforce in app layer + rules check fields immutable)

**Workflow doc (`aosEngagementWorkflows`):** **KEEP** update allowed for head fields; rules cannot easily enforce field-level immutability on embedded published snapshots — hence **moving published content out of workflow doc**.

---

## 7. Migration Strategy

**Constraints:** No destructive migration; existing engagements remain readable; deterministic initial versions; audit trail for migration.

### 7.1 Existing workflow documents

Records created under D4 have embedded artifacts without separate version docs.

**Strategy: lazy materialization on first post-E command**

| Trigger | Action |
|---------|--------|
| First read after E deploy | Workflow loads as today (embedded fields) |
| First `approveRequirements` after E | If no `RequirementVersion` exists for current approved set → publish v1 from embedded snapshot; write migration audit `aos_migration_requirement_version_materialized` |
| First `approvePromptPack` after E | Same for Prompt Version v1 |
| Existing approved artifacts never re-approved | Remain embedded-only until engagement mutates; **read path** treats embedded approved content as implicit v1 for display |

### 7.2 Migration audit

Every lazy materialization emits append-only audit event with:

- `engagementId`
- `source: "d4_embedded_migration"`
- `materializedVersionId`
- `actorUserId: "system"` or triggering user

### 7.3 Rollback

- New collections can be ignored by pre-E code paths if feature flag `AOS_VERSION_CHAINS_ENABLED=false`
- Workflow doc never stripped of embedded fields during E2 — dual projection until E3 verification complete
- Rollback = disable flag; reads fall back to embedded fields

### 7.4 Data loss prevention

- No delete migration scripts
- No in-place rewrite of historical embedded data
- Version publish **copies** content to new doc; does not move/delete source until E3 cleanup phase (optional, post-verification)

---

## 8. Converter Requirements

| Converter | Rules |
|-----------|-------|
| `requirementVersionToFirestore` | `deepOmitUndefinedFields`; reject undefined nested |
| `promptVersionToFirestore` | Same |
| All version fromFirestore | Validate `companyId`, monotonic fields present |
| Workflow head projection | Sync from head after save; never embed full published snapshot post-E |

Reuse D4 pattern: `aos/infrastructure/firestore/documentPayload.ts` → `deepOmitUndefinedFields`.

---

## 9. scripts/verify-aos-firestore-security.ts

Extend structural verification (E2):

- Assert new collection rule blocks exist
- Assert `allow update, delete: if false` on version collections
- Assert evaluation/cursor conditional update helpers referenced

No runtime emulator proof in script — integration tests handle that (E3).
