# 01 — Data Strategy

**Purpose:** Justify every important piece of business data the system collects—or plans to collect—against a 10-year standard:

> *If I use this system continuously across multiple businesses, will this data significantly improve ROI analysis, business intelligence, probability predictions, and founder decision making?*

**Scope:** Frozen BOS architecture + existing ERP facts + intelligence layers (ROI → BI → Prediction → Founder Intelligence).  
**Status:** Product and data architecture review — no implementation.

---

## 1. Data Layer Model

```
Layer 1 — Accounting (ERP)     → What happened (immutable operational facts)
Layer 2 — ROI Tracking (BOS)   → Why it happened + what it funded (context sidecar)
Layer 3 — Business Intelligence → Patterns across ventures, time, channels
Layer 4 — Business Prediction  → Probability from historical distributions
Layer 5 — Founder Intelligence → Judgment compounding + recommended actions
```

**Principle:** Layer 2+ cannot exist without Layer 1. Layer 4 cannot exist without Layer 2–3 quality. **Data collected today is training data for Year 3+ predictions.**

---

## 2. BOS Core Entities — Field Justification

### 2.1 BosVenture

| Field | Why it exists | ROI | BI | Prediction | Founder decisions |
|-------|---------------|-----|----|-----------|-------------------|
| `id` | Stable reference across ventures, attributions, decisions | Portfolio rollups | Cross-venture comparison | Venture survival curves | "Which business line to fund?" |
| `companyId` | Multi-tenant isolation | Company-scoped ROI | Portfolio by legal entity | Entity-level cash models | Delegation boundaries |
| `name` | Human identity of business unit | Report labels | Venture ranking dashboards | Name is not predictive—identity only | "What am I building?" |
| `description` | Strategic thesis in prose | Context for ROI interpretation | NLP/clustering (future) | Weak alone; pairs with outcomes | Onboarding, board narrative |
| `status` | Lifecycle (planned → archived) | Exclude archived from active ROI | Active vs wind-down mix | State transition probabilities | Scale, pause, kill venture |
| `businessModelId` | Classification (agency, SaaS, etc.) | ROI benchmarks by model | Cross-venture pattern library | Prior for new ventures | "Have we done this model before?" |
| `ownerUserId` | Accountability (not audit) | Owner-attributed decision quality | Workload / capacity per owner | Owner effect on outcomes | Delegation, escalation |
| `createdById` / `updatedById` | Audit trail | Fraud/error detection | Process compliance | Low | Governance |
| `createdAt` / `updatedAt` | Temporal ordering | Time-series ROI by venture age | Venture maturity curves | Cohort analysis | "How long in this state?" |

**10-year test:** All fields pass except `businessModelId` (Future until taxonomy exists)—still justified as classification anchor.

---

### 2.2 BosInitiative

| Field | Why it exists | ROI | BI | Prediction | Founder decisions |
|-------|---------------|-----|----|-----------|-------------------|
| `id` | Bet identity | Initiative ROI | Initiative scoreboard | Bet outcome models | Focus allocation |
| `companyId` | Tenancy | Scoped investment sums | Company dashboards | — | — |
| `ventureId` | Parent business unit | Venture rollup ROI | Initiative mix per venture | Venture-initiative fit | Capital allocation |
| `name` | Bet label | Reporting | Ranking | — | Communication |
| `hypothesis` | Testable belief | Explains ROI variance | Similar-hypothesis clustering | Feature for success classifier | Scale / kill / pivot |
| `successCriteria` | Definition of "won" | Target vs actual ROI | Goal attainment rate | Label for supervised learning | Close evaluation |
| `status` | draft → active → closed | Eligibility for attribution | Pipeline health | Transition probabilities | Pause, activate |
| `budget.amount` / `budget.currency` | Planned cap | Budget utilization % | Burn forecasting | Budget overrun probability | Increase / cut budget |
| `startDate` / `endDate` | Planned window | Burn rate, ROI per day | Schedule adherence | Duration vs outcome | Checkpoint timing |
| `closedAt` | Actual end | ROI for completed period | Cycle time | Time-to-ROI distributions | Retrospectives |
| `closureOutcome` | success / killed / pivoted | Win rate | Outcome mix | Outcome predictors | Portfolio pruning |
| `closureReason` | Why closed | Qualitative ROI context | Failure mode taxonomy | Risk signals | Kill decisions |
| `lessonLearned` | Institutional memory | Improves next bet ROI | Lesson search | Transfer learning across ventures | Avoid repeated mistakes |
| `successorInitiativeId` / `predecessorInitiativeId` | Pivot lineage | ROI chain across pivots | Pivot success rate | Pivot path modeling | Continue vs restart |

