# 10 — Product Philosophy

**Stage D0 — FXD**  
**Grounding:** ADR-001, ADR-012, `docs/aos-architecture/01_AOS_VISION.md`

---

## What AOS Is

AOS is an **AI-first Development Operating System** for software agencies.

It governs how approved requirements become evaluated code — and how each delivery makes the next one faster.

---

## What AOS Is Not

AOS is **not** project management with AI bolted on.

---

## Comparison Matrix

| Dimension | Jira / ClickUp / Monday / Asana | Linear | AOS |
|-----------|--------------------------------|--------|-----|
| **Unit of work** | Task / Issue | Issue | Requirement → Prompt Artifact → Session |
| **Progress signal** | Status column / % complete | Issue state | Lifecycle state + evaluation evidence |
| **Planning** | Backlog grooming | Cycles (light) | Approved Requirement Set + Prompt Pack |
| **Execution** | Developer picks tasks | Developer picks issues | Cursor runs approved prompts only |
| **Quality proof** | “Done” checkbox | Done + PR | Evaluation rubric pass |
| **Reuse** | Not native | Not native | Module Registry first (ADR-010) |
| **Learning** | Retrospective optional | Not core | Knowledge Engine + Registry (mandatory path) |
| **AI role** | Add-on summaries | Add-on | Core orchestration layer |
| **Client data** | Often duplicated CRM | N/A | ERP Sidecar — never duplicated |
| **Strategy link** | Not native | Not native | BOS initiative read-only link |

---

## Why Jira Fails the Agency AOS Use Case

Jira optimizes **coordination visibility** across large teams.

Agencies delivering client software with Cursor need:

- Versioned prompt context — not story descriptions
- Evaluation gates — not workflow transitions
- Reuse registry — not component epics
- Append-only evidence — not editable history

Jira’s task model **actively hides** the artifacts that make AI delivery work.

---

## Why ClickUp / Monday Fail

They generalize across industries — construction, marketing, software.

AOS specializes in **software delivery for agencies** with:

- Agency type profiles (web/mobile/AI/SaaS)
- Cursor execution model
- Sidecar integration with existing ERP/BOS stack

Generic flexibility becomes **wrong defaults** for founders.

---

## Why Asana Fails

Asana excels at cross-functional task coordination.

AOS replaces tasks with **evidence chains**:

```
Requirement v3 → Prompt Artifact v2 → Session → Evaluation pass → Knowledge
```

Asana has no concept of prompt versioning or evaluation gates.

---

## Why Linear Is Closest — But Still Different

Linear respects craft: fast, minimal, developer-respected.

AOS shares aesthetic goals but different ontology:

| Linear | AOS |
|--------|-----|
| Issue | Prompt Artifact |
| Cycle | Lifecycle phase (domain state) |
| Triage | Evaluation queue |
| Done | Evaluation pass + evidence |

Linear is **team issue tracking**. AOS is **delivery intelligence + AI orchestration**.

AOS may feel Linear-*like* in UI calm — never Linear-*equivalent* in domain.

---

## AOS Differentiators (Product Moat)

1. **Reuse-first economics** — every engagement increases registry value
2. **Prompt as contract** — what Cursor runs is approved, versioned, evaluable
3. **Evaluation gate** — quality is proven, not asserted
4. **Three-layer stack** — ERP/BOS/AOS each own truth; no duplication
5. **Compounding knowledge** — retrospectives feed future AI context
6. **Agency-type templates** — not one-size Scrum

---

## Messaging Rules (Go-to-Market Alignment)

**Say:**

- “Development Operating System”
- “AI-assisted delivery with proof”
- “Reuse-first client delivery”

**Never say:**

- “Project management for agencies”
- “Jira alternative”
- “AI writes your code autonomously”

---

## Permanent Product Boundaries (ADR-012)

Will never become:

- Generic task manager
- Sprint planning tool
- Client billing system (ERP)
- Strategic portfolio tool (BOS)

May add later (without violating ADR-012):

- Optional due dates as metadata
- Capacity hints on dashboard
- Client portal (read-only deliverable view)

---

## Related Documents

- [01 Founder Journey](./01_FOUNDER_JOURNEY.md)
- [09 UX Principles](./09_UX_PRINCIPLES.md)
- [12 Final FXD Report](./12_FINAL_FXD_REPORT.md)
