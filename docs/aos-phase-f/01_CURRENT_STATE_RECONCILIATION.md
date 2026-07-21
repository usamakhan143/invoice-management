# 01 — Current State Reconciliation (Post-Phase-E)

Audit of actual codebase vs Learning Engine requirements. Classification: **READY FOR F** | **PARTIAL** | **STUB** | **MISSING** | **OUT OF F SCOPE**.

---

## 1. Delivery Evidence Chain (Phase E)

| Asset | Location | Status | Notes |
|-------|----------|--------|-------|
| RequirementVersion | `aos/domain/requirements/`, `aosRequirementVersions` | **READY FOR F** | Immutable; list/detail APIs |
| PromptVersion | `aos/domain/prompt/`, `aosPromptVersions` | **READY FOR F** | Bound to requirementVersionId |
| CursorSession | `aos/domain/cursor/`, `aosCursorSessions` | **READY FOR F** | Finalized sessions immutable |
| CursorRevision | `aos/domain/cursor/entities/cursorRevision.ts`, `aosCursorRevisions` | **PARTIAL** | Domain + repo; no workflow orchestration; failed-session only |
| Evaluation | `aos/domain/evaluation/`, `aosEvaluations` | **READY FOR F** | Confirmed/overridden immutable; lineage refs |
| Engagement workflow head | `aosEngagementWorkflows` | **READY FOR F** | Mutable head + embedded D4 compat |
| Version history UI | Engagement Hub ST-05/07/08/09/11 | **READY FOR F** | Read-only evidence inspection |

---

## 2. Retrospective Trigger & Traceability

| Item | Location | Status |
|------|----------|--------|
| `Retrospective` entity | `aos/domain/workflow/entities/engagementWorkflow.ts` | **READY FOR F** |
| `DeliveryTraceabilityRefs` | Same + DTOs | **READY FOR F** |
| `buildDeliveryTraceabilityRefs()` | Domain entity | **READY FOR F** |
| `approveRetrospective()` | `engagementWorkflowAggregate.ts` | **READY FOR F** |
| Capture at approve | Sets `traceabilityRefs`, audit `retro.approved` | **READY FOR F** |
| UI traceability section | `EngagementRetrospectiveScreen.tsx` | **READY FOR F** (display only) |
| Extraction hook on approve | — | **MISSING** |
| `retrospectiveId` in traceabilityRefs | — | **PARTIAL** (retro id on entity; not duplicated in refs struct) |

**Terminology:** Code uses `status: "approved"` and gate `retrospectiveComplete`. LE docs say `closed`. Interpret as equivalent trigger (see doc 13).

---

## 3. Retrospective Lessons (Stub)

| Item | Status |
|------|--------|
| `RetrospectiveLesson.promotionTarget` | **STUB** — `"knowledge" \| "registry"` only |
| Hardcoded lessons in `generateRetrospective()` | **STUB** — placeholder text |
| `KnowledgeCard` / `RegistryCard` on retro screen | **STUB** — no actions |

---

## 4. Audit Infrastructure

| Item | Location | Status |
|------|----------|--------|
| `AuditEvent` entity | `aos/domain/audit/entities/auditEvent.ts` | **READY FOR F** |
| `aosAuditEvents` collection | Append-only, company-scoped | **READY FOR F** |
| Delivery audit types | workflow aggregate + orchestrator | **READY FOR F** |
| Learning audit types (`aos_learning_*`) | — | **MISSING** |
| ERP ActivityLogger integration | Referenced in LE docs | **OUT OF F SCOPE** for F1–F3 unless explicitly required; **PARTIAL** — AOS owns `aosAuditEvents` today |

**Phase F interpretation:** Extend `aosAuditEvents` with learning taxonomy (doc 06). Dual-write to ERP ActivityLogger is optional Phase F2+ integration, not blocker for F1.

---

## 5. Promotion Targets (Read Catalogs)

| Target | Domain | Contract | Repo | Collection | App Service | UI | Write Path |
|--------|--------|----------|------|------------|-------------|-----|------------|
| Knowledge Pattern | `knowledgePattern.ts` | `KnowledgeRepository` | read-only | `aosKnowledgePatterns` | list/get | ST Knowledge | **MISSING** |
| Module Registry | `moduleRegistry.ts` | `ModuleRegistryRepository` | read-only | `aosModuleRegistry` | list/get | ST Registry | **MISSING** |
| Agency Playbook | `playbookEntry.ts` | `PlaybookRepository` | read-only | `aosPlaybookEntries` | list/get | ST Playbook | **MISSING** |
| Prompt template (org) | Playbook `prompt_template` type | — | — | playbook entries | — | — | **MISSING** |
| Engagement PromptVersion | Phase E | `PromptVersionRepository` | publish | `aosPromptVersions` | workflow | ST Prompts | **READY** (delivery only) |
| Rubric | `evaluationRubric.ts` stub + playbook seed | — | — | — | — | — | **PARTIAL** |

---

## 6. Reuse & QA Evidence

| Item | Status |
|------|--------|
| ReuseAssessment on workflow | **READY FOR F** — embedded on workflow doc |
| Reuse module decisions | **READY FOR F** |
| QA checklist / quality report | **READY FOR F** — workflow head |
| Knowledge Record (engagement-scoped) | **MISSING** — documented in LE, not implemented |

---

## 7. Application & Presentation Patterns

| Pattern | Status | Reuse for F |
|---------|--------|-------------|
| `EngagementWorkflowApplicationService` | **READY FOR F** | Orchestration model |
| `QueueProjectionApplicationService` | **READY FOR F** | Extend for learning queue |
| `QueueScreenTemplate` + ST-12–15 | **READY FOR F** | Pattern for learning review UI (F4) |
| `ApprovalDialog` | **READY FOR F** | Approve/reject candidate |
| TanStack Query keys | **READY FOR F** | Add `learning` namespace |
| `AOS_FEATURE_FLAG` | **PARTIAL** | No `LEARNING_ENGINE` flag yet |

---

## 8. Learning Engine Implementation

| Capability | Status |
|------------|--------|
| Learning Candidate domain | **MISSING** |
| Learning Extraction Report | **MISSING** |
| Extraction orchestration | **MISSING** |
| Quality gates (G-001…) | **MISSING** |
| Promotion pipelines | **MISSING** |
| AI extraction port | **MISSING** |
| Learning queue UI | **MISSING** |
| Knowledge Intelligence | **OUT OF F SCOPE** |

---

## 9. Summary Matrix

| Category | READY | PARTIAL | STUB | MISSING |
|----------|-------|---------|------|---------|
| Phase E evidence | 6 | 1 | 0 | 0 |
| Retrospective trigger | 5 | 1 | 2 | 1 |
| Audit | 2 | 1 | 0 | 1 |
| Promotion targets | 0 | 2 | 0 | 4 |
| Learning Engine core | 0 | 0 | 2 | 8 |

**Conclusion:** Phase E provides a **sufficient immutable evidence foundation** for Learning Engine extraction. Phase F must implement the learning process layer and promotion write paths without redesigning Phase E.
