# 10 — Continuous Learning

How every completed project makes future projects better. The compounding intelligence flywheel at the heart of AOS.

---

## The Flywheel

```
Delivery Engagement completes
        │
        ▼
Retrospective captures lessons
        │
        ├──→ Knowledge Engine (patterns, decisions)
        ├──→ Prompt Engine (template improvements)
        ├──→ Module Registry (new/updated entries)
        └──→ Matching Engine (better reuse suggestions)
        │
        ▼
Next Engagement starts with richer context
        │
        ├──→ Better requirements analysis
        ├──→ Higher reuse rate
        ├──→ Better prompts
        ├──→ Higher evaluation pass rate
        └──→ Faster delivery
        │
        ▼
Retrospective captures new lessons
        │
        ▼
(Repeat — each cycle compounds)
```

This is the **primary long-term value proposition** of AOS. Without continuous learning, AOS is just structured project tracking — which is explicitly not the goal.

---

## Learning Inputs

### From every engagement

| Input | Source | Learning extracted |
|-------|--------|-------------------|
| Evaluation scores | Evaluation Engine | Which prompt structures produce passing outputs |
| Evaluation failures | Evaluation Engine | Common failure patterns and root causes |
| Reuse assessment | Matching Engine | Which modules matched, which gaps existed |
| Prompt pack metadata | Prompt Engine | Pack size, sequence, context budget usage |
| Cursor session records | Cursor Integration | Execution time, revision count, file scope |
| Retrospective | Human input | Qualitative lessons, process improvements |
| Estimation vs actual | Engagement metadata | Planning accuracy calibration |

### From platform changes

| Input | Trigger | Learning extracted |
|-------|---------|-------------------|
| ERP module changes | Code commits to ERP | Registry staleness, pattern updates |
| BOS phase completions | BOS releases | New patterns to catalog |
| ERP Discovery refresh | Periodic audit | Updated reuse/duplication map |
| Evaluation rubric changes | AOS config update | Recalibrated quality baselines |

---

## Learning Outputs

### Prompt Engine improvements

| Learning | Prompt Engine action |
|----------|---------------------|
| Prompt structure consistently passes evaluation | Promote to agency-type template |
| Prompt missing reuse context causes failures | Add reuse block to template |
| Context budget exceeded | Adjust assembly priorities |
| Constraint missing allows ERP duplication | Add constraint to all packs |
| Agency-type specific failure pattern | Create specialized sub-template |

### Module Registry improvements

| Learning | Registry action |
|----------|----------------|
| Module used successfully | Increase quality score, usage count |
| Module caused evaluation failure | Decrease score, add anti-pattern note |
| Net-new code extracted from engagement | Register new module |
| Existing module deprecated in codebase | Mark deprecated |
| Gap identified repeatedly | Flag as "needed module" for investment |

### Knowledge Engine improvements

| Learning | Knowledge action |
|----------|-----------------|
| Engagement lesson with reusable pattern | Promote to agency pattern |
| Architecture decision during delivery | Record as permanent decision |
| Client preference discovered | Store as client context summary (ERP-linked) |
| Repeated mistake across engagements | Elevate to agency anti-pattern |
| Successful delivery playbook deviation | Update agency-type playbook |

### Matching Engine improvements

| Learning | Matching action |
|----------|----------------|
| Module recommended but rejected by dev | Analyze rejection reason, adjust matching |
| Module not recommended but dev built equivalent | Add to registry or improve matching |
| Requirement category consistently unmatched | Identify systematic gap |

---

## Estimation Learning

AOS tracks planning accuracy to improve future estimates:

| Metric | Comparison | Learning |
|--------|-----------|----------|
| Prompt count | Planned vs actual prompts in pack | Calibrate pack sizing |
| Revision rate | Prompts passing first evaluation vs requiring revision | Calibrate prompt quality |
| Reuse rate | Planned reuse vs actual reuse | Calibrate Matching Engine |
| Engagement duration | Planned vs actual lifecycle time | Calibrate intake estimates |
| Net-new module count | Planned vs actual new code | Calibrate greenfield vs enhancement estimates |

Estimation learning is **statistical**, not AI magic — it requires N completed engagements to produce meaningful calibration.

---

## Cross-Engagement Learning Rules

