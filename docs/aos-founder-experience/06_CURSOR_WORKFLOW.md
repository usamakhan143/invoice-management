# 06 — Cursor Workflow

**Stage D0 — FXD**  
**Grounding:** ADR-006, `docs/aos-architecture/07_CURSOR_INTEGRATION.md`, Prompt Domain model

---

## Workflow Principle

```
AOS plans → Human approves → Cursor executes → AOS captures → AOS evaluates → Learn
```

Cursor is never the source of truth for requirements, prompts, or quality.

---

## Stage 1 — Prompt Generation

| Aspect | Detail |
|--------|--------|
| **Trigger** | Approved Requirement Set + Reuse Assessment complete |
| **Input** | Requirements, reuse selections, template, knowledge, context budget |
| **AI role** | Generate Prompt Pack with sequenced Prompt Artifacts |
| **Human role** | Review, edit drafts, approve pack |
| **Output** | Approved Prompt Pack version (immutable) |
| **Founder visibility** | Prompts tab + global Prompts queue |

**Gate:** Engagement cannot enter `building` without approved pack (domain invariant).

---

## Stage 2 — Prompt Versions

| Aspect | Detail |
|--------|--------|
| **Trigger** | Edit during draft; iteration after failed evaluation |
| **Input** | Prior artifact version + failure analysis |
| **AI role** | Produce new draft version with targeted changes |
| **Human role** | Approve new version — old version preserved |
| **Output** | Prompt Version chain (append-only) |
| **Founder visibility** | Version history on artifact |

**ADR-013:** Versions are immutable once approved.

---

## Stage 3 — Prompt Approval

| Aspect | Detail |
|--------|--------|
| **Trigger** | Founder/delivery lead reviews full pack |
| **Input** | Draft pack + AI readiness summary |
| **Human role** | Explicit approve action — not implicit save |
| **Output** | Approved pack; artifacts unlocked for Cursor |
| **Sidecar check** | AI validates no ERP/BOS write instructions in prompts |

---

## Stage 4 — Cursor Execution

| Aspect | Detail |
|--------|--------|
| **Trigger** | Developer selects approved artifact; copies to Cursor |
| **Integration level** | Phase 1: manual handoff (Level 1 per architecture doc) |
| **Human role** | Run Cursor agent/composer in workspace |
| **Output** | Work in repo (outside AOS); session start recorded in AOS |
| **Founder visibility** | Cursor tab — “in progress” |

**Rule:** Only **approved** artifact versions appear in execution queue.

---

## Stage 5 — Response Capture

| Aspect | Detail |
|--------|--------|
| **Trigger** | Session ends |
| **Input** | Capture template: files changed, decisions, self-assessment, transcript excerpt |
| **Human role** | Fill capture — required before evaluation |
| **Output** | Cursor Session record linked to Prompt Artifact |
| **AI assist** | Completeness check; missing field prompts |

**Phase 2+:** Structured capture templates (architecture Level 2).

---

## Stage 6 — Evaluation

| Aspect | Detail |
|--------|--------|
| **Trigger** | Capture submitted |
| **Input** | Capture + artifact acceptance criteria + rubric |
| **AI role** | Score dimensions; explain pass/fail |
| **Human role** | Accept score or override with audit note |
| **Output** | Evaluation record |
| **Gate** | Pass required before next artifact or lifecycle advance (ADR-007) |

---

## Stage 7 — Revision

| Aspect | Detail |
|--------|--------|
| **Trigger** | Evaluation fail or partial |
| **Input** | Failure analysis + original artifact |
| **AI role** | Generate revision prompt |
| **Human role** | Approve revision → re-execute in Cursor |
| **Output** | New session revision; prior attempts preserved |

**Philosophy:** Failures are **data**, not deleted history.

---

## Stage 8 — Acceptance

| Aspect | Detail |
|--------|--------|
| **Trigger** | Evaluation pass |
| **Input** | Passing evaluation |
| **Human role** | Acknowledge; advance to next artifact or phase gate |
| **Output** | Artifact marked complete; next prompt unlocked |

---

## Stage 9 — Knowledge Update

| Aspect | Detail |
|--------|--------|
| **Trigger** | Notable decision during session capture |
| **Input** | Capture decisions + evaluation notes |
| **AI role** | Suggest knowledge pattern candidates |
| **Human role** | Defer to retrospective or promote early |
| **Output** | Draft knowledge candidates |

---

## Stage 10 — Module Update

| Aspect | Detail |
|--------|--------|
| **Trigger** | Reusable code produced and proven |
| **Input** | Session files + reuse assessment |
| **AI role** | Suggest module registration metadata |
| **Human role** | Register at retrospective or explicit action |
| **Output** | Module Registry entry or version bump |

---

## Cursor Workflow Diagram

```
[Approved Requirement Set]
         │
         ▼
[AI: Generate Prompt Pack draft]
         │
         ▼
[Human: Approve Prompt Pack] ──gate──► building
         │
         ▼
┌─────────────────────────────────────┐
│  For each Prompt Artifact (sequence) │
│                                      │
│  Copy to Cursor → Execute session    │
│         │                            │
│         ▼                            │
│  Submit capture                      │
│         │                            │
│         ▼                            │
│  AI + Human: Evaluation            │
│         │                            │
│    ┌────┴────┐                       │
│   Pass      Fail                     │
│    │         │                       │
│    ▼         ▼                       │
│  Next     Revision prompt            │
│  artifact  → re-execute              │
└─────────────────────────────────────┘
         │
         ▼
[All artifacts pass + phase gates]
         │
         ▼
evaluating → delivering → handoff → retrospective → closed
```

---

## Founder Questions Answered

| Question | Where answered |
|----------|----------------|
| What is Cursor doing? | Cursor tab — session status |
| What should Cursor do next? | Next approved artifact in queue |
| Did Cursor output pass? | Evaluation tab |
| Can we proceed? | Evaluation pass + domain lifecycle gates |

---

## Related Documents

- [01 Founder Journey](./01_FOUNDER_JOURNEY.md)
- [05 AI Touchpoints](./05_AI_TOUCHPOINTS.md)
- [07 Decision Map](./07_DECISION_MAP.md)
