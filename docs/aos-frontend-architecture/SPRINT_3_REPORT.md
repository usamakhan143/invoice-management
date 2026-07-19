# Sprint 3 Report — M7–M12 Founder Workflow (ST-05 → ST-11)

**Stage D2 — Sprint 3**  
**Date:** July 19, 2026  
**Status:** Complete  
**Next:** M13 (ST-12–15 Queues) — **not started**  
**Explicitly deferred:** Registry, Knowledge, Dashboard (M14–M16)

---

## Executive Summary

Sprint 3 implements the **continuous founder workflow** inside the Engagement Hub as one orchestrated path — not seven isolated modules:

**Requirements → Reuse → Prompt Pack → Cursor Session → Evaluation → QA → Retrospective**

All seven tab screens (ST-05 through ST-11) share `useEngagementWorkflowScreen`, `workflowGates`, and the same Sprint 1/2 layout and gate patterns. Sprint 3 also adds the Sprint 1–deferred engagement/AI catalog components (C-023, C-030–C-035, C-040–C-045, C-050–C-054) and a **presentation-facing workflow application layer** backed by an in-memory store (no domain, repository, or Firestore changes).

| Verification | Result |
|--------------|--------|
| `npm run build` | PASS |
| `npm run test:aos` | PASS — 15 files, 47 tests |
| `npm run aos:validate` | PASS — 7 converter checks |

---

## 1. Workflow Validation

### Sequential gate chain

| Step | Gate flag | Unlocks |
|------|-----------|---------|
| ST-05 Requirements | `requirementsApproved` | Reuse tab |
| ST-06 Reuse | `reuseRecorded` | Prompts tab |
| ST-07 Prompt Pack | `promptPackApproved` | Cursor tab |
| ST-08 Cursor Session | `cursorSubmitted` | Evaluation tab |
| ST-09 Evaluation | `evaluationPassed` | QA tab |
| ST-10 QA / Handoff | `qaComplete` | Retrospective tab |
| ST-11 Retrospective | `retrospectiveComplete` | Workflow complete |

### Orchestration artifacts

| Artifact | Role |
|----------|------|
| `workflowGates.ts` | Tab enable/disable + pending indicators + `getNextWorkflowStepHref()` |
| `useEngagementWorkflowScreen.ts` | Shared query + mutations for all ST-05–ST-11 screens |
| `EngagementWorkflowApplicationService` | Single service for all workflow steps; advances delivery lifecycle via existing `delivery.advanceLifecycle()` |
| `EngagementHubLayoutScreen` | Gate chips, tab gating, lifecycle badge |
| `EngagementOverviewScreen` | Workflow timeline + “Continue to …” CTA |

### Continuous UX pattern

Each step screen follows the same Sprint 2 screen pattern:

1. Load workflow via shared hook  
2. Show `LoadingState` / `ErrorState` / gated `EmptyState`  
3. Primary action (generate, approve, submit)  
4. **StickyFooterBar** “Continue to [next step]” after gate satisfaction  
5. Navigate to next tab route on continue  

### Automated validation

| Test | Coverage |
|------|----------|
| `workflowGates.test.ts` | Tab lock order; next-href resolution |
| `EngagementWorkflowApplicationService.test.ts` | Full ST-05→ST-11 gate chain in one flow |
| `createAosPresentationServices.test.ts` | Workflow service wired alongside delivery |

---

## 2. Screens Implemented

| ST | Screen | Path | Route segment |
|----|--------|------|---------------|
| ST-05 | `EngagementRequirementsScreen` | `engagement-hub/requirements/` | `requirements` |
| ST-06 | `EngagementReuseScreen` | `engagement-hub/reuse/` | `reuse` |
| ST-07 | `EngagementPromptsScreen` | `engagement-hub/prompts/` | `prompts` |
| ST-08 | `EngagementCursorScreen` | `engagement-hub/cursor/` | `cursor` |
| ST-09 | `EngagementEvaluationScreen` | `engagement-hub/evaluation/` | `evaluation` |
| ST-10 | `EngagementQaScreen` | `engagement-hub/qa/` | `qa` |
| ST-11 | `EngagementRetrospectiveScreen` | `engagement-hub/retrospective/` | `retrospective` |

### Updated (not new routes)

| Screen | Changes |
|--------|---------|
| `EngagementHubLayoutScreen` | Workflow query, gate chips, tab `disabled`/`title`, `LifecycleBadge` |
| `EngagementOverviewScreen` | Workflow status, gate chips, continue navigation |
| `App.tsx` | Lazy routes renamed from `*Placeholder` to real screen components |

### Removed

Obsolete skeleton placeholders (`EngagementRequirementsPlaceholder`, etc.) — replaced by real screens.

---

## 3. Folder Tree (Sprint 3 additions)

