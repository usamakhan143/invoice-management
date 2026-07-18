# 07 — Founder Decision Map

**Stage D0 — FXD**  
**Grounding:** Domain gates, ADR-004 through ADR-010, Delivery Engagement lifecycle

Every decision is **explicit**, **evidenced**, and **traceable**.

---

## Decision Catalog

### D1 — Open Delivery Engagement

| Field | Content |
|-------|---------|
| **Inputs** | ERP customer (required); optional lead, BOS initiative; agency type; engagement type; delivery lead; scope summary |
| **Outputs** | Delivery Engagement in `draft`/`intake` |
| **AI recommendation** | Template fit; repeat-client context; scope risk flags |
| **Required evidence** | Valid ERP customer exists (read port) |
| **Business impact** | Starts delivery cost clock; commits agency capacity |

---

### D2 — Link BOS Initiative

| Field | Content |
|-------|---------|
| **Inputs** | Initiative ID; audit note if post-planning |
| **Outputs** | `bosInitiativeId`, `bosVentureId` on engagement |
| **AI recommendation** | Strategic alignment summary from BOS read port |
| **Required evidence** | Initiative exists same company |
| **Business impact** | Enables ROI attribution read-only; locks initiative changes post-planning without audit |

---

### D3 — Approve Requirement Set

| Field | Content |
|-------|---------|
| **Inputs** | Draft Requirement Set; AI coverage report |
| **Outputs** | Immutable approved version; `currentApprovedRequirementSetId` |
| **AI recommendation** | Coverage gaps; ambiguous items; approval readiness |
| **Required evidence** | All critical requirements have acceptance criteria |
| **Business impact** | Legal/contractual scope lock for delivery; unlocks planning |

---

### D4 — Accept Reuse Assessment

| Field | Content |
|-------|---------|
| **Inputs** | AI module matches; registry metadata |
| **Outputs** | Selected modules; reuse rate baseline |
| **AI recommendation** | Ranked modules with fit scores |
| **Required evidence** | Assessment record linked to engagement |
| **Business impact** | Reduces build cost/time (ADR-010) |

---

### D5 — Approve Net-New Development

| Field | Content |
|-------|---------|
| **Inputs** | Reuse assessment showing gaps; written justification |
| **Outputs** | Net-new scope documented |
| **AI recommendation** | Challenge if reuse overlooked |
| **Required evidence** | Justification note when reuse candidates exist |
| **Business impact** | Higher cost/risk; future module registration expected |

---

### D6 — Approve Prompt Pack

| Field | Content |
|-------|---------|
| **Inputs** | Draft Prompt Pack; context preview |
| **Outputs** | Approved pack version; unlocks `building` |
| **AI recommendation** | Constraint check; sequence sanity |
| **Required evidence** | Approved requirements; reuse decisions recorded |
| **Business impact** | Authorizes all Cursor execution for pack |

---

### D7 — Select Prompt Artifact to Execute

| Field | Content |
|-------|---------|
| **Inputs** | Approved artifact queue |
| **Outputs** | Cursor session started |
| **AI recommendation** | Next in sequence |
| **Required evidence** | Prior artifacts evaluated pass (sequence gate) |
| **Business impact** | Developer time allocation |

---

### D8 — Submit Session Capture

| Field | Content |
|-------|---------|
| **Inputs** | Files changed, notes, self-assessment, transcript excerpt |
| **Outputs** | Complete Cursor Session record |
| **AI recommendation** | Completeness validation |
| **Required evidence** | Required capture fields per template |
| **Business impact** | Enables evaluation — blocks progress without it |

---

### D9 — Accept Evaluation Result

| Field | Content |
|-------|---------|
| **Inputs** | AI rubric scores; capture evidence |
| **Outputs** | Pass → next artifact; Fail → iteration path |
| **AI recommendation** | Dimension scores + explanation |
| **Required evidence** | Evaluation record |
| **Business impact** | Quality gate — prevents bad code propagating (ADR-007) |

---

### D10 — Override Evaluation (Exception)

| Field | Content |
|-------|---------|
| **Inputs** | Failed evaluation; written audit note |
| **Outputs** | Override recorded append-only |
| **AI recommendation** | Warn on override patterns |
| **Required evidence** | Audit note mandatory |
| **Business impact** | Accepts technical debt risk — visible to founder |

