# 03 — BOS Mapping

**Pilot:** Digikinz Client Acquisition System  
**Architecture:** BOS v1.0 (frozen) + implemented Sprint 1–3 domain/infrastructure  
**Legend:**

- ✅ **Representable today** — existing entity, sidecar, or ERP module
- ⚠️ **Representable with planned architecture** — in frozen docs, not yet implemented
- ❌ **Gap** — cannot be represented without new architectural concept (see doc 04)

---

## 1. Mapping Table

| # | Journey Stage | BOS Module (conceptual) | Entity / Artifact | Relationship | Expected KPI | Expected Decision |
|---|---------------|-------------------------|-------------------|--------------|--------------|-------------------|
| 1 | **Idea** | Portfolio / Venture planning | **BosVenture** (Agency) + **BosInitiative** (Digikinz) in `draft` | Initiative `belongs_to` Venture | `active_initiatives` | “Charter Digikinz acquisition initiative” — **BosDecision** (strategic) |
| 2 | **Brand** | Initiative context (text) + ERP expenses | **BosInitiative** (`hypothesis`, `successCriteria`) + **ERP expenses** + **BosAttribution** | Expenses attributed to initiative | `total_investment`, `budget_utilization` | “Approve brand spend ceiling” — **BosDecision** (budget) |
| 3 | **Offer** | Strategic positioning | ⚠️ **BosOffer** (Doc 10 — not implemented) | Offer `supports` Initiative | — | “Finalize Digikinz offer stack & pricing” — **BosDecision** (strategic) |
| 4 | **Landing Page** | Experiment or external asset | ⚠️ **BosExperiment** OR manual note on Initiative | Experiment `within` Initiative | ⚠️ `funnel` metrics (Phase 2) | “Launch v1 landing page” — **BosDecision** (operational) |
| 5 | **Automation** | Channel + stack spend | ⚠️ **BosAcquisitionChannel** (Automation/GHL) + **ERP expenses** + **BosAttribution** | Channel `used_by` Initiative | `total_investment` by channel | “Select CRM/automation stack” — **BosDecision** (operational) |
| 6 | **Meta Campaign** | CRM campaign + BOS link | **ERP:Campaign** (existing CRM) + ⚠️ **BosCampaignLink** | CampaignLink `wraps` ERP:Campaign → Initiative + Channel (Meta) | `cost_per_lead`, spend by channel | “Set Meta daily budget at $X” — **BosDecision** (budget/channel) |
| 7 | **Lead** | CRM + attribution | **ERP:Lead** + **BosAttribution** (`sourceType: lead`) | Lead attributed to Initiative (+ Channel) | ⚠️ `total_leads`, CPL | “Qualify/disqualify lead source quality” — **BosDecision** (channel) |
| 8 | **Meeting** | Funnel stage | ⚠️ **BosFunnelStageEvent** (meeting_held) OR CRM activity | Event `for` Lead + Initiative | ⚠️ `meeting_rate` | “Change setter script” — **BosDecision** (operational) |
| 9 | **Proposal** | Funnel stage | ⚠️ **BosFunnelStageEvent** (proposal_sent) OR CRM stage | Event `for` Lead/Opportunity | ⚠️ `proposal_rate`, pipeline value | “Discount vs hold price” — **BosDecision** (strategic/budget) |
| 10 | **Client** | CRM conversion | **ERP:Lead** → **ERP:Customer** + ⚠️ funnel event (client_closed) | Customer `originates_from` attributed Lead | ⚠️ `close_rate`, CAC | “Accept client / reject fit” — **BosDecision** (strategic) |
| 11 | **Project Delivery** | Post-sale delivery | ⚠️ **BosDeliveryEngagement** (future) + **ERP expenses/invoices** | Engagement `fulfills` Client; optional link to Initiative for full P&L | ⚠️ profit, delivery margin | “Add scope / change timeline” — **BosDecision** (operational) |
| 12 | **Payment** | Revenue attribution | **ERP:Invoice** + **BosAttribution** (`sourceType: invoice`) | Invoice attributed to Initiative | ⚠️ `total_revenue`, `gross_roi`, `net_roi` | “Milestone billing structure” — **BosDecision** (budget) |
| 13 | **Referral** | Channel attribution | **ERP:Lead** (source=referral) + ⚠️ **BosAcquisitionChannel** (Referral) | Lead attributed to Referral channel | CPL/CAC by channel | “Launch referral incentive” — **BosDecision** (channel) |
| 14 | **Scale** | Initiative lifecycle | **BosInitiative** → `closed` / `pivot` / successor OR **BosVenture** status change | `successorInitiativeId` links pivot | ROI vs target, `burn_rate` | “Scale spend 2x” / “Kill initiative” — **BosDecision** (strategic) + closure lesson |

---

## 2. Entity Graph (Pilot Instance)

```
BosPortfolio (implicit — company scope)
    └── BosVenture: "Mobile App Development Agency"
            └── BosInitiative: "Digikinz Client Acquisition System"
                    ├── hypothesis: "Meta + GHL funnel will produce clients at <$X CAC"
                    ├── budget: { amount, currency }
                    ├── successCriteria: "N clients, ROI > Y% by date Z"
                    │
                    ├── BosDecision[] (charter, budget, channel, scale/kill)
                    │
                    ├── BosAttribution[] (sidecar — Phase 1B+)
                    │       ├── expense → Meta spend, brand, tools
                    │       ├── lead → CRM lead ids
                    │       └── invoice → client payments
                    │
                    ├── ⚠️ BosAcquisitionChannel[] (Meta, Referral, Automation)
                    ├── ⚠️ BosCampaignLink[] → ERP:Campaign
                    ├── ⚠️ BosExperiment[] (landing page tests)
                    ├── ⚠️ BosFunnelStageEvent[] (meeting, proposal, close)
                    └── ⚠️ BosDeliveryEngagement[] (per client project)
```

