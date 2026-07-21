# 13 — Documentation Reconciliation

Amendments to Learning Engine documentation interpretation based on Phase E implementation. **Historical LE docs are NOT rewritten** — these clarifications govern Phase F implementation.

---

## Conflict 1: Retrospective Trigger Terminology

| | |
|--|--|
| **Original assumption** | LE docs: trigger on retrospective `closed` |
| **Phase E reality** | Code: `status: "approved"`, gate `retrospectiveComplete` |
| **Implementation interpretation** | **`approved` ≡ `closed`** for Learning Engine trigger. Extraction schedules on successful `approveRetrospective()`. Update LE docs only in a future doc-maintenance sprint if desired. |

---

## Conflict 2: Audit Storage Owner

| | |
|--|--|
| **Original assumption** | `18_LEARNING_AUDIT_TRAIL.md`: ERP ActivityLogger primary |
| **Phase E reality** | AOS uses `aosAuditEvents` append-only for workflow |
| **Implementation interpretation** | Learning events extend **`aosAuditEvents`** taxonomy. ERP ActivityLogger dual-write is optional F3/F5 adapter — not F1 blocker. LF-15 satisfied by AOS audit store. |

---

## Conflict 3: Knowledge Record Entity

| | |
|--|--|
| **Original assumption** | GK-005 requires ≥1 Knowledge Record link |
| **Phase E reality** | No `KnowledgeRecord` entity or collection |
| **Implementation interpretation** | GK-005 satisfied by **Evaluation link + retrospective observation** until Knowledge Record implemented. Gate rule annotated in domain as `evaluationId OR knowledgeRecordId`. |

---

## Conflict 4: Prompt Version vs Org Template

| | |
|--|--|
| **Original assumption** | Prompt improvement → Prompt Template update (ambiguous entity) |
| **Phase E reality** | `PromptVersion` = immutable delivery artifact |
| **Implementation interpretation** | Prompt evolution promotes to **organizational template** (playbook `prompt_template` or future org store). NEVER mutates `aosPromptVersions`. Metadata links `derivedFromPromptVersionId`. |

---

## Conflict 5: traceabilityRefs Field Set

| | |
|--|--|
| **Original assumption** | LE inputs list many optional sources |
| **Phase E reality** | `DeliveryTraceabilityRefs` has 4 required + optional rubricVersionId |
| **Implementation interpretation** | Extraction **requires** the four core IDs. `cursorRevisionIds` loaded when session has revisions. `retrospectiveId` on provenance from entity id, not refs struct. |

---

## Conflict 6: Cursor Revision Orchestration

| | |
|--|--|
| **Original assumption** | Full cursor revision workflow |
| **Phase E reality** | Revisions recorded for failed sessions; no full orchestration |
| **Implementation interpretation** | Learning consumes revisions when present; does not require revision workflow completion for extraction trigger. |

---

## Conflict 7: Hardcoded Retro Lessons

| | |
|--|--|
| **Original assumption** | AI extraction produces candidates |
| **Phase E reality** | `generateRetrospective()` returns hardcoded lessons with promotionTarget |
| **Implementation interpretation** | F2 may seed candidates from retro lessons deterministically. F5 removes stub generator. UI KnowledgeCard/RegistryCard placeholders replaced in F4. |

---

## Conflict 8: Evaluation Rubric Storage

| | |
|--|--|
| **Original assumption** | Evaluation insights update rubric config |
| **Phase E reality** | `evaluationRubric.ts` stub; rubrics in playbook seed |
| **Implementation interpretation** | `evaluation_insight` promotes to playbook rubric entry new version. No separate rubric collection in F3 unless needed. |

---

## Conflict 9: Reuse Assessment as Hard Input

| | |
|--|--|
| **Original assumption** | LE lifecycle table: Reuse Assessment **required** |
| **Phase E reality** | Reuse embedded on workflow; always present for engagements that reached retro |
| **Implementation interpretation** | Required when workflow reached retrospective. Extraction fails soft (partial) if reuse block missing — audit warning. |

---

## Conflict 10: Metrics Dashboards

| | |
|--|--|
| **Original assumption** | Docs 12–16 reference dashboards |
| **Phase E reality** | No metrics persistence |
| **Implementation interpretation** | Phase F verifies **computability from persisted evidence** only. Dashboards classified future (see freeze report §18). |

---

## Valid Without Amendment

These LE doc decisions remain fully valid:

- Three-layer LE / KE / KIL separation
- ADR-009 human approval
- Client facts never auto-promote
- Quality gates before review queue
- Non-destructive versioning of org assets
- Continuous learning flywheel concept
- Approval workflow stages (approve/reject/defer/amend)
