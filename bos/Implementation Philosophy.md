# BOS Implementation Philosophy

## Purpose

This document explains why the BOS module is structured as **Clean Architecture with Domain-Driven Design (DDD)** and how the domain layer protects the frozen architecture (Version 1.0) over time.

Sprint 1 establishes **definitions only** — no Firestore, no React UI, no CRUD services. Everything else in Phase 1 builds on top of this foundation.

---

## The problem we are solving

The ERP application already handles expenses, leads, invoices, and reports. BOS adds a **strategic layer above ERP** without redesigning those modules.

If business rules live inside React components or Firestore services:

- Sidecar attribution law breaks silently (`initiativeId` on `expenses` documents)
- CRM `businesses` get confused with `BosVenture`
- Lifecycle rules diverge between UI and database
- Phase 1B integration becomes a rewrite instead of a wiring task

The domain layer exists so **business truth has one home**.

---

## Layer model

```
┌─────────────────────────────────────────────────────────┐
│  UI (React pages, components) — Phase 1A Sprint 3+      │
├─────────────────────────────────────────────────────────┤
│  Application services (use cases, orchestration)        │
├─────────────────────────────────────────────────────────┤
│  Contracts (repository interfaces) ◄── you are here     │
├─────────────────────────────────────────────────────────┤
│  Domain (entities, rules, lifecycles) ◄── Sprint 1      │
├─────────────────────────────────────────────────────────┤
│  Infrastructure (Firestore repos, ERP read adapters)    │
└─────────────────────────────────────────────────────────┘
         ▲                              │
         │         depends inward       │
         └──────────────────────────────┘
```

**Dependency rule:** outer layers depend on inner layers. The domain depends on nothing in the app except primitive types and constants.

---

## What lives where

| Layer | Folder | Responsibility |
|-------|--------|----------------|
| **Types** | `bos/types/` | Branded IDs, money, pagination — no business rules |
| **Constants** | `bos/constants/` | Enums, status values, permission keys, activity types — **never hardcode strings elsewhere** |
| **Config** | `bos/config/` | Routes, navigation, permission registry, feature flags |
| **Domain** | `bos/domain/` | Entities, lifecycles, validation rules, relationships |
| **Contracts** | `bos/contracts/` | Repository and port interfaces — **no Firebase** |

Future layers (not in Sprint 1):

| Layer | Planned folder | Responsibility |
|-------|----------------|----------------|
| Application | `bos/application/` | Use cases: `CreateVenture`, `CloseInitiative`, etc. |
| Infrastructure | `bos/infrastructure/` | Firestore repository implementations |
| UI | `pages/app/bos/`, `components/bos/` | Presentation only |

---

## Core entities (Phase 1)

| Entity | Role | Architecture reference |
|--------|------|------------------------|
| **Venture** (`BosVenture`) | Business unit in the portfolio | Doc 10, Doc 11 §1 |
| **Initiative** (`BosInitiative`) | Strategic hub for spend, decisions, KPIs | Doc 10, Doc 11 §2 |
| **Decision** (`BosDecision`) | Institutional memory of choices | Doc 10, Doc 11 §7, Doc 13 |
| **Attribution** (`BosAttribution`) | Sidecar link to ERP facts | Doc 10, Doc 11 §5 — **Phase 1B** |
| **KPI** (`BosMetricDefinition`, `KpiValue`) | Computed measurement, not manual entry | Doc 08, Doc 10 |

---

## Rules the domain enforces

These are implemented in `bos/domain/rules/` today and must not be reimplemented ad hoc in UI or Firestore code:

1. **Sidecar law** — BOS never writes fields onto ERP collections (`expenses`, `leads`, `invoices`, …).
2. **Attribution eligibility** — only `active` or `paused` initiatives accept attributions.
3. **Lifecycle transitions** — invalid FSM moves (e.g. `closed → active`) are rejected in domain.
4. **No delete** — decisions and attributions are voided or superseded, not deleted.
5. **Allocation ceiling** — split attributions sum to ≤ 100%.
6. **Naming law** — venture ≠ CRM business; initiative ≠ CRM campaign (see `FORBIDDEN_ERP_ALIASES`).

---

## How future code must behave

### Application services (next sprints)

- Call domain validators **before** persisting.
- Depend on `BosVentureRepository` interfaces, not `db.collection()`.
- Map Firestore documents to domain entities at the infrastructure boundary.

### Firestore repositories

- Implement contracts in `bos/infrastructure/firestore/`.
- Never import React.
- Never embed business rules that already exist in `domain/rules/`.

### React UI

- Read constants for labels and statuses (`VENTURE_STATUS_LABELS`, etc.).
- Read config for routes and nav (`BOS_ROUTES`, `BOS_NAV_ITEMS`).
- Call application services; **do not** validate lifecycle transitions inline.

### ERP integration (Phase 1B)

- Expense linking uses `ErpExpenseReadPort` (read-only) + `BosAttributionRepository` (write sidecar).
- `ExpensesPage` remains untouched unless a minimal integration point is proven necessary (Doc 20).

---

## Feature flags

`bos/config/featureFlags.ts` controls when integration surfaces activate:

- Phase **1A**: `MODULE_ENABLED` only — standalone BOS.
- Phase **1B**: attribution, ERP expense read, BOS reports.

Flags allow staging/production rollout without domain model changes.

---

## Alignment with Doc 20 (Vertical Slice)

| Sprint | Delivers | Domain role |
|--------|----------|-------------|
| **1** (now) | Domain layer | Entities, rules, contracts, constants |
| 2 | Firestore repos | Implement contracts |
| 3 | BOS UI | Consume application services |
| 6 (1B) | Attribution | Domain already defines `BosAttribution` + rules |

---

## What success looks like for Sprint 1

- [ ] All Phase 1A statuses and permission keys exist in `constants/`
- [ ] All five core entities defined in `domain/entities/`
- [ ] Lifecycle FSMs match Doc 11
- [ ] Repository contracts defined with no Firebase imports
- [ ] Zero files under `pages/`, `components/`, or `services/` modified for BOS CRUD
- [ ] `npm run build` still passes (domain is tree-shaken until wired)

---

## Long-term payoff

When Phase 2 adds funnel events, invoice attribution, or metric snapshots:

- Extend entities and constants
- Add repository methods to contracts
- Add infrastructure implementations

You do **not** hunt through 3,000-line ERP pages to rediscover business rules.

That is how the domain layer protects architecture quality while the team moves at execution speed.

---

**References:** Doc 20 (Vertical Slice Roadmap), Architecture docs 01–13 (frozen v1.0), `docs/business-operating-system/10_Domain_Glossary.txt`, `docs/business-operating-system/11_Entity_Lifecycles.txt`
