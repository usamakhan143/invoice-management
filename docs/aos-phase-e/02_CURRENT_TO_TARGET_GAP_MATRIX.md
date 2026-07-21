# Phase E — Current vs Target Gap Matrix

**Baseline:** D4.7 closed implementation (July 2026)  
**Target:** ADR-004/005/006/007 immutable version chains

Legend: **KEEP** = no change required | **CHANGE** = modify | **ADD** = new | **DEPRECATE** = stop using pattern

---

## 1. Requirement Set / Requirement Version (ADR-004)

| Layer | Current (D4.7) | Target (Phase E) | Action |
|-------|----------------|------------------|--------|
| **Domain entity** | `RequirementSet` embedded in `EngagementWorkflow` (`engagementWorkflow.ts`) | `RequirementSet` head + `RequirementVersion` immutable entity | **ADD** + **CHANGE** |
| **Version field** | `version: 1` hardcoded in aggregate | Monotonic `versionNumber` on publish | **CHANGE** |
| **Draft mutation** | `updateRequirementDraft` edits in place; no post-approve guard | Draft-only edits; approve blocked if not draft | **CHANGE** |
| **Approve** | Sets `status=approved` on embedded object | Publishes `RequirementVersion` snapshot; sets `currentApprovedVersionId` | **CHANGE** |
| **Supersession** | Not implemented | Set → `superseded`; new set on material scope change | **ADD** |
| **Application** | `generateRequirementsDraft`, `updateRequirementDraft`, `approveRequirements` | Same commands; orchestrate version publish | **CHANGE** |
| **Repository** | `EngagementWorkflowFirestoreRepository.save` (merge whole doc) | `RequirementVersionRepository.append` (immutable) + head update | **ADD** |
| **Firestore doc** | Nested under `aosEngagementWorkflows/{companyId}__{engId}` | `aosRequirementVersions/{versionId}` + head fields on workflow or `aosRequirementSets/{setId}` | **ADD** |
| **Converter** | `engagementWorkflowDocument.ts` embeds full set | `requirementVersionDocument.ts` + head projection | **ADD** |
| **UI** | `EngagementRequirementsScreen` shows `requirementSet.version` | Show current version + history list (read-only) | **CHANGE** (E3) |
| **Audit** | `requirements.approved` | + `aos_requirement_version_published` with version number | **CHANGE** |
| **Security rules** | Workflow doc freely updatable | Version docs: create-only after publish | **ADD** |

**Mutable fields violating target (must fix):**

- `requirementSet.items` editable after approve via `updateRequirementDraft` (no guard)
- Approved content lives in same Firestore merge path as drafts

---

## 2. Prompt Pack / Prompt Version (ADR-005)

| Layer | Current (D4.7) | Target (Phase E) | Action |
|-------|----------------|------------------|--------|
| **Domain entity** | `PromptPack` + `PromptArtifact[]` embedded | Head + `PromptVersion` per artifact | **ADD** + **CHANGE** |
| **Requirement ref** | None | `requirementVersionId` required on pack | **ADD** |
| **Version field** | `version: 1` hardcoded | `packVersion` + per-artifact `versionNumber` | **CHANGE** |
| **Approve** | Sets pack `status=approved` in place | Publishes `PromptVersion` per artifact | **CHANGE** |
| **Application** | `generatePromptPack`, `approvePromptPack` | Gate on `requirementVersionId`; publish versions | **CHANGE** |
| **Repository** | Embedded in workflow save | `PromptVersionRepository` | **ADD** |
| **Firestore** | Embedded | `aosPromptVersions/{versionId}` | **ADD** |
| **UI** | `EngagementPromptsScreen` | Current version label + artifact version refs | **CHANGE** (E3) |
| **Audit** | `prompts.approved` | + `aos_prompt_version_published` | **CHANGE** |

**Mutable fields violating target:**

- Entire `promptPack.artifacts[].body` mutable until re-approve overwrites same slot
- No pin to Requirement Version

---

## 3. Cursor Session / Revision (ADR-006)

| Layer | Current (D4.7) | Target (Phase E) | Action |
|-------|----------------|------------------|--------|
| **Domain entity** | `CursorSession[]` embedded | First-class append-only `CursorSession` | **CHANGE** |
| **Prompt ref** | `promptPackId` only | `promptVersionId` + `promptArtifactId` | **CHANGE** |
| **Revision** | Not implemented | `CursorRevision` entity on failure | **ADD** |
| **Application** | `startCursorSession`, `submitCursorCapture` | Pass resolved `promptVersionId` at start | **CHANGE** |
| **Repository** | Array merge on workflow doc | `CursorSessionRepository.append` | **ADD** |
| **Firestore** | Embedded array | `aosCursorSessions/{sessionId}` | **ADD** |
| **UI** | `EngagementCursorScreen` | Display executed version ID/number | **CHANGE** (E3) |
| **Audit** | `cursor.started`, `cursor.capture_submitted` | Align to domain names (`aos_cursor_session_*`) | **CHANGE** (optional alias period) |

**Violations:**

- Sessions lack exact prompt version pin
- No revision chain on evaluation failure

---

## 4. Evaluation (ADR-007)

