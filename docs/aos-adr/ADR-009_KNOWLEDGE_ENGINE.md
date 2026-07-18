# ADR-009 — Knowledge Engine

## 1. Decision

AOS captures delivery knowledge during normal work and promotes anonymized, reusable insights into company-wide Knowledge Patterns.

## 2. Status

**Accepted**

## 3. Context

ERP ActivityLogger records who changed operational data, and BOS captures strategic decisions and lessons. Neither captures delivery-specific knowledge such as prompt effectiveness, module suitability, architecture choices, Cursor failures, or reusable implementation lessons.

## 4. Problem

If learning depends on final documentation or individual memory, it is inconsistent and lost between projects. Raw client-specific facts cannot safely become company-wide context. A flat notes repository cannot distinguish evidence, pattern confidence, scope, or staleness.

## 5. Decision

Knowledge Records are captured from requirements, reuse decisions, Cursor sessions, evaluations, ADRs, and Retrospectives. Engagement-scoped records may be promoted through human approval into anonymized Knowledge Patterns. Patterns inform Prompt Templates, Agency Playbooks, Module Registry metadata, and future context assembly. Client-specific facts stay scoped and are never promoted.

## 6. Why this decision

Automatic capture creates a compounding delivery advantage without imposing a separate documentation project. Separating raw records from promoted patterns preserves evidence while ensuring agency-wide guidance is reviewed, reusable, and privacy-safe.

## 7. Alternatives considered

- Retrospective notes only
- ERP ActivityLogger as the full knowledge store
- BOS Decisions for all learning
- Shared wiki or markdown files only
- Automatic promotion of all AI-extracted lessons

## 8. Why alternatives were rejected

Retrospectives alone miss in-flight evidence. Activity logs lack insight. BOS Decisions are strategic, not delivery-oriented. Static documents do not create traceable promotion or retrieval. Automatic promotion can spread incorrect or confidential conclusions.

## 9. Consequences

- Knowledge requires classification, scope, and promotion governance.
- Retrospective closure is mandatory.
- Patterns require staleness and supersession controls.
- Capture volume must be managed to avoid noise.

## 10. Benefits

- Organizational memory survives turnover
- Prompt and module quality improve over time
- Failures become reusable prevention knowledge
- Client privacy is protected
- Documentation becomes a workflow byproduct

## 11. Risks

- Low-quality records may create noise.
- Human promotion may become a bottleneck.
- Anonymization may be incomplete.
- Stale patterns may misguide future engagements.

## 12. Future impact

Semantic retrieval, AI-assisted classification, stale detection, and optional cross-agency sharing may be added. Human-governed promotion and client isolation remain mandatory.

## 13. Related ADRs

ADR-001, ADR-006, ADR-007, ADR-008, ADR-010, ADR-014

## 14. Related Domain Entities

Knowledge Record, Knowledge Pattern, Retrospective, Agency Playbook, Architecture Decision Record, Prompt Template, Module Registry Entry, Evaluation

## 15. Related Architecture Documents

- `docs/aos-architecture/08_KNOWLEDGE_ENGINE.md`
- `docs/aos-architecture/10_CONTINUOUS_LEARNING.md`
- `docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md`
- `docs/business/11_Lessons_Learned.md`

## 16. Things that are permanently forbidden

- Promoting client-identifying facts into company-wide patterns
- Treating ERP activity events as sufficient delivery knowledge
- Automatically promoting unreviewed AI conclusions
- Deleting evidence supporting an active pattern
- Replacing BOS strategic decisions with AOS delivery knowledge
