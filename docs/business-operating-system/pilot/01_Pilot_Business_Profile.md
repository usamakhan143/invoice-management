# 01 — Pilot Business Profile

**Pilot:** Mobile App Development Agency  
**Validation initiative:** Digikinz Client Acquisition System  
**Sprint:** Business Validation (no implementation)  
**Architecture reference:** BOS v1.0 (frozen)

---

## 1. Business Overview

A **mobile app development agency** sells custom mobile application design, development, and launch services to businesses that need a product built and shipped—not a generic software shop selling hours, but an outcome-oriented agency positioning around speed, quality, and go-to-market support.

The agency may run multiple ventures over time (e.g., agency services, a SaaS tool, a productized offer). For this pilot, the **venture** is the agency itself. The **initiative** is a deliberate client-acquisition system built around the Digikinz brand and offer—not a single client project.

---

## 2. What the Business Sells

| Layer | What is sold | How it is packaged |
|-------|----------------|-------------------|
| **Core offer** | Custom mobile app development (design → build → launch) | Fixed-scope projects or phased retainers |
| **Positioning** | Speed, reliability, founder-friendly delivery | Brand + case studies + proof |
| **Acquisition vehicle** | Digikinz Client Acquisition System | End-to-end funnel: brand → ads → leads → meetings → proposals → clients |
| **Delivery** | Project execution per signed client | Separate from acquisition (post-sale delivery) |

**Revenue model:** Primarily **project-based fees** (invoices) with optional **deposits/milestones**. Not subscription-first unless a productized tier is introduced later.

**Strategic distinction (BOS):**

- **Digikinz Client Acquisition System** = a **BosInitiative** (growth bet: “this system will produce clients at acceptable CAC/ROI”).
- **A signed Digikinz client project** = **ERP delivery work** (CRM customer, invoices, expenses)—attributed *to* the initiative, not *as* the initiative.

---

## 3. How Money Enters the Business

| Source | Mechanism | ERP module (existing) | BOS role |
|--------|-----------|----------------------|----------|
| **Client project payments** | Invoices, deposits, milestone billing | Invoices | Attribute revenue to initiative/channel via **BosAttribution** (sidecar) |
| **Retainers / ongoing support** | Recurring invoices | Invoices | Same attribution pattern |
| **Referrals** | New clients from existing relationships | Leads → Customers | Lead attribution + channel = Referral |
| **Upsells** | Additional scope on existing clients | Invoices | Revenue attribution; may link to delivery engagement (future) |

**Money-in flow (conceptual):**

```
Meta Ad spend (expense) → Lead (CRM) → Meeting → Proposal → Client (CRM) → Invoice (ERP) → Payment
```

BOS does **not** process payments. It **observes** invoice facts and **enriches** them with initiative/channel context for ROI.

---

## 4. How Money Leaves the Business

| Category | Examples | ERP module | BOS role |
|----------|----------|------------|----------|
| **Paid acquisition** | Meta Ads, creative tools, landing page builders | Expenses | Attribute to initiative + channel (Meta Ads) |
| **Brand & creative** | Logo, brand kit, video, copy | Expenses | Attribute to initiative (brand build phase) |
| **Automation & CRM stack** | GoHighLevel, Zapier, domains, hosting | Expenses | Attribute to initiative; channel = Automation/Funnel |
| **Sales labor** | Closer commissions, setter costs, meeting tools | Expenses (or future time) | Attribute to initiative; optional cost center |
| **Delivery cost** | Developers, subcontractors, tools for client work | Expenses | **Post-sale**—may attribute to **BosDeliveryEngagement** (future), not acquisition initiative |
| **Overhead** | Admin, accounting, general software | Expenses | Portfolio/venture overhead unless explicitly attributed |

**Sidecar law:** All spend stays in **expenses**. BOS never adds fields to expense documents—only **bosAttributions** links.

---

## 5. Success Metrics

Metrics the founder cares about for **Digikinz Client Acquisition System**:

### Investment & efficiency

| Metric | Founder question |
|--------|------------------|
| Total investment | How much have I put into this system? |
| Net investment | After refunds/returns, what did it really cost? |
| Budget utilization | Am I about to run out of allocated budget? |
| Burn rate | How fast am I spending per month? |
| CPL (cost per lead) | What does each lead cost? |
| CAC (customer acquisition cost) | What does each **client** cost to acquire? |

### Funnel & conversion

| Metric | Founder question |
|--------|------------------|
| Leads generated | Is the top of funnel working? |
| Meeting rate | Are leads qualified enough? |
| Proposal rate | Are meetings turning into opportunities? |
| Close rate | Are we winning deals? |
| Overall conversion (lead → client) | End-to-end efficiency? |
| Sales cycle length | How long from lead to close? |

### Revenue & return

| Metric | Founder question |
|--------|------------------|
| Total revenue (attributed) | How much revenue did this system produce? |
| Gross ROI / Net ROI | Was the bet worth it? |
| Pipeline value | What revenue is still possible from open proposals? |
| Profit (future) | Revenue minus fully-loaded cost (investment + delivery) |

### Learning & control

| Metric | Founder question |
|--------|------------------|
| Expected vs actual (decisions) | Did our strategic bets play out? |
| Biggest bottleneck | Where is the funnel leaking? |
| Attribution coverage | Do we trust the numbers? (% of spend/revenue linked) |

### Mapping to frozen BOS KPI keys (Doc 08 / code)

| Pilot metric | BOS KPI_KEY (current catalog) | Phase |
|--------------|-------------------------------|-------|
| Total investment | `total_investment` | 1B |
| Net investment | `net_investment` | 1B |
| Budget utilization | `budget_utilization` | 1B |
| Burn rate | `burn_rate` | 2+ |
| CPL | `cost_per_lead` | 2+ |
| CAC | `customer_acquisition_cost` | 2+ |
| Close rate | `close_rate` | 2+ |
| Total revenue | `total_revenue` | 2+ |
| Gross/net ROI | `gross_roi`, `net_roi` | 2+ |
| Active initiatives | `active_initiatives` | 1A |
| Attribution coverage | `attribution_coverage` | 1B |

---

## 6. Pilot Scope Boundary

This profile describes the **business reality** the architecture must model. It does **not** require building brand tools, Meta Ads, CRM, or automation—those remain in ERP and external systems. BOS must **represent** the journey and **measure** the bet.

**Primary validation question (deferred to doc 06):** Can BOS v1.0 represent this agency and the Digikinz acquisition initiative end-to-end without architectural redesign?
