# Milestone System — Implementation Report

## Summary

The BOS milestone system is now **initiative-driven**. Milestones are stored as first-class domain entities in Firestore. The BOS no longer infers progress from campaign launches, leads, clients, or ROI unless explicit milestone evidence is recorded.

Founders can:

- Create initiatives with **blank** or **template-based** milestone plans
- Edit, reorder, add, remove, and rename milestones before and after save
- Complete milestones only with **explicit evidence** (decision, expense, invoice, lead, manual, integration)
- Save an initiative's milestone plan as a **reusable template**
- View milestone-driven **Current Situation** and **Timeline** on the initiative detail page

---

## What Was Implemented

### Domain layer

| File | Purpose |
|------|---------|
| `bos/domain/entities/milestone.ts` | `BosMilestone`, evidence, create/update/complete/block/skip/start inputs |
| `bos/domain/entities/milestoneTemplate.ts` | `BosMilestoneTemplate`, steps, draft steps |
| `bos/domain/lifecycle/milestoneLifecycle.ts` | Status transition graph |
| `bos/domain/rules/milestoneRules.ts` | Validation including evidence required on complete |
| `bos/domain/rules/milestoneTemplateRules.ts` | Template validation (marketplace blocked) |
| `bos/constants/milestoneStatus.ts` | `planned`, `ready`, `in_progress`, `blocked`, `completed`, `skipped` |
| `bos/constants/milestoneEvidenceType.ts` | Extensible evidence types |
| `bos/constants/milestoneTemplateVisibility.ts` | `private`, `company`, `marketplace` (future) |

### Contracts & repositories

| File | Purpose |
|------|---------|
| `bos/contracts/BosMilestoneRepository.ts` | Repository interface + reorder contract |
| `bos/contracts/BosMilestoneTemplateRepository.ts` | Template repository interface |
| `bos/infrastructure/firestore/repositories/FirestoreBosMilestoneRepository.ts` | CRUD, batch create, transitions, reorder, delete planned |
| `bos/infrastructure/firestore/repositories/FirestoreBosMilestoneTemplateRepository.ts` | Template CRUD |
| `bos/infrastructure/firestore/models/milestoneDocument.ts` | Firestore converter |
| `bos/infrastructure/firestore/models/milestoneTemplateDocument.ts` | Firestore converter |

### Application services

| File | Purpose |
|------|---------|
| `bos/application/BosMilestoneApplicationService.ts` | UI entry point for milestone operations |
| `bos/application/BosMilestoneTemplateApplicationService.ts` | Template list/create/save-from-initiative |
| `bos/application/milestoneSituation.ts` | Situation snapshot, timeline events, progress (from stored data only) |

### UI

| File | Purpose |
|------|---------|
| `pages/app/bos/initiativeDetail/BosMilestoneList.tsx` | Milestone list with actions (edit, start, complete, block, skip, delete, reorder) |
| `pages/app/bos/initiativeDetail/BosMilestoneDraftEditor.tsx` | Editable milestone plan during initiative create |
| `pages/app/bos/BosInitiativesPage.tsx` | Blank vs template create flow + batch milestone creation |
| `pages/app/bos/BosInitiativeDetailPage.tsx` | DB-driven milestones, situation, timeline, save-as-template |
| `pages/app/bos/BosMilestoneTemplatesPage.tsx` | Template library |
| `pages/app/bos/initiativeDetail/BosCurrentSituationCard.tsx` | Milestone-driven situation rows |

### Removed

- `pages/app/bos/initiativeDetail/BosMilestoneEngine.tsx` — hardcoded Planning/Campaign Live/Lead/ROI stepper
- Heuristic `evaluateMilestones()` and guessed situation rows from `initiativeMilestoneEngine.ts`

---

## New Firestore Collections

### `bosMilestones`

Each document represents one founder-defined milestone.

**Key fields:** `companyId`, `initiativeId`, `templateId?`, `templateStepId?`, `title`, `description?`, `sequence`, `plannedStartDate?`, `plannedEndDate?`, `completedDate?`, `status`, `ownerUserId?`, `notes?`, `dependencyIds?`, `evidence?[]`, `blockedReason?`, `skippedReason?`, `startedAt?`, `blockedAt?`, `skippedAt?`, audit fields.

### `bosMilestoneTemplates`

Reusable milestone definitions (institutional memory).

**Key fields:** `companyId`, `name`, `category?`, `description?`, `steps[]`, `visibility`, `ownerUserId`, `sourceInitiativeId?`, audit fields.

