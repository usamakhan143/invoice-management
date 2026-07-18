# 31 — Component Architecture

**Stage D1.6 — AOS Frontend Engineering Freeze**  
**Status:** Frozen  
**Grounding:** Design System C-xxx catalog, Design Freeze ST-xx templates

---

## Purpose

Define **atomic hierarchy**, smart vs dumb split, ownership, composition, providers, and lifecycle — so every component has one home and one job.

---

## Atomic Hierarchy

| Tier | Name | Location | Maps to | Examples |
|------|------|----------|---------|----------|
| **L0** | Token / theme | `aos/theme/` | Design tokens | CSS variables — not React |
| **L1** | Primitives | `presentation/ui/primitives/` | C-001–C-018, C-080–C-083 | Button, TextInput, SkeletonBlock |
| **L2** | Composites | `presentation/ui/composites/` | C-020–C-076 | AttentionQueue, AiDraftPanel, DataTable |
| **L3** | Layouts | `presentation/layouts/` | Layout system | PageShell, PageHeader, StickyFooterBar |
| **L4** | Gates | `presentation/gates/` | C-090–C-092 | PermissionGate, FeatureFlagGate |
| **L5** | Screens | `presentation/screens/` | ST-xx | `DashboardScreen`, `DeliveryListScreen` |
| **L6** | Routes | `aos/pages/` | App.tsx lazy imports | `AosDashboardPage` |

**Rule:** Higher tier may compose lower; lower never imports higher.

---

## Smart vs Dumb Components

### Dumb (Presentational) — Default for L1–L2

| Trait | Requirement |
|-------|-------------|
| Data | Receives via props |
| Events | Emits callbacks (`onApprove`, `onRetry`) |
| Side effects | None — no fetch, no router, no permissions |
| Hooks | None except purely visual (e.g. `useId`, `useReducedMotion`) |
| Testing | Props in → DOM out |

All C-xxx catalog components are **dumb unless explicitly listed as smart below**.

### Smart (Container) — L5 Screens + designated L2 orchestrators

| Trait | Requirement |
|-------|-------------|
| Data | Calls hooks in `aos/hooks/` |
| Routing | Screens may use router hooks for params/navigation |
| Permissions | Screens wrap regions with gates — or pass `canApprove` booleans to dumb UI |
| Side effects | Query/mutation hooks, polling setup |

**Smart components list (exhaustive Phase 1):**

- All L5 `*Screen` components  
- `EngagementHubLayoutScreen` (tabs, outlet, engagement context)  
- No L1 primitives are smart  
- L2 composites are dumb **except** none in Phase 1 — orchestration stays in screens  

**Reason:** Keeps C-xxx reusable and testable; ST-xx owns use case wiring.

---

## Page Ownership

| Artifact | Owns |
|----------|------|
| `aos/pages/AosXxxPage.tsx` | Route gate, page title, lazy boundary, render one Screen |
| `presentation/screens/xxx/XxxScreen.tsx` | ST-xx regions, hook calls, navigation handlers |
| Screen co-located `useXxxScreen.ts` | Optional — screen-specific hook composition |

**Pages never:**

- Contain JSX layout regions beyond `<AosRouteGate><XxxScreen /></AosRouteGate>`  
- Call application services directly  
- Define new visual components  

---

## Composition Rules

1. **Screen = template manifest** — file header comment references ST-xx ID.  
2. **Region → component mapping** documented in screen folder `README` (one paragraph) referencing freeze template.  
3. **Max nesting depth** in UI tree: 6 levels from Screen to primitive — extract composite if deeper.  
4. **Slot pattern** — PageHeader accepts `title`, `actions`, `breadcrumb` props — not children soup.  
5. **Compound components** — Card.Header / Card.Body allowed within same L2 folder only.

---

## Context Providers

| Provider | Location | Scope | Provides |
|----------|----------|-------|----------|
| `AosServicesProvider` | `presentation/providers/` | AOS routes subtree | Application service instances |
| `QueryClientProvider` | `presentation/providers/` | AOS routes subtree | TanStack Query client |
| `EngagementContextProvider` | `presentation/screens/engagement-hub/` | Engagement hub nested routes | `engagementId`, engagement DTO snapshot, refetch |
| ERP `PermissionsProvider` | ERP shell | Global | Already exists — do not duplicate |

**Rules:**

