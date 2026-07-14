# Milestone Form v1.0 — Implementation Report

**Status:** Complete — schema frozen for Digikinz initiative entry.

## Summary

Extended the BOS Milestone Form and domain schema with four optional planning/classification fields and automatic immutable milestone numbering. No UI redesign, no lifecycle changes, no Finance integration.

## New Fields (all optional)

| Field | Storage | UI location |
|-------|---------|-------------|
| Milestone Type | `milestoneType` (string) | Classification — preset dropdown + custom |
| Estimated Duration | `estimatedDuration` + `estimatedDurationUnit` | Planning |
| Estimated Cost | `estimatedCostAmount` + `estimatedCostCurrency` | Planning |
| Business Impact | `businessImpact` | Planning — Low / Medium / High / Critical |

## Automatic Numbering

- Assigned at **create only** in `FirestoreBosMilestoneRepository` (`create` + `batchCreate`).
- Fields: `milestoneNumber` (e.g. `M-001`), `milestoneNumberIndex` (integer).
- Never exposed as an editable form field; shown as a read-only badge in the milestone list.
- Dependency dropdown uses `M-00N · Title` via `milestoneReferenceLabel()`.
- Existing milestones without numbers remain valid (backward compatible).

## Files Touched

- **Domain:** `bos/domain/entities/milestone.ts`, `milestoneNumbering.ts`, `milestoneRules.ts`, `milestoneTemplate.ts`
- **Constants:** `milestoneType.ts`, `milestoneDurationUnit.ts`, `milestoneBusinessImpact.ts`, `constants/index.ts`
- **Firestore:** `milestoneDocument.ts`, `milestoneTemplateDocument.ts`, `FirestoreBosMilestoneRepository.ts`
- **UI:** `milestoneFormTypes.ts`, `BosMilestoneForm.tsx`, `BosMilestoneList.tsx`, `BosInitiativeDetailPage.tsx`
- **Validation:** `runConverterChecks.ts` (+7 checks)

## Verification

- `npm run build` — passed
- `npm run bos:validate` — **29 checks passed**

## Notes for Digikinz

- First milestone created on a new initiative receives `M-001`; sequence continues per initiative regardless of display reorder.
- All new fields are optional; only title and success criteria remain required in the form.
- Template save-as flow persists the new fields on template steps for reuse.
