# 04 — Project Lifecycle

How a client software project moves from lead to delivery completion within the three-layer platform. This describes **delivery flow**, not a task board.

**Grounding:** ERP lead→customer conversion (`leadService.convertWonLead`), BOS initiative lifecycle, `docs/business/08_Delivery_Playbook.md` phase structure, ERP Discovery data flows.

---

## Lifecycle Overview

```
ERP: Lead ──→ Won ──→ Customer
                          │
BOS: (optional) Initiative activated ──→ strategic milestones
                          │
AOS: Delivery Engagement opened ──→ Requirements ──→ AI Plan
                          │
                    Prompt Pack ──→ Cursor Execution ──→ Evaluation
                          │
                    QA ──→ Deploy ──→ Handoff ──→ Retrospective
                          │
                    Knowledge captured ──→ Module registry updated
                          │
ERP: Invoice milestones · Expense attribution · Activity log
```

Each stage has a **clear owner layer**. Stages do not collapse into generic PM statuses.

---

## Stage 0 — Business Origin (ERP)

**Owner:** ERP  
**Not AOS responsibility**

| Event | ERP module | Key action |
|-------|-----------|------------|
| Lead created | Leads | `leadService.createLead` |
| Outreach logged | Outreach | `outreachService` → `outreachEvents` |
| Lead assigned | Leads | Assignment + `assignmentEvents` |
| Lead won | Leads | Status → Won |
| Customer created | Customers | `leadService.convertWonLead()` |
| Invoice for deposit | Invoices | Optional — ERP invoice lifecycle |

**AOS entry trigger:** Delivery lead or founder opens an AOS **Delivery Engagement** linked to the ERP customer (and optionally the originating lead).

**AOS does NOT:** Create leads, convert customers, or manage the sales pipeline.

---

## Stage 1 — Strategic Alignment (BOS, Optional)

**Owner:** BOS  
**AOS role:** Read-only link

| Event | BOS module | When relevant |
|-------|-----------|---------------|
| Initiative activated | BOS Initiatives | Client project serves a strategic bet |
| Budget set | BOS Initiatives | Delivery must respect investment envelope |
| Business milestones defined | BOS Milestones | Delivery aligns to business outcomes |
| Expenses attributed | BOS Attributions | Delivery costs link to initiative ROI |

**AOS action:** Engagement record stores optional `initiativeId` reference. AOS reads initiative hypothesis, budget, and attributed expenses for context — never writes BOS fields.

**When skipped:** Routine client work (retainer tasks, small fixes) may have no BOS initiative. AOS engagement still functions independently.

---

## Stage 2 — Engagement Intake (AOS)

**Owner:** AOS  
**First AOS-native stage**

### Purpose
Formalize the delivery contract in AOS terms — separate from ERP customer record and BOS strategy.

### Inputs (read from ERP)
- Customer name, contacts, businesses (`customers`, `businesses`)
- Lead history if converted (`leads`, `outreachEvents`)
- Team members available (`users`, `companyUsers`)
- Existing invoices/contracts if any (`invoices`)

### AOS decisions captured
- **Agency type profile:** web / mobile / AI / SaaS (determines template pack)
- **Engagement type:** greenfield / enhancement / maintenance / migration
- **Delivery lead** (ERP user reference, not a new user system)
- **Scope summary** (high-level, refined in Stage 3)
- **Link to BOS initiative** (optional)

### Outputs
- Delivery Engagement record (AOS-owned)
- Intake checklist completion (aligned with Delivery Playbook onboarding section)

### Anti-pattern
Creating a duplicate "client" entity in AOS. Client = ERP customer.

---

## Stage 3 — Discovery & Requirements (AOS + AI)

**Owner:** AOS Requirements Domain

### Purpose
Transform client needs into structured, evaluable requirements that AI can plan against.

### Activities
1. **Context assembly** — pull ERP customer facts, BOS constraints, prior engagement knowledge (if repeat client)
2. **Reuse scan** — query Module Registry and ERP component inventory for existing solutions
3. **Requirement capture** — functional, technical, constraint, acceptance criteria
4. **AI-assisted analysis** — decompose requirements, identify risks, suggest architecture patterns
5. **Human review gate** — delivery lead approves requirement set

### Agency-type specialization

| Agency type | Requirement focus |
|-------------|-------------------|
| Web | Pages, components, API contracts, responsive/accessibility |
| Mobile | Platforms, offline, store requirements, device matrix |
| AI | Model requirements, data sources, evaluation criteria, latency/cost |
| SaaS | Tenancy, billing integration (→ ERP invoices), admin vs user roles |

### Outputs
- Approved requirement set (AOS-owned)
- Reuse assessment report (what exists vs net-new)
- Risk register (delivery-scoped, not BOS strategic risks)

---

## Stage 4 — AI Planning & Prompt Generation (AOS)

**Owner:** AOS Prompt Engine + AI Orchestration

### Purpose
Convert approved requirements into executable **prompt artifacts** for Cursor.

### Activities
1. Select **delivery template** (agency type + engagement type)
2. Assemble **context package** from Requirements, Knowledge Engine, Module Registry
3. AI generates **draft delivery plan** — phases, reuse candidates, estimated complexity (not story points)
4. AI generates **prompt pack** — sequenced prompts with acceptance criteria per prompt
5. Human review gate — delivery lead approves plan and prompt pack

