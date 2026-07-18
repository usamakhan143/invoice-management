# ADR-002 — Three-Layer Ownership

## 1. Decision

ERP owns business operations, BOS owns founder strategy, and AOS owns software delivery.

## 2. Status

**Accepted**

## 3. Context

The audited ERP already has authoritative customer, lead, finance, user, permission, and reporting modules. BOS is implemented as a strategic sidecar with its own ventures, initiatives, milestones, decisions, and attributions. AOS adds a third concern: requirements, reuse, AI prompting, Cursor execution, evaluation, and delivery learning.

## 4. Problem

Without explicit ownership, implementation could create duplicate customers, projects, expenses, strategic milestones, users, or decisions. Overlapping sources of truth would produce inconsistent data, ambiguous permissions, and cross-layer coupling.

## 5. Decision

Ownership is permanently divided:

- **ERP:** business identity and transactions
- **BOS:** founder strategy and investment outcomes
- **AOS:** software-delivery process and intelligence

AOS may reference ERP and BOS records through company-scoped read ports. References remain read-only. AOS-owned delivery decisions use Architecture Decision Records; they do not become BOS strategic decisions.

## 6. Why this decision

Each layer answers a different question:

- ERP: What is happening in the business?
- BOS: Where and why is the founder investing?
- AOS: How will software be delivered and improved?

The split preserves mature ERP functionality and proven BOS boundaries while allowing AOS to specialize deeply.

## 7. Alternatives considered

- One unified platform domain containing all entities
- AOS owns client and project records
- BOS owns delivery engagements and Cursor execution
- ERP becomes the parent for every AOS artifact

## 8. Why alternatives were rejected

A unified model would couple unrelated lifecycles and permissions. AOS-owned clients duplicate ERP customers. BOS-owned execution confuses strategic milestones with development work. Making ERP parent every artifact would force ERP changes and violate backward compatibility.

## 9. Consequences

- Cross-layer integrations require explicit read ports.
- AOS cannot correct ERP/BOS data directly.
- A Delivery Engagement may link to an ERP Customer and optionally a BOS Initiative without becoming either.
- Removal of AOS leaves ERP and BOS operational.

## 10. Benefits

- Single source of truth per concern
- Lower migration and regression risk
- Independent evolution of layers
- Clear permissions and terminology
- Strong protection against accidental duplication

## 11. Risks

- Read-port work adds initial implementation effort.
- Users may expect one workflow to mutate all layers.
- Cross-layer reporting may require aggregation infrastructure later.

## 12. Future impact

New concepts must first be assigned to one layer. Cross-layer writes require a new accepted ADR and are presumed forbidden. Future AOS analytics may combine read models but cannot transfer ownership.

## 13. Related ADRs

ADR-001, ADR-003, ADR-011, ADR-015

## 14. Related Domain Entities

Delivery Engagement, Architecture Decision Record, Requirement, Reuse Assessment, Delivery Quality Report

## 15. Related Architecture Documents

- `docs/aos-architecture/02_CORE_PRINCIPLES.md`
- `docs/aos-architecture/03_SYSTEM_ARCHITECTURE.md`
- `docs/aos-domain-model/DOMAIN_RELATIONSHIP_MAP.md`
- `docs/erp-discovery/03_DATA_FLOW.md`
- `docs/erp-discovery/07_BOS_INTEGRATION_ANALYSIS.md`

## 16. Things that are permanently forbidden

- AOS-owned Customer, Lead, Invoice, Expense, User, Venture, or BOS Initiative duplicates
- AOS writing ERP or BOS business fields
- BOS owning Cursor Sessions or Prompt Artifacts
- ERP owning AOS Requirement or Evaluation lifecycles
- Silent movement of an entity from one layer to another