---

### D11 — Approve Revision Prompt

| Field | Content |
|-------|---------|
| **Inputs** | Failure analysis; revision draft |
| **Outputs** | New artifact version approved for re-run |
| **AI recommendation** | Minimal fix scope |
| **Required evidence** | Link to failed evaluation |
| **Business impact** | Additional Cursor cycle cost |

---

### D12 — Pass QA / Complete QA Gate

| Field | Content |
|-------|---------|
| **Inputs** | Requirement coverage matrix; QA checklist |
| **Outputs** | `qaComplete` flag; quality report draft |
| **AI recommendation** | Uncovered requirements |
| **Required evidence** | All critical requirements mapped to verification |
| **Business impact** | Client delivery authorization |

---

### D13 — Approve Quality Report

| Field | Content |
|-------|---------|
| **Inputs** | Draft Delivery Quality Report |
| **Outputs** | Approved report (immutable) |
| **AI recommendation** | Metric anomalies |
| **Required evidence** | Evaluations aggregated |
| **Business impact** | Handoff quality record |

---

### D14 — Confirm Handoff

| Field | Content |
|-------|---------|
| **Inputs** | Handoff checklist; client sign-off note |
| **Outputs** | Engagement `handoff` → retrospective path |
| **AI recommendation** | Handoff doc draft |
| **Required evidence** | QA complete |
| **Business impact** | Client relationship milestone |

---

### D15 — Approve Retrospective

| Field | Content |
|-------|---------|
| **Inputs** | AI-drafted retrospective; team edits |
| **Outputs** | `completedRetrospectiveId`; unlocks close |
| **AI recommendation** | Lesson extraction |
| **Required evidence** | Retrospective submitted |
| **Business impact** | Organizational learning captured |

---

### D16 — Promote Knowledge Pattern

| Field | Content |
|-------|---------|
| **Inputs** | Candidate patterns from retro |
| **Outputs** | Knowledge Pattern records |
| **AI recommendation** | Dedup merge suggestions |
| **Required evidence** | Source engagement link |
| **Business impact** | Future delivery speed (ADR-009) |

---

### D17 — Register / Update Module

| Field | Content |
|-------|---------|
| **Inputs** | Proven code; metadata draft |
| **Outputs** | Registry entry or version bump |
| **AI recommendation** | Module boundary suggestion |
| **Required evidence** | Passing evaluation on module work |
| **Business impact** | Reuse rate for future clients (ADR-008) |

---

### D18 — Close Engagement

| Field | Content |
|-------|---------|
| **Inputs** | All gates satisfied |
| **Outputs** | `closed` terminal state |
| **AI recommendation** | Closure checklist verification |
| **Required evidence** | Retrospective complete |
| **Business impact** | Capacity freed; engagement auditable forever |

---

### D19 — Pause Engagement

| Field | Content |
|-------|---------|
| **Inputs** | Active engagement |
| **Outputs** | `paused` with `pausedFromState` preserved |
| **AI recommendation** | None required |
| **Required evidence** | None |
| **Business impact** | Stops forward progress — visible on dashboard |

---

### D20 — Cancel Engagement

| Field | Content |
|-------|---------|
| **Inputs** | Cancel reason (required) |
| **Outputs** | `cancelled` — record preserved |
| **AI recommendation** | None |
| **Required evidence** | Non-empty reason |
| **Business impact** | Terminates delivery — append-only history (ADR-014) |

---

## Decision Frequency (Typical Engagement)

| Frequency | Decisions |
|-----------|-----------|
| **Once** | D1, D3, D6, D15, D18 |
| **Few** | D2, D4, D5, D13, D14, D16, D17 |
| **Many** | D7, D8, D9, D11 (per prompt artifact) |
| **Rare** | D10 (override), D19, D20 |

---

## Related Documents

- [01 Founder Journey](./01_FOUNDER_JOURNEY.md)
- [04 Dashboard Philosophy](./04_DASHBOARD_PHILOSOPHY.md)
- [08 Notification Philosophy](./08_NOTIFICATION_PHILOSOPHY.md)
