# 05 — Pilot Dashboard (Information Architecture)

**Context:** Digikinz Client Acquisition System initiative has **completed** (or is in steady-state evaluation).  
**Audience:** Founder of Mobile App Development Agency  
**Purpose:** Define what information a founder dashboard must surface—**no UI, no wireframes, no components**.

---

## 1. Dashboard Purpose

Answer one meta-question:

> **“Was the Digikinz Client Acquisition System worth it—and what do I do next?”**

The dashboard is **initiative-centric** (BosInitiative as hub), with venture rollup and channel drill-down—not an ERP clone.

---

## 2. Information Hierarchy

```
Level 0 — Executive verdict (3 numbers + 1 label)
Level 1 — Investment & return summary
Level 2 — Funnel performance
Level 3 — Channel comparison
Level 4 — Decision & learning log
Level 5 — Risk, bottleneck, recommended action
Level 6 — Data trust & attribution health
```

---

## 3. Level 0 — Executive Verdict

| Field | Definition | Source |
|-------|------------|--------|
| **Initiative status** | closed (success) / active / killed / pivoted | BosInitiative |
| **Net ROI %** | (Attributed revenue − net investment) / net investment | KPI engine |
| **Verdict label** | Scale / Optimize / Pivot / Kill (derived or manual decision) | BosDecision + KPI thresholds |
| **Period** | Initiative start → close (or “as of today”) | BosInitiative dates |

**Founder sees first:** “Digikinz Client Acquisition — SUCCESS — Net ROI 142% — Recommendation: Scale”

---

## 4. Level 1 — Investment & Return

### 4.1 Investment block

| Question | Metric | Formula / source |
|----------|--------|------------------|
| How much have I invested? | **Total investment** | Σ attributed expenses |
| How much is still committed? | **Budget remaining** | Initiative.budget − total investment |
| What is actual net spend? | **Net investment** | Total investment − returns |
| Am I running out of budget? | **Budget utilization %** | total investment / budget |
| How fast am I burning? | **Burn rate** (monthly) | investment / days active × 30 |
| Where did money go? | **Investment by category** | Group by cost center OR expense category (enriched) |
| Where did money go (growth)? | **Investment by channel** | Group by BosAcquisitionChannel |

### 4.2 Return block

| Question | Metric | Formula / source |
|----------|--------|------------------|
| How much revenue did this produce? | **Total attributed revenue** | Σ attributed invoices/payments |
| Was it worth it? | **Gross ROI / Net ROI** | Doc 08 formulas |
| What profit did we make? | **Gross profit** (partial) | Revenue − acquisition investment (excludes delivery unless engagement linked) |
| Full profit? | **Net profit** (future) | Revenue − acquisition − attributed delivery cost |

### 4.3 Expected vs actual (initiative)

| Field | Source |
|-------|--------|
| successCriteria (text) | BosInitiative |
| Target KPIs (future) | BosMetricDefinition targets |
| Actual KPIs | BosMetricSnapshot / live compute |
| Variance | actual − target |

---

## 5. Level 2 — Funnel Performance

Assumes funnel stages are tracked (CRM and/or BosFunnelStageEvent).

| Question | Metric | Stages |
|----------|--------|--------|
| How many leads came? | **Total leads** | Lead generated |
| How many meetings happened? | **Meetings held** | Meeting |
| How many proposals were sent? | **Proposals sent** | Proposal |
| How many deals closed? | **Clients closed** | Client |
| Lead → meeting? | **Meeting rate** | % |
| Meeting → proposal? | **Proposal rate** | % |
| Proposal → client? | **Close rate** | % |
| Lead → client? | **Overall conversion** | % |
| Where is the funnel leaking? | **Drop-off by stage** | 1 − stage(n+1)/stage(n) |
| How long to close? | **Sales cycle length** | avg(close date − lead date) |
| What's still possible? | **Pipeline value** | Σ open proposal amounts |

### Funnel visualization (IA only)

```
Leads (N) → Meetings (n1) → Proposals (n2) → Clients (n3)
              ↓ drop        ↓ drop           ↓ drop
           [bottleneck]  [bottleneck]    [bottleneck]
```

Each stage tile shows: **count**, **conversion from prior**, **benchmark/target** (future).

---

## 6. Level 3 — Channel Comparison

For Digikinz, minimum channels:

| Channel | Questions |
|---------|-----------|
| **Meta Ads** | Spend, leads, CPL, meetings, CAC, revenue, ROI |
| **Referral** | Same metrics |
| **Automation/GHL** (cost channel) | Spend only unless leads tagged |

| Question | Metric |
|----------|--------|
| Which channel is most efficient? | CAC by channel |
| Which produces most leads? | Lead source distribution |
| Which produces best quality? | Meeting rate by channel (future) |

---

## 7. Level 4 — Efficiency Metrics (CAC / CPL)

| Question | Metric |
|----------|--------|
| What does a lead cost? | **CPL** = investment / leads |
| What does a client cost? | **CAC** = investment / clients closed |
| Is CAC improving over time? | CPL/CAC trend (weekly/monthly snapshots) |

