# 05 — AI Orchestration

How artificial intelligence participates throughout AOS delivery. Architecture only — no provider selection, no API design, no implementation.

---

## Philosophy

AOS treats AI as a **delivery team member with clear boundaries**:

- AI **proposes** plans, prompts, evaluations, and documentation
- Humans **approve** requirements, prompt packs, and deliverables
- Cursor **executes** approved prompts in the codebase
- AOS **captures** everything for the knowledge flywheel

This mirrors BOS design: decisions require explicit judgment (`BosDecision` entity, human `decidedAt`). AOS extends the pattern to delivery decisions.

**Anti-pattern:** Autonomous AI that writes code without evaluation gates, captured records, or human approval.

---

## AI Participation Map

| Lifecycle stage | AI role | Human gate |
|-----------------|---------|------------|
| **Intake** | Summarize ERP customer/lead history | Delivery lead confirms scope |
| **Discovery** | Decompose requirements, identify risks | Delivery lead approves requirement set |
| **Reuse scan** | Match requirements to Module Registry | Developer confirms reuse choices |
| **Planning** | Generate delivery plan draft | Delivery lead approves plan |
| **Prompt generation** | Produce prompt pack from plan + context | Delivery lead approves prompt pack |
| **Cursor execution** | (Cursor agent executes approved prompt) | Developer runs session |
| **Evaluation** | Score Cursor output against rubric | Developer + lead review score |
| **Revision** | Generate improved prompt from failure analysis | Developer approves re-prompt |
| **Documentation** | Draft docs from requirements + execution records | Lead approves publish |
| **Retrospective** | Extract lessons, suggest module/prompt updates | Team confirms lessons |

---

## Orchestration Architecture (Conceptual)

```
┌─────────────────────────────────────────────────────────┐
│                  AOS Application Layer                   │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Context      │  │ Orchestration │  │ Evaluation     │ │
│  │ Assembler    │→ │ Router        │→ │ Engine         │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                   │          │
└─────────┼────────────────┼───────────────────┼──────────┘
          │                │                   │
   ┌──────▼──────┐  ┌─────▼──────┐    ┌───────▼────────┐
   │ ERP/BOS     │  │ AI Provider │    │ Human Review   │
   │ Read Ports  │  │ Port        │    │ Queue          │
   │ Knowledge   │  │ (future)    │    │                │
   │ Module Reg  │  └─────────────┘    └────────────────┘
   └─────────────┘
```

### Context Assembler

Gathers all inputs needed for an AI call:

| Source | Data (read-only) |
|--------|-----------------|
| ERP customer port | Client name, contacts, history summary |
| ERP lead port | Origin context if converted lead |
| BOS initiative port | Strategic constraints, budget envelope |
| Requirements domain | Current requirement set |
| Knowledge Engine | Agency patterns, past lessons for similar engagements |
| Module Registry | Available reuse candidates with metadata |
| Agency template | Web/mobile/AI/SaaS prompt pack baseline |

**Context budget management:** AI calls have finite context windows. Assembler prioritizes: requirements > reuse candidates > relevant lessons > ERP facts > BOS constraints.

---

### Orchestration Router

Routes AI requests to appropriate processing:

| Request type | Purpose |
|-------------|---------|
| `analyze_requirements` | Decompose and structure client needs |
| `assess_reuse` | Match requirements to module registry |
| `generate_plan` | Create delivery plan from requirements + reuse assessment |
| `generate_prompts` | Create prompt pack from approved plan |
| `evaluate_output` | Score Cursor execution against rubric |
| `generate_revision` | Improve prompt based on evaluation failure |
| `generate_documentation` | Draft docs from engagement artifacts |
| `extract_lessons` | Post-retrospective knowledge extraction |

Each request type has a defined input schema (conceptual) and output schema (conceptual). Schemas are domain definitions, not Firestore documents.

---

### Evaluation Engine

Scores AI and Cursor outputs against structured rubrics.

**Evaluation dimensions (conceptual):**

