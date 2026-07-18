# 08 — Knowledge Engine

How documentation, learnings, and project knowledge accumulate across the agency. Architecture only — no storage design, no schemas.

---

## Purpose

Software agencies lose knowledge constantly:

- Developers leave and take tacit knowledge
- Cursor sessions succeed but patterns are not recorded
- The same mistakes repeat across projects
- ERP Discovery itself proved this — 3,000-line pages with embedded logic that no inventory existed for until the audit

The Knowledge Engine ensures **every delivery engagement makes the agency smarter** — automatically, not through mandatory post-project documentation chores.

---

## Knowledge Taxonomy

| Type | Scope | Lifetime | Example |
|------|-------|----------|---------|
| **Agency pattern** | Company-wide | Permanent | "Always use read ports for ERP data" |
| **Prompt pattern** | Company-wide | Evolves | "SaaS tenant scoping prompt template v3" |
| **Module knowledge** | Company-wide | Versioned | "ScreenLockContext — use for PIN-gated views" |
| **Architecture decision** | Company-wide | Permanent | "New bounded contexts follow bos/ folder pattern" |
| **Agency-type playbook** | Company-wide | Evolves | "Mobile store submission checklist" |
| **Engagement fact** | Single engagement | Engagement lifetime | "Client prefers weekly async updates" |
| **Engagement lesson** | Single engagement | Promoted to agency if reusable | "Firebase compat SDK required — no modular v9" |
| **Evaluation insight** | Single engagement | Promoted if pattern repeats | "Prompts without reuse context produce 40% rework" |
| **Client context summary** | Single client | Updated each engagement | Read from ERP — **never duplicated** |

---

## Knowledge Sources

### Automatic capture (during normal AOS workflow)

| Event | Knowledge extracted |
|-------|-------------------|
| Requirement approved | Structured requirement patterns |
| Reuse assessment completed | Which modules matched / were rejected |
| Prompt pack approved | Successful prompt structures |
| Cursor session evaluated | What worked / failed in execution |
| Evaluation failed | Failure patterns → prompt improvements |
| Retrospective completed | Lessons, estimation accuracy |
| Module registered | New reusable asset documented |

### Manual capture (deliberate input)

| Input | When |
|-------|------|
| Architecture decision record | Significant technical choice during delivery |
| Client preference note | Communication or process preference discovered |
| External reference | Third-party API docs, platform guidelines |

### Imported knowledge (bootstrap)

| Source | Content |
|--------|---------|
| ERP Discovery docs (`docs/erp-discovery/`) | System inventory, reuse map, duplication report |
| BOS docs (`bos/docs/`) | Architecture patterns, integration layer guide |
| Existing Cursor rules/skills | Codified team conventions |
| Business playbooks (`docs/business/`) | Delivery process templates |

The ERP Discovery audit is the **seed corpus** for the Knowledge Engine.

---

## Knowledge Engine Architecture (Conceptual)

```
┌─────────────────────────────────────────────────────────┐
│                   Knowledge Engine                       │
│                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ Ingestion    │  │ Classification│  │ Retrieval    │  │
│  │ Pipeline     │→ │ & Tagging     │→ │ Service      │  │
│  └──────┬───────┘  └───────────────┘  └──────┬───────┘  │
│         │                                      │         │
│  ┌──────▼──────────────────────────────────────▼───────┐  │
│  │              Knowledge Store (AOS-owned)            │  │
│  │  patterns · lessons · decisions · module docs       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ▲                    │                    ▲
         │                    ▼                    │
   AOS workflow          Prompt Engine       AI Orchestration
   events                Context Assembly     Evaluation Engine
```

### Ingestion Pipeline

Accepts knowledge records from:
- AOS application services (workflow events)
- Retrospective submissions
- Module Registry updates
- Manual architecture decision entries
- ERP Discovery import (one-time bootstrap)

### Classification & Tagging

Every knowledge record tagged with:
- **Agency type** (web/mobile/AI/SaaS/all)
- **Domain** (architecture, prompting, reuse, client, quality, deployment)
- **Source engagement** (if engagement-scoped)
- **Confidence** (single observation vs repeated pattern)
- **Promotion status** (engagement-only vs agency-wide)

### Retrieval Service

Answers queries from:
- Prompt Engine (context assembly): "What patterns exist for SaaS tenant scoping?"
- AI Orchestration (planning): "What lessons from similar engagements?"
- Module Registry (matching): "What modules relate to authentication?"
- Delivery lead (UI): "What do we know about this client?"

Retrieval respects **client isolation** — Client A's specific facts never appear in Client B's context.

---

## Knowledge Promotion Flow