```
aos/
├── application/
│   └── workflow/                          (NEW — presentation-facing workflow layer)
│       ├── dto/EngagementWorkflowDto.ts
│       ├── EngagementWorkflowApplicationService.ts
│       ├── EngagementWorkflowApplicationService.test.ts
│       ├── EngagementWorkflowStore.ts
│       └── index.ts
├── infrastructure/
│   └── memory/
│       └── EngagementWorkflowMemoryStore.ts (NEW — in-memory persistence)
├── hooks/queries/
│   ├── useEngagementWorkflowQuery.ts        (NEW)
│   └── keys.ts                              (UPDATED — workflow query key)
├── wiring/
│   ├── createAosPresentationServices.ts     (UPDATED — delivery + workflow)
│   └── types.ts                             (UPDATED)
└── presentation/
    ├── providers/AosProviders.tsx           (UPDATED — ToastProvider)
    ├── ui/
    │   ├── ai/AiComponents.tsx              (NEW — C-030–C-035)
    │   └── engagement/EngagementComponents.tsx (NEW — C-023, C-040–C-045, C-050–C-054)
    └── screens/engagement-hub/
        ├── workflowGates.ts                 (NEW)
        ├── workflowGates.test.ts            (NEW)
        ├── useEngagementWorkflowScreen.ts   (NEW)
        ├── requirements/EngagementRequirementsScreen.tsx
        ├── reuse/EngagementReuseScreen.tsx
        ├── prompts/EngagementPromptsScreen.tsx
        ├── cursor/EngagementCursorScreen.tsx
        ├── evaluation/EngagementEvaluationScreen.tsx
        ├── qa/EngagementQaScreen.tsx
        └── retrospective/EngagementRetrospectiveScreen.tsx
```

---

## 4. Reuse Percentage

| Metric | Value |
|--------|-------|
| Sprint 1+2 foundation components available | 45 catalog IDs + 5 layouts + 3 gates |
| Sprint 1+2 components used in Sprint 3 screens | **32 of 45** catalog IDs (**71%**) |
| Sprint 1 layouts/gates reused | **8 of 8** required (**100%**) |
| New Sprint 3 catalog components (C-xxx) | **17** (see §5) |
| Duplicate UI components created | **0** |
| Duplicate layouts/dialogs/tables | **0** |

**Interpretation:** Sprint 3 achieves **100% reuse compliance** — every primitive comes from the Sprint 1 library or new catalog IDs defined for M7+. No parallel button/dialog/table implementations. The 71% catalog utilization reflects Sprint 1 components reserved for ST-12+ queues and global pages (FilterBar, Pagination, DangerDialog, etc.) not yet needed in the founder workflow.

---

## 5. Component Reuse Matrix

### Sprint 3 new catalog components

| ID | Component | File |
|----|-----------|------|
| C-023 | WaitingStatePanel | `ui/engagement/EngagementComponents.tsx` |
| C-030 | AiDraftPanel | `ui/ai/AiComponents.tsx` |
| C-031 | ApprovalPanel | `ui/ai/AiComponents.tsx` |
| C-032 | ContextPanel | `ui/ai/AiComponents.tsx` |
| C-033 | EvidencePanel | `ui/ai/AiComponents.tsx` |
| C-034 | AiExplainBlock | `ui/ai/AiComponents.tsx` |
| C-035 | AiConfidenceIndicator | `ui/ai/AiComponents.tsx` |
| C-040 | RequirementCard | `ui/engagement/EngagementComponents.tsx` |
| C-041 | PromptCard | `ui/engagement/EngagementComponents.tsx` |
| C-042 | CursorSessionCard | `ui/engagement/EngagementComponents.tsx` |
| C-043 | EvaluationCard | `ui/engagement/EngagementComponents.tsx` |
| C-044 | KnowledgeCard | `ui/engagement/EngagementComponents.tsx` |
| C-045 | RegistryCard | `ui/engagement/EngagementComponents.tsx` |
| C-050 | LifecycleBadge | `ui/engagement/EngagementComponents.tsx` |
| C-051 | StatusChip | `ui/engagement/EngagementComponents.tsx` |
| C-052 | GateChip | `ui/engagement/EngagementComponents.tsx` |
| C-053–C-054 | Timeline / TimelineEvent | `ui/engagement/EngagementComponents.tsx` |
| — | HandoffStrip | `ui/engagement/EngagementComponents.tsx` (pattern, no C-ID) |

### Sprint 1+2 components × workflow screens