**Scope:** Initiative-level default; drill-down to channel and experiment.

---

## 8. Level 5 — Decision & Learning Log

| Question | Information |
|----------|-------------|
| What did we decide? | BosDecision list (filter: initiative) |
| Did it work? | expectedOutcome vs actualOutcome (evaluated decisions) |
| What did we learn on close? | closureReason + lessonLearned + BosLessonLearned (future) |
| What assumptions failed? | BosAssumption status (future) |

**Sort:** Most recent first; highlight unevaluated active decisions.

---

## 9. Level 6 — Risks, Bottlenecks, Next Action

### 9.1 Upcoming risks

| Risk signal | Example (Digikinz) |
|-------------|-------------------|
| Budget > 90% utilized | “Meta spend will exhaust budget in ~12 days” |
| CPL rising 3 weeks straight | “Creative fatigue suspected” |
| Close rate below assumption | “Offer/pricing mismatch” |
| Attribution coverage low | “ROI may be unreliable” |

**Source (future):** BosRisk entities + KPI trend rules + Doc 13 decision engine.

### 9.2 Biggest bottleneck

**Definition:** Funnel stage with largest absolute or relative drop-off.

| Output | Example |
|--------|---------|
| Stage name | “Meeting → Proposal” |
| Drop-off % | 62% |
| Supporting count | 40 meetings → 15 proposals |

### 9.3 Next recommended action

**Definition:** Single prioritized recommendation (advisory—not automated execution).

| Trigger | Example recommendation |
|---------|-------------------------|
| High meetings, low proposals | “Review proposal template and closer follow-up SLA” |
| High CPL, low lead quality | “Refresh Meta creative; narrow audience” |
| Positive ROI, budget remaining | “Scale Meta budget 25% — decision draft ready” |
| Negative ROI, initiative past end date | “Close initiative; capture lesson; open pivot successor” |

**Source (future):** Doc 13 Decision Engine rules; until then: manual founder interpretation from sections 4–6.

---

## 10. Level 7 — Data Trust

| Question | Metric |
|----------|--------|
| Can I trust these numbers? | **Attribution coverage** — % of relevant expenses/invoices/leads attributed |
| What's unattributed? | List of high-value unattributed ERP records (read-only links) |
| Last snapshot date | BosMetricSnapshot timestamp |

---

## 11. Dashboard Sections (Layout IA)

| Section ID | Title | Primary questions |
|------------|-------|-------------------|
| `S0` | Verdict | Worth it? Scale or kill? |
| `S1` | Investment & budget | Spent, committed, burn |
| `S2` | Revenue & ROI | Return, profit, vs target |
| `S3` | Funnel | Leads → clients, drop-offs |
| `S4` | Channels | Meta vs Referral efficiency |
| `S5` | Unit economics | CPL, CAC, trends |
| `S6` | Decisions & lessons | Institutional memory |
| `S7` | Alerts | Risks, bottleneck, next action |
| `S8` | Data health | Attribution coverage |

**Default view:** S0 + S1 + S2 + S3 (founder daily).  
**Drill-down:** Channel (S4), Decisions (S6), Alerts (S7).

---

## 12. Data Dependencies (Which BOS Pieces Must Exist)

| Section | Minimum architecture |
|---------|---------------------|
| S0–S2 (investment/ROI) | BosAttribution (expense + invoice) + KPI engine + Initiative budget |
| S3 (funnel) | Lead attribution + BosFunnelStageEvent OR CRM stage mapping |
| S4 (channels) | BosAcquisitionChannel + attribution channel dimension |
| S5 (CPL/CAC) | S3 + S1 |
| S6 (decisions) | BosDecision ✅ (implemented) |
| S7 (alerts) | KPI trends + BosRisk + rules (Phase 3+) |
| S8 (trust) | Attribution coverage KPI |

---

## 13. What This Dashboard Is Not

- Not a replacement for Meta Ads Manager, GoHighLevel, or CRM lead views
- Not a project management dashboard for client delivery
- Not a general ERP finance dashboard (ReportsPage unchanged)
- Not a real-time operational inbox for setters/closers

It is the **founder’s strategic command center for one initiative’s economic outcome**.

---

## 14. Pilot Success Criteria (Dashboard Validation)

The information architecture is **validated** if a founder reviewing a completed Digikinz initiative can answer **all** of the following from BOS-sourced data (without spreadsheets):

1. Total invested and remaining budget  
2. Leads, meetings, proposals, clients (counts)  
3. Revenue and ROI  
4. CPL and CAC  
5. Conversion rates by stage  
6. Best/worst channel  
7. Expected vs actual on key decisions  
8. Biggest bottleneck stage  
9. Whether to scale, optimize, pivot, or kill  
10. Whether attribution coverage supports trust in the numbers  

**Current architecture:** Can define this IA fully; **cannot populate all sections** until Phase 1B–2 modules exist (see doc 06).
