# 05 — AI Touchpoints

**Stage D0 — FXD**  
**Grounding:** `docs/aos-architecture/05_AI_ORCHESTRATION.md`, ADR-005, ADR-007, ADR-009, ADR-010

Every AI interaction is **propose → human decide → record evidence**.

---

## Touchpoint Map

| # | Stage | AI capability | Human gate | Output artifact |
|---|-------|---------------|------------|-----------------|
| 1 | Engagement intake | Summarize ERP customer/lead | Confirm scope | Intake notes |
| 2 | Template selection | Recommend delivery template | Select template | Template link |
| 3 | Requirement capture | Decompose scope into requirements | Edit items | Draft Requirement Set |
| 4 | Requirement clarification | Generate questions for ambiguities | Send to client / resolve | Clarification log |
| 5 | Requirement review | Consistency + coverage analysis | Approve set | Approved version |
| 6 | Reuse scan | Match requirements → registry | Accept/reject matches | Reuse Assessment |
| 7 | Module suggestion | Rank modules with rationale | Select modules | Recommendations |
| 8 | Net-new justification | Challenge missing reuse | Document override | Justification note |
| 9 | Architecture validation | Check Sidecar Law / layer boundaries | Acknowledge warnings | Validation report |
| 10 | Delivery plan draft | Phase outline from requirements | Approve plan | Plan draft |
| 11 | Prompt pack generation | Full sequenced pack | Approve pack | Prompt Pack version |
| 12 | Prompt artifact refinement | Per-prompt improve | Edit/approve | Artifact versions |
| 13 | Context assembly | Prioritize context budget | (automatic) | Context package |
| 14 | Pre-execution review | Prompt readiness check | Execute in Cursor | Readiness flag |
| 15 | Capture completeness | Missing fields detection | Complete capture | Session record |
| 16 | Cursor response pre-review | Diff summary vs criteria | Send to evaluation | Review notes |
| 17 | Evaluation scoring | Rubric auto-score | Accept/override | Evaluation record |
| 18 | Failure analysis | Root cause on fail | Approve revision | Failure analysis |
| 19 | Revision prompt | Targeted re-prompt | Approve revision | Revision artifact |
| 20 | QA coverage | Requirements ↔ evidence map | Complete QA | Coverage report |
| 21 | Handoff docs | Release notes draft | Approve publish | Handoff doc |
| 22 | Quality report | Aggregate metrics draft | Approve report | Quality Report |
| 23 | Retrospective draft | Timeline synthesis | Approve retro | Retrospective |
| 24 | Knowledge extraction | Pattern candidates | Promote/reject | Knowledge Pattern |
| 25 | Pattern promotion | Dedup vs existing knowledge | Merge decision | Knowledge update |
| 26 | Module registration | Suggest module metadata | Register/deprecate | Registry entry |
| 27 | Dashboard prioritization | Attention queue ranking | Act on item | (no artifact) |
| 28 | Risk detection | Stale/blocked heuristics | Investigate | Risk flag |
| 29 | Playbook assist | Contextual methodology help | Read | (no artifact) |
| 30 | Cross-engagement learning | “Similar engagement” recall | Optional apply | Context injection |

---

## AI Boundaries (Permanent)

AI must **never**:

- Approve requirements, prompts, or evaluations autonomously
- Write to ERP or BOS records
- Mark lifecycle states passed without domain gates
- Execute Cursor sessions
- Delete or rewrite historical evidence
- Invent modules not backed by registry or code evidence

---

## Context Assembler Touchpoints

Every generation call uses prioritized context (architecture doc order):

1. Approved requirements
2. Reuse candidates / selected modules
3. Relevant knowledge patterns
4. ERP customer facts (read port)
5. BOS initiative constraints (read port)
6. Agency template baseline

**FXD rule:** UI shows **context preview** before founder approves AI-heavy outputs (prompt packs, evaluations).

---

## AI UX Patterns

| Pattern | Use |
|---------|-----|
| **Draft panel** | AI output clearly labeled “Draft — review before approving” |
| **Explain** | “Why AI suggests this” expandable on every recommendation |
| **Diff** | Show changes between AI draft and approved version |
| **Confidence** | Show when low — force human review |
| **Regenerate** | Allowed on drafts only — never on approved versions |

---

## Orchestration Router (Conceptual Routes)

| Route | Trigger |
|-------|---------|
| `requirement.analyze` | Requirement set saved |
| `reuse.scan` | Planning entered |
| `prompt.generate` | Requirements approved + reuse done |
| `evaluation.score` | Session capture submitted |
| `revision.generate` | Evaluation failed |
| `retro.draft` | Handoff complete |
| `knowledge.extract` | Retrospective approved |
| `dashboard.prioritize` | Dashboard load |

Implementation deferred — FXD defines **when** AI fires, not **how**.

---

## Related Documents

- [06 Cursor Workflow](./06_CURSOR_WORKFLOW.md)
- [07 Decision Map](./07_DECISION_MAP.md)
- [09 UX Principles](./09_UX_PRINCIPLES.md)
