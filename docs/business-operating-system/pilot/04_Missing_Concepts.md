# 04 — Missing Concepts

**Pilot:** Digikinz Client Acquisition System  
**Method:** Gaps discovered during journey mapping (doc 03)  
**Rule:** Document only. Do not propose implementation.

---

## 1. Missing Entities

Entities defined in **frozen architecture (Doc 10)** but **not yet implemented** in code:

| Entity | Journey need | Doc reference |
|--------|--------------|---------------|
| **BosOffer** | Represent what Digikinz sells (scope, price positioning) distinct from ERP Product catalog | Doc 10 §3 |
| **BosAcquisitionChannel** | Meta Ads, Referral, Automation/GHL as reusable channels with per-channel KPIs | Doc 10 §3, Doc 04 |
| **BosCampaignLink** | Link ERP:Campaign to Initiative without merging campaign into BOS | Doc 10 §4 |
| **BosExperiment** | Landing page A/B, creative tests, offer tests | Doc 10 §4, Doc 05 |
| **BosFunnelStageEvent** | Meeting held, proposal sent, client closed — funnel analytics | Doc 10 §5, Doc 09 Phase 2 |
| **BosDeliveryEngagement** | Post-sale project economics separate from acquisition initiative | Doc 10 §4 |
| **BosCostCenter** | Engineering vs Marketing vs Sales spend classification | Doc 10 §3 |
| **BosStrategicGoal / OKR** | Align Digikinz initiative to quarterly agency goals | Doc 10 §3 |
| **BosMetricDefinition** | Versioned KPI formulas (ROI definition stability) | Doc 10 §5 |
| **BosMetricSnapshot** | Point-in-time KPI cache for dashboard | Doc 10 §5 |
| **BosLessonLearned** | Structured capture on initiative close (beyond free-text closureReason) | Doc 10 §6 |
| **BosAssumption** | Explicit bets (“CPL will be under $30”) | Doc 10 §4 |
| **BosRisk** | Identified threats with mitigation | Doc 10 §4 |
| **BosBusinessModel** | Classify agency economics pattern | Doc 10 §2 |
| **BosMarketSegment / ICP** | Target profile for Digikinz offer | Doc 10 §3 |

Entities **implemented** but **not persisted for attribution yet**:

| Entity | Status |
|--------|--------|
| **BosAttribution** | Domain + contract only; no Firestore repo (Phase 1B) |

---

## 2. Missing Relationships

| Relationship | Journey need | Current state |
|--------------|--------------|---------------|
| Initiative → Channel (M:N) | Digikinz uses Meta + Referral + Automation | Not modeled; only text fields on Initiative |
| Initiative → Experiment (1:N) | Landing page test belongs to initiative | Not implemented |
| CampaignLink → ERP:Campaign (1:1 wrap) | Meta campaign maps to CRM campaign | Not implemented |
| Attribution → Channel | Spend/lead tagged to Meta vs Referral | Attribution has initiative/venture only; no channelId |
| FunnelStageEvent → Lead | Meeting/proposal/close per lead | Not implemented |
| DeliveryEngagement → Customer | Project P&L per client | Not implemented |
| Initiative → Offer (N:1 or 1:1) | Which offer this initiative validates | BosOffer not implemented |
| Decision → Assumption/Risk | Decision triggered by failed assumption | Not implemented |

---

## 3. Missing Lifecycles

| Lifecycle | Journey need | Current state |
|-----------|--------------|---------------|
| **BosExperiment** | planned → running → concluded | Doc 11 — not in code |
| **BosFunnelStageEvent** | immutable fact vs correction via supersede | Doc 11 — not in code |
| **BosCampaignLink** | active → paused → archived | Not defined in Doc 11 detail |
| **BosDeliveryEngagement** | scoping → active → delivered → closed | Future — not in code |
| **BosOffer** | draft → active → retired | Not defined |
| **Attribution transition validator** | `isAttributionTransitionAllowed` added Sprint 3; repo not built | Partial |

**Implemented lifecycles sufficient for:** Venture, Initiative, Decision, Attribution (domain only).

---

## 4. Missing KPIs

KPIs from **Doc 08** required for full Digikinz dashboard but **not in PHASE_1A/1B KPI keys**:

