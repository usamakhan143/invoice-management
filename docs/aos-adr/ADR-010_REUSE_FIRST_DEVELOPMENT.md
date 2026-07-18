# ADR-010 — Reuse-First Development

## 1. Decision

AOS requires reuse assessment before planning net-new code. The long-term objective is not repeated code generation; it is minimal new code supported by growing reusable knowledge.

## 2. Status

**Accepted**

## 3. Context

ERP Discovery found substantial reusable functionality and documented high duplication risk around customers, invoices, leads, expenses, permissions, reporting, authentication, and BOS strategic concepts. AI code generation can increase duplication by making new code cheap without making it necessary.

## 4. Problem

If each engagement begins by generating fresh code, delivery remains slow to integrate, expensive to maintain, and inconsistent. Repeated code also fragments security, permissions, business rules, and bug fixes. AOS would become a faster duplication machine rather than a learning system.

## 5. Decision

Every approved delivery path follows:

Existing Module  
↓  
Reuse Assessment  
↓  
Integration or extension  
↓  
Minimal new code only for genuine gaps  
↓  
Evaluation and module/knowledge updates  
↓  
The next project starts faster

Reuse Recommendations classify direct reuse, extension, pattern-only reuse, or genuine gap. ERP-owned capabilities must be consumed, not rebuilt. Prompt Artifacts include accepted reuse directives.

## 6. Why this decision

Reuse compounds. A single successful module can reduce effort across many engagements, while repeated generation compounds maintenance cost. The Module Registry, Knowledge Engine, and Evaluation system make reuse measurable and improvable rather than aspirational.

## 7. Alternatives considered

- Generate code first and refactor later
- Leave reuse to developer judgment
- Reuse only packaged libraries
- Clone prior project code without assessment
- Optimize for maximum AI-generated output

## 8. Why alternatives were rejected

Refactoring later rarely removes duplication fully. Developer-only discovery is inconsistent. Package reuse excludes internal services and patterns. Cloning imports client coupling and stale assumptions. Maximizing generated output optimizes volume rather than business value.

## 9. Consequences

- Discovery includes mandatory reuse assessment.
- Some planning time shifts earlier.
- Registry quality directly affects delivery quality.
- Net-new implementation must explain why existing assets are insufficient.
- Rejected recommendations become learning signals.

## 10. Benefits

- Shorter delivery time
- Smaller maintenance surface
- Consistent architecture and permissions
- Better-tested building blocks
- Increased value from every completed engagement

## 11. Risks

- Forced reuse may preserve unsuitable legacy patterns.
- Registry gaps may create false confidence.
- Teams may overextend a module instead of building a clean replacement.
- Reuse metrics can be gamed if treated as quotas.

## 12. Future impact

Matching may become AI-assisted and quality-weighted. Reuse rate is a learning metric, not an absolute target. Genuine gaps remain valid sources of new modules after evaluation and extraction.

## 13. Related ADRs

ADR-001, ADR-005, ADR-008, ADR-009, ADR-011, ADR-012

## 14. Related Domain Entities

Reuse Assessment, Reuse Recommendation, Module Registry Entry, Module Version, Prompt Artifact, Evaluation, Retrospective, Knowledge Pattern

## 15. Related Architecture Documents

- `docs/aos-architecture/09_REUSABLE_MODULE_SYSTEM.md`
- `docs/aos-architecture/10_CONTINUOUS_LEARNING.md`
- `docs/aos-domain-model/02_REQUIREMENTS_DOMAIN.md`
- `docs/erp-discovery/09_DUPLICATION_REPORT.md`
- `docs/erp-discovery/08_AOS_INTEGRATION_POINTS.md`

## 16. Things that are permanently forbidden

- Rebuilding ERP-owned capability without an approved architecture change
- Skipping Reuse Assessment because generation appears faster
- Measuring AOS success by lines or volume of generated code
- Copying prior client code without suitability, privacy, and IP review
- Forcing reuse when documented evidence shows the module is unsafe or incompatible
