# 06 — Architecture Gap Report

**Pilot:** Mobile App Development Agency → Digikinz Client Acquisition System  
**Question:** Can the current BOS architecture fully support this business **without redesign**?  
**Architecture version:** BOS v1.0 (frozen)  
**Code state:** Phase 1A domain + repositories + application services (Sprint 1–3)

---

## Verdict

### **NO** — not fully, **today**.

### **YES** — the **architecture model** can support this journey **without redesign**, provided planned modules are completed.

The pilot did **not** reveal a structural failure of the Initiative-centric, sidecar-attribution design. It revealed that **implementation depth** lags the **documented architecture**—which is expected at Phase 1A.

---

## 1. Why the Model Fits (No Redesign Required)

### 1.1 Initiative as hub matches the real bet

“Digikinz Client Acquisition System” is exactly a **BosInitiative**: time-bound, hypothesis-driven, budgeted, measurable, closeable with lessons. The agency is a **BosVenture**. Doc 04’s hub diagram holds for all 14 journey stages.

### 1.2 Sidecar law matches ERP reality

The journey’s operational facts already live in ERP/CRM:

- Spend → **expenses**
- Leads → **leads**
- Revenue → **invoices**
- Outreach → **campaigns**

BOS **observes and links** via **BosAttribution** without polluting ERP schemas. The Digikinz pilot confirms this pattern for every money-in and money-out event.

### 1.3 Decision log matches founder forks

Brand budget, Meta spend, pricing, hire closer, scale/kill—all map to **BosDecision** with expected vs actual evaluation. Implemented entity supports institutional memory.

### 1.4 KPI catalog anticipates the dashboard

Doc 08 KPIs (CPL, CAC, close rate, ROI, funnel metrics) cover doc 05’s dashboard IA. Keys exist in `bos/constants/kpi.ts`; computation and funnel inputs are Phase 2 scope per Doc 09—not absent from architecture.

### 1.5 Planned entities cover “missing” journey stages

| Journey gap feeling | Already in frozen docs |
|---------------------|------------------------|
| Offer | BosOffer |
| Meta campaign context | BosCampaignLink + BosAcquisitionChannel |
| Landing page test | BosExperiment |
| Meeting / proposal / close | BosFunnelStageEvent |
| Client project economics | BosDeliveryEngagement |
| Profit beyond acquisition | Cost center + delivery attribution |

None require abandoning Venture / Initiative / Attribution / Decision.

---

## 2. Why It Cannot Fully Support the Journey Today

### 2.1 Implementation depth (Phase 1A only)

| Capability | Required for Digikinz | Status |
|------------|----------------------|--------|
| Venture + Initiative + Decision CRUD | Idea → Scale decisions | ✅ Implemented |
| Expense attribution | All spend stages | ⚠️ Domain only; repo Phase 1B |
| Lead attribution | Lead stage | ⚠️ Source type defined; no repo |
| Invoice attribution | Payment / ROI | ⚠️ Source type defined; no repo |
| KPI computation | Full dashboard | ❌ Not implemented |
| Acquisition channels | Meta vs Referral | ❌ Not implemented |
| Funnel stage events | Meeting → client metrics | ❌ Phase 2 |
| Campaign link | Meta campaign context | ❌ Phase 2 |

**A founder running Digikinz today** could register the initiative and log decisions in BOS, but could **not** get ROI, funnel, or CAC answers from BOS alone.

### 2.2 Attribution dimension gaps (within frozen model)

Doc 03 identified that **BosAttribution** links initiative + venture but **channel assignment** expects **BosAcquisitionChannel** as a first-class entity—not a redesign, an **unfinished module** from Doc 04.

### 2.3 Advisory intelligence not built

Doc 05 dashboard sections S7 (bottleneck, next action) depend on **Doc 13 Decision Engine** and KPI trends—explicitly future. Not an architecture surprise.

---

## 3. Missing Architectural Pieces (List Only)

These are the **minimum architectural modules** still required to fully represent the Digikinz journey per frozen docs—not implementation tasks, not UI:

### 3.1 Phase 1B (attribution foundation)

1. **BosAttribution** persistence (`bosAttributions` collection, rules, indexes)  
2. **Expense read + attribution write** path (sidecar only)  
3. **Attribution coverage** KPI input  
4. **Investment KPIs** (`total_investment`, `net_investment`, `budget_utilization`)

