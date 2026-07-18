# ADR-015 — Implementation Boundaries

## 1. Decision

Implementation may realize the frozen AOS architecture but may not redesign its ownership, aggregate roots, responsibilities, lifecycles, versioning, sidecar law, or evaluation-first philosophy.

## 2. Status

**Accepted**

## 3. Context

ERP Discovery, AOS Architecture Phase 0, the Domain Modeling Sprint, relationship map, dependency graph, freeze report, and readiness verdict are complete. Implementation now needs freedom to select technical details without reopening foundational decisions through incidental code choices.

## 4. Problem

Architecture often drifts silently during implementation. A convenient database shape, UI shortcut, framework limitation, or deadline can change cardinality, bypass a lifecycle, merge responsibilities, or allow writes across boundaries without explicit review.

## 5. Decision

Implementation may add:

- UI and interaction design
- Firestore persistence and indexes
- Repositories and application services
- ERP/BOS read ports and adapters
- Working feature flags
- Permission keys in the existing registry
- Validation, tests, migrations, observability, and backup support

Implementation may not change:

- Delivery Engagement as aggregate root
- ERP/BOS/AOS domain ownership
- Entity responsibilities and required relationships
- Frozen lifecycle transitions and closure gates
- Mutable-head/immutable-version philosophy
- Append-only evidence policy
- Sidecar/read-only cross-layer law
- Evaluation-before-progression
- Reuse-first development
- Rejection of generic PM as the core model

## 6. Why this decision

Technical choices must remain adaptable, but architectural meaning must remain stable. Separating allowed realization choices from forbidden semantic changes prevents code from becoming an unreviewed architecture amendment.

## 7. Alternatives considered

- Treat architecture documents as non-binding guidance
- Freeze every implementation detail now
- Allow each implementation sprint to reinterpret the model
- Let code become the source of truth automatically
- Require approval for every technical decision

## 8. Why alternatives were rejected

Non-binding guidance invites drift. Freezing all implementation details invents premature schemas and blocks learning. Sprint-level reinterpretation destroys consistency. Code alone cannot explain why a decision exists. Approval for every low-level choice would stop delivery.

## 9. Consequences

- Engineers have clear autonomy within semantic boundaries.
- Material conflicts require a new ADR before code proceeds.
- Reviews must check architecture compliance, not only tests.
- Some seemingly simple shortcuts will require redesign or escalation.

## 10. Benefits

- Stable domain during implementation
- Faster technical decisions within clear guardrails
- Reduced accidental coupling and duplication
- Auditable architecture evolution
- Easier onboarding and review

## 11. Risks

- Boundaries may be applied too rigidly to genuinely new evidence.
- Teams may misclassify a domain change as an implementation detail.
- ADR governance can become slow if ownership is unclear.

## 12. Future impact

New UI, infrastructure, providers, automation, and integrations can evolve freely if semantics remain intact. Material architecture changes require a new ADR with impact analysis, migration strategy, and explicit approval.

## 13. Related ADRs

ADR-001 through ADR-014

## 14. Related Domain Entities

All 24 frozen AOS domain entities, especially Delivery Engagement, Requirement Version, Prompt Pack, Cursor Session, Evaluation, Module Registry Entry, Knowledge Pattern, and Retrospective

## 15. Related Architecture Documents

- `docs/aos-domain-model/ARCHITECTURE_FREEZE_REPORT.md`
- `docs/aos-domain-model/READINESS_VERDICT.md`
- `docs/aos-domain-model/DEPENDENCY_GRAPH.md`
- `docs/aos-domain-model/DOMAIN_RELATIONSHIP_MAP.md`
- `docs/aos-architecture/12_IMPLEMENTATION_PLAN.md`

## 16. Things that are permanently forbidden

- Silent architecture change through code, schema, UI, or repository design
- Changing aggregate roots or ownership without a superseding ADR
- Weakening lifecycle, version, audit, sidecar, reuse, or evaluation rules for convenience
- Creating a third permission system
- Introducing dead feature flags
- Treating implementation code as authority over accepted ADRs
