# AOS Domain Model — Index

**Sprint:** AOS Domain Modeling Sprint  
**Status:** Architecture freeze candidate  
**Phase:** 0 — no implementation  
**Grounding:** `docs/aos-architecture/`, `docs/erp-discovery/`, `bos/domain/`

---

## Purpose of This Package

This folder freezes the **complete AOS domain model** before any implementation code, Firestore collections, TypeScript entities, or UI is created.

Every entity is defined as a **conceptual domain object** with lifecycle, invariants, and cross-layer boundaries — not as a database schema or code artifact.

---

## Domain Taxonomy

AOS domains are grouped into six bounded areas:

| Area | Entities | Doc |
|------|----------|-----|
| **Delivery** | Delivery Engagement, Delivery Template, Delivery Quality Report | `01_DELIVERY_DOMAIN.md` |
| **Requirements** | Requirement Set, Requirement, Requirement Attachment, Requirement Version, Reuse Assessment, Reuse Recommendation | `02_REQUIREMENTS_DOMAIN.md` |
| **Prompting** | Prompt Pack, Prompt Artifact, Prompt Version, Prompt Template | `03_PROMPT_DOMAIN.md` |
| **Execution** | Cursor Session, Cursor Revision | `04_CURSOR_DOMAIN.md` |
| **Quality** | Evaluation, Evaluation Rubric | `05_EVALUATION_DOMAIN.md` |
| **Knowledge & Registry** | Knowledge Record, Knowledge Pattern, Retrospective, Agency Playbook, Architecture Decision Record, Module Registry Entry, Module Version | `06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md` |

---

## Cross-Cutting Conventions

Applied to **all** AOS entities unless explicitly overridden.

### Tenancy

- Every AOS entity carries `companyId` (same semantics as ERP/BOS via `resolveCompanyIdForUser()`).
- Cross-company reads and writes are forbidden.
- Client-identifying data in knowledge entities must be anonymizable on promotion.

### Audit (mirrors BOS `AuditTimestamps` + `AuditActor`)

| Field (conceptual) | Meaning |
|--------------------|---------|
| `createdAt` | Record creation timestamp |
| `updatedAt` | Last mutation timestamp |
| `createdByUserId` | ERP user who created |
| `updatedByUserId` | ERP user who last updated |

Additional audit events emitted to ERP `ActivityLogger` for significant lifecycle transitions.

### ERP User References

AOS never owns user identity. All `*UserId` fields reference ERP `users/{uid}`.

### External References (read-only)

| Reference type | Target layer | Writable by AOS? |
|----------------|-------------|------------------|
| `erpCustomerId` | ERP `customers` | No |
| `erpLeadId` | ERP `leads` | No |
| `erpInvoiceId` | ERP `invoices` | No |
| `bosInitiativeId` | BOS `bosInitiatives` | No |
| `bosVentureId` | BOS `bosVentures` | No |

AOS stores foreign key references only. Hydration occurs via read ports at application layer.

### Deletion Philosophy (mirrors BOS)

| Class | Deletion policy |
|-------|----------------|
| **Core delivery records** | No physical delete; archive or cancel |
| **Version snapshots** | Immutable; never deleted |
| **Evaluations & sessions** | Append-only; never deleted |
| **Registry entries** | Deprecate, never delete |
| **Knowledge records** | Archive; never hard-delete promoted patterns |

### Versioning Philosophy

- **Mutable head + immutable versions** where history matters (Requirements, Prompts, Modules).
- Version records are append-only snapshots triggered by explicit publish/approve actions.
- The mutable head is the working draft; published versions are frozen.

### Layer Ownership

| Layer | Owns writes |
|-------|------------|
| ERP | customers, leads, invoices, expenses, users, activities |
| BOS | bosVentures, bosInitiatives, bosMilestones, bosDecisions, bosAttributions |
| AOS | All entities in this domain model |

---

## Entity Count

| # | Entity | Area |
|---|--------|------|
| 1 | Delivery Engagement | Delivery |
| 2 | Requirement Set | Requirements |
| 3 | Requirement | Requirements |
| 4 | Requirement Attachment | Requirements |
| 5 | Requirement Version | Requirements |
| 6 | Reuse Assessment | Requirements |
| 7 | Reuse Recommendation | Requirements |
| 8 | Delivery Template | Delivery |
| 9 | Prompt Pack | Prompting |
| 10 | Prompt Artifact | Prompting |
| 11 | Prompt Version | Prompting |
| 12 | Cursor Session | Execution |
| 13 | Cursor Revision | Execution |
| 14 | Evaluation | Quality |
| 15 | Evaluation Rubric | Quality |
| 16 | Knowledge Record | Knowledge |
| 17 | Knowledge Pattern | Knowledge |
| 18 | Module Registry Entry | Registry |
| 19 | Module Version | Registry |
| 20 | Retrospective | Knowledge |
| 21 | Agency Playbook | Knowledge |
| 22 | Architecture Decision Record | Knowledge |
| 23 | Prompt Template | Prompting |
| 24 | Delivery Quality Report | Delivery |

**Total: 24 entities**

---

## Summary Documents

| Doc | Purpose |
|-----|---------|
| `DOMAIN_RELATIONSHIP_MAP.md` | Complete relationship map |
| `DEPENDENCY_GRAPH.md` | Entity dependency ordering |
| `ARCHITECTURE_FREEZE_REPORT.md` | Freeze checklist and decisions |
| `MISSING_CONCEPTS_REPORT.md` | Gaps deferred to later phases |
| `READINESS_VERDICT.md` | Go/no-go for implementation |

---

## Compliance Tests (All Entities)

1. Entity is scoped by `companyId`
2. Entity does not duplicate an ERP or BOS entity
3. Entity has defined lifecycle with valid transitions
4. Entity has explicit creation/update/deletion rules
5. Cross-layer references are read-only foreign keys
6. Audit fields and ActivityLogger events defined
7. Invariants documented and enforceable at application layer
