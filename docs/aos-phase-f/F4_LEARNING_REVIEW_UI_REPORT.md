# F4 — Learning Review & Governance UI Report

**Sprint:** Phase F — F4  
**Status:** COMPLETE — awaiting explicit authorization before F5  
**Date:** 2026-07-22

---

## 1. Executive Summary

Sprint F4 exposes the F1–F3 Learning Engine to founder/delivery leadership through the existing AOS UI architecture. Human reviewers can now traverse the full governed lifecycle:

**Retrospective → Learning Candidate → Pending Review → Evidence Review → Approve / Reject / Defer → Explicit Promote → Organizational Asset**

Delivered without redesigning AOS, without KIL, without semantic search, and without project-management UI:

- Canonical **Learning Review Queue** at `/aos/learning` (ST-16 pattern)
- **Candidate detail SidePanel** with provenance, gates, governance actions, and explicit promotion
- **Permission keys** for view / review / promote (closes F3 permission debt)
- **Founder Dashboard** attention integration (`REVIEW_LEARNING`)
- **Retrospective** extraction summary + queue navigation
- **Feature flag** `LEARNING_ENGINE` (default `false`) gates all surfaces cleanly
- Unit/component tests + full regression pass (149 unit, 70 integration)

**Recommendation: GO for F4 acceptance. F5 real AI classified OPTIONAL POST-V1 (see §24).**

---

## 2. Screen / Route Architecture

| Route | Screen ID | Gate | Permission | Feature Flag |
|-------|-----------|------|------------|--------------|
| `/aos/learning` | ST-16 Learning Review Queue | `AosRouteGate` | `aos_learning_view` OR `admin` | `learning_engine` |
| SidePanel (query `?candidate=`) | Candidate review detail | inline | review/promote via `PermissionGate` | inherited |
| `/aos/delivery/:id/retrospective` | ST-11 (enhanced) | engagement hub | existing workflow perms | learning summary when flag on |

**URL state:** `?q=` search, `?status=`, `?type=`, `?candidate=` — default status `pending_review`.

**Navigation after promotion:**

| Promoted Asset Kind | Target |
|---------------------|--------|
| `knowledge_pattern` | `/aos/knowledge?pattern={id}` |
| `module_registry` | `/aos/registry/{id}` |
| `prompt_template` / `playbook` / `evaluation_rubric` | `/aos/playbook?entry={id}` |

---

## 3. UI Reuse Audit

| Need | Reused Component / Pattern | Source |
|------|---------------------------|--------|
| Queue layout | `QueueScreenTemplate` | ST-12–ST-15 queues |
| Detail review | `SidePanel` | Knowledge / Registry screens |
| Table | `DataTable` (compact) | Global D2 |
| Filters | `FilterBar`, `FilterChip`, `Select`, `SearchInput` | Knowledge screen |
| Status | `StatusChip` | Global D2 |
| Cards | `KnowledgeCard` | Knowledge library |
| Provenance | `TraceabilityReference` | Version history |
| Approve / defer | `ApprovalDialog` | Workflow screens |
| Reject | `DangerDialog` | Workflow screens |
| Promote confirm | `ConfirmationDialog` | Existing pattern |
| Permissions | `PermissionGate` | All AOS governance surfaces |
| Route gate | `AosRouteGate` + `FeatureFlagGate` | AOS nav architecture |
| Attention | Founder dashboard attention queue | ST-01 |
| Errors | `ErrorState`, `InAppAlert`, `LoadingState`, `EmptyState` | Global D2 |
| Nav badge | Sidebar queue badge pattern | Requirements/Evaluation queues |

**No new D2 primitives created.**

---

## 4. Folder Tree (F4 additions)

