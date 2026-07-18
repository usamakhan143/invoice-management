# AOS Final Architecture Lock

## Official Declaration

The AOS Phase 0 architecture is officially **FROZEN and ACCEPTED**.

The discovery, architecture, domain-modeling, relationship, dependency, readiness, and ADR work has established a complete implementation boundary. Implementation may now begin, but only within this lock and the accepted ADRs.

This document does not authorize silent redesign. It authorizes implementation of the design already approved.

## Architecture Version

**AOS Architecture v1.0**

This version covers the complete Phase 0 architecture and domain model before the first AOS production implementation.

## Freeze Date

**July 17, 2026**

## Freeze Status

| Area | Status |
|---|---|
| ERP Discovery | Complete |
| AOS Architecture Phase 0 | Accepted |
| AOS Domain Model | Frozen |
| Domain Relationship Map | Frozen |
| Dependency Graph | Frozen |
| Architecture Freeze Report | Accepted |
| Missing Concepts Report | Accepted as explicit deferral record |
| Readiness Verdict | GO |
| ADR Set ADR-001 through ADR-015 | Accepted |
| Phase 0 architecture | **LOCKED** |
| Implementation | **May begin within this lock** |

## Covered Documents

### ERP foundation

- `docs/erp-discovery/01_SYSTEM_OVERVIEW.md`
- `docs/erp-discovery/02_MODULE_INVENTORY.md`
- `docs/erp-discovery/03_DATA_FLOW.md`
- `docs/erp-discovery/04_FIRESTORE_ANALYSIS.md`
- `docs/erp-discovery/05_REUSABLE_COMPONENTS.md`
- `docs/erp-discovery/06_REUSABLE_BUSINESS_LOGIC.md`
- `docs/erp-discovery/07_BOS_INTEGRATION_ANALYSIS.md`
- `docs/erp-discovery/08_AOS_INTEGRATION_POINTS.md`
- `docs/erp-discovery/09_DUPLICATION_REPORT.md`
- `docs/erp-discovery/10_TECHNICAL_DEBT.md`
- `docs/erp-discovery/11_AOS_READINESS_REPORT.md`

### AOS architecture

- `docs/aos-architecture/01_AOS_VISION.md`
- `docs/aos-architecture/02_CORE_PRINCIPLES.md`
- `docs/aos-architecture/03_SYSTEM_ARCHITECTURE.md`
- `docs/aos-architecture/04_PROJECT_LIFECYCLE.md`
- `docs/aos-architecture/05_AI_ORCHESTRATION.md`
- `docs/aos-architecture/06_PROMPT_ENGINE.md`
- `docs/aos-architecture/07_CURSOR_INTEGRATION.md`
- `docs/aos-architecture/08_KNOWLEDGE_ENGINE.md`
- `docs/aos-architecture/09_REUSABLE_MODULE_SYSTEM.md`
- `docs/aos-architecture/10_CONTINUOUS_LEARNING.md`
- `docs/aos-architecture/11_ROADMAP.md`
- `docs/aos-architecture/12_IMPLEMENTATION_PLAN.md`

### AOS domain model

- `docs/aos-domain-model/00_DOMAIN_MODEL_INDEX.md`
- `docs/aos-domain-model/01_DELIVERY_DOMAIN.md`
- `docs/aos-domain-model/02_REQUIREMENTS_DOMAIN.md`
- `docs/aos-domain-model/03_PROMPT_DOMAIN.md`
- `docs/aos-domain-model/04_CURSOR_DOMAIN.md`
- `docs/aos-domain-model/05_EVALUATION_DOMAIN.md`
- `docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md`
- `docs/aos-domain-model/DOMAIN_RELATIONSHIP_MAP.md`
- `docs/aos-domain-model/DEPENDENCY_GRAPH.md`
- `docs/aos-domain-model/ARCHITECTURE_FREEZE_REPORT.md`
- `docs/aos-domain-model/MISSING_CONCEPTS_REPORT.md`
- `docs/aos-domain-model/READINESS_VERDICT.md`

### BOS precedent

- `bos/docs/INTEGRATION_LAYER.md`
- The existing BOS sidecar, application-service, domain-rule, repository-contract, and read-port architecture

## Covered ADRs

| ADR | Locked decision |
|---|---|
| ADR-001 | AOS purpose |
| ADR-002 | Three-layer ownership |
| ADR-003 | Delivery Engagement aggregate root |
| ADR-004 | Requirement versioning |
| ADR-005 | Prompt Pack architecture |
| ADR-006 | Cursor execution model |
| ADR-007 | Evaluation gate |
| ADR-008 | Module Registry |
| ADR-009 | Knowledge Engine |
| ADR-010 | Reuse-first development |
| ADR-011 | Sidecar law extension |
| ADR-012 | No generic project management |
| ADR-013 | Versioning policy |
| ADR-014 | Audit and append-only policy |
| ADR-015 | Implementation boundaries |

## Locked Architectural Truths