**10-year test:** All pass. `successCriteria` is in domain but **not yet on create form**—must be collected before close for prediction labels.

---

### 2.3 BosDecision

| Field | Why it exists | ROI | BI | Prediction | Founder decisions |
|-------|---------------|-----|----|-----------|-------------------|
| `title` | Commitment summary | Links spend spikes to choices | Decision frequency | — | Daily queue |
| `context` | Trigger for decision | Explains ROI changes | Context clustering | — | "Why now?" |
| `decision` | What was chosen | Causal narrative for ROI | Decision type mix | Policy learning | Commitment |
| `decisionType` | strategic / budget / tactical | ROI impact by type | Decision taxonomy | — | Ceremony level |
| `status` | proposed → evaluated | Pending vs closed loop | Decision debt metrics | — | Inbox |
| `expectedOutcome` | Pre-registration | Expected vs actual ROI | Forecast accuracy | Calibration training | Before committing |
| `actualOutcome` | Post evaluation | Validates ROI assumptions | Decision quality score | Founder judgment model | Learning |
| `alternatives` | Rejected paths | Counterfactual ROI (future) | Option analysis | — | Better decisions |
| `decidedAt` / `evaluatedAt` | Review cadence | Time-to-outcome | Decision latency | Optimal review windows | Reckoning |
| `decidedById` | Accountability | Decision quality by role | — | — | Delegation |
| `supersedesDecisionId` | Lineage | ROI narrative continuity | Reversal patterns | Regime change detection | Changed mind |
| `ventureId` / `initiativeId` | Scope | Scoped decision ROI | — | — | Context |

**10-year test:** All pass. **Critical for prediction:** `expectedOutcome` + `actualOutcome` + dates must be enforced over time or decision log becomes useless.

---

### 2.4 BosAttribution (Sidecar)

| Field | Why it exists | ROI | BI | Prediction | Founder decisions |
|-------|---------------|-----|----|-----------|-------------------|
| `sourceType` + `sourceId` | Link ERP fact to bet | **Core ROI numerator/denominator** | Spend/revenue by initiative | Feature engineering | "Why this spend?" |
| `initiativeId` / `ventureId` | Rollup targets | Initiative & venture ROI | Portfolio views | — | Allocation |
| `allocationPercent` | Split attribution | Partial ROI | Shared cost analysis | — | Fair allocation |
| `amountSnapshot` / `currencySnapshot` | Point-in-time audit | Stable ROI if ERP edits | Reconciliation | — | Trust |
| `status` | active / void / superseded | Net investment | Data quality KPIs | — | Corrections |
| `attributedById` | Who linked | Process quality | — | — | Governance |
| `supersededById` / `voidReason` | Correction trail | ROI restatement history | Error rates | — | Audit |

**10-year test:** Pass. **Sidecar law non-negotiable**—ERP stays source of truth; attribution is interpretive layer for ROI.

---

## 3. ERP Operational Facts (Layer 1 — Read by BOS)

These are not BOS fields but **must remain attributable** for ROI.

| Source | Key fields | ROI role | 10-year |
|--------|------------|----------|---------|
| **Expense** | amount, currency, date, category, payee | Investment numerator | **Required** |
| **Invoice** | amount, status, paid date, customer | Revenue numerator | **Required** |
| **Lead** | source, status, campaign, dates | Funnel ROI, CAC | **Required** |
| **Customer** | created date, linked lead | LTV, client ROI | **Required** |
| **Loan** | principal, repayment | Capital cost | Optional early |
| **Bank deposit** | amount, date | Cash reality check | Optional early |

