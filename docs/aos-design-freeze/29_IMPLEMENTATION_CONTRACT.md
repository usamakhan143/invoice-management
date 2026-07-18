# 29 — Implementation Contract

**Stage D1.5 — AOS Design Freeze**  
**Status:** Constitutional — binds all Stage D2+ UI implementation

This document is the **implementation constitution**. Violations are defects, not style preferences.

---

## Core Rule

> **If it is not documented, it does not exist.**  
> **STOP implementation → write documentation → get review → then implement.**

---

## Implementation MUST NEVER

| # | Prohibition |
|---|-------------|
| 1 | **Invent components** outside C-xxx catalog ([04 Component Library](../aos-design-system/04_COMPONENT_LIBRARY.md)) |
| 2 | **Invent layouts** outside ST-xx templates ([21 Screen Templates](./21_SCREEN_TEMPLATES.md)) and Layout System |
| 3 | **Invent spacing** — only semantic spacing tokens |
| 4 | **Invent colors** — only semantic color tokens |
| 5 | **Invent icons** — only [24 Iconography](./24_ICONOGRAPHY_SYSTEM.md) map |
| 6 | **Invent buttons** — only [05 Button System](../aos-design-system/05_BUTTON_SYSTEM.md) variants |
| 7 | **Invent forms** — only [06 Form System](../aos-design-system/06_FORM_SYSTEM.md) patterns |
| 8 | **Invent tables** — only [07 Table System](../aos-design-system/07_TABLE_SYSTEM.md) |
| 9 | **Invent dialogs** — only [14 Dialog Patterns](../aos-design-system/14_DIALOG_PATTERNS.md) |
| 10 | **Invent navigation** — only routes in `aos/config/routes.ts` + FXD hub tabs |
| 11 | **Invent interactions** — only [22 Interaction System](./22_INTERACTION_SYSTEM.md) |
| 12 | **Invent motion** — only [23 Motion System](./23_MOTION_SYSTEM.md) tokens |
| 13 | **Invent copy** — only [25 Content Guidelines](./25_CONTENT_AND_COPY_GUIDELINES.md) |
| 14 | **Invent search behavior** — only [26 Search](./26_SEARCH_AND_DISCOVERY.md) |
| 15 | **Ship without UI review** — [27 UI Review Standard](./27_UI_REVIEW_STANDARD.md) sign-off |

---

## When Documentation Is Missing

```
Encounter gap in spec
  → STOP coding
  → File doc PR in docs/aos-design-freeze/, docs/aos-frontend-architecture/, or docs/aos-design-system/
  → Reference ST-xx / C-xxx gap explicitly
  → Review against 28 Design Decision Principles
  → Merge doc
  → Resume implementation
```

**Forbidden:** “We’ll fix the docs later” or “temporary component until design catches up”.

Temporary UI in production **is not allowed** for AOS Phase 1.

---

## Documentation Precedence (Highest → Lowest)

When documents conflict, resolve top-down:

| Rank | Source | Governs |
|------|--------|---------|
| 1 | **ADR** (`docs/aos-adr/`) | Non-negotiable architecture |
| 2 | **Architecture Lock** (`docs/aos-adr/FINAL_ARCHITECTURE_LOCK.md`) | Phase 0 boundary |
| 3 | **Domain Model** (`docs/aos-domain-model/`) | Entity names, states, gates, relationships |
| 4 | **Design Freeze** (`docs/aos-design-freeze/`) | **UX decisions** — screen templates, interactions, motion, copy, search, review, principles, this contract |
| 5 | **Frontend Architecture** (`docs/aos-frontend-architecture/`) | **Engineering implementation** — layers, folders, imports, state, data flow, performance, testing, errors, D2 sequence |
| 6 | **Design System** (`docs/aos-design-system/`) | Components, tokens, layout, accessibility |
| 7 | **Founder Experience** (`docs/aos-founder-experience/`) | Journeys, screen purpose, philosophy |
| 8 | **ERP Discovery** (`docs/erp-discovery/`) | Shell reuse, integration constraints |
| 9 | **Implementation** (running code in `aos/**`, `App.tsx`) | Lowest authority — must conform to all ranks above; **not** a source of new design |

**Rule:** Lower rank never overrides higher rank.

### Authority split (locked)

| Question type | Authority |
|---------------|-----------|
| What should the founder see and do? | **Design Freeze** (+ Design System for component behavior) |
| How is the frontend engineered and built? | **Frontend Architecture** |
| What is architecturally forbidden or owned? | **ADR → Domain Model** |

**If implementation conflicts with Design Freeze, ADR always wins** — escalate via ADR amendment; do not ship conflicting UX.

**Engineering implementation must follow Frontend Architecture before writing code** — folder placement, import direction, state ownership, and milestone order are not decided during feature work.

---

## ADR Precedence

- ADR-012 forbids PM UI — overrides any informal feature request  
- ADR-011 Sidecar Law — overrides convenience CRUD in AOS  
- ADR-014 Append-only — overrides delete UX patterns  
- ADR-015 boundaries — UI mirrors server permissions  

New ADR required to override any accepted ADR.

