# 19 — Accessibility Guidelines

**Stage D1 — AOS Design System**  
Target: **WCAG 2.1 Level AA** for all AOS surfaces.

---

## Non-Negotiables

1. **Keyboard operable** — all actions reachable without pointer
2. **Visible focus** — `color-border-focus` ring on all interactive elements
3. **Color not sole indicator** — lifecycle, severity, pass/fail include text
4. **Accessible names** — every button, link, input labelled
5. **Live regions** — toasts, approval success, evaluation completion announced appropriately

---

## Component-Specific Requirements

| Component | Requirement |
|-----------|-------------|
| AttentionQueue | Arrow key navigation; severity text |
| AiDraftPanel | Draft banner announced on load (`role="status"`) |
| ApprovalPanel | Focus order: note field → actions; no trap |
| DataTable | `<th scope="col">`; sort buttons with `aria-sort` |
| EngagementTabBar | Roving tabindex; `aria-selected` |
| SidePanel / Dialog | Focus trap, Esc close, restore focus |
| LifecycleBadge | Text content = state name |
| StatusChip | Text always visible |
| Timeline | List semantics; events as list items |
| IconButton | Required `aria-label` |
| FilterChip | Remove button labelled “Remove filter {name}” |

---

## AI Transparency (Accessibility + Trust)

- AI-generated regions: programmatically distinguishable (`aria-describedby` pointing to AI disclaimer)
- Approval actions: button name includes artifact type and version
- Do not use `aria-hidden` on draft content user must review

---

## Motion

Respect `prefers-reduced-motion`:
- Disable panel slide animations
- Disable session active pulse
- Keep opacity transitions minimal

---

## Contrast

Semantic tokens in [02 Design Tokens](./02_DESIGN_TOKENS.md) must meet 4.5:1 body text, 3:1 large text and UI components — verified at implementation phase.

AI draft borders and warning surfaces must maintain readable text contrast.

---

## Forms

- Errors associated via `aria-describedby`
- Required fields: `aria-required="true"` + visual indicator
- Cancel engagement reason: required field announced

---

## Document Structure

Each page:
- One `<h1>` — engagement name or screen title
- Sections use hierarchical headings — not bold paragraphs only
- Skip link to main content (ERP shell permitting)

---

## Testing Checklist (Pre-release)

- [ ] Tab through entire approve flow
- [ ] Screen reader: AttentionQueue → Requirements → Approve
- [ ] Screen reader: Evaluation fail → InAppAlert
- [ ] 200% zoom usable without horizontal scroll on forms
- [ ] Dialog Esc and focus return

---

## Anti-patterns

- `div` with `onClick` without keyboard support
- Placeholder-only labels
- Auto-playing carousels on dashboard

---

## Related Documents
[05 Button System](./05_BUTTON_SYSTEM.md), [14 Dialog Patterns](./14_DIALOG_PATTERNS.md), [17 Permission UI](./17_PERMISSION_AND_FEATURE_FLAG_UI.md)