**Gap today:** Vertical slice attributes **expenses only**. Invoice and lead attribution are **required for complete ROI**—architecture supports them; collection does not yet.

---

## 4. Future BOS Entities (Frozen, Not Built)

| Entity | Data purpose | 10-year |
|--------|--------------|---------|
| BosCampaign | Campaign-level ROI | Required for channel/campaign ROI |
| BosChannel | Meta, LinkedIn, Referral | Required for CAC by channel |
| BosExperiment | A/B within initiative | Required for creative/channel optimization |
| BosMetricSnapshot | KPI time series | Required for BI dashboards |
| BosFunnelStage | Lead → client stages | Required for conversion prediction |

**Do not collect manually**—derive from ERP + attribution where possible.

---

## 5. Product Review — Venture & Initiative Create Forms

Evaluated for **10-year founder use**. Classifications:

- **Required** — Must collect at creation; prediction/ROI degrades without it
- **Optional** — Improves intelligence but not blocking
- **System Generated** — Never ask user; set by backend
- **Future** — In domain/roadmap; not on form yet
- **Deprecated** — Should not exist in founder-facing UX

### 5.1 Venture Form

| Field | Classification | Why |
|-------|----------------|-----|
| **Venture Name** | **Required** | Primary key for human memory, portfolio, rollups. Without it, no venture identity across 10 years. |
| **Description** | **Optional** | Improves BI clustering and onboarding; not needed for ROI math. Collect early if low friction. |
| **Owner** | **System Generated** (default) + **Future** (Assign picker) | Domain field **Required** in data model; form should NOT expose raw UID. Default = logged-in user. When teams exist → searchable assignee. See §6. |
| **Planned Start Date** | **Future** | Venture lifecycle uses status, not dates, today. Useful for portfolio timeline BI in Year 2+. Not on current form—correct. |
| **Planned End Date** | **Future** | Same as above; wind-down is event-driven, not date-driven, today. |
| **Success Hypothesis** | **Deprecated** at venture level | Hypothesis belongs to **Initiative** (bet), not venture (business line). Venture has description/thesis instead. |
| **Budget** | **Future** at venture level | Venture-level capital envelope useful Year 2+ for portfolio allocation. Initiative budget is correct granularity today. |
| **Currency** | **Future** at venture level | Pairs with venture budget. Initiative currency sufficient for slice. |

**Form gaps (acceptable for slice, not for Year 2 ROI):**

- No `businessModelId` classification → limits cross-venture benchmarking
- Owner exposed as UID → product defect, not data strategy defect

---

### 5.2 Initiative Form

| Field | Classification | Why |
|-------|----------------|-----|
| **Venture** (select) | **Required** | Without parent venture, no portfolio ROI rollup. |
| **Name** | **Required** | Bet identity for 10-year archive. |
| **Hypothesis** | **Optional** (should become **Required** before activate) | **Critical for prediction.** Success classifier needs labeled beliefs. Optional at draft, required at activate. |
| **Budget** | **Optional** | Enables utilization KPI. ROI works without budget (absolute investment only). Strongly recommended. |
| **Currency** | **Optional** (required if budget set) | Multi-currency ventures need this for correct ROI. |
| **Success Criteria** | **Future** on form | In domain; needed before close for outcome labels. Should appear at activate or mid-flight. |
| **Planned Start Date** | **Future** | In domain (`startDate`); enables burn rate, schedule BI. Set on activate, not create. |
| **Planned End Date** | **Future** | In domain (`endDate`); checkpoint and review scheduling. |
| **Owner** | **System Generated** / **Future** | Initiative owner not separate field today—venture owner + `createdById` suffice for slice. Dedicated `ownerUserId` on initiative is **Future** if initiative owner ≠ venture owner. |

---

