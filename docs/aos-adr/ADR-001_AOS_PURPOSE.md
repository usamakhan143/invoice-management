# ADR-001 — AOS Purpose

## 1. Decision

AOS is an AI-first Development Operating System for software delivery. It improves planning, reuse, prompting, Cursor execution, evaluation, knowledge capture, and continuous learning.

## 2. Status

**Accepted**

## 3. Context

ERP already owns mature business operations: leads, customers, invoices, expenses, banking, users, permissions, and reports. BOS owns founder strategy through ventures, initiatives, milestones, decisions, and investment attribution. The ERP Discovery Audit found no existing operating layer for software-delivery intelligence, despite substantial reusable code and an established Cursor-based workflow.

## 4. Problem

Software delivery knowledge currently remains fragmented across developer memory, ad hoc prompts, code files, and isolated project outcomes. Reusable modules are discovered by chance, Cursor output lacks a consistent evaluation loop, and completed projects do not systematically improve future delivery. Building another project tracker would record work without solving these problems.

## 5. Decision

AOS owns the complete software-delivery learning loop:

Requirement → Reuse Assessment → Prompt Pack → Cursor Session → Evaluation → Knowledge → improved future delivery.

Its purpose is to reduce delivery time and net-new code while increasing quality and organizational learning. It supports web, mobile, AI, and SaaS agencies through specialized templates, rubrics, and reusable modules—not through generic project-management abstractions.

## 6. Why this decision

The existing platform already handles business and strategy. The missing capability is a system that makes software development repeatable and self-improving. Cursor can execute code changes, but it does not own client context, requirements, quality gates, reuse policy, or company knowledge. AOS supplies that operating layer while preserving current ERP/BOS investments.

## 7. Alternatives considered

- Extend ERP into delivery management
- Extend BOS into development execution
- Adopt a generic project-management product
- Use Cursor alone with informal prompts
- Build a generic AI code-generation platform

## 8. Why alternatives were rejected

ERP expansion would mix operational business data with software-delivery artifacts. BOS expansion would confuse strategic business outcomes with development execution. Generic PM products optimize tasks and boards rather than prompt quality and reuse. Cursor alone cannot provide durable organizational governance. A generic code generator would repeat code creation rather than compound reusable agency assets.

## 9. Consequences

- AOS becomes a distinct bounded context.
- Delivery artifacts require explicit entities and lifecycles.
- ERP and BOS remain usable without AOS.
- The system must capture execution and evaluation evidence, not only status.
- Some future capabilities require server-side AI orchestration and storage, which the current ERP lacks.

## 10. Benefits

- Clear product identity and scope
- No duplication of mature ERP/BOS modules
- Traceable AI-assisted delivery
- Higher reuse and lower rework
- Knowledge survives individual projects and developers
- One specialized operating model across software agency types

## 11. Risks

- Scope may drift toward generic PM features.
- AI-first may be misunderstood as fully autonomous coding.
- Capture discipline may feel heavier before automation exists.
- Value depends on high-quality requirements, evaluation, and registry data.

## 12. Future impact

All future phases must be measured against delivery acceleration, reuse, quality, and learning. Capabilities such as time tracking or client portals may be added only when they support this purpose without redefining AOS as an ERP or PM product.

## 13. Related ADRs

ADR-002, ADR-006, ADR-007, ADR-009, ADR-010, ADR-012, ADR-015

## 14. Related Domain Entities

Delivery Engagement, Requirement Set, Reuse Assessment, Prompt Pack, Prompt Artifact, Cursor Session, Evaluation, Knowledge Record, Module Registry Entry, Retrospective

## 15. Related Architecture Documents

- `docs/aos-architecture/01_AOS_VISION.md`
- `docs/aos-architecture/03_SYSTEM_ARCHITECTURE.md`
- `docs/aos-architecture/04_PROJECT_LIFECYCLE.md`
- `docs/aos-domain-model/00_DOMAIN_MODEL_INDEX.md`
- `docs/erp-discovery/11_AOS_READINESS_REPORT.md`

## 16. Things that are permanently forbidden

- Recasting AOS as Jira, ClickUp, Monday, or a generic task tracker
- Rebuilding ERP or BOS capabilities inside AOS
- Treating AI as an ungoverned autonomous developer
- Measuring success primarily by task throughput or story points
- Removing reuse, evaluation, or knowledge capture from the core delivery loop
