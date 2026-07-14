# 05 — Decision Workflow

**Purpose:** Define how founders make, review, evaluate, and archive decisions inside BOS—so judgment compounds instead of evaporating.

**Core belief:** A decision is not a meeting note. It is a **commitment with an expected outcome and a future reckoning.**

---

## Why Decisions Are the Product

Founders don’t lack data. They lack **recorded judgment under uncertainty**.

BOS should feel like:

- **Before deciding:** “Here’s what we decided last time, and what happened.”
- **While deciding:** “What do we expect, and how will we know?”
- **After deciding:** “Was I right—and what does that teach the company?”

Everything else (initiatives, attribution, investment) exists to **give decisions context**.

---

## Decision Types (Founder Mental Model)

Not all decisions deserve the same ceremony.

| Type | Examples | Ceremony level |
|------|----------|----------------|
| **Strategic** | Scale channel, kill initiative, enter new market | Full workflow |
| **Resource** | Increase budget, hire, reallocate | Full workflow |
| **Tactical** | Pause ads 2 weeks, change creative angle | Lightweight |
| **Governance** | Approve unattributed spend, ratify team decision | One-click + rationale |

BOS should infer ceremony from type—not ask founders to pick workflow templates.

---

## When a Decision Should Be Created

### Automatic Prompts (BOS suggests)

| Trigger | Suggested decision |
|---------|-------------------|
| Initiative activated | “What does success look like in 30/60/90 days?” |
| Budget 80% | “Continue, increase, or pause funding?” |
| Checkpoint date | “Is hypothesis holding? Scale / optimize / pivot / kill?” |
| Material unattributed spend | “Strategic or overhead?” |
| Team logs blocker | “Founder ratification needed?” |
| Initiative close initiated | “Final verdict and lesson” |

### Founder-Initiated

Any time the founder thinks: *“We’re choosing a path.”*

BOS should make capture **faster than a Slack message**—otherwise decisions stay outside the system.

### When NOT to Create a Decision

- Routine operational choices (expense category, lead assignment)
- Decisions already implied by initiative close outcome
- “We discussed it” without a clear commitment

**Rule:** If there’s no expected outcome to evaluate later, it’s a note—not a BOS decision.

---

## Decision Record (Minimum Viable Judgment)

Every strategic/resource decision captures:

| Field | Purpose |
|-------|---------|
| **Title** | Verb-first: “Scale Meta spend to $3k/month” |
| **Context** | Why now? What triggered this? |
| **Decision** | What we chose |
| **Expected outcome** | What we believe will happen (measurable when possible) |
| **Review date** | When we reckon with this |
| **Initiative / venture link** | What bet this belongs to |
| **Author** | Who owns the judgment |

Optional but valuable:

- Alternatives considered
- Confidence level (high / medium / low)
- Dissent (“I disagreed because…”)

---

## Decision Lifecycle

```
PROPOSED → ACTIVE → DUE FOR REVIEW → EVALUATED → ARCHIVED
              ↓
           SUPERSEDED (new decision replaces)
              ↓
           REVERSED (explicit override with reason)
```

### Proposed

- BOS or team suggests a decision
- Founder has not committed
- Appears in attention queue as “Approve / Edit / Dismiss”

### Active

- Founder committed
- Expected outcome and review date locked
- Visible on initiative timeline
- Drives behavior: e.g., “approved scale” may unlock budget tracking expectation

### Due for Review

- Review date reached OR material contradicting signal
- Surfaces in morning briefing and weekly review
- Founder evaluates: on track, wrong, too early to tell

### Evaluated

- Outcome recorded: **Correct / Partially correct / Wrong / Inconclusive**
- Short note: what happened vs expected
- Feeds institutional memory and future recommendations

### Archived

- Read-only historical record
- Searchable when starting similar bets
- Never deleted—founders regret lost judgment

### Superseded / Reversed