| Dimension | Question |
|-----------|----------|
| **Requirement coverage** | Does output address all stated requirements? |
| **Reuse compliance** | Did output use recommended modules vs unnecessary net-new code? |
| **Architecture compliance** | Does output follow AOS principles (sidecar law, layer discipline)? |
| **ERP compatibility** | Does output avoid duplicating ERP modules? |
| **Quality** | Code quality, test coverage, documentation completeness |
| **Scope discipline** | Did output stay within prompt constraints (no scope creep)? |

**Scoring:** Each dimension produces a score + evidence. Aggregate determines pass/revise/reject.

**Human override:** Evaluation Engine recommends; humans can override with recorded reason (feeds Knowledge Engine).

---

## AI Orchestration vs Cursor

| Concern | AI Orchestration (AOS) | Cursor (IDE) |
|---------|----------------------|--------------|
| **When** | Planning, analysis, evaluation, documentation | Code execution |
| **Input** | Structured context packages | Approved prompt artifacts |
| **Output** | Plans, prompts, scores, docs | Code changes, file diffs |
| **Capture** | Automatic in AOS | Manual trigger → AOS execution record |
| **Human gate** | Before prompt approval | Before commit/deploy |

AOS AI Orchestration **feeds** Cursor; it does not replace it.

---

## Agency-Type AI Specialization

Each agency type activates different orchestration templates:

### Web Agency
- Component pattern matching against ERP `components/` inventory
- API contract generation prompts
- Responsive/accessibility evaluation rubrics
- Deployment checklist generation

### Mobile Agency
- Platform-specific module matching
- Store submission requirement analysis
- Device/offline evaluation rubrics
- Native vs cross-platform decision prompts

### AI Agency
- Model selection decision frameworks
- RAG architecture prompt packs
- Evaluation criteria for model outputs (accuracy, latency, cost)
- Data pipeline requirement analysis

### SaaS Agency
- Multi-tenancy pattern matching (ERP already uses `companyId` tenancy)
- Billing integration prompts (reference ERP invoices, never rebuild)
- Admin vs user role separation rubrics
- Release cadence and feature flag prompts

Templates are **orchestration configuration**, not separate products.

---

## Infrastructure Considerations

**Current platform state (ERP Discovery §10):**
- Zero Cloud Functions
- Zero server-side logic
- All business logic client-side in React SPA

**Architectural implication:** AI Orchestration likely requires server-side infrastructure in Phase 3+ to:
- Protect API keys
- Manage context assembly at scale
- Run evaluations without blocking UI
- Rate-limit and cost-control AI calls

**Phase 0 decision:** Acknowledge this requirement. Do not specify implementation. Phase 1–2 can operate with human-triggered, client-side orchestration for prototyping; production orchestration needs server-side planning.

---

## Safety & Quality Guardrails

| Guardrail | Enforcement |
|-----------|-------------|
| No ERP duplication | Evaluation rubric checks; prompt constraints include sidecar law |
| No BOS writes | Orchestration context is read-only for BOS |
| Human approval gates | Application service rejects AI output without approval record |
| Context isolation | Client A's data never appears in Client B's context assembly |
| Prompt versioning | Every execution linked to specific prompt artifact version |
| Evaluation before advance | Next prompt in pack blocked until current evaluation passes |
| Audit trail | All AI calls logged via extended ActivityLogger |

---

## Relationship to Existing AI Usage

The team already uses Cursor for development. AOS formalizes what is currently ad hoc:

| Today (informal) | AOS (formal) |
|-------------------|--------------|
| Developer writes prompt from memory | Prompt Engine assembles from context |
| Cursor output reviewed mentally | Evaluation Engine scores against rubric |
| Successful patterns forgotten | Knowledge Engine captures |
| Reuse discovered by chance | Module Registry queried systematically |
| No cross-project learning | Continuous Learning flywheel |

---

## Anti-Patterns

| Anti-pattern | Why |
|-------------|-----|
| AI generates code without approved prompt artifact | No audit trail, no evaluation |
| Single mega-prompt for entire project | No incremental evaluation, context overflow |
| AI evaluates its own output without rubric | No objective quality measure |
| Client data in agency-wide learning | Privacy violation |
| AI replaces human approval gates | Violates D-002 principle |
| Orchestration without capture | Knowledge flywheel breaks |