| Component | ID | ST-05 | ST-06 | ST-07 | ST-08 | ST-09 | ST-10 | ST-11 | Hub |
|-----------|-----|-------|-------|-------|-------|-------|-------|-------|-----|
| Button | C-001 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| LinkButton | C-004 | — | — | — | — | — | ✓ | — | — |
| FormField | C-005 | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| TextArea | C-007 | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| Checkbox | C-010 | — | — | — | — | — | ✓ | — | — |
| DataTable | C-012 | — | — | — | — | ✓ | — | — | — |
| ApprovalDialog | C-072 | ✓ | — | ✓ | — | — | ✓ | ✓ | — |
| ConfirmationDialog | C-071 | — | — | — | ✓ | — | — | — | — |
| SidePanel | C-063 | ✓ | — | — | — | — | — | — | — |
| InAppAlert | C-075 | — | — | — | — | ✓ | — | — | ✓ |
| EmptyState | C-080 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — |
| LoadingState | C-081 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ErrorState | C-082 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| useToast | C-074 | — | — | ✓ | — | — | — | — | — |
| PageShell | — | — | — | — | — | — | — | — | ✓ |
| PageHeader | — | — | — | — | — | — | — | — | ✓ |
| ContextBanner | — | — | — | — | — | — | — | — | ✓ |
| StickyFooterBar | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| EngagementTabBar | C-061 | — | — | — | — | — | — | — | ✓ |
| PermissionGate | C-090 | ✓ | — | ✓ | ✓ | — | — | — | — |
| FeatureFlagGate | C-091 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| LockedOverlay | C-092 | ✓ | — | — | — | — | — | — | — |

---

## 6. New Hooks & Application Artifacts

| Hook / Service | Type | Purpose |
|----------------|------|---------|
| `useEngagementWorkflowQuery` | Query hook | TanStack Query → `workflow.getWorkflow` |
| `useEngagementWorkflowMutations` | Mutation bundle | 14 workflow mutations with shared invalidation |
| `useEngagementWorkflowScreen` | Screen hook | Shared ST-05–ST-11 wiring (query + mutations + engagementId) |
| `EngagementWorkflowApplicationService` | Application service | Generate/approve/submit for all workflow steps |
| `EngagementWorkflowMemoryStore` | Infrastructure | In-memory Map store (Phase 1A stub) |
| `EngagementWorkflowDto` | DTO | Workflow snapshot + gate flags + artifacts |

**Query key added:** `aosQueryKeys.deliveries.workflow(engagementId)`

---

## 7. ST-05 → ST-11 Feature Coverage

| ST | Primary flow | Key components |
|----|--------------|----------------|
| ST-05 | Generate AI draft → edit → approve requirements | AiDraftPanel, RequirementCard, ApprovalDialog, LockedOverlay |
| ST-06 | Run reuse assessment → accept modules → record decisions | RegistryCard, WaitingStatePanel |
| ST-07 | Generate prompt pack → approve → copy handoff | PromptCard, HandoffStrip, useToast |
| ST-08 | Start session → submit capture | CursorSessionCard, ConfirmationDialog |
| ST-09 | Run evaluation → review evidence | EvaluationCard, EvidencePanel, DataTable |
| ST-10 | QA checklist → approve handoff | Checkbox, ApprovalDialog |
| ST-11 | Generate retrospective → approve close | KnowledgeCard, Timeline, RegistryCard |

All screens: `FeatureFlagGate`, `LoadingState`, `ErrorState`, `StickyFooterBar` continue pattern.

---

## 8. Bundle Impact

| Chunk | Sprint 2 | Sprint 3 | Delta |
|-------|----------|----------|-------|
| `index-*.js` (main) | 1,118 kB | **1,133 kB** | +15 kB |
| `AosEngagementHubPage` | 5.2 kB | **5.6 kB** | +0.4 kB |
| `EngagementContextProvider` | — | **8.6 kB** | new shared chunk |
| `AiComponents` | — | **3.4 kB** | shared AI primitives |
| `EngagementRequirementsScreen` | placeholder | **6.2 kB** | lazy |
| `EngagementPromptsScreen` | placeholder | **2.8 kB** | lazy |
| `EngagementCursorScreen` | placeholder | **3.4 kB** | lazy |
| `EngagementReuseScreen` | placeholder | **2.6 kB** | lazy |
| `EngagementEvaluationScreen` | placeholder | **2.3 kB** | lazy |
| `EngagementQaScreen` | placeholder | **2.2 kB** | lazy |
| `EngagementRetrospectiveScreen` | placeholder | **2.7 kB** | lazy |
| `useEngagementWorkflowScreen` | — | **0.3 kB** | shared hook chunk |

**Observations:**

- Workflow screens remain **lazy-loaded** per tab; main bundle growth is modest (+15 kB).
- Shared `AiComponents` chunk deduplicates AI panels across Requirements, Prompts, and Retrospective.
- `EngagementContextProvider` chunk includes workflow service wiring pulled in by hub layout.
- Total lazy workflow tab payload ≈ **22 kB** (minified, pre-gzip).

