# ADR-004 — Requirement Versioning

## 1. Decision

Requirement Sets are mutable while drafting, but approval creates an immutable Requirement Version that all planning and evaluation must reference.

## 2. Status

**Accepted**

## 3. Context

AI planning, reuse assessment, prompt generation, and evaluation require a stable definition of expected delivery. Client scope can change, but past prompts and quality decisions must remain explainable against the scope that existed when they were made.

## 4. Problem

Editing approved requirements in place destroys historical truth. A prompt could appear inadequate after requirements change, or a failed delivery could be made to look compliant by altering acceptance criteria. Informal document copies cannot guarantee traceability.

## 5. Decision

A Requirement Set is the mutable working head. It progresses from draft to review and approval. Approval publishes an immutable, monotonically numbered Requirement Version containing the active requirements and attachment references. Prompt Packs target a specific Requirement Version. Any material scope change creates a new approved version; prior versions remain permanent.

## 6. Why this decision

Immutable versions preserve the contract that governed each delivery decision. They allow accurate diffs, scope-change analysis, prompt evaluation, retrospective learning, and audit. This follows the BOS preference for preserved business history while adding delivery-specific version semantics.

## 7. Alternatives considered

- Edit approved requirements in place
- Use timestamps without snapshots
- Store requirements only inside Prompt Packs
- Version each Requirement independently
- Use external documents as the source of truth

## 8. Why alternatives were rejected

In-place edits erase evidence. Timestamps do not reconstruct content. Prompt Packs are execution artifacts, not scope authority. Independent requirement versions make set-level approval ambiguous. External documents lack enforceable lifecycle and traceability inside AOS.

## 9. Consequences

- Published versions consume permanent storage.
- Scope-change workflows must explicitly supersede prior versions.
- Prompt Packs and Evaluations carry exact version references.
- Attachments included in approval must remain referentially stable.

## 10. Benefits

- Tamper-resistant scope history
- Objective evaluation baseline
- Accurate requirement-to-prompt traceability
- Clear client change management
- Reliable retrospective and estimation analysis

## 11. Risks

- Users may create excessive versions for minor wording changes.
- Attachment retention may require future storage policy.
- Version diff presentation may be complex, though it is not required initially.

## 12. Future impact

Future partial approvals, phased scope, change-order billing, and requirement dependency features must preserve immutable published versions. They may add relationships but cannot permit retroactive modification.

## 13. Related ADRs

ADR-003, ADR-005, ADR-007, ADR-013, ADR-014

## 14. Related Domain Entities

Requirement Set, Requirement, Requirement Attachment, Requirement Version, Reuse Assessment, Prompt Pack, Evaluation

## 15. Related Architecture Documents

- `docs/aos-domain-model/02_REQUIREMENTS_DOMAIN.md`
- `docs/aos-domain-model/DOMAIN_RELATIONSHIP_MAP.md`
- `docs/aos-domain-model/ARCHITECTURE_FREEZE_REPORT.md`
- `docs/aos-architecture/04_PROJECT_LIFECYCLE.md`

## 16. Things that are permanently forbidden

- Editing or deleting a published Requirement Version
- Evaluating delivery against an unspecified or mutable draft
- Rewriting acceptance criteria after Cursor execution to obtain a pass
- Reusing a version number
- Treating a Prompt Pack as the authoritative requirement source
