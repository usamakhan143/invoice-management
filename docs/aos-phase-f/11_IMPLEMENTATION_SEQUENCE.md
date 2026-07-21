# 11 — Implementation Sequence

Derived from actual architecture gaps and layer boundaries. **No code authorized until each sprint explicitly approved.**

---

## F1 — Domain + Contracts

### Scope

- `LearningCandidate`, `LearningExtractionRun`, `LearningPromotionRecord` entities
- Value objects: `LearningProvenance`, `ConfidenceSnapshot`, `GateResult`, `PromotionTargetRef`
- Domain services: lifecycle transitions, gate evaluation (deterministic rules), promotion eligibility, provenance validation
- Repository **interfaces** only
- `LearningExtractionAiPort` interface + null adapter
- Contract DTOs for API/hooks
- Extend `AuditEventType` union with learning events (type definitions only)
- Unit tests for domain (pure)

### Forbidden

- Firestore collections, rules, indexes
- UI
- Real AI provider
- Promotion writes to catalogs
- Workflow aggregate changes

### Acceptance

- All LF invariants expressible in domain tests
- Illegal transitions rejected
- Gate rules G-001–G-005 implemented deterministically
- 100% domain unit coverage on lifecycle + gates

### Stop condition

Domain review + contracts frozen; F1 report accepted.

---

## F2 — Persistence + Extraction Application + Security

### Scope

- Firestore repos for 3 learning collections
- `firestore.rules` + indexes for learning collections
- `LearningExtractionApplicationService`
- Post-commit hook from `approveRetrospective` success path (application only)
- `AOS_FEATURE_FLAG.LEARNING_ENGINE`
- Evidence bundle loader
- Audit append for extraction events
- Integration tests: idempotency, tenant isolation, security rules

### Forbidden

- Promotion pipelines
- Learning queue UI
- Real AI (use null port)
- KIL

### Acceptance

- Approve retro → extraction run created idempotently
- Candidates created from deterministic retro-lesson path (no AI required)
- LF-03, LF-04, LF-02 integration tests pass
- Cross-company read/write denied

### Stop condition

Emulator integration green; F2 report accepted.

---

## F3 — Promotion Pipelines

### Scope

- `LearningPromotionApplicationService` + per-target adapters
- Extend catalog repos with **create/version** methods (infrastructure)
- `LearningSourceRef` on promoted assets
- Promotion transaction + audit
- Gate rules GK/GM/GP for promotion eligibility
- Optional: bind AI adapter behind feature flag
- Integration tests: promote knowledge, module, playbook; rollback; duplicate reject

### Forbidden

- Full learning queue UI (minimal API OK)
- KIL graph
- Dashboards

### Acceptance

- Approved candidate → promoted asset with version chain
- LF-06, LF-07, LF-08, LF-11 verified
- No mutation of Phase E version documents

### Stop condition

End-to-end promote path in emulator; F3 report accepted.

---

## F4 — Founder Review / Approval UI

### Scope

- Learning queue screen (ST pattern, new ST-16 or extend queue)
- Candidate detail with evidence links (reuse VersionHistory components)
- Approve / reject / defer actions
- Hooks + application commands
- Accessibility tests

### Forbidden

- Kanban/backlog patterns
- KIL visualization
- Metrics dashboards

### Acceptance

- Human can review gate-passed candidates
- Approve triggers promotion (F3)
- Full flywheel visible in UI for one engagement

### Stop condition

UI tests + axe pass; F4 report accepted.

---

## F5 — Full Learning Flywheel Verification

### Scope

- Replace stub `generateRetrospective` lessons with extraction-driven flow
- AI adapter (if provider authorized)
- Remaining gate rules (GK-002 overrides, module dual approval)
- Metrics **computability** verification (no dashboard)
- ERP ActivityLogger adapter (optional)
- E2E regression: delivery close → extract → approve → promote → reuse on new engagement read

### Acceptance

- All LF-01…LF-15 verified in integration suite
- Phase F closure report

### Stop condition

Phase F CLOSED — handoff to KIL planning or operational hardening.

---

## Dependency Graph

```
F1 (domain/contracts)
  └── F2 (persistence + extraction)
        └── F3 (promotion)
              └── F4 (UI)
                    └── F5 (verification + AI optional)
```

**Parallelization:** None between F1–F4. F5 may split AI binding if deferred.

---

## Estimated File Layers

| Sprint | Primary paths |
|--------|---------------|
| F1 | `aos/domain/learning/`, `aos/contracts/learning/` |
| F2 | `aos/application/learning/`, `aos/infrastructure/firestore/learning*` |
| F3 | `aos/application/learning/promotion/`, catalog repo extensions |
| F4 | `aos/presentation/screens/learning/`, `aos/hooks/queries/learning*` |
| F5 | Cross-cutting + tests |
