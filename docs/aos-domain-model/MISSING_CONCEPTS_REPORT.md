# Missing Concepts Report

Concepts intentionally **not modeled** in the 24-entity domain freeze. Each entry explains why it is deferred and when it may be needed.

---

## Category 1 — Explicitly Rejected (Not AOS)

These concepts were considered and rejected because they would make AOS a generic PM tool or duplicate existing layers.

| Concept | Why rejected | Alternative in AOS |
|---------|-------------|-------------------|
| **Task** | Generic PM concept | Prompt Artifact + Cursor Session |
| **Sprint** | Generic PM concept | Prompt Pack sequence |
| **Story / Story Points** | Generic PM estimation | Requirement + MoSCoW priority |
| **Kanban Board** | Generic PM UI | Engagement state machine |
| **Backlog** | Generic PM concept | Requirement Set (draft) |
| **Epic** | Generic PM concept | Delivery phase within engagement |
| **Subtask** | Generic PM concept | Prompt Pack artifact sequence |
| **Time Entry** | Not in scope | Deferred to Category 2 |
| **Resource Allocation** | Not in scope | Deferred to Category 2 |
| **Gantt Chart / Timeline** | Generic PM UI | Engagement states + quality report |
| **Client Portal User** | ERP owns users | Deferred to Category 2 |
| **Duplicate Customer** | ERP owns customers | ERP Customer reference |
| **Duplicate Invoice** | ERP owns invoices | ERP Invoice reference |
| **BOS Milestone as Dev Task** | BOS owns business milestones | Separate AOS delivery milestones (deferred) |
| **BOS Decision as Code Review** | BOS owns strategic decisions | ADR for delivery decisions |

---

## Category 2 — Deferred to Future Phases

Concepts aligned with AOS vision but not required for domain freeze or Phase 1 implementation.

### Phase 2 Extensions

| Concept | Why deferred | Trigger to add |
|---------|-------------|--------------|
| **Engagement Phase** | Prompt Pack covers phasing for now | Multiple concurrent packs needed |
| **Requirement Dependency** | Requirements independent in v1 | Complex projects with blocking deps |
| **Partial Requirement Approval** | Full-set approval simpler | Phased delivery demand |
| **Client Communication Log** | ERP outreachEvents covers sales | Client-facing delivery comms needed |
| **Estimation Record** | Metrics captured in Retrospective | Formal estimation history needed |
| **Retainer Cycle** | Maintenance engagements use same entity | Recurring billing cycle tracking |

### Phase 3 Extensions

| Concept | Why deferred | Trigger to add |
|---------|-------------|--------------|
| **AI Orchestration Request** | Infrastructure not decided | Server-side tier built |
| **Context Assembly Record** | Embedded in Prompt Artifact for now | Debugging context needs |
| **File Storage Reference** | No storage infrastructure | Firebase Storage or equivalent deployed |
| **Agent Transcript** | Manual capture in Session for now | Cursor Level 3 automation |
| **Git Commit Reference** | Manual file list in capture | Git integration built |
| **Automated Evaluation** | Human confirmation in Phase 3 | Evaluation accuracy proven |

### Phase 4 Extensions

| Concept | Why deferred | Trigger to add |
|---------|-------------|--------------|
| **Documentation Artifact** | Generated in Quality Report for now | Standalone doc management |
| **Cross-Engagement Benchmark** | Needs N completed engagements | Sufficient data volume |
| **Template Effectiveness Score** | Manual template improvement first | Automated scoring justified |
| **Knowledge Search Index** | Structured retrieval sufficient initially | Scale requires search |
| **Promotion Vote** | Delivery lead approves promotions | Team size warrants voting |

### Phase 5 Extensions

| Concept | Why deferred | Trigger to add |
|---------|-------------|--------------|
| **Client Delivery Portal** | Not core to delivery OS | Client visibility requested |
| **Cross-Agency Pattern Sharing** | Single agency focus | Multi-agency platform |
| **Cursor SDK Session Automation** | Level 1–2 first | SDK integration ready |
| **Workflow Automation Rule** | Manual lifecycle sufficient | Repetitive patterns identified |
| **SLA / Deadline Entity** | Risk of becoming PM tool | Contractual SLA tracking needed |

---

