# ADR-007 — Evaluation Gate

## 1. Decision

Evaluation is a mandatory gate between Cursor execution and delivery progression.

## 2. Status

**Accepted**

## 3. Context

AOS is designed to improve delivery quality, not merely produce code. Prompt Artifacts define acceptance criteria and Evaluation Rubrics. Cursor output can be incomplete, duplicative, architecturally invalid, or outside scope even when it appears plausible.

## 4. Problem

Without an explicit gate, AI output becomes accepted by momentum. Failures are detected late, requirement coverage remains subjective, ERP/BOS boundaries can be violated, and future learning lacks structured evidence.

## 5. Decision

Every captured Cursor Session receives an Evaluation against the exact Prompt Version and its rubric. Scores must include evidence for each dimension. Human confirmation is required in the initial model. Outcomes are pass, conditional pass, or fail. Failure blocks dependent prompt progression and triggers a revision path. Architecture or ERP-duplication violations are mandatory failures.

## 6. Why this decision

AI-assisted code must be held to explicit, repeatable criteria. Evaluation turns acceptance from intuition into auditable evidence, creates useful learning data, and protects the frozen architecture throughout implementation.

## 7. Alternatives considered

- Developer self-review only
- Code compiles/tests pass as the only gate
- Final-project QA only
- AI self-evaluation with no human confirmation
- Non-blocking evaluation metrics

## 8. Why alternatives were rejected

Self-review is inconsistent. Passing tests cannot prove requirement coverage or architecture compliance. Final QA discovers errors too late. Unconfirmed AI evaluation lacks accountability. Non-blocking metrics do not prevent known violations from progressing.

## 9. Consequences

- Delivery progression waits for evaluation.
- Rubrics become governed, versioned assets.
- Failed work remains recorded.
- Human review effort is required until automation proves reliable.
- Conditional passes need explicit follow-up accountability.

## 10. Benefits

- Consistent quality baseline
- Early architecture and duplication detection
- Requirement coverage traceability
- Actionable revision evidence
- Learning data for prompts and modules

## 11. Risks

- Weak rubrics produce false confidence.
- Evaluation can become bureaucratic if oversized.
- Human overrides could undermine consistency.
- Automated scoring may encode bias or miss runtime defects.

## 12. Future impact

Evaluation may become increasingly automated and agency-type-specific. Automation cannot remove evidence, rubric version references, or audit history. Human confirmation policy may change only through a future ADR after measured reliability.

## 13. Related ADRs

ADR-004, ADR-005, ADR-006, ADR-009, ADR-013, ADR-014, ADR-015

## 14. Related Domain Entities

Evaluation, Evaluation Rubric, Cursor Session, Cursor Revision, Prompt Version, Requirement, Delivery Quality Report, Knowledge Record

## 15. Related Architecture Documents

- `docs/aos-architecture/05_AI_ORCHESTRATION.md`
- `docs/aos-architecture/07_CURSOR_INTEGRATION.md`
- `docs/aos-domain-model/05_EVALUATION_DOMAIN.md`
- `docs/aos-domain-model/01_DELIVERY_DOMAIN.md`

## 16. Things that are permanently forbidden

- Progressing dependent execution without required evaluation
- Evaluating against a different prompt or requirement version
- Passing sidecar-law or ERP-duplication violations
- Editing a confirmed Evaluation to hide failure
- Deleting failed Evaluations
- Using a score without dimension evidence
