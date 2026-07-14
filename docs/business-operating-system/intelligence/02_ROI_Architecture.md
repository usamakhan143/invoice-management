# 02 — ROI Architecture

**Purpose:** Define ROI philosophy and calculation model across the operating system—without implementing a KPI engine.

**Core belief:** ROI is not a dashboard number. It is **the answer to whether a strategic bet returned more value than it consumed**, traceable to source facts, preserved historically, and comparable across ventures and time.

**10-year test:** Every ROI definition must be reproducible from stored facts years later.

---

## 1. ROI Principles

### 1.1 Computed, Never Typed

ROI is always derived from:

```
Investment  = Σ (attributed costs)
Return      = Σ (attributed revenue) − delivery costs (when attributed)
Net ROI     = (Return − Investment) / Investment
```

Manual ROI entry is forbidden—it cannot be audited or used for prediction.

### 1.2 Sidecar Attribution Law

ERP records remain authoritative for amounts. BOS attributions explain **which bet** an ERP fact funded. ROI restatements happen via attribution supersede/void—not ERP mutation.

### 1.3 Snapshots for Audit, Facts for Truth

`amountSnapshot` on attributions preserves ROI at link time. Live ROI recomputes from current ERP reads when needed. Historical reports may freeze snapshots for closed periods.

### 1.4 Scope Hierarchy

ROI rolls up and drills down:

```
Portfolio (company)
  └── Venture
        └── Initiative
              └── Campaign / Experiment (future)
                    └── Channel
                          └── Client / Project (ERP)
```

Each level answers a different founder question.

### 1.5 Time Is a First-Class Dimension

ROI without time is misleading. Every ROI view supports:

- **Point in time** — as of today
- **Period** — month, quarter, initiative lifetime
- **Cohort** — initiatives started in Q2 2026

---

## 2. ROI Components

| Component | Source | Sign |
|-----------|--------|------|
| **Acquisition investment** | Attributed marketing, ads, tools, agency fees | Cost |
| **Delivery investment** | Attributed labor, contractor, infra for fulfillment | Cost |
| **Overhead allocation** | Optional % attribution to initiatives | Cost |
| **Gross revenue** | Attributed invoices (paid) | Return |
| **Refunds / returns** | Attributed expense returns, credit notes | Reduces return or investment |
| **Capital cost** | Attributed loan interest (future) | Cost |

**Gross ROI (acquisition-focused):**

```
Gross ROI = (Attributed Revenue − Acquisition Investment) / Acquisition Investment
```

**Net ROI (full initiative economics, when delivery attributed):**

```
Net ROI = (Attributed Revenue − Acquisition Investment − Delivery Investment) / Total Investment
```

Start with **gross ROI at initiative level**; add delivery as attribution matures.

---

## 3. ROI by Scope

### 3.1 Initiative (Primary Unit)

**Question:** *Was this bet worth it?*

| Metric | Formula |
|--------|---------|
| Total investment | Σ active expense attributions × allocation % |
| Total revenue | Σ active invoice attributions × allocation % |
| Budget utilization | investment / budget |
| Burn rate | investment / days active |
| Gross ROI | (revenue − investment) / investment |
| Payback period | first date cumulative revenue ≥ investment |

**Decisions enabled:** Scale, optimize, pivot, kill, reallocate budget.

**History:** Frozen at initiative close—final ROI becomes immutable portfolio record.

---

### 3.2 Venture

**Question:** *Is this business line economically viable?*

| Metric | Formula |
|--------|---------|
| Venture investment | Σ initiative investments + venture-level attributions |
| Venture revenue | Σ initiative revenue attributions |
| Initiative win rate | closed success / closed total |
| Average initiative ROI | mean(initiative gross ROI) |
| Active bet count | count(active initiatives) |

**Rollup rule:** Sum attributed facts where `ventureId` matches; exclude archived initiatives from active views, include in historical.

**Decisions enabled:** Continue venture, wind down, hire venture lead, portfolio weight.

---

### 3.3 Campaign (Future)

**Question:** *Did this campaign produce clients at acceptable CAC?*

| Metric | Formula |
|--------|---------|
| Campaign investment | Σ attributions tagged to campaign |
| Campaign leads | attributed leads |
| Campaign clients | attributed customers from campaign leads |
| CAC | investment / clients |
| Campaign ROI | (client revenue − investment) / investment |

**Requires:** BosCampaign + lead/campaign links + expense attribution.

---

### 3.4 Channel

**Question:** *Which channel deserves more capital?*

| Metric | Formula |
|--------|---------|
| Channel investment | Σ attributions by channel (Meta, Referral, etc.) |
| Channel leads / clients / revenue | attributed funnel facts |
| Channel CAC, CPL, ROI | standard formulas |
| Channel mix % | channel investment / total investment |