| Layer | Current (D4.7) | Target (Phase E) | Action |
|-------|----------------|------------------|--------|
| **Domain entity** | Single `evaluation` object, replaced on re-run | Append-only `Evaluation` records | **CHANGE** |
| **Refs** | `engagementId` only | `cursorSessionId`, `promptVersionId`, `rubricVersionId` | **ADD** |
| **Confirm flow** | Immediate stub pass (`passed: true`) | Draft → confirmed; immutable after confirm | **CHANGE** |
| **Override** | Not implemented | `overridden` with reason; no silent edit | **ADD** |
| **Amendment** | Not implemented | `amendsEvaluationId` for re-score | **ADD** |
| **Application** | `runEvaluation` | Score against rubric snapshot; confirm gate | **CHANGE** |
| **Repository** | Embedded replace | `EvaluationRepository.append` | **ADD** |
| **Firestore** | Embedded | `aosEvaluations/{evaluationId}` | **ADD** |
| **UI** | `EngagementEvaluationScreen` | Show rubric version + session link | **CHANGE** (E3) |

**Violations:**

- Re-running evaluation overwrites prior result (history loss)
- No rubric version immutability

---

## 5. Cross-Cutting (Unchanged vs Changed)

| Concern | Current | Target | Action |
|---------|---------|--------|--------|
| **EngagementWorkflow gates** | Derived from embedded artifact status | Derived from head pointers + version existence | **CHANGE** |
| **Audit collection** | `aosAuditEvents` append-only | Same; enrich with `versionId` refs | **KEEP** + **CHANGE** |
| **Workflow doc** | Single source of truth for all artifacts | Head + pointers; versions in dedicated collections | **CHANGE** |
| **Founder journey integration test** | Passes on mutable model | Must pass on versioned model | **CHANGE** (E3 regression) |
| **Tenant isolation** | Verified D4.7 | Extended to new collections | **ADD** rules |
| **Reuse Assessment** | Embedded mutable | Links `requirementVersionId` | **CHANGE** |
| **Retrospective** | Embedded mutable | Add trace refs; append-only hardening optional post-E | **CHANGE** (refs E3) |
| **Workflow QA (`qualityReport`)** | Embedded checklist | Out of version-chain scope | **KEEP** |
| **Delivery Quality Report** | Separate collection, unused in workflow | Out of scope | **KEEP** |
| **Import boundaries** | D4 enforced | New domain modules must not invert layers | **KEEP** |
| **Presentation services** | `createAosPresentationServices` | Same wiring; new queries for history | **CHANGE** (E3) |

---

## 6. Files / Layers Affected (Summary)

### Domain (E1)

| Path | Action |
|------|--------|
| `aos/domain/requirements/` | **ADD** |
| `aos/domain/prompt/` | **ADD** |
| `aos/domain/cursor/` | **ADD** |
| `aos/domain/evaluation/` | **ADD** |
| `aos/domain/workflow/entities/engagementWorkflow.ts` | **CHANGE** — pointers + slim head |
| `aos/domain/workflow/aggregate/engagementWorkflowAggregate.ts` | **CHANGE** — delegate publish to version domains |

### Contracts (E1)

| Path | Action |
|------|--------|
| `aos/contracts/RequirementVersionRepository.ts` | **ADD** |
| `aos/contracts/PromptVersionRepository.ts` | **ADD** |
| `aos/contracts/CursorSessionRepository.ts` | **ADD** |
| `aos/contracts/EvaluationRepository.ts` | **ADD** |
| `aos/contracts/EngagementWorkflowRepository.ts` | **KEEP** (head persistence) |

### Application (E2)

| Path | Action |
|------|--------|
| `aos/application/workflow/EngagementWorkflowApplicationService.ts` | **CHANGE** |
| `aos/application/workflow/dto/EngagementWorkflowDto.ts` | **CHANGE** — version refs + history DTOs |

### Infrastructure (E2)

| Path | Action |
|------|--------|
| `aos/infrastructure/firestore/models/*Version*.ts` | **ADD** |
| `aos/infrastructure/firestore/repositories/*Version*.ts` | **ADD** |
| `aos/infrastructure/firestore/collections.ts` | **CHANGE** |
| `firestore.rules` | **CHANGE** |
| `firestore.indexes.json` | **CHANGE** |

### Presentation (E3)

| Path | Action |
|------|--------|
| `aos/presentation/screens/engagement-hub/requirements/` | **CHANGE** |
| `aos/presentation/screens/engagement-hub/prompts/` | **CHANGE** |
| `aos/presentation/screens/engagement-hub/cursor/` | **CHANGE** |
| `aos/presentation/screens/engagement-hub/evaluation/` | **CHANGE** |
| Reuse / QA / Retro screens | **KEEP** (minimal or no change) |

### Tests (E1–E3)

| Path | Action |
|------|--------|
| `aos/domain/**/**/*.test.ts` | **ADD** version invariant tests |
| `aos/infrastructure/integration/versionChain.integration.test.ts` | **ADD** (E3) |
| Existing `workflowStack`, `founderJourney` integration tests | **KEEP** green |

---

## 7. Explicit Non-Changes (Do Not Touch in Phase E)

- Delivery engagement lifecycle domain (`aos/domain/delivery/`)
- BOS / ERP read adapters
- Catalog seeds (module registry, knowledge, playbook) structure
- ADR documents
- Design system / design freeze docs
- Generic PM features (ADR-012)
- Learning Engine promotion pipelines
- Cursor SDK automation (ADR-006 future levels)
