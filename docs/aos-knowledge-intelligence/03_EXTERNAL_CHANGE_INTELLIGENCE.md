# 03 — External Change Intelligence

**Stage D2.6 — Knowledge Intelligence Layer**

---

## Purpose

Define how the Knowledge Intelligence Layer will detect, classify, and propagate **external platform changes** — framework updates, SDK deprecations, security advisories, API changes — through the Organizational Knowledge Graph **without implementing** feeds, scanners, or automation.

External change intelligence prevents organizational knowledge from **silently rotting** as the technology landscape evolves over 10+ years.

---

## Scope of External Change

### Technology stack signals (future monitoring)

| Category | Examples | Typical impact surface |
|----------|----------|------------------------|
| **Frontend frameworks** | React, Next.js, Vue major versions | Prompts, modules, patterns, rubrics |
| **Mobile** | Flutter, React Native, Swift/Kotlin SDK | Playbook, modules, agency-type templates |
| **Backend / runtime** | Node LTS, Deno, Python | Modules, deployment playbook |
| **Cloud / BaaS** | Firebase, Supabase, AWS SDK breaks | Patterns, modules, constraints |
| **Payments** | Stripe API version sunset | Modules, patterns, eval rubrics |
| **Auth / identity** | OAuth spec, passkey APIs | Security patterns, modules |
| **Package ecosystem** | npm deprecation, peer dependency breaks | Module registry, reuse graph |
| **Security** | CVE advisories, npm audit critical | Patterns, playbook, module scores |
| **Browser / platform** | Safari API change, Chrome third-party cookie | Frontend patterns, QA checklist |
| **OS** | iOS/Android target SDK requirements | Mobile playbook, store submission |
| **AI tooling** | Cursor, model API changes | Prompt templates, cursor playbook |
| **Standards** | WCAG update, PCI DSS revision | Rubrics, accessibility patterns |

### Non-technology external change (future)

| Category | Examples |
|----------|----------|
| **Regulatory** | GDPR interpretation, industry compliance |
| **App store policy** | Apple/Google guideline changes |
| **Vendor EOL** | Service shutdown announcements |

---

## External Change Node (Graph)

Future graph node type: **External Change Event (ECE)**

| Field (conceptual) | Purpose |
|--------------------|---------|
| `eceId` | Unique identifier |
| `sourceType` | npm / github / vendor / advisory / manual |
| `severity` | info / low / medium / high / critical |
| `category` | framework / sdk / security / api / os / policy |
| `summary` | Human-readable description |
| `effectiveDate` | When change takes effect |
| `sunsetDate` | When old behavior stops (if applicable) |
| `referenceUrl` | Vendor docs, CVE, changelog |
| `detectedAt` | When KIL recorded event |

Edges:

- ECE → `affected_by` ← Module, Pattern, Prompt Template, Playbook, Rubric
- ECE → `triggers_review` → Asset[]
- ECE → `mitigated_by` ← Knowledge Pattern (after human promotion)

---

## Impact Propagation Model

```
External Change Event detected
        │
        ▼
Classification (category, severity, domain tags)
        │
        ▼
Graph matching — find nodes referencing affected:
        • package names
        • SDK versions
        • API endpoints
        • framework patterns
        • playbook checklist items
        │
        ▼
Create affected_by edges (KIL intelligence)
        │
        ▼
Health alerts (doc 04): Freshness ↓, Knowledge Debt ↑
        │
        ▼
Review queue (NOT auto-modify assets):
        • Module → stale candidate
        • Pattern → stale candidate  
        • Prompt Template → review candidate
        • Playbook section → review candidate
        • Rubric → calibration candidate
        │
        ▼
Human resolution paths:
        • Promote mitigation pattern (Learning Engine)
        • Supersede template/playbook (approved)
        • Deprecate module (Registry)
        • Accept risk (documented, audited)
```

**Law:** External change intelligence **never** auto-edits promoted assets. It creates **intelligence events** and graph edges only.

---

## Impact by Asset Type

### Modules

