# 30 — Frontend Architecture

**Stage D1.6 — AOS Frontend Engineering Freeze**  
**Status:** Frozen  
**Grounding:** System Architecture §AOS Internal Layer Model, ADR-015, BOS integration pattern, existing `aos/` scaffold

---

## Purpose

Define the **overall frontend architecture** for AOS within the ERP SPA so D2 implementation is deterministic — same layers, same folders, same dependency direction every time.

AOS frontend is a **bounded presentation module** inside a single React SPA (Vite, HashRouter, Firebase client SDK). It does not own auth, company scope, or shell navigation — ERP does.

---

## Architectural Position

```
ERP Shell (Sidebar, Auth, AppLayout, usePermissions)
        │
        ▼
AOS Route Layer (aos/pages/* — lazy, gated)
        │
        ▼
AOS Presentation Layer (screens, ui, layouts, gates, providers)
        │
        ▼
AOS Hooks Layer (queries, mutations, polling orchestration)
        │
        ▼
AOS Application Layer (aos/application/* — commands/queries, DTOs)
        │
        ├── AOS Contracts (repository interfaces)
        ├── AOS Infrastructure (Firestore repos, adapters)
        ├── ERP/BOS Read Ports (read-only)
        └── AOS Domain (rules — never imported by UI)
```

**Mandatory rule (ADR-015):** Presentation and hooks call **application services only**. Never Firestore, never repositories, never domain aggregates from UI.

---

## Layer Definitions

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Route** | `aos/pages/` | Lazy route entry, `usePageTitle`, wrap `AosRouteGate`, render one screen |
| **Screen** | `aos/presentation/screens/` | ST-xx template composition; wires hooks to UI regions |
| **UI** | `aos/presentation/ui/` | C-xxx design system components — props in, events out |
| **Layout** | `aos/presentation/layouts/` | PageShell, PageHeader, ContentGrid, StickyFooterBar |
| **Gate** | `aos/presentation/gates/` | RouteGate, PermissionGate, FeatureFlagGate, LockedOverlay |
| **Provider** | `aos/presentation/providers/` | Application service injection, query client, AOS context |
| **Hook** | `aos/hooks/` | Server queries, mutations, derived selectors, polling |
| **Application** | `aos/application/` | Use cases, DTO mapping, validation orchestration |
| **Contract** | `aos/contracts/` | Repository interfaces |
| **Infrastructure** | `aos/infrastructure/` | Firestore, adapters, wiring factories |
| **Integration** | `aos/integration/` | ERP/BOS read port interfaces |
| **Domain** | `aos/domain/` | Entities, rules, lifecycle — backend of frontend |
| **Config** | `aos/config/` | Routes, nav, flags, permissions — no UI |
| **Theme** | `aos/theme/` | Semantic token → stylesheet mapping (D2) |
| **Constants** | `aos/constants/` | Domain enums shared for display labels |

**Legacy note:** Existing `aos/components/` and `aos/presentation/components/` from Stage A scaffold **consolidate into** `presentation/ui/` and `presentation/gates/` during D2 Milestone 0 — no dual homes after M0.

---

## Folder Ownership Rules

| Folder | Owner | May contain |
|--------|-------|-------------|
| `aos/pages/` | Route team | Default exports only; max ~30 lines |
| `aos/presentation/screens/` | Feature screens | One folder per ST-xx (`dashboard/`, `delivery-list/`, `engagement-hub/`) |
| `aos/presentation/ui/` | Design system impl | One folder per component group (`buttons/`, `tables/`, `ai/`) |
| `aos/presentation/layouts/` | Layout | Region composers |
| `aos/presentation/gates/` | Access control | Gates matching C-090–C-092 |
| `aos/presentation/providers/` | App bootstrap | React context providers |
| `aos/hooks/queries/` | Data fetching | Read hooks per aggregate/query |
| `aos/hooks/mutations/` | Data writing | Command hooks per use case |
| `aos/hooks/ui/` | Ephemeral UI | SidePanel open state, tab memory |
| `aos/theme/` | Design tokens impl | Token CSS variables, Tailwind theme extension |
| `aos/wiring/` | Composition root | `createAosPresentationServices()` — binds infra to application for UI |

**Wiring location (locked):** New `aos/wiring/` owns UI-facing service factory. Existing `aos/infrastructure/wiring/` remains infrastructure-only; `aos/wiring/` imports from it.

---

## Module Boundaries

AOS frontend is **one module** (`aos/`). Sub-boundaries are **logical**, not separate packages:

| Boundary | Isolation |
|----------|-----------|
| **UI ↔ Application** | Hooks only crossing boundary |
| **Application ↔ Domain** | Application imports domain; UI never does |
| **Application ↔ Infrastructure** | Application depends on contracts; infrastructure implements |
| **AOS ↔ ERP pages** | AOS never imports from `pages/app/*` except shared ERP components explicitly listed in erp-discovery/05 |
| **AOS ↔ BOS** | Read ports only via adapters — no BOS page imports |

---

## Dependency Direction

```
pages → screens → ui
              ↓
            hooks → application → contracts
                        ↓              ↑
                   domain         infrastructure
```