### 5.3 Fields That Should NOT Exist on Founder Create Forms

| Field | Why exclude |
|-------|-------------|
| Firebase UID | Infrastructure; destroys UX and trust |
| `companyId` | System generated from auth |
| `createdById` / `status` | System generated |
| Internal IDs | Never |

---

## 6. Owner Field Review (Product Only)

### Current state

- Backend stores `ownerUserId` on BosVenture
- Frontend shows raw Firebase UID (editable/read-only in slice)
- Table lists UID in Owner column

### Answers

**1. Should `ownerUserId` remain in the domain model?**

**Yes.** Accountability is a first-class strategic concept distinct from `createdById`. Over 10 years: multiple ventures, venture leads, delegated ownership, decision routing, and capacity planning all require a stable owner reference. Removing it would force inference from audit fields—lossy and wrong when founder creates but GM owns.

**2. Should Firebase UID ever be visible to founders?**

**No.** UIDs are implementation detail. They communicate nothing about judgment, responsibility, or ROI. Exposing them signals "database admin tool," not "operating system for founders." Display names + email internally; UID only in logs/support.

**3. Should the field be hidden and automatically assigned to the logged-in user?**

**Yes, for default case.** When a founder creates a venture, `ownerUserId = actorUserId` silently. Zero form friction. Matches 90% of Year 1 usage.

**4. When teams exist, should Owner become a searchable "Assign Owner" picker?**

**Yes.** Search by display name / email from company users. Store UID backend-only. Required when:

- Founder creates venture for a Venture Lead
- Owner changes on succession
- ROI and decision debt route to accountable person

**5. Recommended UX and long-term scalability**

| Stage | UX |
|-------|-----|
| **Year 1 (solo founder)** | Hidden; auto-assign creator |
| **Year 1–2 (small team)** | Optional "Assign owner" dropdown on create/edit; default self |
| **Year 3+ (portfolio)** | Owner on venture card as **name**; filter initiatives by owner; notification routing |

**Table column:** Show `displayName` (fallback email), not UID.

**10-year test:** Pass. Owner data improves delegation, decision quality scoring, and capacity models. UID visibility fails the test—should not exist in UX.

---

## 7. Data We Must Start Collecting Now (Priority)

Even before BI/prediction modules:

| Priority | Data | Why now |
|----------|------|---------|
| P0 | Expense attributions to initiatives | Investment ROI foundation (slice ✅) |
| P0 | Decisions with expected outcome | Calibration data |
| P0 | Close lessons on invested initiatives | Supervised labels |
| P1 | Invoice attributions | Revenue ROI |
| P1 | Lead attributions | CAC, funnel ROI |
| P1 | `successCriteria` on initiatives | Outcome labels |
| P1 | Decision evaluation (actual vs expected) | Founder judgment model |
| P2 | Channel/campaign on attributions | Channel ROI |
| P2 | `startDate` on activate | Burn rate |
| P2 | Venture `businessModelId` | Cross-business priors |

---

## 8. Data We Should NOT Collect

| Data | Why not |
|------|---------|
| Manual ROI percentages | Compute from facts; manual entry rots |
| Duplicate ERP facts in BOS | Sidecar law |
| AI-generated predictions stored as facts | Predictions are derived, versioned, reproducible |
| Vanity metrics without attribution | Noise for 10-year models |
| Firebase UIDs in founder UI | No decision value |

---

## 9. Summary

**Today's vertical slice collects the seed of Layer 2:** venture, initiative, decision, expense attribution, investment summary, close lesson.

**Insufficient for full ROI (Layer 2 complete):** revenue attribution, lead/funnel linkage, decision evaluation, success criteria.

**Sufficient for 10-year foundation:** Yes—if we expand attribution and decision reckoning before scaling form fields. Every field in the frozen model justifies its existence; several belong **off create forms** and **on lifecycle moments** (activate, checkpoint, close).

**Owner field:** Keep in domain; hide from default UX; never show UID.

---

*Next: `02_ROI_Architecture.md` — how ROI composes across scopes and time.*