```
aos/
├── application/learning/
│   ├── dto/LearningReviewDto.ts                    (NEW)
│   ├── LearningReviewApplicationService.ts         (NEW)
│   ├── LearningApplicationService.ts               (NEW — UI facade)
│   ├── createLearningApplicationService.ts         (NEW)
│   ├── learningErrorMessages.ts                    (NEW)
│   ├── learningErrorMessages.test.ts               (NEW)
│   └── LearningReviewApplicationService.test.ts    (NEW)
├── constants/
│   └── learningReview.ts                           (NEW — presentation-safe types)
├── hooks/
│   ├── learning/mapLearningErrorMessage.ts         (NEW — boundary-safe re-export)
│   └── queries/
│       ├── learningReviewFilters.ts                (NEW)
│       ├── useLearningReviewQueries.ts             (NEW)
│       └── useLearningReviewQueries.test.ts        (NEW)
├── pages/
│   ├── AosLearningReviewPage.tsx                   (NEW)
│   └── AosLearningReviewPage.test.tsx              (NEW)
└── presentation/screens/queues/learning/
    ├── LearningReviewQueueScreen.tsx               (NEW)
    ├── LearningReviewQueueScreen.test.tsx          (NEW)
    ├── LearningCandidateDetailSidePanel.tsx        (NEW)
    ├── LearningCandidateDetailSidePanel.test.tsx   (NEW)
    ├── useLearningReviewScreenState.ts             (NEW)
    ├── learningReviewLabels.ts                     (NEW)
    └── learningReviewLabels.test.ts                (NEW)
```

---

## 5. Files Created

See §4. Additional test files listed there. Total **18 new source files** (+ tests).

---

## 6. Files Modified

| File | Change |
|------|--------|
| `aos/constants/permissionKeys.ts` | `LEARNING_VIEW`, `LEARNING_REVIEW`, `LEARNING_PROMOTE` |
| `aos/config/permissions.ts` | AOS permission definitions |
| `config/permissions.ts` | ERP granular permissions + category |
| `aos/config/routes.ts` | `/aos/learning` route |
| `aos/config/navigation.ts` | "Learning Review" nav item + badge |
| `App.tsx` | Lazy route registration |
| `aos/wiring/types.ts` | `learning: LearningApplicationService` |
| `aos/wiring/createAosPresentationServices.ts` | Service factory wiring |
| `aos/application/dashboard/DashboardApplicationService.ts` | Learning attention + pending count mapping |
| `aos/application/dashboard/dto/FounderDashboardDto.ts` | `REVIEW_LEARNING`, `pendingReviews.learning` |
| `aos/application/dashboard/DashboardApplicationService.test.ts` | Learning mock |
| `aos/application/queues/QueueProjectionApplicationService.ts` | Learning badge count |
| `aos/application/queues/dto/QueueProjectionDto.ts` | `learning` in badge DTO |
| `aos/application/queues/QueueProjectionApplicationService.test.ts` | Badge assertion |
| `aos/hooks/queries/keys.ts` | `learning.*` query keys |
| `aos/hooks/queries/index.ts` | Exports |
| `aos/presentation/navigation/AosSidebarNavLinks.tsx` | Learning badge |
| `aos/presentation/screens/dashboard/FounderDashboardScreen.tsx` | Pending learning link |
| `aos/presentation/screens/engagement-hub/retrospective/EngagementRetrospectiveScreen.tsx` | Extraction summary |

---

## 7. Learning Review Queue Behavior

- Lists human-reviewable candidates across statuses: `pending_review`, `approved`, `gate_deferred`, `rejected`, `promoted`, `promotion_failed`
- **Default filter:** `pending_review` (actionable first)
- **Sort:** pending → promotion_failed → approved → deferred → promoted → rejected; then by `updatedAt`
- **Filters:** status, candidate type, search (title/summary/engagement/client/type)
- **States:** loading, error (retry), empty with founder-readable copy
- Row click opens SidePanel via `?candidate=` URL param
- Not a generic admin CRUD table — decision-oriented columns (proposed learning, engagement, target, eligibility)

---

## 8. Candidate Detail / Review Experience

