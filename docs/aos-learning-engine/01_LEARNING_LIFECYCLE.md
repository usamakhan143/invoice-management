# 01 — Learning Lifecycle

**Stage D2.5 — Learning Engine Architecture**

---

## Purpose

Define the governed lifecycle that transforms a **closed Retrospective** into durable **organizational learning** — patterns, modules, prompts, playbooks, and metrics that improve future engagements.

The objective is **organizational learning**, not knowledge storage. Storage is a means; compounding delivery capability is the end.

---

## Inputs

| Input | Source | Required? |
|-------|--------|-----------|
| Closed Retrospective | AOS Retrospective domain | **Yes** — trigger |
| Evaluation outcomes | Evaluation Engine | **Yes** |
| Reuse Assessment decisions | Matching / Reuse domain | **Yes** |
| Prompt Pack metadata | Prompt Engine | **Yes** |
| Cursor session records | Cursor Integration | **Yes** |
| Requirement versions | Requirements domain | Optional |
| Engagement metrics | Delivery Engagement metadata | **Yes** |
| BOS initiative lessons | BOS (read-only) | Optional |
| ERP Discovery anti-patterns | Bootstrap corpus | Reference |

---

## Outputs

| Output | Consumer |
|--------|----------|
| Learning Extraction Report | Delivery lead, Learning queue |
| Knowledge Candidates | Knowledge Engine |
| Module Candidates | Module Registry |
| Prompt Improvement Candidates | Prompt Engine |
| Evaluation Insights | Evaluation Engine, Prompt Engine |
| Playbook update proposals | Agency Playbook |
| Registry improvement actions | Module Registry |
| Promoted Knowledge Patterns | Retrieval, Prompt context assembly |
| Reusable Assets (modules, templates) | Future engagements |
| Learning metrics snapshot | Dashboard (future), quarterly review |

---

## Ownership

| Layer | Owner | Responsibility |
|-------|-------|----------------|
| Learning Engine process | AOS | Orchestration and governance |
| Retrospective | AOS / Delivery lead | Trigger and qualitative input |
| Knowledge Records & Patterns | AOS | Capture and promotion |
| Module Registry | AOS | Asset catalog |
| Prompt Templates | AOS Prompt Engine | Template evolution |
| Agency Playbook | AOS | Process evolution |
| Audit events | ERP ActivityLogger | Append-only event stream |
| BOS strategic context | BOS | Read-only input |

---

## Approval

| Stage | Approver | Gate |
|-------|----------|------|
| Learning Extraction (automated) | — | Runs on retrospective `closed` |
| Candidate classification (AI-assisted) | — | Produces draft candidates only |
| Knowledge promotion | Delivery lead | Required per ADR-009 |
| Module registration | Delivery lead + technical reviewer | Required per ADR-008 |
| Prompt template update | Delivery lead | Required |
| Playbook section update | Delivery lead or agency owner | Required |
| Pattern activation | Delivery lead | `proposed` → `active` |

**Law:** AI recommends; humans approve. No automatic promotion of AI conclusions (ADR-009 §16).

---

## Versioning

| Artifact | Version model |
|----------|---------------|
| Learning Extraction Report | One per retrospective; immutable after publish |
| Knowledge Candidate | Links to source retrospective version |
| Knowledge Pattern | Integer `patternVersion` with predecessor chain |
| Module Registry Entry | Module Version semver |
| Prompt Template | Template version with changelog |
| Agency Playbook | Section version with effective date |
| Evaluation Insight | Tied to evaluation ID (append-only) |

See [10_VERSIONING_STRATEGY.md](10_VERSIONING_STRATEGY.md).

---

## Promotion Rules

Learning progresses through **candidate → review → promotion → activation**:

```
Retrospective (closed)
        │
        ▼
Learning Extraction ──→ produces typed candidates (not promotions)
        │
        ├── Knowledge Candidates ──→ promotion review ──→ Knowledge Pattern
        ├── Module Candidates ──→ registration review ──→ Registry Entry
        ├── Prompt Candidates ──→ template review ──→ Prompt Template update
        ├── Evaluation Insights ──→ rubric/template review ──→ Evaluation config
        └── Playbook Proposals ──→ playbook review ──→ Agency Playbook section
        │
        ▼
Reusable Assets available to Matching Engine, Prompt Engine, Knowledge retrieval
        │
        ▼
Future Engagement (intake uses improved assets)
```

