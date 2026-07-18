# 07 — Cursor Integration

How Cursor IDE fits into the AOS delivery workflow. Architecture and process only — no SDK implementation, no code.

---

## Role of Cursor in AOS

Cursor is the **execution engine** for approved AOS prompt artifacts. It is not the planning system, not the knowledge store, and not the evaluation authority.

```
AOS plans & prompts  →  Human approves  →  Cursor executes  →  AOS evaluates & captures
```

This division is intentional:

| System | Responsibility |
|--------|---------------|
| **AOS** | Context assembly, prompt generation, approval gates, evaluation, knowledge capture |
| **Cursor** | Code generation, refactoring, file operations in the workspace |
| **Human** | Approval, execution trigger, override, commit decision |
| **ERP/BOS** | Business/strategic truth (read-only from AOS/Cursor context) |

---

## Integration Model

AOS integrates with Cursor at three levels:

### Level 1 — Prompt Handoff (Phase 1–2)

**Manual workflow:**

1. Developer opens approved prompt artifact in AOS UI
2. Developer copies structured prompt (objective + context + constraints + acceptance criteria) into Cursor
3. Developer executes Cursor agent/composer session
4. Developer returns to AOS and records execution outcome
5. AOS Evaluation Engine scores outcome (AI-assisted + human review)

**Characteristics:**
- No API integration required
- Works with current SPA architecture (no server-side needed)
- Immediate value from structured prompts alone
- Capture depends on developer discipline (mitigated by workflow design)

---

### Level 2 — Structured Capture (Phase 2–3)

**Enhanced manual workflow:**

1. Same prompt handoff as Level 1
2. AOS provides **capture template** alongside prompt:
   - Files changed (list)
   - Key decisions made during session
   - Self-assessment against acceptance criteria
   - Agent transcript excerpt (paste or file upload — storage TBD)
3. AOS links capture to prompt artifact version and engagement
4. Evaluation Engine processes capture automatically

**Characteristics:**
- Still no Cursor API required
- Execution records become structured AOS artifacts
- Enables evaluation and learning loops
- File storage requirement emerges (ERP has none today)

---

### Level 3 — Orchestrated Integration (Phase 4–5)

**Automated workflow (future):**

1. AOS pushes approved prompt to Cursor via SDK or API
2. Cursor session runs with AOS-provided context
3. Cursor outputs (diff, transcript, files) flow back to AOS automatically
4. Evaluation Engine runs automatically
5. Pass → next prompt; Fail → revision prompt generated

**Characteristics:**
- Requires server-side orchestration (ERP has 0% today)
- Cursor SDK/automation capability needed
- Full closed-loop delivery automation
- Highest maturity stage

**Phase 0 note:** Level 3 is architectural direction only. Phase 1 starts at Level 1.

---

## Cursor Session Record (Conceptual)

Every Cursor execution produces a **Session Record** in AOS:

| Field (conceptual) | Source |
|--------------------|--------|
| Prompt artifact reference + version | AOS |
| Executor (ERP user) | AOS auth |
| Start/end timestamp | AOS |
| Files created | Developer capture / future automation |
| Files modified | Developer capture / future automation |
| Summary of changes | Developer capture / AI-generated |
| Agent transcript excerpt | Developer capture / future automation |
| Self-assessment | Developer |
| Evaluation score | Evaluation Engine |
| Evaluation evidence | Evaluation Engine |
| Outcome | pass / revise / reject |
| Revision prompt reference | AOS (if revise) |

---

## Cursor Rules & Skills Alignment

The repository already has Cursor configuration:

| Asset | Location | AOS relationship |
|-------|----------|-----------------|
| Cursor rules | `.cursor/rules/` | Prompt constraints reference applicable rules |
| Agent skills | `.cursor/skills-cursor/` | Module Registry catalogs available skills |
| Agent transcripts | Past conversation logs | Knowledge Engine may reference patterns |

### Alignment principles

