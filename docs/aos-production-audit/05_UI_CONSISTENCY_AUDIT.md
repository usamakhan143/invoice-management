# 05 — UI Consistency Audit

**Reference:** `docs/aos-design-system/*`, `docs/aos-design-freeze/21_SCREEN_TEMPLATES.md`, `docs/aos-founder-experience/*`

---

## Layout Consistency

### PageShell / PageHeader Usage

| Pattern | Screens using | Consistent? |
|---------|:-------------:|:-----------:|
| `PageShell` wrapper | ST-01, 02, 03, 04, 12–19 (11 files) | **Yes** |
| `PageHeader` with title | Same 11 files | **Yes** |
| `ContentGrid` | ST-01 only (1/11) | **Underused** — intentional for dashboard |
| `ContextBanner` | ST-04 only | **Correct** — hub-specific |
| `StickyFooterBar` | ST-03, ST-05–11 | **Consistent** on workflow screens |
| Tab panels without PageShell | ST-04 child tabs | **Correct** — nested under hub layout |

### Critical Bug: PageHeader `description` vs `subtitle`

`PageHeader` accepts **`subtitle`**, not `description`:

```4:9:aos/presentation/layouts/PageHeader.tsx
export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  ...
}
```

**6 call sites pass `description=` — silently ignored, subtitles never render:**

| File | Line |
|------|------|
| `FounderDashboardScreen.tsx` | 59 |
| `KnowledgeScreen.tsx` | 244 |
| `RegistryScreen.tsx` | 169 |
| `RegistryDetailScreen.tsx` | 75 |
| `PlaybookScreen.tsx` | 186 |
| `QueueScreenTemplate.tsx` | 52 |

**3 screens correctly use `subtitle=`:** ST-02, ST-03, ST-04.

**Impact:** User-visible subtitle text missing on dashboard, catalog screens, and all queue screens.

---

### Loading State Inconsistency

| Screen | Loading pattern |
|--------|-----------------|
| ST-02, ST-03 | Loading inside `PageShell` |
| ST-01 | Bare `<LoadingState>` **outside** PageShell — loses `<main>` landmark during load |

---

## Spacing & Typography

| Check | Status | Evidence |
|-------|--------|----------|
| CSS custom properties for spacing | **Consistent** | `var(--space-stack-md)`, `var(--space-inline-md)` in layouts |
| Typography tokens | **Consistent** | `var(--font-size-display)`, `var(--font-size-body)` in PageHeader |
| Color tokens | **Consistent** | `var(--color-text-primary/secondary)` |
| Raw Tailwind overrides | **Minimal** | Some screens use raw `grid`/`flex` gaps instead of tokens — acceptable |
| Sprint doc ID confusion | **Documentation only** | Some docs label PageShell as C-051; C-051 is actually `StatusChip` |

---

## Responsive Consistency

| Screen | Mobile handling |
|--------|-----------------|
| ST-02 Delivery List | Desktop table + mobile card stack — **good** |
| ST-01 Dashboard | `ContentGrid` responsive columns |
| Catalog screens | Card grid with responsive columns |
| Engagement hub | Tab bar scrolls horizontally via C-061 |
| Dialogs / SidePanel | Full-width on small viewports via SidePanel CSS |

No broken responsive patterns found in source inspection.

---

## Naming Consistency

| Area | Status |
|------|--------|
| Screen file naming | `*Screen.tsx` — consistent |
| Hook naming | `use*Query`, `use*Mutation`, `use*ScreenState` — consistent |
| Component exports | PascalCase — consistent |
| Route paths | `/aos/*` prefix — consistent via `aos/config/routes.ts` |
| Query keys | Centralized in `aos/hooks/queries/keys.ts` — consistent |

---

## Accessibility Consistency

### Strengths

| Pattern | Implementation |
|---------|----------------|
| Focus trap | C-070 Dialog, C-063 SidePanel via `useFocusTrap.ts` |
| Modal semantics | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Tab navigation | C-061 `EngagementTabBar`: `role="tablist"`, `aria-selected`, `aria-controls` |
| Form wiring | C-005 `FormField`: `aria-describedby`, `aria-invalid` |
| Live regions | C-074 Toast `aria-live`; C-081 LoadingState `role="status"` |
| Required icon labels | C-002 `IconButton` requires `aria-label` prop |
| Search semantics | C-009 `SearchInput`: `role="searchbox"` |
| Dashboard landmarks | ST-01: 8× `aria-labelledby` section headings |

### Gaps

| Issue | Severity | Evidence |
|-------|----------|----------|
| Missing `role="tabpanel"` on live tab screens | **High** | Only dead `EngagementTabPlaceholder.tsx` sets it; 8 active tab screens do not |
| Limited axe test coverage | **Medium** | Only `Button.a11y.test.tsx` (C-001) |
| Interactive cards lack `aria-label` | **Medium** | C-044/C-045 set `role="button"` on div without supplemental label |
| ST-01 loading skips main landmark | **Low** | No `<main>` during initial load |
| PageHeader subtitles missing | **Medium** | Accessibility impact: supplementary context not exposed to sighted users (visual); screen readers still get title |

---

## Interaction Consistency

| Pattern | Consistent? | Notes |
|---------|:-----------:|-------|
| SidePanel open via URL param | **Yes** | `?pattern=`, `?module=`, `?entry=` |
| Filter state in URL | **Yes** | Catalog and delivery list screens |
| Primary action in PageHeader actions slot | **Yes** | ST-02, ST-03, ST-04 |
| Approval flows use C-072 | **Yes** | Requirements, prompts, evaluation tabs |
| Error recovery via C-082 + retry | **Yes** | All data-fetching screens |
| Empty states via C-080 | **Yes** | Lists and queues |
| AI content labeled via C-034 | **Yes** | Dashboard, requirements, prompts |

---

## Founder Experience Compliance (ST-01)

| Requirement | Status |
|-------------|--------|
| Decision surface, not analytics | **Met** — no charts, KPI walls, velocity |
| Attention Queue | **Met** — C-020/C-021 |
| No kanban/scrum | **Met** — verified across presentation |
| Quick Actions | **Met** — LinkButton navigation |
| Forbidden PM patterns | **Met** — ADR-012 aligned |

---

## UI Consistency Score

| Dimension | Score (0–10) |
|-----------|:------------:|
| Layout patterns | 8 |
| Design token usage | 9 |
| Responsive behavior | 8 |
| Naming | 9 |
| Accessibility | 6 |
| Interaction patterns | 8 |
| Screen template fidelity | 7 |

**Overall UI consistency:** **7.9/10** — strong token and interaction discipline undermined by PageHeader prop bug and incomplete tab panel semantics.

---

## Verdict

UI implementation is **visually and structurally consistent** with the frozen design system. Two concrete defects require fix before production: **`description` vs `subtitle` prop mismatch** (6 screens) and **missing `role="tabpanel"`** on engagement hub tabs. Neither was caught by automated tests.