## Category 3 — Infrastructure Concepts (Not Domain Entities)

These are infrastructure concerns, not domain entities. They will be addressed in implementation architecture, not domain model.

| Concept | Layer | Notes |
|---------|-------|-------|
| Firestore collection mapping | Infrastructure | Deliberately excluded from domain freeze |
| Repository interfaces | Infrastructure | Follow BOS contract pattern |
| Read port interfaces | Integration | Extend BOS port pattern |
| Feature flag registry | Config | Must work (unlike BOS dead flags) |
| Permission key registry | Config | Extend `config/permissions.ts` |
| ActivityLogger event catalog | Cross-cutting | Extend existing logger |
| Server-side orchestration service | Infrastructure | Phase 3 prerequisite |
| File storage service | Infrastructure | Phase 3 prerequisite |
| Backup/migration inclusion | Infrastructure | Extend DatabaseMigrationService |

---

## Category 4 — Identified Gaps Requiring Decision Before Implementation

These are not missing entities but **unresolved design questions** that may produce new entities or modify existing ones.

| Gap | Impact | Decision needed by |
|-----|--------|-------------------|
| **Junction entities for N:M** | Requirement ↔ Prompt Artifact traceability | Phase 2 implementation |
| **Engagement Phase entity** | Multi-phase projects | Phase 2 if needed |
| **Delivery Milestone vs BOS Milestone** | Alignment tracking | Phase 2 — may add read-only link entity |
| **Time tracking entity** | Agency billing by hour | Business decision — may never be AOS |
| **Multi-repo module location** | Mobile/client separate repos | Phase 1 if multi-repo confirmed |
| **Evaluation amendment model** | Re-scoring same session | Phase 3 — amendment vs new evaluation |
| **Prompt Pack parallelism** | Independent artifact tracks | Phase 3 if sequential too slow |
| **Confidential attachment storage** | Security model | Phase 2 with file storage |

---

## Category 5 — Concepts from Architecture Docs Not Yet Entity-ified

| Architecture concept | Current entity coverage | Gap |
|---------------------|------------------------|-----|
| AI Orchestration Router | Not entity-ified | Captured in Prompt Artifact metadata for now |
| Context Assembler | Not entity-ified | Embedded in Prompt Artifact context block |
| Matching Engine | Not entity-ified | Reuse Assessment is the output entity |
| Evaluation Engine | Not entity-ified | Evaluation is the output entity |
| Ingestion Pipeline | Not entity-ified | Knowledge Record creation covers this |
| Retrieval Service | Not entity-ified | Query concern, not storage entity |
| Promotion Workflow | Not entity-ified | State transitions on Knowledge Record/Pattern |
| Bootstrap Seed | Not entity-ified | One-time import process |

These are **application services**, not domain entities. Correctly excluded from entity model.

---

## Category 6 — ERP/BOS Concepts AOS Must Never Model

Hard exclusions from Duplication Report — listed here as permanent missing concepts (intentionally never added):

| ERP/BOS concept | AOS approach |
|----------------|-------------|
| Customer | Reference `erpCustomerId` |
| Business | Reference via ERP port |
| Lead | Reference `erpLeadId` |
| Invoice | Reference via ERP port |
| Expense | Reference via ERP port + BOS attribution |
| Bank Account | Reference via ERP port |
| User / Team Member | Reference `*UserId` |
| Custom Role / Permission | Extend existing registry |
| BOS Venture | Reference via port |
| BOS Initiative | Reference via port |
| BOS Milestone | Read for alignment; no AOS equivalent initially |
| BOS Decision | Read for constraints; ADR for delivery decisions |
| BOS Attribution | Read for investment context |
| Campaign | Not referenced by AOS |
| Product | Read for requirement context |

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Explicitly rejected | 15 | Never add |
| Deferred to future phases | 22 | Add when triggered |
| Infrastructure (not entities) | 9 | Implementation architecture |
| Gaps requiring decision | 8 | Decide before relevant phase |
| Application services (not entities) | 8 | Correctly excluded |
| ERP/BOS hard exclusions | 14 | Never add |

**No missing entity blocks Phase 1 implementation.**

The 24 frozen entities are sufficient to begin Delivery Engagement + Registry + Template bootstrap.
