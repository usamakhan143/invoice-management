# 27 — UI Review Standard

**Stage D1.5 — AOS Design Freeze**  
**Status:** Mandatory checklist before any screen ships

Every AOS screen implementation requires **UI review approval** against this checklist. Fail any **Blocker** item → do not merge.

---

## Review Process

1. Implementer completes self-check against this document  
2. Reviewer maps screen to **Screen Template ID** (ST-xx) from [21_SCREEN_TEMPLATES.md](./21_SCREEN_TEMPLATES.md)  
3. Reviewer verifies component IDs (C-xxx) only — no inventing  
4. Sign-off recorded in PR description: `UI-Review: ST-xx PASS`  

---

## Blockers vs Warnings

| Severity | Meaning |
|----------|---------|
| **Blocker** | Must fix before merge |
| **Warning** | Fix before release; may merge with ticket |

---

## Accessibility (Blocker)

- [ ] Keyboard path completes primary flow without mouse  
- [ ] Focus visible on all interactive elements  
- [ ] Dialog/SidePanel: focus trap, Esc close, focus restore  
- [ ] Icons paired with text on status — not color-only  
- [ ] Form errors linked via `aria-describedby`  
- [ ] AI draft region programmatically labeled  
- [ ] WCAG 2.1 AA contrast for text and controls (verified in implementation)  
- [ ] `prefers-reduced-motion` honored per [23 Motion System](./23_MOTION_SYSTEM.md)  

---

## Performance (Warning)

- [ ] Initial skeleton — no blank white screen > 200ms  
- [ ] Polling pauses when tab hidden  
- [ ] No realtime listeners Phase 1 unless doc amended  
- [ ] Load more — not unbounded list render  
- [ ] Images/icons SVG — no unoptimized assets  

---

## Hierarchy (Blocker)

- [ ] One primary action per PageHeader / StickyFooterBar region  
- [ ] Information order matches ST-xx template hierarchy  
- [ ] AttentionQueue / NBA above analytics on dashboard  
- [ ] ApprovalPanel visible without scroll on laptop viewport (1280×800) for gate screens  

---

## Spacing (Blocker)

- [ ] Region gaps use tokens from Layout System — no arbitrary px  
- [ ] Card padding uses `space-card-padding`  
- [ ] Button groups use `space-inline-md`  

---

## Typography (Blocker)

- [ ] Page title uses display/heading tokens  
- [ ] Version IDs use mono caption  
- [ ] No font sizes outside token scale  

---

## Responsiveness (Blocker)

- [ ] Tested at `breakpoint-md` and `breakpoint-lg` minimum  
- [ ] ApprovalPanel sticky on mobile gate screens  
- [ ] Queue tables: card-list or column hide — not broken layout  
- [ ] SidePanel full-screen on mobile  

---

## Loading (Blocker)

- [ ] Screen template loading pattern implemented  
- [ ] Button loading on submit — no double submit  
- [ ] AI generation shows generating banner — not silent wait  

---

## Error Handling (Blocker)

- [ ] ErrorState with Retry on fetch failures  
- [ ] Inline validation on forms  
- [ ] Gate failures show InAppAlert + path to resolve  
- [ ] No generic “Something went wrong” alone  

---

## Permissions (Blocker)

- [ ] PermissionGate on approve/execute actions  
- [ ] Nav items hidden per fail-closed rule  
- [ ] No approve button that fails only on submit  

---

## Feature Flags (Blocker)

- [ ] FeatureFlagGate on flagged routes/tabs  
- [ ] No dead links to disabled modules  

---

## AI Transparency (Blocker)

- [ ] AI Draft banner on all AI-generated content  
- [ ] Approve flow uses ApprovalDialog with AI addendum when applicable  
- [ ] AI explanations labeled — not presented as fact  
- [ ] No auto-approve after generation  

---

## Evidence Visibility (Blocker)

- [ ] Gate screens link to EvidencePanel or equivalent  
- [ ] Evaluation shows pass/fail + score caption rule  
- [ ] Timeline events on retrospective / overview preview  
- [ ] Approved artifacts show approver + timestamp  

---

## Consistency (Blocker)

- [ ] Copy follows [25 Content Guidelines](./25_CONTENT_AND_COPY_GUIDELINES.md)  
- [ ] Icons follow [24 Iconography](./24_ICONOGRAPHY_SYSTEM.md) map  
- [ ] Motion follows [23 Motion System](./23_MOTION_SYSTEM.md)  
- [ ] Interactions follow [22 Interaction System](./22_INTERACTION_SYSTEM.md)  

---

## Component Reuse (Blocker)

- [ ] Only C-xxx catalog components — or composition documented  
- [ ] No duplicate button variants  
- [ ] No custom table when DataTable applies  
- [ ] No custom modal when Dialog patterns apply  

---

## Navigation (Blocker)

- [ ] URL reflects engagement + tab  
- [ ] Queue rows navigate to engagement — no inline approve  
- [ ] Breadcrumb accurate  
- [ ] Sidecar opens new tab  

---

## Design Language Compliance (Blocker)

- [ ] Feels operational — not PM tool  
- [ ] No kanban, sprints, tasks, story points  
- [ ] Lifecycle badges neutral-first  
- [ ] Calm color — semantic only  

---

## Anti-Patterns (Blocker if present)

- [ ] Multiple primary buttons in one region  
- [ ] Bulk approve on queues  
- [ ] Optimistic approve  
- [ ] Undo toast on gates  
- [ ] Embedded Cursor IDE  
- [ ] ERP customer create inside AOS  
- [ ] KPI dashboard widgets on founder dashboard  
- [ ] Generic “Save” on approve gates  
- [ ] Keyboard shortcut for approve  

---

## Review Sign-Off Template

```
Screen Template: ST-xx
Route: /aos/...
Reviewer:
Date:
Blockers: 0
Warnings: {n} — tickets: ...
Verdict: PASS | FAIL
```

---

## Related Documents

- [29 Implementation Contract](./29_IMPLEMENTATION_CONTRACT.md)
- [28 Design Decision Principles](./28_DESIGN_DECISION_PRINCIPLES.md)
- [Design System Report](../aos-design-system/20_FINAL_DESIGN_SYSTEM_REPORT.md)
