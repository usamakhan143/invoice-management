# 22 — Interaction System

**Stage D1.5 — AOS Design Freeze**  
**Status:** Frozen — all interaction patterns for AOS UI

Interactions are **predictable, keyboard-complete, and evidence-preserving**. No surprise automation.

---

## Interaction Priority Stack

When multiple interactions compete, resolve in this order:

1. **Safety** — DangerDialog, cancel flows, permission denial  
2. **Human gates** — ApprovalPanel, ApprovalDialog  
3. **Primary navigation** — engagement entry, attention item  
4. **Data submission** — forms, capture  
5. **Secondary navigation** — SidePanel, tabs  
6. **Ambient refresh** — polling, background sync  
7. **Decorative** — hover polish, non-essential motion  

---

## Hover

| Element | Behavior | Reason |
|---------|----------|--------|
| DataTable row | Subtle background lift | Affords click navigation |
| AttentionItem | Background + chevron emphasis | Primary dashboard affordance |
| Button | Token hover fill | Standard affordance |
| Card (interactive) | Border emphasis | Not elevation shadow — calm UI |
| IconButton | Tooltip after 400ms | Icon-only needs label |
| LinkButton / Sidecar | Underline or color shift | External vs internal distinction |
| Disabled control | No hover change | Prevents false affordance |
| AiDraftPanel | No hover on body | Content is read/review — not clickable blob |

**Rule:** Hover never reveals destructive actions without prior context (no hover-delete on rows).

---

## Focus

- All interactive elements: visible `color-border-focus` ring (2px offset).  
- Focus order: logical DOM order; modals trap focus.  
- Skip link: ERP shell permitting, jump to `#aos-main-content`.  
- After dialog close: focus returns to trigger element.  
- Tab bar: roving `tabindex` on EngagementTabBar.  

**Forbidden:** `outline: none` without replacement; focus on `aria-hidden` content.

---

## Keyboard

| Context | Keys | Action |
|---------|------|--------|
| AttentionQueue | ↑/↓ | Move between items |
| AttentionQueue | Enter | Open item |
| EngagementTabBar | ←/→ | Change tab |
| EngagementTabBar | Enter | Activate tab |
| DataTable | Enter on row | Navigate (when row focused) |
| Dialog | Esc | Close (unless submit in flight) |
| SidePanel | Esc | Close |
| SearchInput | Esc | Clear query |
| ApprovalPanel | — | **No keyboard shortcut for Approve** — intentional friction |
| Global | `/` | Focus search when on list/queue screens (optional Phase 1b) |

---

## Selection

- **Tables:** No multi-select Phase 1 — single row navigation only.  
- **Filters:** FilterChip selection is toggle + removable.  
- **Text:** Copy affordance on mono IDs (artifact, version) via IconButton.  
- **No lasso, no shift-click range select.**

---

## Loading

| Scope | Pattern | Duration messaging |
|-------|---------|-------------------|
| Page initial | Skeleton matching screen template | None until 10s → “Still loading…” caption |
| Button action | Button spinner, disabled | Preserve button width |
| AI generation | AiDraftPanel skeleton + status banner | “Generating draft…” |
| Evaluation run | EvaluationCard spinner | “Evaluation in progress…” |
| SidePanel fetch | Skeleton in panel | — |
| Infinite scroll | Row skeleton at bottom | Load more button preferred over auto |

**Rule:** Never block entire ERP shell — loading scoped to AOS PageShell regions.

---

## Retry

- ErrorState always offers **Retry** for transient failures (Firestore, read ports).  
- Retry re-executes last query with same params — no silent param change.  
- After 3 failed retries, show caption “Problem persists — contact admin” (no auto-escalation UI Phase 1).  
- Form validation errors: inline retry via fix fields — not ErrorState.

---

## Undo

**Phase 1: No generic undo toast.**

| Action | Undo |
|--------|------|
| Approve artifact | **Forbidden** — append-only; supersede with new version only |
| Cancel engagement | **Forbidden** — irreversible via DangerDialog |
| Dismiss attention item | Not applicable Phase 1 — items clear when gate resolved |
| Filter remove | Immediate — re-add via FilterBar |
| Copy to clipboard | N/A |

**Reason:** ADR-014 append-only and gate auditability prohibit casual undo.

---

## Optimistic Updates

**Default: pessimistic UI for gates; optimistic only for low-risk actions.**