### 3.2 Phase 2 (full funnel & channels)

5. **BosAcquisitionChannel** entity and initiative relationship  
6. **BosCampaignLink** wrapping ERP:Campaign  
7. **Lead attribution** integration (read CRM, write sidecar)  
8. **Invoice attribution** integration (read ERP, write sidecar)  
9. **BosFunnelStageEvent** (meeting, proposal, client closed)  
10. **KPI engine** with Doc 08 funnel + acquisition formulas  
11. **BosMetricDefinition** + **BosMetricSnapshot** (versioned, historical)  
12. **Channel-scoped attribution** (attribution → channel link)

### 3.3 Phase 2–3 (strategic richness)

13. **BosOffer** (what Digikinz sells)  
14. **BosExperiment** (landing/creative tests)  
15. **BosDeliveryEngagement** (post-sale profit separation)  
16. **BosCostCenter** (acquisition vs delivery spend)  
17. **BosLessonLearned** (structured closeout)  
18. **BosAssumption** / **BosRisk** (expected vs reality, alerts)  
19. **Decision Engine** advisory outputs (bottleneck, next action)

### 3.4 Cross-cutting (not new architecture)

20. **ERP permission wiring** for `bos_*` keys (Doc 12)  
21. **Activity log** integration for BOS events  

Items 20–21 are integration/enforcement, not domain redesign.

---

## 4. Red Flags Checked — None Found

| Potential redesign trigger | Pilot result |
|----------------------------|--------------|
| Initiative wrong granularity for “system” | Initiative fits; delivery is separate entity |
| Need to merge CRM Campaign into BOS | CampaignLink wrapper sufficient |
| Need BOS fields on expenses | Sidecar law holds |
| Venture ≠ agency business line | BosVenture matches |
| CRM Lead ≠ BOS entity | Attribution sidecar sufficient |
| ROI requires stored authoritative totals | Computed + snapshot pattern in Doc 10 |
| Multi-channel requires separate initiatives | Channels attach to one initiative (Doc 04) |
| Pivot requires new initiative | predecessor/successor on Initiative ✅ |

---

## 5. Pilot Mapping Scorecard

| Journey coverage | With implemented code only | With frozen architecture complete |
|------------------|---------------------------|-----------------------------------|
| Idea → charter | ~80% | 100% |
| Brand → automation (spend tracking) | ~20% | ~90% |
| Meta → lead | ~10% | ~95% |
| Meeting → client (funnel) | ~5% | ~95% |
| Payment → ROI | ~10% | ~95% |
| Delivery → profit | ~0% | ~85% |
| Scale → learn | ~60% (decisions + close) | ~95% |
| **Full dashboard (doc 05)** | ~15% | ~95% |

---

## 6. Final Answer (Single Question)

> **“Can the current BOS architecture fully support this business without redesign?”**

**If “current” means implemented software today:** **No.**

**If “current” means frozen BOS v1.0 architectural model:** **Yes—with completion of already-defined modules (Phase 1B through Phase 2/3), not a redesign.**

The Digikinz pilot **validates the architecture direction**. It does **not** yet validate that the **product** can serve a founder end-to-end. That requires finishing the planned layers—not new planning, and not UI until business validation is accepted.

---

## 7. Recommendation for Gate Decision

| Gate | Criterion | Pilot outcome |
|------|-----------|---------------|
| **Architecture gate** | No redesign required | **PASS** |
| **Implementation gate** | Can populate doc 05 dashboard | **FAIL** (expected at 1A) |
| **UI gate** | Founder can operate without spreadsheets | **NOT READY** |

**Suggested next step (business decision, not dev):** Accept architecture gate → prioritize Phase 1B attribution + investment KPIs before any UI. Defer funnel dashboard until Phase 2 entities are specified in implementation sprints.

---

## 8. Document Index

| Doc | Role |
|-----|------|
| 01_Pilot_Business_Profile | Business context |
| 02_Pilot_Journey | 14-stage founder journey |
| 03_BOS_Mapping | Stage → entity mapping |
| 04_Missing_Concepts | Gap inventory (document only) |
| 05_Pilot_Dashboard | Information architecture |
| 06_Architecture_Gap_Report | This verdict |
