# 01 — Design Language

**Stage D1 — AOS Design System**  
**Grounding:** FXD UX Principles, ADR-012, ADR-001

---

## North Star

AOS UI feels like **Stripe clarity + Linear calm + Apple restraint + Vercel factual progress** — inside the existing ERP shell.

It must never feel like a Bootstrap admin panel, Material dashboard, or Jira clone.

---

## Product Personality

| Attribute | Expression |
|-----------|------------|
| **Confident** | Clear hierarchy; one primary action |
| **Calm** | Limited color; whitespace over borders |
| **Factual** | Domain lifecycle labels; evidence over percentages |
| **Trustworthy** | AI drafts labeled; approvals explicit |
| **Professional** | Agency founder audience — not playful consumer |
| **Precise** | Monospace for IDs/versions; prose for narrative |

---

## Visual Hierarchy (Conceptual)

1. **Primary action** — single filled button per view region
2. **Lifecycle / gate status** — badge or banner at top of engagement views
3. **Content** — cards and tables with minimal chrome
4. **Metadata** — secondary text, smaller size token
5. **History / audit** — collapsed by default

---

## Density Modes

| Mode | Use |
|------|-----|
| **Comfortable (default)** | Founder dashboard, approval panels, forms |
| **Compact** | Global queues, table rows, attention queue |
| **Expanded** | AI draft review, evaluation evidence, prompt artifact body |

User-selectable density is **future** — FXD default is Comfortable with Compact queues.

---

## Color Philosophy (Semantic Only)

Colors express **meaning**, not decoration.

| Semantic role | Use |
|---------------|-----|
| **Primary** | Primary CTA, current engagement focus |
| **Neutral** | Chrome, borders, secondary buttons |
| **Success** | Evaluation pass, approved version — not generic “green check” spam |
| **Warning** | Borderline evaluation, stale risk, draft awaiting review |
| **Danger** | Cancel, delete forbidden actions, failed evaluation |
| **AI accent** | AI-generated content border/label — distinct from primary |
| **Approved accent** | Human-approved immutable artifact — distinct from AI |
| **Sidecar** | ERP/BOS external links |

**Rule:** Lifecycle states use **neutral badges** with text labels — not rainbow columns.

---

## Typography Philosophy

| Role | Content |
|------|---------|
| **Display** | Page titles — engagement name, dashboard |
| **Heading** | Section titles, card titles |
| **Body** | Prose, descriptions, AI output |
| **Label** | Form labels, table headers |
| **Caption** | Timestamps, metadata, version IDs |
| **Mono** | Document IDs, version hashes, artifact sequence numbers |

No more than **3 size steps** visible in one viewport region.

---

## Motion Philosophy

| Type | Rule |
|------|------|
| **Micro** | Button press, toggle — ≤150ms |
| **Panel** | Side panel slide — 200–250ms |
| **Page** | Cross-fade content — no elaborate transitions |
| **Forbidden** | Confetti, bounce, parallax, celebratory animations on approve |

Respect `prefers-reduced-motion`.

---

## Icon Philosophy

- Outline icons default; filled only for active nav
- Icons always paired with text on primary actions
- Lifecycle icons optional — **text label required** for accessibility
- AI sparkle/icon only on AI-labeled regions — not global branding clutter

---

## Content Tone (Microcopy)

| Context | Tone |
|---------|------|
| Empty states | Direct next step — “Create an engagement when ERP customer exists” |
| Errors | What failed + what to do — no error codes alone |
| AI | “Draft — review before approving” |
| Gates | “Approval required to start Cursor execution” |
| Sidecar | “View in ERP” / “View in BOS” |

---

## Layout Personality

- **Single column hero** for next best action
- **Two column** for list + detail on wide screens only
- **No dashboard widget grid** of equal-weight tiles
- **Engagement hub** uses horizontal tabs — not vertical wizard

---

## Anti-Patterns (Design Language)

| Anti-pattern | Why forbidden |
|--------------|---------------|
| Rainbow status columns | Kanban association |
| 6+ equal KPI tiles | Dashboard philosophy violation |
| Unlabeled icon-only actions | Founder clarity |
| Hiding failed evaluations | Trust / evidence |
| “100% complete” progress rings | Misleading without evaluation |
| Generic “Submit” on approve gates | Must say Approve / Reject explicitly |

---

## ERP Shell Relationship

AOS content renders inside existing ERP app shell (`Sidebar`, auth, permissions).

| Layer | Owner |
|-------|-------|
| Global sidebar, auth, profile | ERP — extend with AOS nav group |
| AOS content area | AOS design language |
| Modals/dialogs over AOS | AOS patterns |

AOS content area is visually **subtle distinction** (spacing, typography) — not a different product skin.

---

## Related Documents

- [02 Design Tokens](./02_DESIGN_TOKENS.md)
- [09 AI Components](./09_AI_COMPONENTS.md)
- [FXD 09 UX Principles](../aos-founder-experience/09_UX_PRINCIPLES.md)