- New decision explicitly replaces old
- Link between them preserved
- “We changed our mind because…” is first-class data

---

## Review Cadence

| Decision type | Default review |
|---------------|----------------|
| Scale / budget increase | 30 days |
| Kill / pause | Immediate (no review—outcome is action) |
| Channel test | 14–30 days |
| Hire / role | 90 days |
| Strategic pivot | 60 days |

Founder can adjust review date at creation—default should be intelligent.

---

## Evaluation Workflow (The Compounding Moment)

When a decision comes due for review, BOS presents:

1. **What you decided** (title + date)
2. **What you expected** (expected outcome)
3. **What happened** (signals from investment, revenue, progress—when available)
4. **Verdict prompt:** Correct / Partial / Wrong / Too early
5. **Lesson line:** One sentence optional

**Product insight:** Evaluation should take **under 2 minutes**. If it feels like homework, founders skip it and BOS dies.

---

## Decision Inbox (Founder Surface)

Separate from Command Center but linked.

**Sections:**

| Section | Content |
|---------|---------|
| **Needs you now** | Overdue reviews + pending approvals |
| **Active commitments** | Decisions with upcoming review dates |
| **Recently evaluated** | Last 30 days—quick pattern recognition |
| **Search** | “What did we decide about Meta?” |

Sort by **stakes × urgency**, not date.

---

## Relationship to Initiatives

| Initiative state | Decision expectation |
|------------------|---------------------|
| Draft | 0–1: “Why start?” |
| Active | Ongoing tactical + checkpoint strategic |
| Paused | 1: “Resume or kill?” |
| Closed | 1 final: verdict + lesson |

An active initiative with **no decision in 21+ days** is a product failure signal—surface as decision debt.

---

## Relationship to Money

Decisions and money tell one story:

| Money event | Decision link |
|-------------|---------------|
| Expense attributed | “Spends toward decision X” or “Exploratory—no decision yet” |
| Budget override | Requires decision record |
| Scale approval | Expect spend increase—track against decision |

**Founder question answered:** “Why did we spend this?” → Decision + attribution, not category alone.

---

## Team Decisions vs Founder Decisions

| Who decides | BOS behavior |
|-------------|--------------|
| Initiative owner | Log tactical decisions; founder notified only if threshold |
| Founder | Strategic decisions; team sees in initiative timeline |
| Shared | Owner proposes → founder ratifies (governance type) |

Founder should **not** approve every tactical call—that’s how BOS becomes bureaucracy.

---

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| Decisions as long essays | Structured fields + optional detail |
| Decisions without review dates | Never allow—default intelligently |
| Decisions never evaluated | Weekly nudge + batch evaluation mode |
| 50 active decisions | Archive evaluated; max ~10 active per venture |
| Decisions disconnected from initiatives | Require link for strategic type |

---

## What “Magical” Feels Like

> “We’re thinking about scaling Digikinz again.”  
> BOS: “Last time (March 12) you scaled Meta to $2k expecting 15 leads/month. Actual: 11. Partially correct. Creative fatigue noted. Recommend optimize before scale.”

That is the product. Not forms—**memory with judgment.**

---

## Current State vs Target (Honest)

**Today (vertical slice):** Founders can record decisions with title, context, expected outcome; view history on initiative detail.

**Target founder experience:**

- Decision inbox with review dates and evaluation
- Automatic prompts at checkpoints
- Outcome linkage to investment/revenue signals
- Search across institutional memory
- Supersede/reverse with lineage

---

## Summary

| Stage | Founder job | BOS job |
|-------|-------------|---------|
| Create | Commit with expected outcome | Make capture frictionless |
| Active | Execute | Keep visible, link money |
| Review | Reckon with reality | Show expected vs actual |
| Evaluate | Score judgment | Store lesson |
| Archive | Refer back later | Searchable memory |

**Product north star:** BOS is where the company remembers **what it chose, why, and whether it was right.**