| KPI (Doc 08) | Pilot need |
|--------------|------------|
| Total Leads Generated | Lead volume |
| Meeting Rate | Meeting stage |
| Proposal Rate | Proposal stage |
| Overall Conversion Rate | Lead → client |
| Funnel Drop-off Rate | Bottleneck detection |
| Sales Cycle Length | Time to close |
| Pipeline Value | Open proposals |
| Lead Source Distribution | Channel comparison |
| Investment by Channel | Meta vs Referral spend |
| Profit / Delivery margin | Full P&L (needs delivery engagement) |
| Lead Quality Score | Quality by channel |

**In KPI_KEY catalog but Phase 2+ for computation:** `cost_per_lead`, `customer_acquisition_cost`, `close_rate`, `total_revenue`, `gross_roi`, `net_roi`, `burn_rate`.

**KPI engine:** No calculator implementation; contracts only.

---

## 5. Missing Ownership / Permissions

| Gap | Journey impact |
|-----|----------------|
| `bos_*` permissions not wired to ERP `usePermissions` | Cannot enforce who manages Digikinz initiative in app |
| No **Closer** / **Setter** role in BOS permission matrix for funnel actions | Sales team attribution may need finance operator vs venture lead split |
| No **channel owner** concept | Who owns Meta vs Referral performance |

Doc 12 defines permission keys in BOS config; ERP integration deferred.

---

## 6. Missing Business Rules

| Rule | Journey need | Current state |
|------|--------------|---------------|
| One active attribution per expense (R-009) | Prevent double-counting Meta spend | Documented; repo not built |
| Lead attribution only when initiative active/paused | Don't attach leads to closed initiative | ✅ Domain rule exists |
| Funnel stage must reference attributed lead | Meeting KPI integrity | Not implemented |
| Client close triggers CAC denominator | CAC calculation | KPI formula in Doc 08; no engine |
| Delivery expenses separable from acquisition | True acquisition ROI | No cost center / engagement split |
| Offer change mid-initiative → decision required | Institutional memory | Not enforced |
| Channel budget ceiling | Meta overspend alert | Not modeled |

---

## 7. Missing Integrations

| Integration | Journey stage | Current state |
|-------------|---------------|---------------|
| **Expense → Attribution** | All spend stages | Read port + sidecar designed; repo not built |
| **Lead → Attribution** | Lead | Source type defined; read port stub exists |
| **Invoice → Attribution** | Payment | Source type defined; read port stub exists |
| **Campaign → CampaignLink** | Meta Campaign | Not started |
| **CRM stage → FunnelStageEvent** | Meeting, Proposal, Client | Phase 2 (Doc 09) |
| **External: Meta Ads API** | Meta Campaign | `EXTERNAL_ADAPTER` source type only |
| **External: GoHighLevel** | Automation | Not in architecture |
| **Reports enrichment** | Dashboard | Optional Path B; BosReportsPage planned |
| **Activity log BOS events** | Decision/close audit | Activity types defined; not wired |

---

## 8. Missing Dashboard / Intelligence Concepts

| Concept | Founder question | Gap |
|---------|------------------|-----|
| **Bottleneck detection** | Biggest funnel leak | Needs funnel stage events + KPI engine |
| **Recommended next action** | What should I do? | Decision engine (Doc 13) — advisory layer not implemented |
| **Expected vs actual (initiative)** | Did we hit successCriteria? | successCriteria text exists; no structured target KPI bindings |
| **Committed vs spent** | How much is still committed? | Budget on initiative; no purchase order / committed spend entity |
| **Upcoming risks** | What might break? | BosRisk not implemented |

---

## 9. Gaps That Are NOT Missing Architecture

These are **implementation backlog**, already planned in frozen roadmap:

- BosAttribution Firestore persistence (Phase 1B)
- KPI calculator service (Phase 2)
- Funnel stage events (Phase 2)
- Acquisition channels registry (Phase 1–2)
- Campaign link wrapper (Phase 2)

These do **not** require redesign of Venture / Initiative / Decision / Attribution sidecar pattern.

---

## 10. Gap Count Summary

| Category | Already in frozen docs | Net-new architecture needed |
|----------|------------------------|----------------------------|
| Entities | 15 | 0 |
| Relationships | 8 | 0 |
| Lifecycles | 6 | 0 |
| KPIs | 11+ | 0 |
| Ownership | 3 | 0 |
| Business rules | 7 | 0 |
| Integrations | 9 | 0 |

**All identified gaps map to planned BOS modules in Docs 04, 08, 09, 10—not to flaws in the Initiative-centric model.**