**ERP (unchanged, observed via read ports + attribution):**

```
expenses ──read──► BosAttribution ──► BosInitiative (Digikinz)
leads    ──read──► BosAttribution ──► BosInitiative
invoices ──read──► BosAttribution ──► BosInitiative
campaigns ──read──► BosCampaignLink ──► BosInitiative (planned)
```

---

## 3. Stage Detail — What BOS Stores vs Observes

| Stage | Stored in BOS (native) | Observed from ERP (read + sidecar) | External only |
|-------|------------------------|-------------------------------------|---------------|
| Idea | Venture, Initiative (draft), Decision | — | — |
| Brand | Initiative text, Decision, budget | Expenses (design, tools) | Creative files |
| Offer | Decision, Initiative successCriteria | — | Offer PDF |
| Landing Page | Decision, ⚠️ Experiment | Expenses (hosting, builder) | Page URL, analytics |
| Automation | Decision, ⚠️ Channel | Expenses (GHL subscription) | GHL config |
| Meta Campaign | Decision, ⚠️ CampaignLink | Expenses (ad spend), ⚠️ Campaign | Meta Ads Manager |
| Lead | Attribution sidecar | Lead records | — |
| Meeting | ⚠️ FunnelStageEvent | CRM activities (read) | Calendar |
| Proposal | ⚠️ FunnelStageEvent | CRM stage (read) | Proposal doc |
| Client | Decision, ⚠️ FunnelStageEvent | Customer conversion | Contract |
| Delivery | ⚠️ DeliveryEngagement | Expenses, time (future) | PM tool |
| Payment | — | Invoices | Bank |
| Referral | ⚠️ Channel | Leads | — |
| Scale | Initiative close/pivot, Decision, lesson | Aggregated KPIs | — |

---

## 4. KPI Mapping by Journey Phase

| Phase | KPIs founder expects | BOS KPI_KEY / Doc 08 | Status |
|-------|---------------------|----------------------|--------|
| Build (Brand–Automation) | Spend vs budget | `total_investment`, `budget_utilization` | ⚠️ 1B |
| Launch (Meta–Lead) | CPL, lead volume | `cost_per_lead`, total leads (Doc 08) | ⚠️ Phase 2 |
| Convert (Meeting–Client) | Meeting rate, close rate, CAC | `close_rate`, `customer_acquisition_cost` | ⚠️ Phase 2 |
| Monetize (Payment) | Revenue, ROI | `total_revenue`, `gross_roi`, `net_roi` | ⚠️ Phase 2 |
| Learn (Scale) | Expected vs actual | Decision `expectedOutcome` / `actualOutcome` | ✅ Decision entity |
| Trust | Data completeness | `attribution_coverage` | ⚠️ 1B |

---

## 5. Decision Mapping (Institutional Memory)

| Stage | Example decision | decisionType (implemented) |
|-------|------------------|----------------------------|
| Idea | “Proceed with Digikinz system vs other growth bets” | `strategic` |
| Offer | “Price at $15k vs $25k entry” | `strategic` |
| Meta | “$100/day vs $250/day ad spend” | `budget` |
| Channel | “Pause LinkedIn, all-in Meta” | `channel` |
| Sales | “Hire dedicated closer” | `operational` |
| Scale | “2x budget — ROI exceeded target” | `strategic` |
| Kill/Pivot | “Offer failed — pivot to enterprise ICP” | `pivot` |

**BosDecision** supports: context, alternatives, expectedOutcome, actualOutcome, evaluate lifecycle — sufficient for expected vs actual at decision level.

---

## 6. Lifecycle Mapping

| Object | Journey touchpoints | Lifecycle (Doc 11 / code) |
|--------|---------------------|---------------------------|
| **BosVenture** (Agency) | Idea → Scale | planned → active → … → archived |
| **BosInitiative** (Digikinz) | Idea → Scale | draft → active → paused → closed (success/killed/pivoted) |
| **BosAttribution** | Spend, Lead, Payment | active → superseded/void/disputed |
| **BosDecision** | Every strategic fork | proposed → active → evaluated/superseded |

---

## 7. Mapping Summary

| Category | Count |
|----------|-------|
| Journey stages | 14 |
| ✅ Fully representable with **implemented** Phase 1A entities | 3 (Idea, partial Brand/Scale via Initiative+Decision+Venture) |
| ⚠️ Representable via **frozen architecture** (not yet built) | 9 |
| ❌ Requires **new** architectural concept (not in frozen docs) | 0 identified |

**Conclusion of mapping (not final — see doc 06):** The journey **conceptually fits** the frozen BOS model (Initiative hub + Attribution sidecar + KPI engine + Decisions). The pilot exposes **implementation depth gaps**, not structural misfit.

---

## 8. Explicit Non-Mapping (By Design)

These remain **outside BOS** per sidecar law and module boundaries:

| Item | Where it lives | Why not BOS |
|------|----------------|-------------|
| Expense line items | ERP Expenses | Operational ledger |
| Lead contact details | CRM Leads | Operational CRM |
| Invoice PDFs | ERP Invoices | Operational billing |
| Ad creative assets | Meta / drive | External tool |
| Automation workflows | GoHighLevel | External tool |
| Task-level delivery | PM tool (future) | Not strategic layer |

BOS **links and measures**—it does not **operate** these systems.
