# 05 — Knowledge Domains

**Stage D2.6 — Knowledge Intelligence Layer**

---

## Purpose

Define the **domain taxonomy** for classifying every node in the Organizational Knowledge Graph — enabling scoped retrieval, health segmentation, diversity measurement, and future AI reasoning without relying on keyword search alone.

Domains are **orthogonal to agency type** (web/mobile/SaaS) and **complementary to lifecycle layer** (L0–L4).

---

## Why Domains Matter

| Capability | Domain benefit |
|------------|----------------|
| **Retrieval** | Prompt assembly pulls Security patterns for auth prompts, not Mobile store patterns |
| **Health metrics** | Coverage and Diversity computed per domain |
| **External change** | React update affects Frontend subgraph only |
| **Reasoning** | AI traverses within domain before cross-domain inference |
| **Review routing** | Technical reviewer assigned by domain |
| **10-year scale** | Prevents monolithic undifferentiated corpus |

---

## Domain Hierarchy

### Tier 1 — Engineering (technical delivery)

| Domain | Scope | Example patterns |
|--------|-------|------------------|
| **Architecture** | System structure, boundaries, ADRs | Sidecar law, bounded contexts |
| **Frontend** | Web UI, React, CSS, a11y | Component patterns, responsive rules |
| **Backend** | APIs, services, data layer | Read ports, Firestore rules |
| **Mobile** | iOS, Android, Flutter, RN | Store submission, offline sync |
| **AI** | LLM integration, prompts, agents | Context budget, eval rubrics |
| **DevOps** | CI/CD, deploy, infra | Environment promotion checklist |
| **Security** | Auth, secrets, compliance | Permission gates, CVE response |
| **Testing** | Unit, E2E, eval harness | Test patterns, jsdom limits |
| **UI** | Visual design system, components | AOS design tokens, C-xxx usage |
| **UX** | Flows, founder experience, accessibility UX | Tab gating, workflow continuity |

### Tier 2 — Delivery operations (AOS-native)

| Domain | Scope | Example patterns |
|--------|-------|------------------|
| **Prompt Engineering** | Prompt artifacts, templates, packs | Reuse block structure |
| **Module Engineering** | Registry, reuse, extraction | Module boundaries |
| **Evaluation** | Rubrics, scoring, gates | First-pass criteria |
| **Delivery** | Engagement lifecycle, handoff | Founder workflow order |
| **Playbook** | Process, checklists, estimation | Intake checklist |
| **Cursor** | Execution, capture, session patterns | Copy-prompt handoff |

### Tier 3 — Business (agency operations)

| Domain | Scope | Example patterns |
|--------|-------|------------------|
| **Business** | Offers, pricing context | Delivery scope norms |
| **Sales** | Pipeline, client intake | — (rarely in AOS corpus) |
| **Marketing** | — | Minimal AOS scope |
| **Hiring** | Team capability | Skill gap signals |
| **Operations** | Internal ops | Review SLAs |
| **Finance** | Budget, ROI | Knowledge ROI inputs |
| **Agency** | Company-wide norms | Cross-type standards |

### Tier 4 — Meta

| Domain | Scope |
|--------|-------|
| **Knowledge** | Meta-patterns about knowledge itself |
| **Learning** | Meta-patterns about learning process |

---

## Classification Rules

### Primary vs secondary domain

Every L2+ node has:

- **Primary domain** (exactly one) — drives routing and coverage
- **Secondary domains** (0–N) — cross-cutting tags

Example: Pattern "Firebase auth with ERP permissions" → Primary: **Security**; Secondary: **Backend**, **Architecture**.

### Classification sources

| Source | When applied |
|--------|--------------|
| Learning Engine extraction | Candidate creation |
| Knowledge Engine ingestion | Record creation |
| Human reviewer | Promotion approval |
| KIL inference (future) | Suggest secondary domains — human confirm |

### Edge representation

```
Node ──classified_as──→ Domain
Node ──applies_to──→ AgencyType (web/mobile/SaaS/AI/all)
```

Agency type and domain are **independent dimensions**.

---

## Retrieval Advantages

### Scoped context assembly (Prompt Engine)

```
Request: Generate prompt for SaaS tenant scoping
Filter: domain IN (Backend, Security, Architecture)
        AND agencyType = SaaS
        AND confidence >= validated
        AND lifecycleState = active
        AND NOT stale
Traverse: supports, related_to (depth ≤ 2)
Rank: confidence × recency × eval_backing
```

### Domain-aware health

Coverage metric computed **per domain** — reveals Security at 90%, Mobile at 40%.

### Domain-aware external change

Flutter SDK update triggers review on **Mobile** subgraph only — not entire corpus.

### Cross-domain reasoning (advanced)

When primary domain coverage insufficient, KIL may suggest **related_to** cross-domain patterns with lower rank — explicit, not implicit keyword bleed.

---

## Domain Governance

| Action | Authority |
|--------|-----------|
| Add new domain | Architecture owner + KIL governance |
| Merge domains | Rare; requires migration plan for edges |
| Deprecate domain | Reclassify nodes; never orphan |
| Domain-specific rubric | Evaluation Engine + domain owner |

New domains expected over 10 years (e.g., **Edge**, **Web3**, **On-device AI**) — taxonomy is extensible via versioned domain registry.

---

## Domain Registry (Conceptual)

Future maintained list:

```
domainId, name, tier, description, parentDomainId?, 
introducedVersion, deprecated?, ownerRole
```

Bootstrap mapping from existing tags in `08_KNOWLEDGE_ENGINE.md` and ERP Discovery categories.

---

## Failure Cases

| Failure | Response |
|---------|----------|
| Misclassified domain | Reviewer reclassifies; audit |
| Domain sprawl (100+ micro-domains) | Merge policy; tier enforcement |
| Single domain dominance | Diversity health alert |
| Cross-domain contradict undetected | Require domain tag on both nodes for conflict UI |

---

## Boundaries

| Layer | Domain role |
|-------|-------------|
| Knowledge Engine | Stores tags on records |
| Learning Engine | Domain on candidates at extraction |
| **KIL** | Taxonomy authority, retrieval optimization, health segmentation |

---

## Related Documents

- [01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md](01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md)
- [04_KNOWLEDGE_HEALTH.md](04_KNOWLEDGE_HEALTH.md)
- [06_AI_REASONING_LAYER.md](06_AI_REASONING_LAYER.md)
- `docs/aos-architecture/08_KNOWLEDGE_ENGINE.md`