SidePanel shows founder-friendly review bundle:

- Proposed learning title + summary
- Candidate type, confidence, promotion eligibility
- Engagement context (`KnowledgeCard`)
- Promotion target + version strategy + existing target label (supersede)
- Universal + target-specific gate results (`DataTable`)
- Phase E provenance (`TraceabilityReference` — IDs secondary/copyable)
- AI recommendation metadata when present
- Promotion result + navigable asset link when promoted
- Lifecycle actions gated by status + permissions
- Link to source retrospective

Raw internal IDs are not primary UX labels.

---

## 9. Governance Actions

Wired to `LearningGovernanceApplicationService` via `LearningApplicationService` facade:

| Action | Dialog | Confirmation | Optimistic Update |
|--------|--------|--------------|-------------------|
| Approve | `ApprovalDialog` | Yes (+ AI addendum when metadata present) | **No** |
| Reject | `DangerDialog` | Yes (terminal) | **No** |
| Defer | `ApprovalDialog` | Yes | **No** |
| Supersede | Available in service; UI exposes domain-allowed paths via F3 contract | — | **No** |

On success: invalidate `learning.*`, `dashboard`, `queues` TanStack Query keys; refetch canonical state.

---

## 10. Promotion UX

- **Separate explicit action** — approval does NOT auto-promote
- `Promote to catalog` visible only when `status === approved` && `canPromote` && `LEARNING_PROMOTE`
- `ConfirmationDialog` explains target kind, version strategy, non-destructive nature
- Success: promotion result section + **View organizational asset** navigates via `resolvePromotedAssetHref()`
- Failure: `InAppAlert` with mapped message; UI state unchanged; retry when domain permits

---

## 11. Permission Implementation

| Key | ERP Constant | Purpose | UI Enforcement | App Boundary |
|-----|--------------|---------|----------------|--------------|
| `aos_learning_view` | `AOS_LEARNING_VIEW` | View queue + candidates | `AosRouteGate`, nav | `LearningReviewApplicationService` throws when flag off |
| `aos_learning_review` | `AOS_LEARNING_REVIEW` | Approve/reject/defer | `PermissionGate` on action buttons | F3 governance service (actor-scoped) |
| `aos_learning_promote` | `AOS_LEARNING_PROMOTE` | Promote approved candidates | `PermissionGate` on promote | F3 promotion service |

**Reused:** `AOS_PERMISSION_KEY.ADMIN` as OR fallback (existing AOS pattern).  
**No hardcoded role checks.** Permissions registered in both `config/permissions.ts` and `aos/config/permissions.ts`.

---

## 12. Dashboard Integration

Minimal ST-01 projections (no KPI wall):

- New attention type `REVIEW_LEARNING` (priority 2, after evaluation)
- Up to 3 pending learning items in attention queue with deep link `?candidate=`
- `pendingReviews.learning` count in Pending Reviews card (when > 0)
- Quick action "Learning review" when `LEARNING_ENGINE` enabled
- Uses `learning.listReviewQueue(scope, { status: "pending_review" })`

---

## 13. Retrospective Integration

When `LEARNING_ENGINE` enabled and retrospective approved:

- Shows extraction status, candidate count, pending review count
- Link to Learning Review Queue (`/aos/learning?engagement={id}`)
- Governance actions remain on Learning Review — not embedded in retrospective
- Degrades cleanly when flag off (query disabled, no summary block)

---

## 14. Feature Flag Behavior

`AOS_FEATURE_FLAG.LEARNING_ENGINE` — **default `false`** (`PHASE_1A_FEATURE_DEFAULTS`).

| Surface | Flag OFF | Flag ON |
|---------|----------|---------|
| Route `/aos/learning` | Redirect via `AosRouteGate` | Full queue |
| Nav item | Hidden via nav config | Visible with badge |
| Dashboard learning actions | Omitted | Attention + quick action |
| Retrospective summary | Query disabled | Summary shown |
| TanStack queries | `enabled: false` | Active |