1. **Prompt constraints cite rules** — e.g., "Follow sidecar law per AOS Core Principles" maps to existing rules
2. **Module Registry includes skills** — reusable skills are cataloged alongside code modules
3. **New rules generated from lessons** — Continuous Learning may propose new Cursor rules based on repeated evaluation failures
4. **No rule duplication** — AOS prompts reference rules; they don't restate entire rule files in context

---

## Cursor Workflow by Agency Type

### Web Agency
- Cursor sessions typically modify `pages/app/*`, `components/*`, `services/*`
- Prompt artifacts specify file boundaries ("only modify files in X")
- Evaluation checks component reuse from `components/` inventory
- Common pattern: extend existing page, don't create parallel page

### Mobile Agency
- Sessions may target separate mobile codebase (if not in this repo)
- Module Registry tracks cross-repo modules
- Evaluation includes platform-specific rubrics
- Prompt artifacts reference platform SDK constraints

### AI Agency
- Sessions may create prompt templates, evaluation scripts, model integration code
- Meta-prompting: Cursor builds the AI features that AOS will later orchestrate
- Evaluation rubrics include model accuracy/latency criteria
- Special capture: model config, dataset references

### SaaS Agency
- Sessions follow BOS/ERP patterns: `companyId` tenancy, read ports, application services
- Prompt constraints explicitly forbid rebuilding invoices/customers/auth
- Evaluation checks sidecar law compliance
- Common pattern: new bounded context folder (like `bos/`) for client features

---

## Cursor Integration vs BOS Milestone Completion

These are **different workflows** that must not be conflated:

| Aspect | BOS Milestone Completion | AOS Cursor Session |
|--------|-------------------------|-------------------|
| **Purpose** | Record business outcome evidence | Execute and evaluate code changes |
| **Owner layer** | BOS | AOS |
| **Evidence** | ERP doc IDs, notes, dates | Code diffs, evaluation scores |
| **Human gate** | Founder/manager confirms completion | Developer + lead evaluate output |
| **Lifecycle** | planned → in_progress → completed | draft → approved → executed → evaluated |

A BOS milestone may be satisfied by multiple AOS Cursor sessions. An AOS session does not automatically complete a BOS milestone.

---

## Quality Gates in Cursor Workflow

| Gate | Enforced by | Blocks |
|------|-------------|--------|
| Prompt not approved | AOS application service | Cursor execution (policy) |
| Prior prompt not evaluated | AOS application service | Next prompt in pack |
| Evaluation failed | Evaluation Engine | Progression without revision |
| Sidecar law violation detected | Evaluation rubric | Merge/commit recommendation |
| ERP duplication detected | Evaluation rubric | Merge/commit recommendation |
| Missing capture | AOS workflow | Retrospective completion |

Gates 1–2 are AOS policy enforced by workflow design. Gates 3–6 are evaluation outcomes. Gate 7 is lifecycle enforcement.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|-------------|-----------------|
| Developer prompts Cursor directly without AOS artifact | Always start from approved prompt artifact |
| Cursor session with no capture record | Mandatory capture template before next prompt |
| Entire project in one Cursor session | Prompt pack with sequential evaluation |
| Cursor output merged without evaluation | Evaluation pass required |
| AOS tries to control Cursor UI | AOS governs inputs/outputs, not Cursor internals |
| Cursor rules ignored in prompt constraints | Constraints explicitly reference applicable rules |

---

## Infrastructure Dependencies

| Capability | Current state | Needed for |
|-------------|--------------|------------|
| Client-side SPA | ✅ Exists | Level 1 handoff |
| File storage | ❌ Not in ERP | Transcript/evidence storage (Level 2+) |
| Server-side orchestration | ❌ Not in ERP | Level 3 automation |
| Cursor SDK/API | ❓ External | Level 3 automation |
| Git integration | ❌ Not in AOS scope | Diff capture (may use manual capture initially) |

---

## Success Criteria

Cursor integration is successful when:

1. **100% of delivery code changes** trace to an approved prompt artifact
2. **Evaluation scores trend upward** across engagements (Continuous Learning)
3. **Reuse rate increases** because prompts include Module Registry context
4. **Rework decreases** because constraints prevent ERP duplication and architecture violations
5. **Knowledge compounds** because session records feed the Knowledge Engine
