# 08 — Phase E Traceability Integration

---

## 1. Phase E Deliverables Consumed by Learning Engine

| Phase E Asset | Consumption |
|---------------|-------------|
| `DeliveryTraceabilityRefs` | Copied into extraction run + every candidate provenance |
| `aosRequirementVersions` | Read requirement text/metadata at version |
| `aosPromptVersions` | Read prompt pack at version |
| `aosCursorSessions` | Read session outcome |
| `aosCursorRevisions` | Optional revision chain |
| `aosEvaluations` | Read scores, rubric refs, outcome |
| `aosAuditEvents` | Source audit IDs for provenance |
| Version history UI | Evidence inspection in F4 approval UI |

---

## 2. Traceability Capture Point (Existing)

`approveRetrospective()` in `engagementWorkflowAggregate.ts`:

- Sets `retrospective.status = "approved"`
- Calls `buildDeliveryTraceabilityRefs(workflow)` → stores on retrospective
- Emits workflow audit event

**Verified in Phase E3:** Full lineage integration test through retrospective reload.

---

## 3. `DeliveryTraceabilityRefs` Shape (Phase E)

```typescript
interface DeliveryTraceabilityRefs {
  requirementVersionId: string;
  promptVersionId: string;
  cursorSessionId: string;
  evaluationId: string;
  rubricVersionId?: string;
}
```

Learning Engine **MUST** treat this as authoritative when present.

---

## 4. Evidence Loading Rules (LF-10)

| Priority | Source |
|----------|--------|
| 1 | Immutable version documents via traceabilityRefs IDs |
| 2 | Workflow head fields only when version chain disabled AND migration not materialized |
| 3 | Never use draft/unpublished requirement or prompt |

When `isVersionChainsEnabled()` (default true):

- Extraction MUST fail if any traceability ID missing or not found
- No fallback to embedded D4 strings on workflow head

---

## 5. Retrospective Lessons Integration

Current stub `RetrospectiveLesson` with `promotionTarget`:

- F2 extraction MAY convert approved retro lessons to **deterministic candidates** (no AI) as seed
- Must still pass gates and human approval
- Replace hardcoded `generateRetrospective()` lessons with extraction output in F4/F5

---

## 6. Reuse Assessment

Embedded on workflow document:

- Include in evidence bundle
- Module candidates require gap documentation (GM-002)
- Reuse rejections feed `evaluation_insight` and `module` candidates

---

## 7. QA Evidence

QA checklist / quality report on workflow head:

- Evidence confidence input
- Not directly promotable — informs gates only

---

## 8. Cross-Reference Validation (Domain)

Before candidate create, domain service validates:

```
∀ id ∈ provenance.versionIds:
  load(id).companyId === candidate.companyId
  load(id).engagementId === candidate.engagementId (where applicable)
```

Foreign-company ID → reject entire extraction run (LF-02).

---

## 9. UI Traceability (F4)

Approval candidate detail MUST deep-link to existing:

- `VersionHistoryPanel` / detail views
- `TraceabilityReference` component
- Engagement Hub routes for source engagement

No new traceability UI — reuse Phase E3 components.
