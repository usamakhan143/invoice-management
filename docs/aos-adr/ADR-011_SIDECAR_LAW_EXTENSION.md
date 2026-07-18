# ADR-011 — Sidecar Law Extension

## 1. Decision

The BOS sidecar law extends to AOS: AOS writes only AOS-owned data and treats ERP and BOS as read-only sources.

## 2. Status

**Accepted**

## 3. Context

BOS already proves a read-port and sidecar pattern: ERP collections remain unchanged, while BOS writes strategic records to its own bounded context. ERP remains unaware of BOS. AOS needs customer, user, lead, invoice, expense, initiative, and strategic context.

## 4. Problem

Direct AOS writes to ERP or BOS would couple release cycles, bypass existing business rules, create hidden side effects, and make AOS removal unsafe. Adding AOS fields to source records would also force existing staff workflows to understand AOS.

## 5. Decision

AOS stores company-scoped foreign references to ERP/BOS entities and hydrates them through application-level read ports. It never mutates ERP/BOS records. Delivery-specific links, classifications, and outcomes remain AOS-owned. ERP ActivityLogger event emission is allowed through the established logging service because audit ownership remains ERP; it does not authorize business-data mutation.

## 6. Why this decision

The pattern preserves backward compatibility, clear ownership, testability, and independent operation. It has already been validated by BOS expense attribution and is safer than extending mature source documents with upper-layer concerns.

## 7. Alternatives considered

- Add AOS fields to ERP customers, invoices, and users
- Add delivery fields to BOS initiatives
- Use bidirectional synchronization
- Let AOS call ERP services for writes
- Duplicate ERP/BOS summaries into AOS as authoritative copies

## 8. Why alternatives were rejected

Source fields create coupling. BOS fields confuse strategy and execution. Synchronization introduces conflict and eventual-consistency risk. ERP service writes still violate ownership. Authoritative copies become stale and create competing truth.

## 9. Consequences

- New read ports are required for missing ERP/BOS data.
- AOS cannot repair source data itself.
- Cross-layer labels may change between reads.
- Aggregated reporting may need read models later.

## 10. Benefits

- Safe removal of AOS
- Stable ERP/BOS workflows
- Clear security boundaries
- Independent lifecycle evolution
- Proven architectural precedent

## 11. Risks

- Read latency and availability depend on source layers.
- Denormalized display data may become stale if used carelessly.
- Developers may bypass ports for convenience.

## 12. Future impact

Caching, read models, event feeds, or integration services may improve performance, but they cannot transfer source ownership or authorize AOS writes. Any bidirectional integration requires a superseding ADR.

## 13. Related ADRs

ADR-002, ADR-003, ADR-010, ADR-014, ADR-015

## 14. Related Domain Entities

Delivery Engagement, Requirement, Reuse Assessment, Prompt Pack, Delivery Quality Report, Module Registry Entry

## 15. Related Architecture Documents

- `docs/aos-architecture/02_CORE_PRINCIPLES.md`
- `docs/aos-architecture/03_SYSTEM_ARCHITECTURE.md`
- `docs/aos-domain-model/DOMAIN_RELATIONSHIP_MAP.md`
- `bos/docs/INTEGRATION_LAYER.md`
- `docs/erp-discovery/07_BOS_INTEGRATION_ANALYSIS.md`

## 16. Things that are permanently forbidden

- AOS writing ERP or BOS business fields
- AOS creating parallel authoritative customer, invoice, expense, user, or initiative data
- UI code reading ERP/BOS persistence directly
- Bidirectional synchronization without a superseding ADR
- Making ERP or BOS depend on AOS to remain operational
