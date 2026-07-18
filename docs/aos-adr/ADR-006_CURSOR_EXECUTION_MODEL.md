# ADR-006 — Cursor Execution Model

## 1. Decision

Cursor is AOS's code-execution environment; AOS governs approved inputs, captures outputs, and retains the authoritative execution record.

## 2. Status

**Accepted**

## 3. Context

Cursor is already the agency's development environment. The existing ERP/BOS platform has no Cursor integration, transcript storage, or execution evaluation. Phase 1–2 can use manual prompt handoff; later phases may automate through supported Cursor interfaces.

## 4. Problem

Treating Cursor chats as the complete delivery system loses requirements, approvals, version identity, evaluation evidence, and organizational learning. Conversely, attempting to reproduce Cursor's IDE and agent capabilities inside AOS would duplicate tooling and create unnecessary coupling.

## 5. Decision

AOS prepares and approves Prompt Versions. A human executes them in Cursor initially. Each execution creates an AOS Cursor Session referencing the exact Prompt Version, ERP user, capture summary, changed-file summary, and subsequent Evaluation. Failed sessions may create a Cursor Revision and revised Prompt Version. Future automation may transfer inputs and outputs, but Cursor remains execution and AOS remains governance and record.

## 6. Why this decision

It uses Cursor for what it does best—working in a codebase—while AOS supplies durable context, quality, reuse, and learning. The staged integration avoids blocking early value on SDK, server-side, or storage decisions.

## 7. Alternatives considered

- Build an IDE/agent inside AOS
- Use Cursor with no AOS capture
- Fully automate Cursor from Phase 1
- Treat git commits as the only execution record
- Store only final code, not sessions

## 8. Why alternatives were rejected

Building an IDE duplicates Cursor. Uncaptured sessions break learning. Immediate automation depends on infrastructure not present in ERP. Git commits do not record prompt intent or evaluation. Final code alone cannot explain revisions or failed approaches.

## 9. Consequences

- Manual capture is required before deep automation.
- Cursor Sessions and revisions are append-only.
- AOS needs future transcript/file storage decisions.
- Cursor API limitations cannot redefine AOS domain rules.

## 10. Benefits

- Tool specialization without duplication
- Exact prompt-to-output traceability
- Incremental automation path
- Valuable failure data for learning
- Human control over execution and commit decisions

## 11. Risks

- Manual capture may be incomplete.
- External Cursor capabilities may change.
- Automated output capture may require sensitive repository access.
- Developers may execute outside AOS policy.

## 12. Future impact

Level 3 integration may automate prompt handoff, transcript/diff capture, and evaluation triggers. It must still create the same domain records and respect human approvals unless a future ADR explicitly changes governance.

## 13. Related ADRs

ADR-001, ADR-005, ADR-007, ADR-009, ADR-013, ADR-014

## 14. Related Domain Entities

Prompt Artifact, Prompt Version, Cursor Session, Cursor Revision, Evaluation, Delivery Engagement

## 15. Related Architecture Documents

- `docs/aos-architecture/07_CURSOR_INTEGRATION.md`
- `docs/aos-architecture/05_AI_ORCHESTRATION.md`
- `docs/aos-domain-model/04_CURSOR_DOMAIN.md`
- `docs/aos-domain-model/MISSING_CONCEPTS_REPORT.md`

## 16. Things that are permanently forbidden

- Treating an unrecorded Cursor chat as an authoritative AOS execution
- Letting Cursor own requirements, evaluation policy, or company knowledge
- Rebuilding Cursor as an AOS feature
- Detaching a session from the exact Prompt Version executed
- Deleting failed sessions or revisions to improve reported results