Engagement-scoped knowledge may be **promoted** to agency-wide:

```
Engagement lesson recorded
        │
        ▼
  Is pattern reusable?
    │         │
   yes        no
    │         └── stays engagement-scoped
    ▼
  Delivery lead reviews promotion
    │
    ▼
  Promoted to agency pattern
    │
    ├──→ Prompt template updated
    ├──→ Module Registry annotated
    ├──→ Cursor rule proposed
    └──→ Agency-type playbook updated
```

Promotion requires human approval — AI suggests, humans confirm.

---

## Relationship to Existing Systems

### ERP ActivityLogger

| Aspect | ActivityLogger | Knowledge Engine |
|--------|---------------|-----------------|
| **Purpose** | Audit trail of mutations | Learning and pattern accumulation |
| **Granularity** | Event (who did what when) | Insight (why, what to do next time) |
| **Scope** | ERP operations | Delivery operations |
| **Storage** | `activities` collection | AOS-owned (TBD) |

**Relationship:** Extend ActivityLogger with AOS event types. Knowledge Engine stores richer context that ActivityLogger entries link to.

### BOS Decisions & Lessons

| Aspect | BOS | Knowledge Engine |
|--------|-----|-----------------|
| **Decision type** | Strategic (founder) | Delivery (technical/process) |
| **Lesson type** | Initiative close lesson | Engagement retrospective lesson |
| **Storage** | `bosDecisions`, initiative fields | AOS-owned |

**Relationship:** BOS initiative close lessons may be **read** by Knowledge Engine for strategic context. Delivery lessons stay in AOS.

### ERP Discovery Documentation

The 11 discovery documents are the **foundational knowledge corpus**:
- `01_SYSTEM_OVERVIEW.md` → architecture patterns
- `05_REUSABLE_COMPONENTS.md` → module seed data
- `06_REUSABLE_BUSINESS_LOGIC.md` → service seed data
- `09_DUPLICATION_REPORT.md` → anti-patterns
- `10_TECHNICAL_DEBT.md` → known risks

Knowledge Engine should ingest these as permanent agency patterns.

---

## Documentation Generation

AOS generates documentation as a **byproduct of delivery**, not a separate phase:

| Document | Generated from |
|----------|---------------|
| Technical architecture doc | Requirements + architecture decisions + module usage |
| API documentation | Cursor session outputs + module registry |
| Deployment guide | Agency-type template + deployment checklist completion |
| Handoff package | All engagement artifacts assembled |
| Retrospective report | Evaluation scores + lessons + estimation comparison |

Generated docs are **Knowledge Engine records**, not files in the repo (unless explicitly committed).

---

## Client Data Boundaries

| Data | Storage | Cross-project access |
|------|---------|---------------------|
| Client name, contacts | ERP `customers` | Read summary per engagement |
| Client-specific requirements | AOS engagement | Engagement-scoped only |
| Client-specific code | Client repo / workspace | Not in Knowledge Engine |
| Patterns learned on client project | AOS Knowledge Engine | Promoted without client identifiers |
| Prompt templates refined on client project | AOS Prompt Engine | Client name stripped |

**Law:** Knowledge promotion strips client-identifying information. Patterns are anonymized.

---

## Knowledge Decay & Refresh

| Mechanism | Purpose |
|-----------|---------|
| **Version tracking** | Patterns tagged with codebase version / date |
| **Stale detection** | Patterns referencing removed modules flagged |
| **Conflict resolution** | New pattern contradicting old → human review |
| **Archival** | Deprecated patterns kept but marked inactive |
| **Re-discovery trigger** | Major ERP/BOS changes trigger knowledge refresh (like ERP Discovery audit) |

When ERP or BOS architecture changes significantly, Knowledge Engine should flag affected patterns for review — similar to how ERP Discovery was triggered before AOS design.

---

## Metrics

| Metric | Meaning |
|--------|---------|
| **Knowledge capture rate** | % of workflow events that produce knowledge records |
| **Promotion rate** | % of engagement lessons promoted to agency patterns |
| **Retrieval hit rate** | % of prompt context blocks that include relevant knowledge |
| **Stale pattern count** | Patterns flagged as potentially outdated |
| **Documentation automation rate** | % of handoff docs generated vs manually written |

---

## Phase Introduction

| Phase | Knowledge Engine capability |
|-------|----------------------------|
| Phase 1 | Manual lesson recording; ERP Discovery import as seed |
| Phase 2 | Automatic capture from evaluation outcomes |
| Phase 3 | Classification, tagging, retrieval for prompt context |
| Phase 4 | Documentation generation; promotion workflow |
| Phase 5 | Stale detection; cross-agency pattern sharing (optional) |
