# 03 — Navigation Architecture

**Stage D0 — FXD**  
**Grounding:** `aos/config/navigation.ts`, ADR-012, ADR-003

---

## Navigation Philosophy

AOS navigation follows **delivery intelligence**, not project management taxonomy.

The founder navigates by:

1. **What needs attention** (Dashboard)
2. **Which client engagement** (Delivery)
3. **Which agency asset** (Registry, Knowledge, Playbook)
4. **Which cross-engagement queue** (Requirements, Prompts, Cursor, Evaluation)

Engagement-specific work happens **inside the Engagement Hub** via tabs — not via sidebar proliferation.

---

## Sidebar Hierarchy

```
Delivery (AOS)
├── Dashboard          ← command center
├── Delivery           ← engagement portfolio + hub entry
├── Registry           ← reusable modules (agency asset)
├── Requirements       ← cross-engagement queue
├── Prompts            ← cross-engagement queue
├── Cursor             ← cross-engagement queue
├── Evaluation         ← cross-engagement queue
├── Knowledge          ← agency learning library
└── Playbook           ← methodology reference
```

This mirrors the existing Phase 1A scaffold in `aos/config/navigation.ts` — FXD adds **semantic meaning** and **Engagement Hub tabs** not yet in routes (future UI stage adds `:engagementId/*` child routes without new sidebar items).

---

## Why Each Screen Exists

| Nav item | Exists because |
|----------|----------------|
| **Dashboard** | Founders need one place for attention — not nine modules checked manually |
| **Delivery** | Delivery Engagement is the aggregate root — portfolio + hub entry is mandatory |
| **Registry** | Reuse-first (ADR-010) requires a discoverable module catalog |
| **Requirements** | Approved requirements gate all AI/Cursor work — cross-engagement queue surfaces approval debt |
| **Prompts** | Prompt packs are the execution contract — approval queue prevents unapproved Cursor runs |
| **Cursor** | Execution visibility — founder must see where Cursor is waiting or stuck |
| **Evaluation** | Evaluation gate (ADR-007) — failures must be visible agency-wide |
| **Knowledge** | Learning compounds (ADR-009) — knowledge must be browsable outside one engagement |
| **Playbook** | Human methodology anchor — aligns team language with lifecycle states |

---

## Why Screens Do NOT Exist

| Excluded | Why |
|----------|-----|
| **Tasks** | ADR-012 — Prompt Artifacts sequence work, not tasks |
| **Sprints** | No sprint domain; lifecycle phases are sufficient |
| **Board / Kanban** | Status columns duplicate lifecycle states without evaluation evidence |
| **Backlog** | Requirement Sets are versioned artifacts, not a backlog |
| **Epics / Stories** | Wrong granularity — requirements + prompts replace story hierarchy |
| **Timesheets** | ERP owns time/expense attribution |
| **Clients** | ERP owns customers — AOS links read-only |
| **Invoices** | ERP owns finance — read-only links at handoff |
| **BOS Ventures/Initiatives** | BOS sidebar owns strategy — AOS only links read-only |
| **Settings (AOS)** | ERP owns users/roles — AOS uses ERP permissions (`aos/config/permissions.ts`) |
| **Reports / Analytics hub** | Dashboard answers decisions; deep analytics deferred — avoids KPI product |

---

## Engagement Hub Tabs (Not Sidebar Items)

These are **second-level navigation** inside Delivery — keeping sidebar stable:

| Tab | Rationale |
|-----|-----------|
| Overview | Next action + lifecycle |
| Requirements | Domain artifact ownership |
| Reuse | Reuse-first decision point |
| Prompts | Execution planning |
| Cursor | Execution records |
| Evaluation | Quality gate |
| QA / Handoff | Delivery completion |
| Retrospective | Learning closure |

**Rule:** Do not promote tabs to sidebar items — that fragments engagement context.

---

## Navigation Rules

1. **ERP/BOS links open in context** — sidecar navigation out, never duplicate entities in AOS.
2. **Deep links preserve engagementId** — every artifact URL is engagement-scoped where applicable.
3. **Dashboard always one click away** — founder escape hatch.
4. **Queues link to engagement tabs** — global queues are indexes, not alternate workspaces.
5. **No nested sidebars** — flat AOS group under ERP sidebar section.

---

## Permission-Aware Navigation

Navigation items respect `aos/config/permissions.ts`:

- View-only roles see queues but not approve actions
- Admin sees all items
- Feature flags (`aos/config/featureFlags.ts`) hide immature modules in Phase 1A

FXD assumes all nav items eventually enabled — flags are implementation detail.

---

## Mobile / Narrow View (Future)

FXD default: desktop-first founder workflow. Mobile may collapse to Dashboard + Delivery only; queues fold into Dashboard attention items.

---

## Related Documents

- [02 Screen Architecture](./02_SCREEN_ARCHITECTURE.md)
- [04 Dashboard Philosophy](./04_DASHBOARD_PHILOSOPHY.md)