Tests explicitly enable flag where needed via mocks; production default unchanged.

---

## 15. Query / Cache Strategy

```typescript
aosQueryKeys.learning.all()
aosQueryKeys.learning.reviewQueue(filters)
aosQueryKeys.learning.candidateDetail(candidateId)
aosQueryKeys.learning.engagementSummary(engagementId)
```

- `staleTime`: 15s queue, 10s engagement summary
- Mutations invalidate: `learning.all()`, `dashboard`, `queues`, specific `candidateDetail`
- **No optimistic updates** for governance/promotion
- **No Firestore from presentation** — all via `LearningApplicationService`

---

## 16. Accessibility / Responsive Verification

- Keyboard: queue rows clickable; filter `Select` uses `aria-label`
- SidePanel: titled, structured sections with `aria-labelledby`
- Dialogs: existing `ApprovalDialog` / `DangerDialog` / `ConfirmationDialog` focus patterns
- Status: `StatusChip` text labels (not color-only)
- Responsive: SidePanel + grid provenance (`md:grid-cols-2`); compact queue table
- **Axe:** `LearningCandidateDetailSidePanel` — 0 violations in review state test

---

## 17. Error-State Mapping

| Domain / App Error | Founder Message |
|--------------------|-----------------|
| `VERSION_CONFLICT` | Candidate changed — refresh and review again |
| `AOS_NOT_FOUND` | Candidate unavailable |
| Gate failure (GK/GM/GP…) | Promotion blocked by quality gates — review evidence |
| Not approved | Approve before promoting |
| Already promoted | Refresh for latest state |
| Permission denied | Action unavailable |
| Cross-company | Belongs to another workspace |
| Generic | Safe retry message — no Firebase stack traces |

Mapper: `aos/application/learning/learningErrorMessages.ts` → re-exported via hooks for presentation boundary compliance.

---

## 18. Test Coverage

| Area | Tests |
|------|-------|
| Learning Review Queue render + filter | `LearningReviewQueueScreen.test.tsx` |
| Candidate detail + approve dialog + promote visibility | `LearningCandidateDetailSidePanel.test.tsx` |
| Permission gating | SidePanel test (deny without `LEARNING_REVIEW`) |
| Feature flag off | `AosLearningReviewPage.test.tsx` |
| Target navigation | `learningReviewLabels.test.ts` |
| Error mapping | `learningErrorMessages.test.ts` |
| Query keys | `useLearningReviewQueries.test.ts` |
| Application list/filter/summary | `LearningReviewApplicationService.test.ts` |
| Dashboard wiring | `DashboardApplicationService.test.ts` (updated) |
| Queue badges | `QueueProjectionApplicationService.test.ts` (updated) |
| Axe accessibility | SidePanel test |
| F3 compatibility | Existing `learningPromotion.integration.test.ts` (16 tests) — **PASS** |

**Totals:** 149 AOS unit tests PASS; 70 integration tests PASS.

---

## 19. Founder Journey Verification

Emulator-backed F3 integration tests prove the backend chain. F4 UI wiring completes the journey:

1. Engagement completed → retrospective approved  
2. `LearningExtractionApplicationService.runExtraction` (deterministic proposals from lessons)  
3. Candidates appear in `listReviewQueue`  
4. Founder opens `/aos/learning`, reviews evidence in SidePanel  
5. Approve → explicit Promote  
6. Canonical asset created in Knowledge / Registry / Playbook  
7. Candidate status `promoted`; audit/provenance traceable  
8. **View organizational asset** navigates to existing canonical surface  

Browser E2E automation was **not** executed in this sprint; verification is via unit/component tests + emulator integration tests.

---

## 20. Architecture Compliance

