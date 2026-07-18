# ADR-003 — Delivery Engagement Root

## 1. Decision

Delivery Engagement is the aggregate root for engagement-scoped AOS delivery artifacts.

## 2. Status

**Accepted**

## 3. Context

AOS needs one stable boundary connecting an ERP Customer to requirements, reuse assessments, prompt packs, Cursor sessions, evaluations, quality reports, decisions, knowledge, and retrospective outcomes. BOS Initiative cannot fill this role because it represents a strategic bet and is optional for routine client delivery.

## 4. Problem

If requirements, prompts, sessions, and knowledge are created without a common root, ownership, lifecycle progression, company isolation, closure rules, and audit history become fragmented. A generic “Project” root would also invite PM semantics and overlap BOS.

## 5. Decision

Every client delivery flow begins with one Delivery Engagement. It must reference one ERP Customer, one ERP delivery lead, and one company. It may reference an originating ERP Lead and BOS Initiative. Engagement lifecycle governs when child domains may progress:

intake → discovery → planning → building → evaluating → delivering → handoff → closed, with controlled pause and cancellation.

Approved requirements, completed evaluations, and a closed Retrospective are mandatory progression evidence.

## 6. Why this decision

Delivery Engagement represents a real agency commitment without duplicating client identity or strategy. It supplies a consistent aggregate boundary for invariants, audit, authorization, and cleanup while supporting greenfield, enhancement, maintenance, and migration work.

## 7. Alternatives considered

- Generic Project aggregate
- BOS Initiative as the root
- ERP Customer as the root
- Prompt Pack as the root
- Independent artifact aggregates with loose IDs

## 8. Why alternatives were rejected

“Project” carries generic PM assumptions. BOS Initiative is optional and strategic. ERP Customer can have many engagements and should not own AOS lifecycle. Prompt Pack covers execution only, not intake or learning. Loose artifacts weaken invariants and traceability.

## 9. Consequences

- All engagement-scoped entities inherit company and engagement identity.
- An engagement cannot close without required child outcomes.
- One customer may have many engagements.
- One BOS initiative may relate to multiple engagements.
- Cancellation archives context rather than deleting it.

## 10. Benefits

- Clear lifecycle and aggregate invariants
- Reliable traceability from client need to learning
- Strong company isolation
- Supports different software agency models
- Avoids creating a generic PM Project entity

## 11. Risks

- Aggregate may become too broad if services load all children at once.
- Long-running retainers may need cycles later.
- Cross-engagement reusable knowledge must be promoted rather than directly shared.

## 12. Future impact

Retainer cycles, multi-repository delivery, client visibility, and SLA metadata may extend the aggregate. They cannot replace it or weaken closure gates. If an Engagement Phase entity becomes necessary, it remains subordinate.

## 13. Related ADRs

ADR-001, ADR-002, ADR-004, ADR-005, ADR-007, ADR-012, ADR-015

## 14. Related Domain Entities

Delivery Engagement, Requirement Set, Prompt Pack, Cursor Session, Evaluation, Retrospective, Delivery Quality Report, Architecture Decision Record, Knowledge Record

## 15. Related Architecture Documents

- `docs/aos-architecture/04_PROJECT_LIFECYCLE.md`
- `docs/aos-domain-model/01_DELIVERY_DOMAIN.md`
- `docs/aos-domain-model/DOMAIN_RELATIONSHIP_MAP.md`
- `docs/aos-domain-model/DEPENDENCY_GRAPH.md`

## 16. Things that are permanently forbidden

- Introducing a second peer aggregate called Project for the same delivery work
- Making BOS Initiative mandatory for an engagement
- Making ERP Customer own AOS child lifecycles
- Closing an engagement without its frozen completion conditions
- Physically deleting an engagement with meaningful delivery history
