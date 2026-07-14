# Business Glossary

> **Status:** Template — define business terms here.  
> **Not** the BOS technical glossary → see `docs/business-operating-system/10_Domain_Glossary.txt`.

---

## How to use

- Add terms as the business vocabulary stabilizes.
- One definition per term; note synonyms and related terms.
- Mark terms that map to BOS/ERP concepts when relevant.

---

## Core terms

| Term | Definition | Synonyms | BOS / ERP note |
|------|------------|----------|----------------|
| **Offer** | `[What we sell — service or product bundle]` | `[Package, SKU]` | Maps to sales/marketing; not a Firestore entity |
| **ICP** | Ideal Customer Profile — description of best-fit customer | `[Target segment]` | Informs CRM lead targeting |
| **Lead** | `[Prospect who has shown interest]` | `[Prospect]` | ERP: `leads` collection |
| **Pipeline** | `[Active sales opportunities]` | `[ ]` | CRM stages in app |
| **CAC** | Customer Acquisition Cost — cost to acquire one customer | `[ ]` | BOS KPI (Phase 2+) |
| **CPL** | Cost Per Lead | `[ ]` | BOS KPI (Phase 2+) |
| **ROI** | Return on Investment | `[ ]` | BOS initiative metric |
| **Initiative** | `[Time-bound strategic effort with budget and goals]` | `[Campaign — avoid confusion with CRM Campaign]` | BOS: `BosInitiative` |
| **Venture** | `[Distinct business line or brand in portfolio]` | `[Business unit]` | BOS: `BosVenture` — not CRM `businesses` |
| **Attribution** | `[Linking spend or outcomes to an initiative/channel]` | `[ ]` | BOS: `BosAttribution` sidecar |
| `[TERM]` | `[Definition]` | `[ ]` | `[ ]` |

---

## Sales terms

| Term | Definition |
|------|------------|
| **Discovery call** | `[First structured conversation to assess fit]` |
| **Proposal** | `[Written scope, price, and terms]` |
| **Close** | `[Customer agrees and contract/deposit complete]` |
| **Win / Loss** | `[Deal outcome]` |
| `[TERM]` | `[Definition]` |

---

## Marketing terms

| Term | Definition |
|------|------------|
| **Channel** | `[Acquisition path — ads, SEO, referral, etc.]` |
| **Conversion** | `[Desired action — lead, meeting, sale]` |
| **Funnel** | `[Stages from awareness to customer]` |
| `[TERM]` | `[Definition]` |

---

## Delivery terms

| Term | Definition |
|------|------------|
| **SOW** | Statement of Work — documented scope |
| **Kickoff** | First client meeting after sale |
| **UAT** | User acceptance testing |
| **Go-live** | Production launch to end users |
| `[TERM]` | `[Definition]` |

---

## Finance terms (business)

| Term | Definition |
|------|------------|
| **Retainer** | `[Recurring fee for ongoing access or hours]` |
| **MRR / ARR** | `[If applicable]` |
| **Margin** | `[Revenue minus direct cost]` |
| `[TERM]` | `[Definition]` |

---

## Acronyms

| Acronym | Expansion |
|---------|-----------|
| ICP | Ideal Customer Profile |
| SOW | Statement of Work |
| CAC | Customer Acquisition Cost |
| CPL | Cost Per Lead |
| ROI | Return on Investment |
| NPS | Net Promoter Score |
| SLA | Service Level Agreement |
| `[XX]` | `[Expansion]` |

---

## Disambiguation (important)

| Business term | Often confused with | Clarification |
|---------------|---------------------|---------------|
| **Venture** (business unit) | CRM **Business** (customer sub-entity in app) | Venture = your company line; Business = client's org in CRM |
| **Initiative** (strategic) | CRM **Campaign** (outreach batch) | Initiative = strategy + ROI; Campaign = lead outreach run |
| **BI** (business intelligence) | **BOS** (operating system in app) | BI = insights; BOS = full venture/initiative/decision layer |

---

## Revision history

| Date | Author | Change |
|------|--------|--------|
| `[DATE]` | `[NAME]` | Initial template |