| Change type | Intelligence action |
|-------------|---------------------|
| Package deprecated | Flag module stale; traverse `depends_on` |
| Breaking API | Score penalty candidate; eval history review |
| Security CVE in dependency | Critical review queue; block new reuse recommendations (future) |
| Major version with migration path | Link to mitigation pattern when promoted |

### Knowledge Patterns

| Change type | Intelligence action |
|-------------|---------------------|
| Pattern references obsolete API | `affected_by` + stale state |
| Pattern contradicts new best practice | `contradicts` candidate vs new vendor guidance |
| Repeated eval failures post-change | Confidence downgrade signal |

### Prompt Templates

| Change type | Intelligence action |
|-------------|---------------------|
| Constraint outdated | Template review candidate |
| Context block references removed API | Assembly warning (future) |
| New mandatory constraint from advisory | Gap detection — no template covers it |

### Playbook

| Change type | Intelligence action |
|-------------|---------------------|
| Store submission requirement change | Checklist section stale |
| Deployment target change | DevOps playbook review |
| Tooling change (CI, Cursor) | Process section review |

### Rubrics

| Change type | Intelligence action |
|-------------|---------------------|
| Accessibility standard update | Dimension weight review |
| Security bar raised | Pass threshold calibration candidate |
| New failure mode observed industry-wide | New rubric dimension proposal |

### Knowledge (Records & Patterns)

| Change type | Intelligence action |
|-------------|---------------------|
| Bootstrap corpus outdated | ERP Discovery refresh trigger (architecture event) |
| Canonical pattern invalidated | `deprecated_by` chain + replacement search |

---

## Signal Sources (Future — Not Implemented)

| Source | Signal type | Phase |
|--------|-------------|-------|
| Manual entry | Any | Phase 1 |
| npm/GitHub advisory feeds | Security, deprecations | Phase 2 |
| Vendor RSS/changelog monitors | SDK, API | Phase 3 |
| Dependency graph scan (repo) | Package drift | Phase 3 |
| ERP/BOS commit hooks | Internal platform change | Phase 2 |
| Evaluation failure spike detection | Implicit external break | Phase 4 |
| AI summarization of vendor docs | Change extraction | Phase 5 |

---

## Relationship to ERP Discovery

Major internal platform changes (ERP/BOS rearchitecture) trigger the same propagation model as external changes:

- Event type: `internal_platform_change`
- Action: Full subgraph review for affected patterns/modules
- Analogous to ERP Discovery refresh (`08_KNOWLEDGE_ENGINE.md`)

---

## Severity → Response Matrix

| Severity | Response SLA (operational) | Default action |
|----------|------------------------------|----------------|
| Critical (active exploit, prod break) | 24h review | Block reuse of affected modules (future gate) |
| High (breaking change imminent) | 5 business days | Stale flag + review queue |
| Medium (deprecation window) | 20 business days | Health dashboard alert |
| Low (minor version) | Next quarterly review | Log only |
| Info | — | Graph node for reference |

---

## Failure Cases

| Failure | Response |
|---------|----------|
| False positive match | Human dismisses; audit `ece_dismissed` |
| Missed external change | Eval failure spike detection (Phase 4) |
| Over-alert fatigue | Severity tuning; batch by category |
| Auto-fix attempted | **Forbidden** — human promotion only |
| Client-specific break counted as agency pattern | Scope to engagement; no promotion |

---

## Boundaries

| KIL owns | KIL does not own |
|----------|------------------|
| Change event graph model | Package installation / upgrades |
| Impact traversal | CI/CD automation |
| Review queue intelligence | Vendor feed implementation (deferred) |
| Health metric updates | Module code changes |

Learning Engine still owns **promotion** of mitigation patterns. Knowledge Engine still owns **storage**.

---

## Related Documents

- [01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md](01_ORGANIZATIONAL_KNOWLEDGE_GRAPH.md)
- [02_KNOWLEDGE_RELATIONSHIPS.md](02_KNOWLEDGE_RELATIONSHIPS.md)
- [04_KNOWLEDGE_HEALTH.md](04_KNOWLEDGE_HEALTH.md)
- [07_INTELLIGENCE_ROADMAP.md](07_INTELLIGENCE_ROADMAP.md)
