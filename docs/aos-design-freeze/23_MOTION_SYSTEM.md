# 23 — Motion System

**Stage D1.5 — AOS Design Freeze**  
**Status:** Frozen — enterprise motion specification

Motion communicates **state change**, never decoration. AOS motion feels like Linear/Vercel: fast, subtle, optional.

---

## Motion Philosophy

1. **Functional** — every animation answers “what changed?”  
2. **Fast** — founder tools, not cinema  
3. **Restrained** — no bounce, no parallax, no celebratory confetti  
4. **Accessible** — honors `prefers-reduced-motion`  
5. **Token-driven** — durations and easings are named, not magic numbers in components  

---

## Duration Tokens

| Token | Duration | Use |
|-------|----------|-----|
| `motion-duration-instant` | 0ms | Reduced motion; opacity toggles |
| `motion-duration-fast` | 100ms | Hover, focus, chip remove |
| `motion-duration-normal` | 200ms | Dialog fade, SidePanel slide, expand/collapse |
| `motion-duration-moderate` | 300ms | Page region reveal, AI draft section expand |
| `motion-duration-slow` | 500ms | **Rare** — evaluation result reveal only |
| `motion-duration-ai-pulse` | 1500ms loop | AI generating indicator (optional) |

**Rule:** No animation > 500ms except AI pulse loop ( skippable via reduced motion ).

---

## Easing Tokens

| Token | Curve | Use |
|-------|-------|-----|
| `motion-ease-default` | ease-out | Most enter/exit |
| `motion-ease-in` | ease-in | Exit to hidden |
| `motion-ease-emphasized` | cubic-bezier(0.2, 0, 0, 1) | SidePanel slide |
| `motion-ease-linear` | linear | Progress indicators, pulse |

**Forbidden:** spring/bounce easings; elastic overshoot.

---

## Page Transitions

| Transition | Motion |
|------------|--------|
| Sidebar route change | **None** — instant content replace |
| Engagement tab switch | **None** — instant; optional 100ms crossfade Phase 1b |
| Queue → engagement drill-down | **None** on route; target scroll instant |
| Create form → hub success | Toast enter only — no page celebration |

**Reason:** Founders prefer snappy navigation over theatrical transitions.

---

## Dialogs

| Phase | Motion |
|-------|--------|
| Open | Overlay opacity 0→1 `motion-duration-normal` `motion-ease-default`; dialog scale 0.98→1 + opacity |
| Close | Reverse `motion-duration-fast` |
| Submit loading | No close animation until complete |

Focus trap activates **after** open animation completes (or immediately if reduced motion).

---

## Side Panels

| Phase | Motion |
|-------|--------|
| Open | Slide from right `translateX(100%)→0` `motion-duration-normal` `motion-ease-emphasized`; overlay fade |
| Close | Slide out `motion-duration-fast` |

Mobile full-screen sheet: slide from bottom optional — same duration tokens.

---

## Expansion / Collapse

| Element | Motion |
|---------|--------|
| Accordion artifact in PromptCard | Height auto animate `motion-duration-normal` |
| Timeline “show more” | Expand height + fade content `motion-duration-moderate` |
| AiDraftPanel sections | Chevron rotate 90° `motion-duration-fast`; content expand `motion-duration-normal` |
| FilterBar advanced | Collapse `motion-duration-fast` |

**Rule:** Animate height with care — prefer max-height token or CSS grid 0fr→1fr pattern at implementation; motion intent is documented here.

---

## Loading Animations

| Element | Animation |
|---------|-----------|
| Button spinner | Rotate linear `motion-duration-ai-pulse` / 8 |
| SkeletonBlock | Shimmer gradient loop 1.5s linear — **disabled** under reduced motion (static skeleton) |
| Page LoadingState | Centered spinner fade in `motion-duration-fast` |
| Evaluation in progress | EvaluationCard border subtle pulse `motion-duration-ai-pulse` — optional |

**Forbidden:** Full-screen branded loader; progress bar without determinate percent unless domain provides progress.

---

## Approval Animations

| Moment | Motion |
|--------|--------|
| Approve click → loading | Button spinner only |
| Approve success | AiDraftPanel border transitions ai→approved `motion-duration-moderate`; **no** checkmark explosion |
| ApprovalPanel dismiss | Fade out `motion-duration-fast`; approved banner fade in |

**Reason:** Approval is serious — calm transition reinforces immutability.

---

## AI Generation Transitions

| Phase | Motion |
|-------|--------|
| Start | Banner slides down 8px + fade in `motion-duration-normal` |
| Streaming (Phase 2) | Text append — no typewriter effect; cursor blink optional |
| Complete | Banner text crossfade “Generating…” → “AI Draft · Not approved” |
| Error | Banner tint to warning — no shake animation |

---

## Cursor Execution Indicators

| State | Motion |
|-------|--------|
| Session active | Status dot pulse `motion-duration-ai-pulse` opacity 0.5↔1 — **static dot** under reduced motion |
| Capture submitted | CursorSessionCard flash success border once `motion-duration-slow` |
| Stale session | No animation — Warning chip only (RiskPanel) |

**Forbidden:** Simulated terminal typing; fake IDE progress bars.

---

## Timeline Animations

| Event | Motion |
|-------|--------|
| Initial load | Stagger fade-in events 30ms apart, max 5 staggered — **instant** under reduced motion |
| Load more | Append events fade in `motion-duration-fast` |
| New event on poll | Single event slide in from top `motion-duration-normal` |

---

## Accessibility — Reduced Motion

When `prefers-reduced-motion: reduce`:

- All durations → `motion-duration-instant`  
- SidePanel: opacity fade only, no slide  
- Dialog: opacity only  
- Skeleton: static gray — no shimmer  
- Cursor active pulse: static dot  
- Timeline stagger: disabled  

Implementers must query media preference at root AOS provider.

---

## Forbidden Animations

1. Parallax scroll  
2. Confetti / celebration on approve  
3. Shake on error (color + text sufficient)  
4. Auto-playing carousel on dashboard  
5. Infinite bounce loaders  
6. 3D transforms  
7. Motion on LifecycleBadge (static identity)  
8. Hover scale > 1.02 on cards  
9. Animated background gradients  
10. GIF mascots  

---

## Related Documents

- [22 Interaction System](./22_INTERACTION_SYSTEM.md)
- [19 Accessibility Guidelines](../aos-design-system/19_ACCESSIBILITY_GUIDELINES.md)
- [02 Design Tokens](../aos-design-system/02_DESIGN_TOKENS.md)
