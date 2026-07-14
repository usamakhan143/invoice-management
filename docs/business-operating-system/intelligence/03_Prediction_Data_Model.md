# 03 — Prediction Data Model

**Purpose:** Identify historical data to collect over several years so future probability calculations are accurate—**without implementing prediction or AI.**

**Principle:** Prediction is applied statistics over clean history. Missing data today = blind forecasts tomorrow.

**10-year test:** For each data item: *Which future probability does this improve?*

---

## 1. Prediction Layers (What We're Preparing For)

| Future capability | Requires |
|-------------------|----------|
| "Will this initiative succeed?" | Labeled outcomes + investment + funnel signals |
| "What ROI range should we expect?" | Historical ROI distributions by type/channel |
| "When will we run out of budget?" | Burn rate time series |
| "Should we hire?" | Capacity + initiative load + ROI per head |
| "Which channel will convert?" | Channel × funnel × outcome history |
| "Will this client pay on time?" | Payment delay distributions |
| "Should we pivot?" | Checkpoint signals vs hypothesis class |

---

## 2. Financial Data

### Investment

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Ground truth for all ROI | ROI range, payback period, budget exhaustion date |
| **Collect:** attributed expenses, allocation %, date, category, currency | P(success \| spend level), optimal budget |

### Revenue

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Return side of ROI | Revenue timing forecasts, LTV |
| **Collect:** attributed invoices, paid date, amount, customer link | P(positive ROI by month N) |

### Profit

| Why it matters | Predictions enabled |
|----------------|---------------------|
| True economic outcome | Net ROI classifiers, venture viability |
| **Collect:** revenue − acquisition − delivery (when delivery attributed) | Margin prediction by initiative type |

### Marketing Cost

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Isolates CAC drivers | Channel budget optimization |
| **Collect:** marketing-tagged expenses + channel dimension | CAC by channel, diminishing returns |

### Delivery Cost

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Separates win from fulfill | P(profitable client \| acquisition channel) |
| **Collect:** attributed labor/contractor/project costs | Scope creep risk, pricing models |

### Cash Flow

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Survival vs accounting profit | Runway, scale timing |
| **Collect:** bank movements, invoice timing, expense timing | Cash crunch probability |

### Payment Delays

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Revenue ≠ cash | Working capital needs |
| **Collect:** invoice due vs paid date, customer payment history | DSO forecasting, bad debt risk |

### Refunds

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Reduces true return | Adjusted ROI, offer quality |
| **Collect:** expense returns, credit notes linked to initiative/client | Refund rate by offer/channel |

---

## 3. Funnel & Acquisition Data

### Lead Source

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Channel effectiveness | Source → client conversion priors |
| **Collect:** lead source, campaign, date, attributed initiative | P(client \| source) |

### Campaign

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Creative/offer isolation | Campaign-level ROI prediction |
| **Collect:** campaign id, spend, leads, outcomes | Winner detection, fatigue |

### Meetings

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Mid-funnel signal | Lead quality classifier |
| **Collect:** meeting held date, lead id, initiative | P(close \| meeting) |

### Proposals

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Sales efficiency | Pipeline conversion |
| **Collect:** proposal sent date, value, outcome | Close rate prediction |

### Clients

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Outcome label for acquisition | CAC payback, LTV |
| **Collect:** customer created, linked lead, first invoice | Client quality by channel |

### Conversion Rates

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Funnel compression | Bottleneck identification |
| **Collect:** stage transitions with timestamps | P(next stage \| current stage, channel) |

**Note:** Derive conversion rates from events—do not store as manual KPIs.

---

## 4. Execution & Delivery Data

### Delivery Time

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Capacity and satisfaction | Project duration estimates |
| **Collect:** project start/end, milestone dates | P(on-time delivery \| complexity) |

### Project Complexity

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Margin variance driver | Pricing, staffing |
| **Collect:** scope size, team size, tech stack tags (future) | Overrun probability |

### Capacity

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Can we absorb another bet? | P(initiative success \| team load) |
| **Collect:** active initiatives, owner workload, delivery backlog | Hire timing |

### Team Size / Hiring

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Scaling constraint | ROI per employee |
| **Collect:** headcount snapshots over time, hire dates, roles | Marginal ROI of hire |

---

## 5. Strategic & Judgment Data

### Decision Outcomes

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Founder judgment calibration | P(decision correct \| context) |
| **Collect:** expected vs actual, evaluation date, decision type | Recommendation quality |

### Lessons Learned

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Transfer learning across ventures | Similar bet warnings |
| **Collect:** structured lesson on close, tagged by failure mode | "You tried this before" |

### Confidence Levels

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Separates luck from skill in labels | Calibrated forecasts |
| **Collect:** decision confidence (high/med/low) at commit time | Brier score, calibration curves |

### Business Risks

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Explicit uncertainty | Risk-adjusted ROI |
| **Collect:** risk register entries linked to initiative (future) | P(downside scenario) |

### Hypothesis Text

| Why it matters | Predictions enabled |
|----------------|---------------------|
| Semantic similarity across bets | Cluster priors for new initiatives |
| **Collect:** hypothesis, success criteria | NLP-assisted priors (Year 4+, not required Day 1) |

---

## 6. Contextual Dimensions (Features for All Models)

| Dimension | Predictions enabled |
|-----------|---------------------|
| Venture age | Maturity effects |
| Business model type | Cross-venture transfer |
| Season / quarter | Seasonality |
| Macro tags (optional) | External shocks |
| Initiative duration | Time-to-ROI curves |
| Budget size bucket | P(success \| budget quartile) |

---

## 7. Minimum Viable Prediction Dataset (Year 1–2)

Collect reliably before building prediction engine:

| # | Data | Source |
|---|------|--------|
| 1 | Initiative create/activate/close dates | BOS |
| 2 | Closure outcome + lesson | BOS |
| 3 | Hypothesis + success criteria | BOS |
| 4 | All expense attributions | BOS sidecar |
| 5 | Invoice attributions | BOS + ERP |
| 6 | Lead → meeting → client path | ERP + attribution |
| 7 | Decisions with expected + actual | BOS |
| 8 | Channel on lead/spend | ERP + BOS |

**~30+ closed initiatives with full attribution** = first useful prior distributions.

---

## 8. Data NOT Needed for Early Prediction

| Item | Why skip early |
|------|----------------|
| Real-time sentiment | Noise |
| Manual probability fields | Compute from history |
| 50 custom KPIs | Derive from facts |
| External market data | Add only when internal signal saturated |

---

## 9. Label Quality (Critical for Year 3+)

Prediction models need **honest labels**:

| Label | Definition |
|-------|------------|
| Initiative success | closureOutcome = success AND ROI > threshold |
| Initiative failure | killed OR ROI < 0 |
| Partial success | positive ROI but missed successCriteria |
| Decision correct | evaluated verdict matches outcome |

**Garbage labels** (closing without lesson, unattributed spend) → **garbage prediction**.

---

## 10. Summary Matrix

| Data category | Start collecting | Prediction payoff |
|---------------|------------------|-------------------|
| Investment + revenue attribution | **Now** | ROI, CAC, scale/kill |
| Funnel events | Year 1–2 | Conversion models |
| Decision evaluation | Year 1 | Judgment calibration |
| Delivery cost | Year 2 | Net margin prediction |
| Capacity / hiring | Year 2–3 | Scale timing |
| Risk + confidence | Year 2 | Calibrated forecasts |
| Cross-venture history | Year 3+ | Transfer learning |

---

*Next: `04_Data_Lifecycle.md` — immutability, versioning, archive.*
