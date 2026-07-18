# ADR-008 — Module Registry

## 1. Decision

AOS maintains a company-scoped metadata registry for reusable components, services, utilities, patterns, skills, rules, and templates.

## 2. Status

**Accepted**

## 3. Context

ERP Discovery found dozens of reusable components, services, utilities, hooks, and BOS patterns, but no searchable cross-project catalog. Developers can recreate existing functionality simply because they do not know it exists.

## 4. Problem

Reuse cannot be systematic without discoverable metadata, version identity, integration guidance, quality history, and deprecation status. Copying source code into a catalog would create stale duplicates and unclear ownership.

## 5. Decision

The Module Registry stores metadata and locations, never copied source. Each Module Registry Entry identifies type, origin, agency applicability, dependencies, integration notes, anti-patterns, status, and quality history. Immutable Module Versions preserve published metadata. Registry entries feed Reuse Assessments and Prompt Artifact directives.

## 6. Why this decision

The registry turns codebase knowledge into a reusable agency asset while leaving source under normal repository ownership. It supports both concrete modules and architectural patterns, which is necessary across web, mobile, AI, and SaaS work.

## 7. Alternatives considered

- Rely on repository search
- Store reusable source copies in AOS
- Use package registries only
- Document modules in static markdown only
- Let AI infer modules on every project

## 8. Why alternatives were rejected

Repository search lacks business metadata and quality history. Source copies drift. Package registries exclude internal patterns and integration guidance. Static docs are hard to match and update. Repeated AI inference wastes effort and may miss critical modules.

## 9. Consequences

- Registry content requires stewardship and stale detection.
- Initial entries are seeded from ERP Discovery.
- Reuse outcomes influence module quality scores.
- Multi-repository locations require future extension.

## 10. Benefits

- Discoverable reusable assets
- Fewer duplicate implementations
- Better prompt context
- Versioned integration guidance
- Evidence-based module quality

## 11. Risks

- Stale metadata can cause harmful recommendations.
- Quality scores may overvalue frequently used modules.
- Client-extracted modules introduce IP and confidentiality risk.
- Registry maintenance may be neglected.

## 12. Future impact

The registry may support semantic matching, automatic codebase refresh, cross-repository entries, and approved cross-agency sharing. Source-code ownership and company isolation remain unchanged.

## 13. Related ADRs

ADR-001, ADR-009, ADR-010, ADR-013, ADR-014

## 14. Related Domain Entities

Module Registry Entry, Module Version, Reuse Assessment, Reuse Recommendation, Prompt Artifact, Knowledge Pattern, Retrospective

## 15. Related Architecture Documents

- `docs/aos-architecture/09_REUSABLE_MODULE_SYSTEM.md`
- `docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md`
- `docs/erp-discovery/05_REUSABLE_COMPONENTS.md`
- `docs/erp-discovery/06_REUSABLE_BUSINESS_LOGIC.md`
- `docs/erp-discovery/09_DUPLICATION_REPORT.md`

## 16. Things that are permanently forbidden

- Storing copied source code as the registry's authoritative module
- Recommending reconstruction of ERP-owned modules
- Activating entries without location and integration guidance
- Deleting versions that were used by engagements
- Promoting client-specific code without IP clearance and anonymization