| Rule | Rationale |
|------|-----------|
| Client facts never cross engagements | Privacy and trust |
| Patterns may cross engagements (anonymized) | Organizational learning |
| Prompt templates are agency-wide | Efficiency |
| Module registry is agency-wide | Reuse |
| Evaluation rubrics are agency-wide (with agency-type variants) | Consistent quality |
| Failed patterns are agency-wide | Prevent repeated mistakes |
| BOS strategic lessons are readable by AOS | Strategic alignment |

---

## Learning vs Surveillance

AOS continuous learning tracks **delivery patterns**, not **individual performance surveillance**:

| Tracked (OK) | Not tracked (anti-pattern) |
|-------------|---------------------------|
| Prompt pass rates (aggregate) | Individual developer ranking |
| Module reuse rates (aggregate) | Per-developer speed metrics |
| Evaluation failure patterns | Blame attribution |
| Estimation accuracy (team) | Individual utilization rates |
| Knowledge promotion frequency | Individual activity counts |

This aligns with AOS being a **development operating system**, not an employee monitoring tool.

---

## Compounding Metrics

Track these over time to prove the flywheel works:

| Metric | Direction over time | Meaning |
|--------|-------------------|---------|
| **Reuse rate** | ↑ | More existing modules used per engagement |
| **First-pass evaluation rate** | ↑ | Prompts succeed without revision |
| **Prompt pack size** (for equivalent scope) | ↓ | Fewer prompts needed (better reuse + templates) |
| **Engagement duration** (for equivalent scope) | ↓ | Faster delivery |
| **Knowledge records per engagement** | ↑ then stable | Capture matures, then steady state |
| **Registry entries** | ↑ then plateau | Catalog grows, then stabilizes |
| **Net-new code ratio** | ↓ | Less custom code per engagement |
| **Post-delivery defect rate** | ↓ | Quality improves |

---

## Feedback Loop Timing

| Loop | Frequency | Trigger |
|------|-----------|---------|
| **Per-prompt** | Immediate | Evaluation pass/fail → revision or advance |
| **Per-engagement** | On close | Retrospective → promotion decisions |
| **Per-quarter** | Scheduled | Aggregate metrics review → template updates |
| **Per-platform-change** | Event-driven | ERP/BOS changes → registry/knowledge refresh |
| **Per-discovery-audit** | Periodic | Full system re-audit (like ERP Discovery) |

---

## Relationship to BOS Learning

BOS captures **strategic learning** (initiative close lessons, decision outcomes, ROI vs hypothesis). AOS captures **delivery learning** (prompts, modules, code patterns).

| Learning type | BOS | AOS |
|---------------|-----|-----|
| "This initiative was worth the investment" | ✅ | reads |
| "This prompt pattern works for SaaS tenant setup" | — | ✅ |
| "We should kill this venture" | ✅ | — |
| "ScreenLockContext should be reused for PIN views" | — | ✅ |
| "Actual ROI was 2.3x hypothesis" | ✅ | reads |

When BOS initiative closes with a lesson, AOS Knowledge Engine ingests it as strategic context. When AOS engagement closes with a lesson, it does not automatically write to BOS.

---

## Bootstrap Learning (Day Zero)

Before any AOS engagement completes, the flywheel is seeded from:

1. **ERP Discovery Audit** — 11 documents of system knowledge
2. **BOS architecture docs** — proven patterns and anti-patterns
3. **ERP technical debt report** — known risks to avoid
4. **Duplication report** — hard rules on what not to rebuild
5. **Existing Cursor rules/skills** — codified team conventions
6. **Business delivery playbook** — process template

This ensures the **first AOS engagement** already benefits from accumulated platform knowledge, even before AOS-specific learning exists.

---

## Anti-Patterns

| Anti-pattern | Why it breaks the flywheel |
|-------------|--------------------------|
| Skip retrospective | No learning captured |
| Lessons recorded but never promoted | Knowledge stays siloed |
| Prompt templates never updated | Same mistakes repeat |
| Registry not updated after codebase changes | Stale reuse suggestions |
| Metrics tracked but never reviewed | No calibration happens |
| Client data leaked into agency patterns | Trust violation + noise |
| Learning used for individual surveillance | Team avoids capture |

---

## Phase Introduction

| Phase | Continuous Learning capability |
|-------|-------------------------------|
| Phase 1 | Manual retrospective; ERP Discovery seed; basic metrics |
| Phase 2 | Automatic evaluation-based learning; usage tracking |
| Phase 3 | Promotion workflow; template auto-suggestion |
| Phase 4 | Estimation calibration; quarterly review automation |
| Phase 5 | Cross-agency learning (optional); predictive planning |