Cross-cutting rules:

1. Client-identifying content **never** promotes (ADR-009).
2. Single-observation lessons remain engagement-scoped unless confidence rises (see [11_KNOWLEDGE_CONFIDENCE_LEVELS.md](11_KNOWLEDGE_CONFIDENCE_LEVELS.md)).
3. Failed evaluations must produce at least one learning candidate or documented "no reusable pattern."
4. Rejected reuse recommendations must produce a learning signal (ADR-010).

---

## Lifecycle

### Phase 0 — Pre-trigger (during engagement)

Evidence accumulates append-only: requirements, reuse, prompts, cursor, evaluation. No Learning Engine execution.

### Phase 1 — Trigger

Retrospective reaches `closed`. Engagement cannot fully close without this (domain invariant).

### Phase 2 — Extraction

Learning Engine ingests retrospective + engagement evidence. Produces **Learning Extraction Report** with typed candidates.

### Phase 3 — Classification

Candidates tagged by: agency type, domain, confidence, target system (Knowledge / Registry / Prompt / Playbook / Evaluation).

### Phase 4 — Review queue

Candidates enter founder/delivery-lead review queues (future ST-12+ screens). SLA: async review within 5 business days (operational target, not technical constraint).

### Phase 5 — Promotion

Approved candidates mutate target systems: patterns activated, modules registered, templates versioned, playbook sections updated.

### Phase 6 — Activation

Promoted assets become eligible for retrieval, matching, and prompt assembly in **subsequent** engagements.

### Phase 7 — Measurement

Metrics computed and appended to engagement learning record. Flywheel metrics updated (see [12_LEARNING_METRICS.md](12_LEARNING_METRICS.md)).

### Phase 8 — Decay & refresh

Stale detection runs on schedule or platform-change events. Patterns may move to `stale` without deletion.

---

## Failure Cases

| Failure | Detection | Response |
|---------|-----------|----------|
| Retrospective skipped | Engagement close blocked | Cannot enter Learning Engine |
| Extraction produces zero candidates | Empty report flag | Delivery lead confirms or reopens retrospective |
| AI hallucinated candidate | Human review | Reject candidate; log rejection reason |
| Promotion without evidence | Quality gate failure | Block promotion; require supporting records |
| Anonymization incomplete | PII scan on promotion | Block; return to review |
| Conflicting pattern | Conflict detector | Human merge/supersede decision |
| Registry entry duplicates existing | Dedup check | Merge or reject with learning note |
| Playbook update contradicts ADR | ADR cross-check | Escalate to architecture owner |
| Audit event emission failure | ERP logger error | Retry; block promotion until logged |
| Metrics computation error | Pipeline failure | Alert; manual metrics entry allowed |

---

## Audit Requirements

| Event | ERP ActivityLogger type (conceptual) |
|-------|--------------------------------------|
| Learning extraction started | `aos_learning_extraction_started` |
| Learning extraction completed | `aos_learning_extraction_completed` |
| Candidate created | `aos_learning_candidate_created` |
| Candidate approved | `aos_learning_candidate_approved` |
| Candidate rejected | `aos_learning_candidate_rejected` |
| Promotion executed | `aos_learning_promotion_executed` |
| Pattern activated | `aos_knowledge_pattern_promoted` |
| Module registered from learning | `aos_module_registered_from_learning` |
| Template updated from learning | `aos_prompt_template_updated_from_learning` |
| Playbook section updated | `aos_playbook_section_updated` |

All events link: `companyId`, `engagementId`, `retrospectiveId`, `actorUserId`, `candidateId`, timestamp.

Append-only per ADR-014. Learning evidence is never hard-deleted.

---

## Related Documents

- [07_CONTINUOUS_LEARNING_FLYWHEEL.md](07_CONTINUOUS_LEARNING_FLYWHEEL.md)
- [09_APPROVAL_WORKFLOW.md](09_APPROVAL_WORKFLOW.md)
- [08_QUALITY_GATES.md](08_QUALITY_GATES.md)
- `docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md` (Retrospective entity)