- No server data in React Context except EngagementContext (DTO snapshot + refetch handle) — query cache holds authoritative server state.  
- Providers mounted at AOS route layout in App.tsx or first AOS parent — not per leaf page.  
- Feature flags via hook — not context (existing `useAosFeatureFlags` sufficient).

---

## Reusable Components

Promotion path to `presentation/ui/`:

1. Used in 2+ screens **or** listed in C-xxx catalog  
2. Dumb — props fully document states from design system  
3. Co-located `{Component}.types.ts` for props if >8 props  
4. Co-located `{Component}.test.tsx` before export  

**ERP reuse:** Wrap ERP components in AOS FormField adapter — do not fork ERP component internals.

---

## Screen Ownership

| Screen folder | ST | Primary hook dependencies |
|---------------|-----|---------------------------|
| `screens/dashboard/` | ST-01 | attention query, risks query, nba query |
| `screens/delivery-list/` | ST-02 | list deliveries query |
| `screens/create-engagement/` | ST-03 | create mutation, ERP customer query |
| `screens/engagement-hub/overview/` | ST-04 | get engagement, nba, timeline preview |
| `screens/engagement-hub/requirements/` | ST-05 | requirement set query, approve mutation |
| `screens/engagement-hub/reuse/` | ST-06 | reuse assessment query |
| `screens/engagement-hub/prompts/` | ST-07 | prompt pack query |
| `screens/engagement-hub/cursor/` | ST-08 | sessions query |
| `screens/engagement-hub/evaluation/` | ST-09 | evaluations query |
| `screens/engagement-hub/qa/` | ST-10 | quality report query |
| `screens/engagement-hub/retrospective/` | ST-11 | retrospective query |
| `screens/queues/requirements/` | ST-12 | queue projection query |
| `screens/queues/prompts/` | ST-13 | queue projection query |
| `screens/queues/cursor/` | ST-14 | queue projection query |
| `screens/queues/evaluation/` | ST-15 | queue projection query |
| `screens/registry/` | ST-16 | module list query |
| `screens/registry-detail/` | ST-17 | module detail query |
| `screens/knowledge/` | ST-18 | knowledge list query |
| `screens/playbook/` | ST-19 | static content loader |

---

## Component Lifecycle

| Phase | Behavior |
|-------|----------|
| **Mount** | Screen hooks enable queries; skeleton until data or error |
| **Update** | Query refetch on invalidation; props change re-render dumb UI |
| **Unmount** | Queries cancelled if `enabled: false`; polling stops |
| **Route leave** | EngagementContext cleared on hub unmount |
| **Dialog open** | No unmount parent screen — overlay only |
| **Gate success** | Invalidate queries listed in mutation meta |

---

## Component Responsibilities Matrix

| Component type | Responsible for | Not responsible for |
|----------------|-----------------|---------------------|
| Button | Visual states, a11y, emit click | Permission checks (screen passes `disabled`) |
| PermissionGate | Hide/disable children | Data fetching |
| DataTable | Render rows, emit row click | Fetching rows |
| AiDraftPanel | Display draft content | Generating draft |
| ApprovalPanel | Emit approve/reject intent | Calling application service |
| Screen | Hooks, gates, navigation, ST layout | Pixel-level primitive styling |
| Page | Route gate, title | Layout |

---

## File Naming (Locked)

| Type | Pattern | Example |
|------|---------|---------|
| UI component | PascalCase | `AttentionQueue.tsx` |
| Screen | `{Name}Screen.tsx` | `DashboardScreen.tsx` |
| Page | `Aos{Name}Page.tsx` | `AosDashboardPage.tsx` |
| Hook | `use{camelCase}.ts` | `useDeliveryListQuery.ts` |
| Test | `{Name}.test.tsx` | `AttentionQueue.test.tsx` |
| Types | `{Name}.types.ts` | `AttentionQueue.types.ts` |

---

## Anti-Patterns

1. Smart Button that fetches on click  
2. Screen importing Firestore  
3. UI component reading `useParams`  
4. Multiple screens sharing one mega-file  
5. Context for every list query  
6. Copy-paste primitive instead of C-xxx import  
7. `presentation/ui` importing from `screens`  

---

## Related Documents

- [30 Frontend Architecture](./30_FRONTEND_ARCHITECTURE.md)
- [32 State Management](./32_STATE_MANAGEMENT.md)
- [04 Component Library](../aos-design-system/04_COMPONENT_LIBRARY.md)
