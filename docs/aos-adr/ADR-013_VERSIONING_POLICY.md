# ADR-013 — Versioning Policy

## 1. Decision

AOS uses mutable working heads and immutable published versions for requirements, prompts, modules, templates, rubrics, playbooks, and promoted patterns.

## 2. Status

**Accepted**

## 3. Context

Delivery artifacts evolve before approval but must become stable once they govern execution, evaluation, reuse, or organizational guidance. The domain freeze already defines Requirement Version, Prompt Version, and Module Version as immutable records.

## 4. Problem

Universal immutability makes drafting cumbersome, while universal mutability destroys historical truth. Simple timestamps cannot establish exactly which content governed a Cursor Session, Evaluation, or Reuse Recommendation.

## 5. Decision

Working heads remain editable only in permitted draft states. Publish or approve actions create immutable, monotonically ordered versions. Consumers reference the exact published version used. Material changes create a new version; they never mutate history. Supersession links preserve conceptual lineage where separate records are used.

## 6. Why this decision

The policy balances practical authoring with audit-grade reproducibility. It supports reliable evaluation, rollback analysis, template improvement, and learning without forcing a new permanent record for every keystroke.

## 7. Alternatives considered

- Fully mutable records
- Fully immutable event sourcing for every edit
- Git history as the only version mechanism
- Timestamped records without snapshots
- Copy-on-write without lineage

## 8. Why alternatives were rejected

Full mutability erases evidence. Full event sourcing adds disproportionate complexity. Git does not version AOS business artifacts or guarantee deployed state. Timestamps lack content snapshots. Unlinked copies make provenance ambiguous.

## 9. Consequences

- Storage grows monotonically for versioned artifacts.
- Version publication needs atomic validation.
- UI must distinguish draft head from published versions.
- Migration must preserve version numbers and references.

## 10. Benefits

- Reproducible execution and evaluation
- Clear approval history
- Reliable diffs and supersession
- Safe template and rubric evolution
- Strong audit and retrospective evidence

## 11. Risks

- Inconsistent implementation across entity types
- Excessive versions from trivial edits
- Orphaned versions if reference integrity is weak
- Confusion between record status and version status

## 12. Future impact

Automated diffs, semantic version labels, code commit references, and stale-version detection may be added. Published version immutability and exact consumer references remain mandatory.

## 13. Related ADRs

ADR-004, ADR-005, ADR-006, ADR-007, ADR-008, ADR-014, ADR-015

## 14. Related Domain Entities

Requirement Set, Requirement Version, Prompt Artifact, Prompt Version, Module Registry Entry, Module Version, Delivery Template, Prompt Template, Evaluation Rubric, Knowledge Pattern, Agency Playbook

## 15. Related Architecture Documents

- `docs/aos-domain-model/00_DOMAIN_MODEL_INDEX.md`
- `docs/aos-domain-model/02_REQUIREMENTS_DOMAIN.md`
- `docs/aos-domain-model/03_PROMPT_DOMAIN.md`
- `docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md`
- `docs/aos-domain-model/ARCHITECTURE_FREEZE_REPORT.md`

## 16. Things that are permanently forbidden

- Updating or deleting a published Requirement, Prompt, or Module Version
- Reusing version numbers
- Referencing an unspecified “latest” version for historical execution
- Changing a rubric version after it scored an Evaluation
- Replacing lineage with unlinked copies