1. ERP owns business operations and remains authoritative for customers, leads, invoices, expenses, banking, users, roles, permissions, and business reporting.
2. BOS owns founder strategy and remains authoritative for ventures, initiatives, strategic milestones, strategic decisions, and investment attribution.
3. AOS owns software delivery: engagements, requirements, reuse, prompts, Cursor execution records, evaluations, delivery knowledge, module metadata, and retrospectives.
4. Delivery Engagement is the AOS aggregate root for engagement-scoped delivery.
5. Approved requirements and prompts are immutable versions.
6. Prompt Packs and Prompt Artifacts are the execution-planning model.
7. Cursor executes; AOS governs, captures, evaluates, and learns.
8. Evaluation is mandatory before dependent delivery progression.
9. Reuse Assessment precedes justified net-new development.
10. AOS never writes ERP or BOS business records.
11. Core versions and execution evidence are append-only.
12. AOS is not a generic project-management system.
13. Every AOS entity is company-isolated.
14. AOS removal must not break ERP or BOS.
15. Material architecture change requires a future ADR.

## Allowed Changes

Implementation may add or refine:

- React pages, components, interaction patterns, and accessibility behavior
- Firestore collections, document mappings, converters, indexes, and security rules
- Domain entity code that faithfully represents frozen responsibilities
- Repository contracts and implementations
- Application services and validation
- ERP/BOS read ports and adapters
- Feature flags that are enforced at runtime
- Permission keys added to the existing ERP permission registry
- ActivityLogger event types
- Backup, migration, monitoring, caching, and observability
- Unit, integration, emulator, and UI tests
- Server-side AI orchestration and file-storage infrastructure in later phases
- Optional fields already identified as future extensibility
- Additional evaluation dimensions and audit events that do not change meaning

These are implementation choices, not authority to change domain semantics.

## Forbidden Changes

Implementation may not:

- Replace Delivery Engagement with Project, Task, Sprint, Epic, or another aggregate root
- Move ownership among ERP, BOS, and AOS
- Duplicate ERP Customer, Lead, Invoice, Expense, User, permission, or banking domains
- Duplicate BOS Venture, Initiative, Milestone, Decision, or Attribution domains
- Permit AOS writes to ERP or BOS business fields
- Remove or weaken read-port boundaries
- Change required relationships or lifecycle gates silently
- Make published versions mutable or deletable
- Delete failed sessions, revisions, or confirmed evaluations
- Bypass Evaluation before progression
- Skip Reuse Assessment as a standard delivery step
- Replace Prompt Packs with generic backlogs or task boards
- Make Kanban, Sprints, Story Points, or velocity the AOS source of truth
- Create a third permission system
- Introduce feature flags that are defined but not enforced
- Make ERP or BOS dependent on AOS
- Use an implementation shortcut as an undocumented architecture amendment

## Change Management Process

A proposed material change must follow this sequence:

1. **Raise a change proposal** describing the problem and evidence.
2. **Classify the change** as implementation detail, clarification, or architecture change.
3. **Perform impact analysis** against all ADRs, 24 domain entities, relationship map, dependency graph, ERP/BOS boundaries, permissions, migrations, and existing implementations.
4. **Write a new ADR** using the standard 16-section template.
5. **Identify affected ADRs** and mark them Accepted, Superseded, or Deprecated only after approval.
6. **Define migration and backward-compatibility impact** before code changes.
7. **Obtain explicit architecture approval.**
8. **Update the final lock version** (for example v1.1 or v2.0) and covered-document register.
9. **Implement only after approval.**

No code-first architecture amendment is valid.

## Architecture Governance Rules

- Accepted ADRs outrank implementation plans and code comments.
- Architecture reviews must include ADR compliance, not only functional tests.
- Domain invariants are enforced in application/domain layers, not left to UI convention.
- Read ports are the only sanctioned cross-layer data access path.
- Company isolation is mandatory in every repository and query.
- Every partial capability uses a working feature flag.
- Every new AOS permission extends the existing permission registry.
- Every persisted AOS domain is included in backup and migration planning.
- Every executed prompt references an immutable version.
- Every significant lifecycle transition is auditable.
- Every material implementation deviation stops work until classified and approved.

## Future ADR Process

Future ADRs:

- Use the same 16-section template as ADR-001 through ADR-015.
- Receive the next sequential identifier (`ADR-016`, `ADR-017`, and so on).
- State whether they extend, supersede, or deprecate existing ADRs.
- Explain why the frozen decision is insufficient using implementation or operational evidence.
- Include domain, relationship, migration, security, tenancy, audit, and backward-compatibility impact.
- Never rewrite an accepted ADR's history.

Likely future ADR topics include server-side AI orchestration, file storage, multi-repository module locations, Cursor SDK automation, retainer cycles, and any proposed delivery-milestone concept. None may contradict this lock without explicitly superseding the affected ADR.

## Implementation Authorization

**AOS Phase 0 is complete.**

Implementation may now begin in the order defined by `docs/aos-architecture/12_IMPLEMENTATION_PLAN.md`, starting with bounded-context foundations and Delivery Engagement. This authorization permits implementation only. It does not permit new architecture, silent reinterpretation, or violation of the accepted ADRs.

## Final Lock Statement

As of July 17, 2026, **AOS Architecture v1.0 is locked**.

The first line of implementation must conform to this architecture, and every subsequent line remains subject to the same governance until an approved future ADR changes it.
