# ADR-005 — Prompt Pack Architecture

## 1. Decision

Approved requirements are executed through ordered Prompt Packs containing focused, versioned Prompt Artifacts.

## 2. Status

**Accepted**

## 3. Context

Cursor performs best when objectives, context, constraints, reuse directives, acceptance criteria, and evaluation criteria are explicit. A whole client engagement is too large and unstable for one prompt. Generic tasks are too weak because they do not preserve AI context or quality rules.

## 4. Problem

Ad hoc prompts produce inconsistent scope, repeated code, context overflow, and untraceable outcomes. A single mega-prompt prevents incremental evaluation. A flat list of tasks does not encode prompt versions, module reuse, requirement coverage, or progression gates.

## 5. Decision

A Prompt Pack targets one immutable Requirement Version and orders one or more Prompt Artifacts. Each artifact has one objective, context, constraints, acceptance criteria, reuse directives, an Evaluation Rubric, and immutable Prompt Versions. By default, Artifact N+1 cannot proceed until Artifact N has a passing Evaluation. Significant replanning creates a new pack version rather than altering execution history.

## 6. Why this decision

Prompt Packs transform planning into small, reviewable, AI-executable increments while preserving end-to-end traceability. They are specialized for software delivery and enable evaluation between steps, unlike task backlogs or unstructured chat histories.

## 7. Alternatives considered

- One prompt per engagement
- Free-form Cursor chats
- Generic tasks or tickets
- Prompts embedded directly in Requirements
- Fully parallel prompt execution

## 8. Why alternatives were rejected

Mega-prompts exceed useful context and hide failures. Free-form chats lack governance. Tasks do not carry execution context or rubrics. Requirements define need, not execution instructions. Default parallel execution risks incompatible outputs and weakens progressive learning.

## 9. Consequences

- Prompt authoring and review become explicit delivery activities.
- Packs require lifecycle and sequencing rules.
- Failed evaluations produce revised Prompt Versions.
- Some independent work may wait unless future parallel tracks are explicitly modeled.

## 10. Benefits

- Controlled context size
- Incremental quality gates
- Requirement and reuse traceability
- Reproducible Cursor execution
- Strong retrospective data on what worked

## 11. Risks

- Excessive prompt fragmentation can add overhead.
- Poor sequencing can create artificial blockers.
- Teams may bypass packs if manual handoff is cumbersome.

## 12. Future impact

AI-assisted pack generation, context assembly, dependency-aware parallel tracks, and automated Cursor handoff may evolve. They must preserve artifact focus, exact version references, and evaluation gates.

## 13. Related ADRs

ADR-004, ADR-006, ADR-007, ADR-010, ADR-012, ADR-013

## 14. Related Domain Entities

Prompt Pack, Prompt Artifact, Prompt Version, Prompt Template, Requirement Version, Reuse Assessment, Evaluation Rubric, Cursor Session

## 15. Related Architecture Documents

- `docs/aos-architecture/06_PROMPT_ENGINE.md`
- `docs/aos-architecture/07_CURSOR_INTEGRATION.md`
- `docs/aos-domain-model/03_PROMPT_DOMAIN.md`
- `docs/aos-domain-model/DEPENDENCY_GRAPH.md`

## 16. Things that are permanently forbidden

- Executing an entire engagement as one unversioned mega-prompt
- Approved Prompt Artifacts without acceptance criteria or a rubric
- Cursor execution against an unpublished prompt draft
- Silent mutation of executed prompt content
- Replacing Prompt Packs with generic task lists
