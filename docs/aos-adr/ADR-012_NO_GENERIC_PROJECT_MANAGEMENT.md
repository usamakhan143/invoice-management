# ADR-012 — No Generic Project Management

## 1. Decision

AOS intentionally rejects Tasks, Sprints, Story Points, Kanban, Backlogs, Epics, and generic project-management workflows as core domain concepts.

## 2. Status

**Accepted**

## 3. Context

AOS is intended for AI-first software delivery across web, mobile, AI, and SaaS agencies. Generic PM products already organize work through assignees, due dates, boards, and estimation rituals. Those primitives do not describe the core AOS loop: requirements, reuse, structured prompts, Cursor execution, evaluation, and learning.

## 4. Problem

Adopting generic PM language would pull architecture toward task tracking, duplicate established products, and obscure the artifacts that actually improve AI-assisted delivery. A “done” task does not prove that a requirement was covered, an approved prompt was executed, reusable modules were used, or output passed evaluation.

## 5. Decision

AOS uses specialized delivery primitives:

- **Requirement / Requirement Version** defines approved need.
- **Reuse Assessment / Recommendation** determines what already exists.
- **Prompt Pack / Prompt Artifact / Prompt Version** defines executable intent.
- **Cursor Session / Revision** records implementation attempts.
- **Evaluation / Rubric** proves quality and progression.
- **Retrospective / Knowledge Pattern** creates future advantage.

Delivery Engagement state represents lifecycle, not Kanban columns. Prompt sequencing replaces Sprint/Backlog mechanics for AI execution.

## 6. Why this decision

These entities preserve intent, context, evidence, and learning. They map directly to the agency's Cursor-based delivery method. Tasks and boards optimize coordination visibility; AOS optimizes validated software production and compounding reuse.

## 7. Alternatives considered

- Build AOS around Tasks and Subtasks
- Use Scrum concepts: Sprints, Stories, Story Points, Epics
- Use Kanban as the primary domain and UI
- Integrate an external PM tool as the source of truth
- Add AOS intelligence on top of a generic backlog

## 8. Why alternatives were rejected

Tasks lack versioned prompt context. Sprints impose a ceremony not required by all agency types. Story Points are subjective and do not measure reuse or AI quality. Kanban visualizes status but does not enforce evaluation. An external backlog would fragment AOS traceability and make core delivery dependent on another product.

## 9. Consequences

- Teams cannot expect standard PM boards as the primary AOS experience.
- Coordination needs must be represented through engagement lifecycle and artifact ownership.
- Due dates or assignments may exist as optional metadata later, not domain drivers.
- Product messaging must remain clear to avoid “project management” expectations.

## 10. Benefits

- Strong differentiation from generic PM tools
- Domain language aligned with AI-assisted software delivery
- Better traceability from need to code to evidence
- Metrics focus on reuse, evaluation, and learning rather than velocity
- Works across multiple software agency types without Scrum dependence

## 11. Risks

- Users familiar with PM tools may initially find the model unfamiliar.
- Team coordination features may still be needed.
- Stakeholders may request boards, deadlines, or workload views.
- Prompt sequencing could be misused as disguised tasks.

## 12. Future impact

Optional scheduling, assignment, capacity, or visualization features may be added when they support delivery. They cannot introduce a generic Task aggregate or make Sprint/Kanban semantics the system's source of truth.

## 13. Related ADRs

ADR-001, ADR-003, ADR-005, ADR-007, ADR-010, ADR-015

## 14. Related Domain Entities

Delivery Engagement, Requirement Set, Requirement, Prompt Pack, Prompt Artifact, Cursor Session, Evaluation, Retrospective

## 15. Related Architecture Documents

- `docs/aos-architecture/01_AOS_VISION.md`
- `docs/aos-architecture/04_PROJECT_LIFECYCLE.md`
- `docs/aos-domain-model/MISSING_CONCEPTS_REPORT.md`
- `docs/aos-domain-model/01_DELIVERY_DOMAIN.md`
- `docs/aos-domain-model/03_PROMPT_DOMAIN.md`

## 16. Things that are permanently forbidden

- A Task or Project aggregate duplicating Delivery Engagement and Prompt Artifact responsibilities
- Sprint, Story Point, or velocity metrics as AOS delivery truth
- Kanban columns replacing lifecycle invariants
- A generic backlog replacing approved Requirement Sets
- Marking work “done” without Evaluation evidence
- Rebranding generic PM features as AI-first architecture