---

## 9. Accessibility

| Area | Coverage |
|------|----------|
| Tab gating | Disabled tabs expose `title` with unlock reason via `EngagementTabBar` |
| Gate chips | Clickable when enabled; visual satisfied/pending states |
| Approval flows | `ApprovalDialog` retains Sprint 1 focus trap + labelled note field |
| QA checklist | Native `Checkbox` with associated labels |
| Loading / error | `role="status"` / `role="alert"` from Sprint 1 state components |
| Continue actions | Primary footer actions in consistent tab order via `StickyFooterBar` |
| Toast (ST-07) | `ToastProvider` at AOS root; copy-prompt feedback announced |

### Tests added (Sprint 3)

- `workflowGates.test.ts`
- `EngagementWorkflowApplicationService.test.ts`

---

## 10. Performance

| Concern | Mitigation |
|---------|------------|
| Tab code-splitting | Each ST-05–ST-11 screen is `React.lazy` in `App.tsx` |
| Shared hook chunk | `useEngagementWorkflowScreen` extracted to 0.3 kB shared module |
| Query caching | Single `useEngagementWorkflowQuery` key per engagement; mutations invalidate once |
| In-memory store | No network latency for workflow steps (Phase 1A stub) |
| Re-render scope | Screens consume shared hook; hub layout reads same query (TanStack dedupe) |

---

## 11. Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Screens call hooks; UI components remain dumb | PASS | |
| No Firestore in presentation | PASS | |
| No domain entity changes | PASS | Workflow DTOs in application layer only |
| No repository / Firestore redesign | PASS | Memory store is new infrastructure stub |
| Frozen architecture workflow order | PASS | Sequential gates enforced |
| Pages remain thin adapters | PASS | No page changes required |
| Import boundaries (presentation → application DTO) | PASS | `workflowGates.ts` imports DTO type only |
| No duplicate UI | PASS | |

**Explicit Sprint 3 boundary:** `EngagementWorkflowApplicationService` is a **presentation-period application stub** until frozen domain repositories exist for Requirements, Prompt, Cursor, Evaluation, and Knowledge domains. It does not modify delivery domain entities beyond calling existing `advanceLifecycle()`.

---

## 12. Technical Debt Introduced

| Item | Severity | Description |
|------|----------|-------------|
| In-memory workflow store | **High** | Workflow artifacts reset on page refresh; not production-durable |
| Stub application service | **Medium** | No real AI/registry/knowledge backends; seeded mock data |
| No optimistic mutation rollback tests | Low | Mutations await server (memory) — no optimistic UI |
| `EngagementTabPlaceholder` retained | Low | Unused helper; safe to remove in cleanup sprint |
| Client-only gate enforcement | Low | Tab disable is UX-only until route guards added |
| No E2E workflow test | Medium | Unit/service tests only; browser E2E deferred |

---

## 13. Known Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Workflow data loss on refresh | High | Expected until Firestore workflow repositories ship |
| Lifecycle advance without persisted artifacts | Medium | `advanceLifecycle()` called with computed refs from memory snapshot |
| Permission keys partially enforced | Low | Only ST-05/07/08 use `PermissionGate`; others open to founders |
| Registry/Knowledge cards show mock modules | Low | Visual placeholders until M14+ |
| Shared mutation bundle size | Low | 14 mutations in one hook — acceptable for Phase 1A |

---

## 14. Remaining Milestones (Not Started)

| Milestone | Scope | Status |
|-----------|-------|--------|
| M13 | ST-12–15 Queues | Not started |
| M14 | Registry | **Deferred per Sprint 3 stop rule** |
| M15 | Knowledge | **Deferred per Sprint 3 stop rule** |
| M16 | Dashboard | **Deferred per Sprint 3 stop rule** |
| — | Firestore workflow repositories | Not started (domain/infrastructure) |
| — | E2E founder workflow | Not started |

---

## 15. Verification Log

```
npm run build          → PASS (29.9s)
npm run test:aos       → PASS — 15 files, 47 tests (23.6s)
npm run aos:validate   → PASS — 7 converter checks
Placeholder routes     → REMOVED — real screens wired in App.tsx
```

---

## 16. Sign-off

| Milestone | Screen | Status |
|-----------|--------|--------|
| M7 | ST-05 Requirements | Complete |
| M8 | ST-07 Prompt Pack | Complete |
| M9 | ST-08 Cursor Session | Complete |
| M10 | ST-09 Evaluation | Complete |
| M11 | ST-06 Reuse | Complete |
| M12 | ST-10 QA + ST-11 Retrospective | Complete |

**Sprint 3 complete. STOP — Registry, Knowledge, and Dashboard not started.**