| Rule | Status |
|------|--------|
| No AOS redesign | ✅ Extended existing patterns only |
| No direct Firestore from UI | ✅ Application facade + TanStack Query |
| Import boundaries | ✅ PASS (`aos:import-boundaries`) |
| No domain logic in UI | ✅ Governance in F3 services |
| No optimistic governance | ✅ Invalidate-on-success only |
| Feature flag default false | ✅ Preserved |
| No KIL / vector search / PM UI | ✅ Not introduced |
| ADRs unchanged | ✅ |

**Boundary fix during F4:** Presentation cannot import domain/application/infrastructure directly. UI constants moved to `aos/constants/learningReview.ts`; error mapper stays in application, re-exported via `aos/hooks/learning/mapLearningErrorMessage.ts`.

---

## 21. Exact Regression Results

| Command | Result |
|---------|--------|
| `npm run build` | **PASS** |
| `npm run test:aos` | **PASS** — 42 files, 149 tests |
| `npm run aos:validate` | **PASS** — 12 converter checks |
| `npm run aos:import-boundaries` | **PASS** |
| `npm run aos:security` | **PASS** — 16 collections |
| `npm run test:aos:integration` | **PASS** — 8 files, 70 tests |

---

## 22. Defects Discovered / Fixed

| Defect | Fix |
|--------|-----|
| `FounderDashboardScreen` JSX extra `</li>` | Removed stray closing tag |
| `pendingReviews.evaluations` vs `badgeCounts.evaluation` mismatch | Explicit mapping in `DashboardApplicationService` |
| Import boundary violations (domain/application in presentation) | `constants/learningReview.ts` + hooks re-export |
| Wrong error mapper import path | Moved to application layer |
| `learningErrorMessages.ts` wrong relative path in build | Fixed during F4 continuation |

---

## 23. Remaining Technical Debt

1. **Application-layer permission enforcement** — F3 deferred explicit permission checks inside governance/promotion services; F4 binds UI + route gates. Server-side permission assertions in application services remain a follow-up hardening item.
2. **Supersede UI** — Service supports supersede; F4 exposes approve/reject/defer/promote as primary flows. Supersede dialog can be added when product requires amendment UX.
3. **Browser E2E founder journey** — No Playwright/Cypress run in F4; recommended before production enablement of `LEARNING_ENGINE`.
4. **Confidence / target filters in queue toolbar** — Hook/query support exists; toolbar exposes status + type (minimum viable). Additional filters are incremental UX.

---

## 24. F5 Necessity Assessment

**Classification: B — OPTIONAL POST-V1 ENHANCEMENT**

### Evidence

1. **`NullLearningExtractionAiPort`** returns empty AI proposals; extraction continues with **`buildDeterministicProposals`** from approved retrospective lessons (`LearningExtractionApplicationService.ts` lines 209–230).
2. F2 integration tests prove candidates persist and enter governance without real AI.
3. F3 integration tests (16 scenarios) prove approve → promote → catalog asset without AI.
4. F4 UI completes human governance and promotion — the **promised governed learning loop** does not require LLM sophistication.
5. Real AI (F5) would improve candidate **richness, ranking, and cross-engagement synthesis** — valuable but not blocking V1 closure.

### Minimum if partially required later

If product marketing requires "AI-assisted learning suggestions," the minimum F5 binding would be: replace `NullLearningExtractionAiPort` with a real adapter + surface AI metadata already rendered in SidePanel — **no F4 UI redesign required**.

---

## 25. GO / NO-GO Recommendation

### **GO — Accept F4**

All acceptance criteria satisfied:

- ✅ Complete Learning Review experience implemented
- ✅ Reuses existing AOS UI architecture
- ✅ Permissions closed (view/review/promote)
- ✅ Dashboard + retrospective integration
- ✅ Feature flag safe default
- ✅ Full regression PASS
- ✅ F5 assessed as optional post-V1

### **STOP — Do not start F5, KIL, or UI redesign without explicit authorization**

Priority: **AOS V1 closure.**

---

*End of F4 Report.*