**Requires:** Channel dimension on attributions or ERP lead source mapped to BosChannel.

---

### 3.5 Client

**Question:** *Was this client profitable relative to what we spent to win them?*

| Metric | Formula |
|--------|---------|
| Client acquisition cost | Σ attributions on lead→customer path for initiative |
| Client LTV | Σ invoices for customer (lifetime or period) |
| Client ROI | (LTV − CAC) / CAC |

**Requires:** Lead attribution + customer link + invoice attribution.

---

### 3.6 Project (ERP Delivery)

**Question:** *Did we make margin on delivery?*

| Metric | Formula |
|--------|---------|
| Project revenue | invoices for project/customer |
| Project delivery cost | attributed time, contractors, tools |
| Project margin | revenue − delivery cost |
| Project margin % | margin / revenue |

**Distinction:** Initiative ROI = **acquisition bet**. Project margin = **fulfillment**. Conflating them hides unprofitable delivery.

---

### 3.7 Time

**Question:** *When did ROI turn positive? Is efficiency improving?*

| View | Use |
|------|-----|
| ROI curve | cumulative (revenue − investment) over time |
| Monthly ROI | period investment vs period revenue |
| Initiative age cohorts | compare Q1 vs Q2 starts |
| Seasonality | year-over-year same initiative type |

**Requires:** `startDate`, `closedAt`, dated attributions, dated ERP facts.

---

## 4. ROI States & Lifecycle

```
PLANNING     → ROI undefined (no attribution)
ACTIVE       → ROI provisional (updates as facts arrive)
CHECKPOINT   → ROI directional (enough data for optimize/kill)
CLOSING      → ROI finalizing (lock attributions)
CLOSED       → ROI immutable (portfolio learning record)
ARCHIVED     → ROI read-only historical
```

**Provisional vs final:** Founders must see label—"Early signal" vs "Final ROI"—to avoid false precision.

---

## 5. ROI History & Learning Preservation

### 5.1 What Gets Frozen on Initiative Close

| Artifact | Immutable after close |
|----------|---------------------|
| Final investment total | Yes |
| Final revenue total (at close) | Yes |
| Closure outcome + lesson | Yes |
| Attribution set | Locked (no new links; void only via supersede audit) |
| Decision log | Append-only |

### 5.2 ROI Restatement

When attribution is voided/superseded **before close**, ROI recalculates with audit trail.

After close, restatements require **explicit reopen** (founder decision)—rare, logged.

### 5.3 Portfolio Memory

Closed initiative ROI records feed:

- Prior distribution for similar hypotheses
- Channel benchmarks
- Budget planning for next initiative
- Prediction training labels (success/fail + ROI magnitude)

**Storage concept (future):** `BosRoiSnapshot` at close—denormalized for fast portfolio queries without replaying all attributions.

---

## 6. Multi-Currency & Consolidation

| Rule | Approach |
|------|----------|
| Initiative budget currency | Native currency for initiative ROI |
| Venture rollup | Convert at ERP exchange rate on fact date |
| Portfolio (multi-venture) | Reporting currency per company setting |

**10-year:** Store original currency + amount always; conversion is view-layer.

---

## 7. Data Quality & ROI Integrity

| Signal | Meaning |
|--------|---------|
| Unattributed spend % | ROI understated—fix before deciding |
| Unattributed revenue % | ROI overstated on cost-only view |
| Attribution age vs ERP edit | Reconciliation alert |
| Duplicate active attribution | Blocked by domain rules |

**Founder rule:** No scale/kill verdict when >X% money lacks attribution story.

---

## 8. ROI Maturity Roadmap (Conceptual)

| Phase | Capability |
|-------|------------|
| **Now (slice)** | Initiative investment; expense attribution |
| **Phase 1B** | + invoice revenue; net investment |
| **Phase 2** | + lead/funnel; CAC; channel ROI |
| **Phase 3** | + delivery cost; project margin; full net ROI |
| **Phase 4** | Portfolio ROI; cross-venture benchmarks; frozen snapshots |

---

## 9. Anti-Patterns

| Anti-pattern | Why fatal for 10-year ROI |
|--------------|---------------------------|
| ROI without attribution | Unanswerable "why" |
| Attribution without time | No burn, no cohorts |
| Channel ROI without lead link | Fake marketing metrics |
| Single blended company ROI | Hides losing ventures |
| Deleting closed initiative data | Destroys training data |

---

## 10. Summary

ROI architecture centers on **initiative as the bet**, **attribution as the bridge**, **venture as the portfolio line**, **time as the honesty check**. Campaign, channel, client, and project are **dimensions** of the same attributed facts—not separate accounting systems.

**History preservation** at initiative close is as important as live ROI—without it, Year 3 prediction has no labels.

---

*Next: `03_Prediction_Data_Model.md` — historical data for future probability.*