| Action | Optimistic? |
|--------|-------------|
| Approve requirement set | **No** — wait server confirmation |
| Submit capture | **No** — evaluation depends on integrity |
| Create engagement | **No** — navigate on success only |
| Remove FilterChip | Yes — immediate UI |
| Tab switch | Yes — cached tab content if available |
| Copy prompt | Yes — toast on clipboard API success |

---

## Polling

| Surface | Interval | Condition |
|---------|----------|-----------|
| Active Cursor session | 30s | While session status = active |
| Evaluation running | 5s | Max 5 min then ErrorState |
| Reuse assessment | 10s | While assessment status = running |
| Dashboard AttentionQueue | 60s | When tab visible (Page Visibility API) |
| Engagement Overview NBA | On engagement focus | Refetch on tab return |

**Rule:** Pause polling when document hidden. Back off on error (exponential, max 5 min).

---

## Auto Refresh

- **Not** full page reload.  
- Refetch active query on: window focus (optional), post-success mutation, webhook/event Phase 2.  
- Timeline appends new events on refetch — no flash of entire timeline.

---

## Realtime Updates

Phase 1: **polling only** — no Firestore realtime listeners in UI spec unless implementation doc amends.

Phase 2 candidate: AttentionQueue realtime — requires architecture note.

**Reason:** Predictable load and explicit refresh align with founder review cadence.

---

## AI Generation Flow

```
Trigger (button) → Disable trigger → Banner "Generating…" → Skeleton
  → Success: AiDraftPanel populated + AI banner
  → Failure: ErrorState in panel + Retry
  → Never: auto-open ApprovalDialog
```

- User must scroll/review before Approve enabled (optional `hasViewedDraft` flag Phase 1b — default: Approve always visible but Confirmation/Approval dialog requires explicit click).  
- Regenerate creates **new draft version** — prior draft remains in history.  
- AI streaming Phase 2: chunk append to AiDraftPanel with cursor indicator — motion doc governs.

---

## Approval Flow

```
Review AiDraftPanel → Optional note in ApprovalPanel
  → Click Approve → ApprovalDialog (final consent)
  → Submit → Button loading → Success: Toast + immutable approved view
  → Failure: inline error, dialog stays open
```

- Request Revision: Warning banner, draft stays editable, no dialog.  
- Reject (if domain allows): DangerDialog or ConfirmationDialog per domain rule.  

**Friction is intentional** — reduces mistaken approvals.

---

## Failure Recovery

| Failure type | UX |
|--------------|-----|
| Network | ErrorState + Retry |
| Permission denied on submit | Toast error + LockedOverlay refresh |
| Validation | Inline field errors |
| Gate blocked | InAppAlert + NBA update |
| Partial load | Render loaded regions; failed region ErrorState |
| AI generation timeout | ErrorState + “Try again” + preserve form inputs |

---

## Success Flow

| Action | Feedback |
|--------|----------|
| Approve gate | Toast (4s) + state transition UI + AttentionQueue removes item on refetch |
| Submit capture | Toast + navigate hint to Evaluation tab |
| Create engagement | Toast + navigate to Overview |
| Copy prompt | Toast “Copied to clipboard” |
| Save draft (non-gate) | Toast “Draft saved” or inline “Saved” caption |

**Rule:** Success never uses modal — toast or inline only.

---

## Navigation Transitions

| Transition | Behavior |
|------------|----------|
| Sidebar → screen | Instant content swap; skeleton if cold load |
| Queue row → engagement tab | Navigate + scroll to target component id |
| Tab switch within hub | Preserve scroll per tab in memory Phase 1b; reset scroll Phase 1 acceptable |
| SidePanel open | Overlay fade; panel slide (motion doc) |
| Sidecar external | New tab — no iframe |
| Back breadcrumb | History back — preserve list filters via URL query params |

**Forbidden:** Full-page fade transitions >200ms; lateral slide between sidebar items.

---

## Interaction Anti-Patterns

1. Auto-advancing wizard after AI generation  
2. Approve on double-click  
3. Bulk actions without per-item review Phase 1  
4. Realtime toast for every Firestore write  
5. Optimistic approve with rollback  
6. Hover menus hiding sole primary action  
7. Keyboard shortcut for irreversible actions  
8. Infinite scroll on approval queues (use Load more)  
9. Click-away dismiss ApprovalDialog  
10. Drag-and-drop priority on attention items  

---

## Related Documents

- [23 Motion System](./23_MOTION_SYSTEM.md)
- [21 Screen Templates](./21_SCREEN_TEMPLATES.md)
- [Design System — Buttons](../aos-design-system/05_BUTTON_SYSTEM.md)