### Prompt pack structure (conceptual)
Each prompt artifact contains:
- **Objective** — what this prompt should accomplish
- **Context block** — relevant code, patterns, constraints (budget-limited)
- **Constraints** — what not to do (sidecar law, no ERP duplication, etc.)
- **Acceptance criteria** — how to evaluate the output
- **Reuse references** — module registry entries to prefer
- **Evaluation rubric** — scoring dimensions

### Outputs
- Approved delivery plan
- Prompt pack (sequenced, versioned)
- Evaluation rubrics

---

## Stage 5 — Cursor Execution (AOS + Human)

**Owner:** AOS Cursor Integration Domain + Developer

### Purpose
Execute approved prompts in Cursor and capture results.

### Workflow
1. Developer receives approved prompt artifact from AOS
2. Developer executes in Cursor IDE
3. Developer records execution outcome in AOS:
   - Files created/modified (summary)
   - Agent transcript or key excerpts
   - Self-assessment against acceptance criteria
4. AOS Evaluation Domain scores the output (AI-assisted + human review)
5. If evaluation fails → revised prompt generated → re-execute
6. If evaluation passes → advance to next prompt in pack

### Capture requirements
Every Cursor session produces an **execution record** linked to:
- Prompt artifact version
- Developer (ERP user)
- Evaluation score
- Outcome (pass/revise/reject)

### Anti-pattern
Cursor sessions with no AOS record — knowledge is lost.

---

## Stage 6 — Quality & Delivery (AOS)

**Owner:** AOS Delivery Domain

### Purpose
Ensure shippable quality before client handoff.

### Activities (aligned with Delivery Playbook QA section)
1. **Automated evaluation** — prompt outputs scored against rubrics
2. **Integration verification** — reuse modules integrate correctly
3. **Regression check** — existing ERP/BOS tests still pass (BOS has vitest; ERP has none — noted debt)
4. **Documentation generation** — AI-assisted from requirements + execution records
5. **Client review package** — assembled from AOS artifacts, not manually written

### Definition of done (AOS-scoped)
- All prompt pack items evaluated and passed
- Reuse modules registered/updated in Module Registry
- Delivery documentation generated
- No open evaluation failures

---

## Stage 7 — Deploy & Handoff (AOS → ERP)

**Owner:** AOS orchestrates; ERP records business events

### Purpose
Ship to client and close the delivery loop.

### AOS activities
- Deployment checklist (agency-type specific template)
- Handoff documentation package
- Final retrospective trigger

### ERP activities (unchanged)
- Final invoice creation (`invoiceService`)
- Expense recording for any remaining costs (`expenses`)
- Activity logging (`activityLogger`)
- Customer detail updated if needed (`customerService`)

### BOS activities (if linked)
- Initiative milestone completion (if delivery satisfies a BOS business milestone)
- Attribution updates for delivery costs
- Decision log entries for strategic outcomes

**Law:** AOS triggers awareness of ERP/BOS actions but does not perform ERP writes.

---

## Stage 8 — Retrospective & Learning (AOS)

**Owner:** AOS Knowledge Engine + Continuous Learning

### Purpose
Convert completed delivery into organizational assets.

### Captured automatically
- Which prompts worked / failed (with scores)
- Which modules were reused / created / rejected
- Estimation accuracy (planned vs actual prompt count/complexity)
- Lessons learned (structured, not free-text-only)
- New module registry entries

### Feeds forward to
- Knowledge Engine (agency patterns)
- Prompt Engine (template improvements)
- Module Registry (new/updated entries)
- Future engagement planning (Stage 4 AI plan quality)

---

## Lifecycle States (Conceptual)

Delivery Engagement progresses through states. These are **not** kanban columns:

| State | Meaning |
|-------|---------|
| `intake` | Engagement opened, client linked |
| `discovery` | Requirements being captured |
| `planning` | AI plan and prompt pack in progress |
| `building` | Cursor execution underway |
| `evaluating` | Outputs being scored |
| `delivering` | QA and documentation |
| `handoff` | Client delivery in progress |
| `closed` | Retrospective complete, knowledge captured |
| `paused` | Client or resource hold |
| `cancelled` | Engagement terminated |

---

## Cross-Layer Event Map

| Lifecycle event | ERP | BOS | AOS |
|----------------|-----|-----|-----|
| Lead won | ✅ writes | — | reads |
| Customer created | ✅ writes | — | reads |
| Initiative activated | — | ✅ writes | reads (optional) |
| Engagement opened | — | — | ✅ writes |
| Requirements approved | — | — | ✅ writes |
| Prompt pack approved | — | — | ✅ writes |
| Cursor session executed | — | — | ✅ writes |
| Evaluation completed | — | — | ✅ writes |
| Module registered | — | — | ✅ writes |
| Invoice raised | ✅ writes | — | reads |
| Expense recorded | ✅ writes | attribution | reads |
| Initiative milestone completed | — | ✅ writes | reads |
| Retrospective captured | — | — | ✅ writes |
| Activity logged | ✅ writes (extend types) | — | triggers |

---

## What This Lifecycle Is Not

| Generic PM concept | AOS equivalent |
|--------------------|----------------|
| Sprint | Prompt pack sequence |
| Story | Requirement item |
| Task | Prompt artifact execution |
| Backlog | Requirement set + reuse candidates |
| Board | Engagement state machine |
| Velocity | Reuse rate + prompt pass rate |
| Standup | Not applicable — async evaluation |
| Epic | Delivery phase within engagement |