---

## Domain Precedence

- Lifecycle states, gate names, artifact versioning come from domain model — not UI invention  
- Buttons use domain verbs: Approve requirement set v{n} — not generic Save  
- UI cannot add lifecycle states or gates  

---

## Design Freeze vs Frontend Architecture

| Topic | Design Freeze | Frontend Architecture |
|-------|---------------|----------------------|
| Screen regions and ST-xx | ✓ owns | implements only |
| Interaction and motion | ✓ owns | implements only |
| Folder structure and imports | | ✓ owns |
| State and data flow | | ✓ owns |
| Milestone order | | ✓ owns |

Neither overrides ADR or Domain Model. When freeze and frontend architecture conflict on **engineering mechanics** (e.g. polling owner), **frontend architecture wins**. When they conflict on **UX behavior** (e.g. approval friction), **design freeze wins** — unless ADR forbids it.

---

## Design System Precedence

- Component IDs, states, forbidden usage are binding  
- Design freeze extends design system with behavioral and screen-level contracts — not replace component specs  
- Frontend architecture defines **where** components live and **how** screens compose them — not visual spec overrides  

When design freeze and design system conflict on components → **design system component spec wins**; freeze must be amended.

When design freeze defines screen layout not in design system → **freeze wins** for that screen.

When frontend architecture and design system conflict on component **file location or composition tier** → **frontend architecture wins**; design system visual spec unchanged.

---

## Founder Experience Precedence

FXD defines **why** screens exist and founder journeys. If FXD describes a screen and freeze has ST-xx → implement ST-xx.

If FXD mentions a feature with no ST-xx → **STOP** — add ST-xx first.

---

## Conflict Resolution Order (Algorithm)

1. Is there an accepted ADR? → Follow ADR (**wins over Design Freeze and all lower ranks**)  
2. Is there domain model definition? → Follow domain  
3. Is there ST-xx or UX rule in design freeze? → Follow design freeze  
4. Is there a frontend architecture rule (layers, imports, state, sequence)? → Follow frontend architecture  
5. Is there C-xxx component spec? → Follow design system  
6. Is there interaction/motion/copy in freeze not covered by design system? → Follow freeze  
7. Is there FXD journey guidance? → Follow FXD  
8. Is there ERP discovery constraint? → Follow ERP discovery  
9. None of the above → **STOP** — document first ([28 Principles](./28_DESIGN_DECISION_PRINCIPLES.md))  

---

## Implementation Allowed Without New Docs

- Wiring documented components to existing application services  
- Mapping domain enums to documented StatusChip/LifecycleBadge labels  
- Theme token CSS values in implementation layer (D2) — names frozen in design system  
- ERP shell integration per erp-discovery  

---

## Locked D1 Ambiguities (Resolved in D1.5)

| Topic | Locked decision |
|-------|-----------------|
| ERP theme | Scoped AOS theme subtree; inherit shell chrome; semantic tokens in content area |
| Icon library | ERP icons in shell; Lucide-compatible in AOS content |
| Dark mode | Light only Phase 1; dark Phase 2 requires doc amend |
| BOS links | Same Sidecar pattern as ERP |
| Evaluation display | Pass/fail primary; score % in caption only |
| Attention queue sort | Application layer API; UI renders sorted list |
| Bulk queue approve | Rejected Phase 1 |
| i18n | English only Phase 1 |
| Create engagement | Full page ST-03 — not modal Phase 1 |
| Global omnibar | Deferred Phase 1b |
| Realtime UI | Polling Phase 1; no Firestore listeners unless doc amend |
| ST-20 Templates | Embedded in Playbook + ST-03 picker — no sidebar route |

---

## Phase Gate: D2 Entry Criteria

Before Stage D2 implementation begins:

- [ ] All 9 design freeze documents accepted  
- [ ] All 8 frontend architecture documents accepted (30–37)  
- [ ] [Final Documentation Lock Report](../aos-frontend-architecture/38_FINAL_DOCUMENTATION_LOCK_REPORT.md) verdict: GO  
- [ ] UI reviewer assigned  
- [ ] Theme token mapping plan (CSS values) approved — names only frozen until D2  
- [ ] First screen ST-xx chosen (recommended: ST-02 or ST-04)  
- [ ] Engineering team has read [37 Implementation Sequence](../aos-frontend-architecture/37_IMPLEMENTATION_SEQUENCE.md) Milestone 0 checklist  

---

## Amendment Process

To change frozen UI contract:

1. Demonstrate ADR or domain need  
2. Update design freeze + design system docs in same PR  
3. Pass [27 UI Review Standard](./27_UI_REVIEW_STANDARD.md) on doc changes  
4. Reference amendment in PR — `Design-Freeze-Amend: {summary}`  

---

## Related Documents

- [FINAL_ARCHITECTURE_LOCK](../aos-adr/FINAL_ARCHITECTURE_LOCK.md)
- [Frontend Architecture Index](../aos-frontend-architecture/00_INDEX.md)
- [Design System Index](../aos-design-system/00_INDEX.md)
- [FXD Index](../aos-founder-experience/00_FXD_INDEX.md)