---

## Firestore Security Rules

Added in `firestore.rules`:

- **`bosMilestones`**: company-scoped read/write; delete allowed only when `status == 'planned'`
- **`bosMilestoneTemplates`**: company-scoped read/write; no delete (consistent with other BOS entities)

---

## Firestore Indexes

Added in `firestore.indexes.json`:

```json
{ "collectionGroup": "bosMilestones", "fields": ["companyId", "initiativeId", "sequence"] }
{ "collectionGroup": "bosMilestoneTemplates", "fields": ["companyId", "createdAt"] }
```

---

## Permissions

New keys (ERP `config/permissions.ts` + BOS `bos/constants/permissionKeys.ts`):

| Key | Purpose |
|-----|---------|
| `bos_milestones_view` | View milestones |
| `bos_milestones_manage` | Create, edit, complete, block, skip, delete, reorder |
| `bos_milestone_templates_view` | View templates |
| `bos_milestone_templates_manage` | Create templates, save from initiative |

Hook helpers: `canViewBosMilestones`, `canManageBosMilestones`, `canViewBosMilestoneTemplates`, `canManageBosMilestoneTemplates`.

---

## Architecture Principles Enforced

1. **No hardcoded milestone names** — the system never assumes "Campaign Launch", "First Client", etc.
2. **No auto-completion** — milestones complete only via explicit evidence in `completeMilestone()`
3. **Evidence extensibility** — `MILESTONE_EVIDENCE_TYPE` supports future ERP/BOS integrations via `sourceId`
4. **Template marketplace ready** — `visibility: marketplace` exists in domain; validation blocks it until implemented
5. **Reorder architecture** — `sequence` field + `reorderMilestones()` batch updates; UI uses ↑/↓ (drag-and-drop deferred)
6. **Layered access** — React UI → application services → repositories → Firestore (no direct repo imports in pages)

---

## Current Situation (Milestone-Driven)

Computed from stored `bosMilestones` via `computeMilestoneSituation()`:

- Completed milestones
- Current active milestone (in progress or ready)
- Blocked milestones
- Next milestone (planned/ready/in progress)
- Overall progress (% completed + skipped)

No attribution, decision title, or ROI heuristics are used for this section.

---

## Timeline

`buildMilestoneTimelineEvents()` emits business-dated events:

- Milestone created (`createdAt`)
- Milestone started (`startedAt`)
- Milestone completed (`completedDate`)
- Milestone blocked (`blockedAt`)
- Milestone skipped (`skippedAt`)

Merged with initiative and decision events in `buildBusinessTimelineEvents()`.

---

## Future Extension Points

| Area | How to extend |
|------|----------------|
| Evidence linking | Add UI pickers that pass `sourceId` for decision/expense/invoice/lead types |
| Auto-suggest evidence | Optional **suggestions** only — never auto-complete without user action |
| Drag-and-drop reorder | Wire `@dnd-kit` or similar to `reorderMilestones()` |
| Marketplace templates | Enable `MILESTONE_TEMPLATE_VISIBILITY.MARKETPLACE` + cross-company read rules |
| Default duration | Apply `defaultDurationDays` from template steps when computing planned dates |
| Dependency UI | Visual dependency graph using `dependencyIds` + `validateMilestoneDependenciesMet` |
| Initiative close gate | Optional rule: all milestones completed/skipped before close |
| KPI dashboard | Read milestone completion rates per venture — no inferred phases |

---

## Intentionally Deferred

- **Drag-and-drop reorder** — sequence API and ↑/↓ buttons implemented; native DnD UI not built
- **Template edit/delete UI** — templates can be created and listed; inline edit/delete not exposed
- **Mark Ready** as separate UI action — domain supports `markReady`; UI uses Start from planned/ready
- **Marketplace visibility** — domain constant only; blocked in validation
- **Firestore delete for templates** — follows BOS no-delete pattern
- **Integration tests for milestone repos** — converter checks added; emulator integration tests not expanded in this pass

---

## Verification

- `npm run build` — passes
- `npm run bos:validate` — milestone/template converter and domain checks included in `runConverterChecks.ts`

---

## Deploy Checklist

1. Deploy Firestore rules: `firebase deploy --only firestore:rules`
2. Deploy indexes: `firebase deploy --only firestore:indexes`
3. Grant new BOS milestone permissions to founder/operator roles as needed

---

*Generated as part of the Milestone System implementation — initiative-driven, evidence-based, template-ready.*