**Allowed upward imports:** None. Lower layers never import presentation.

**Shared ERP components (allowed from UI):** Spinner, ErrorBoundary, AppLayout (via pages parent), SearchableListSelect, FieldInfoTip, BosModal (dialog shell until AOS Dialog replaces), RowIconButton — per erp-discovery/05. AOS visual language applied inside content area.

---

## Import Rules

### Allowed

| From | To |
|------|-----|
| `pages` | `presentation/screens`, `presentation/gates`, `config`, ERP `hooks/usePageTitle` |
| `screens` | `presentation/ui`, `presentation/layouts`, `hooks`, `config`, `constants` |
| `ui` | `presentation/ui` (composition), `theme`, `types` (presentation-only types) |
| `hooks/queries` | `application`, `wiring`, `config` |
| `hooks/mutations` | `application`, `wiring`, `config` |
| `application` | `domain`, `contracts`, `integration`, DTOs |
| `infrastructure` | `contracts`, `domain`, Firebase SDK |
| `wiring` | `application`, `infrastructure/wiring`, `integration` |

### Forbidden

| From | To | Reason |
|------|-----|--------|
| `ui` | `hooks` | Smart/dumb violation — screens inject data |
| `ui` | `application`, `domain`, `infrastructure`, `contracts` | Layer violation |
| `screens` | `domain`, `infrastructure`, Firestore | Layer violation |
| `hooks` | `domain` aggregates directly | Use application DTOs |
| `hooks` | Firestore SDK | ADR-015 |
| `application` | `presentation/*` | Inversion |
| `domain` | anything outside domain | Purity |
| Any AOS layer | `firebase/firestore` except `infrastructure` | Persistence isolation |

---

## Composition Philosophy

1. **Screens compose, components render** — ST-xx owns layout regions; C-xxx fills slots.  
2. **Data at the screen edge** — hooks called in screen container (or screen-level hook file), passed as props to dumb UI.  
3. **One screen folder per ST-xx** — co-locate screen-specific hooks if not reused.  
4. **Reuse via catalog** — extract to `presentation/ui/` when second ST-xx needs same C-xxx.  
5. **ERP shell is outer** — AOS PageShell is **inner** content wrapper only.  
6. **No page business logic** — pages are route adapters.

---

## Engagement Hub Routing (Locked)

Engagement routes live under `/aos/delivery/:engagementId/*` as **nested routes** — not new sidebar entries.

| Path segment | Screen |
|--------------|--------|
| `` (index) | ST-04 Overview |
| `requirements` | ST-05 |
| `reuse` | ST-06 |
| `prompts` | ST-07 |
| `cursor` | ST-08 |
| `evaluation` | ST-09 |
| `qa` | ST-10 |
| `retrospective` | ST-11 |

Parent layout screen: `EngagementHubLayoutScreen` renders PageHeader, ContextBanner, EngagementTabBar, `<Outlet />`.

Create engagement: `/aos/delivery/new` → ST-03 (sibling route, not nested).

Module detail: `/aos/registry/:moduleId` → ST-17.

---

## Styling Architecture (Locked)

| Decision | Value |
|----------|-------|
| CSS approach | Tailwind v4 (existing repo) |
| Token mapping | `aos/theme/tokens.css` + Tailwind `@theme` |
| Class naming | Semantic utility composition — no arbitrary hex in components |
| ERP field styling | Reuse `BOS_FIELD_CLASS` for ERP-aligned inputs until AOS FormField fully replaces |

---

## Server State Library (Locked)

**TanStack Query v5** for server-state cache — added Milestone 0 D2. Reason: deterministic cache, invalidation, polling, and mutation lifecycle without custom cache sprawl.

---

## Bootstrap Sequence (Runtime)

1. ERP Auth + company context available  
2. User navigates to `/aos/*`  
3. Lazy page loads → `AosRouteGate` (module flag, route flag, permissions)  
4. `AosServicesProvider` (if not already at ERP level) supplies application services  
5. Screen mounts → query hooks fetch DTOs → UI renders states per design freeze  

---

## Forbidden Frontend Patterns

1. Firestore listeners in components (Phase 1 — polling via query layer only)  
2. Global mutable singleton stores for server data outside query cache  
3. Direct `fetch` to Firestore REST from UI  
4. Importing domain entities into JSX files  
5. Business rules duplicated in UI (display rules OK; gate rules from application)  
6. New permission system — use ERP `usePermissions` + `aos/config/permissions.ts`  
7. Feature flags read ad hoc — use `useAosFeatureFlags` + FeatureFlagGate  
8. Inline styles with magic numbers  
9. Cross-feature screen imports (dashboard importing engagement-hub internals)  
10. PM UI patterns regardless of folder  

---

## Related Documents

- [31 Component Architecture](./31_COMPONENT_ARCHITECTURE.md)
- [33 Data Flow](./33_DATA_FLOW.md)
- [37 Implementation Sequence](./37_IMPLEMENTATION_SEQUENCE.md)
- [System Architecture](../aos-architecture/03_SYSTEM_ARCHITECTURE.md)
