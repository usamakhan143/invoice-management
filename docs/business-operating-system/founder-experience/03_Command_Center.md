# 03 — Founder Command Center

**Purpose:** Define information hierarchy for the first screen a founder sees—without wireframes, components, or technology.

**Analogy:** The Command Center is not a dashboard. It is a **briefing**—like a chief of staff’s morning memo, not a BI tool.

---

## One Sentence Definition

> The Command Center tells the founder **what deserves their judgment today**, and hides everything else behind confident defaults.

---

## The Founder’s Mental Model

When a founder opens BOS, they hold four simultaneous questions:

1. **Am I okay?** (Nothing on fire)
2. **Am I focused?** (Right bets getting attention)
3. **Am I learning?** (Decisions compounding)
4. **Am I allocating well?** (Money matches strategy)

The Command Center answers these in under 60 seconds.

---

## Information Hierarchy

### Tier 0 — Always Visible (Above the Fold)

**The founder should never scroll to know if they’re okay.**

| Element | Content | Why always visible |
|---------|---------|-------------------|
| **Portfolio status line** | “4 active · 1 needs you · 2 paused · $X invested this month” | Instant orientation |
| **Attention queue** | Max 3 items requiring founder action | Prevents decision debt |
| **Primary verdict** | One initiative-level headline: best opportunity OR biggest risk | Focus |
| **Period context** | “Week 12 of Q2” or “Day 34 of Digikinz bet” | Grounds timing |

**Example (conceptual copy, not UI):**

> **This week:** 4 active initiatives · **1 needs you**  
> **Top risk:** Digikinz — $4,200 spent, no decision in 18 days  
> **Top opportunity:** Agency referrals — ROI trending up, under-budget  
> **Your move:** Approve scale decision on Digikinz or pause spend

---

### Tier 1 — Visible on First Scroll (Portfolio Pulse)

**“How are my bets doing?”** — not detailed analytics.

| Block | Shows | Hides |
|-------|-------|-------|
| **Initiative health strip** | Each active initiative: name, status, invested, signal (🟢🟡🔴 or words), last touch | Full history, every metric |
| **Capital at work** | Total strategic spend this week/month vs plan | Line-item expenses |
| **Decision debt** | Count + oldest pending decision age | Full decision text |
| **Unattributed money** | “$X spend · $Y revenue not linked to a bet” | ERP detail |

**Ranking rule:** Initiatives sort by **attention score**, not alphabet or date created.

Attention score = f(decision debt, budget burn rate, negative signal, founder last touch, strategic priority).

---

### Tier 2 — One Click Away (Drill-Down Entry Points)

**The founder chooses to go deeper—BOS never pushes them.**

| Entry point | Opens into | Founder question answered |
|-------------|------------|---------------------------|
| Initiative name | Initiative command view | “What’s the full story on this bet?” |
| Attention item | Decision or action surface | “What do I need to do?” |
| Unattributed money | Attribution workflow | “What spend lacks a story?” |
| Venture name | Venture rollup | “How is this business doing overall?” |
| Decision debt | Decision inbox | “What am I avoiding?” |

---

### Tier 3 — Deliberately Hidden Until Needed

**Power without clutter.**

| Content | Why hidden |
|---------|------------|
| Full decision archive | Weekly/quarterly activity |
| Venture settings | Admin, not daily |
| Permission management | Not founder job |
| Expense line items | Operational layer |
| CRM pipeline views | Operational layer |
| Raw charts / time series | Only when diagnosing |
| Closed initiative detail | Memory search, not morning |

---

## What Deserves Permanent Visibility vs Ephemeral

| Always visible | Ephemeral (contextual) |
|----------------|------------------------|
| Active initiative count | “Initiative closed yesterday” (24h banner) |
| Attention queue | Checkpoint reached notifications |
| Unattributed spend total | One-time onboarding prompts |
| This month’s strategic investment | Empty states |

---

## The Attention Queue (Core Product Surface)

This is the most important element in the entire Command Center.

**Properties:**

- **Max 3 items** — if more exist, BOS prioritizes and batches the rest for weekly review
- **Each item is actionable** — verb-first: “Approve,” “Pause,” “Attribute,” “Decide,” “Review”
- **Each item has stakes** — one line: money, time, or decision impact
- **Each item has a default recommendation** — founder can accept, defer, or override

**Good attention items:**

- “Digikinz: Approve $2k/month Meta scale — ROI +38% last 30 days”
- “$840 Google Ads spend unattributed — assign to initiative or mark non-strategic”
- “Decision pending 14 days: ‘Pause LinkedIn outreach?’ — stall cost ~$400/week”

**Bad attention items:**

- “3 initiatives updated”
- “New expense recorded”
- “Reminder to check dashboard”

---

## Initiative Health Strip (Second Most Important)

Each active initiative gets **one line**, not a card wall:

| Field | Example |
|-------|---------|
| Name | Digikinz Client Acquisition |
| Status | Active · Day 47 |
| Invested | $6,200 / $10,000 budget |
| Signal | ⚠ Stalled — no decision in 18 days |
| Verdict hint | Optimize (not Scale yet) |

Click → full initiative story (investment, decisions, attribution, close path).

---

## Verdict Layer (What Makes BOS Different)

ERP shows numbers. BOS shows **judgment**.

The Command Center should eventually surface plain-language verdicts:

| Verdict | Meaning |
|---------|---------|
| **Scale** | Evidence supports more capital |
| **Optimize** | Keep running, change approach |
| **Pivot** | Hypothesis weak, bet still worth saving |
| **Pause** | Stop spend until decision |
| **Kill** | Stop and extract lesson |

Verdicts are **recommendations**, not automation. Founder always owns the final decision—but the recommendation must be visible every morning.

*Today’s product slice does not yet show verdicts; this is the Command Center’s north star.*

---

## Empty States (First-Time Founder)

If no initiatives exist, the Command Center should not show blank charts.

**Instead:**

> “You don’t have strategic bets tracked yet.  
> Start one initiative you’re already spending money on—BOS will help you decide if it’s worth continuing.”

One primary action: **Create initiative from existing spend** (conceptually—not implementation).

---

## Comparison to What Founders Use Today

| Tool | What it optimizes | Why it fails the founder |
|------|-------------------|--------------------------|
| Accounting | Compliance | No “why” |
| CRM | Pipeline activity | No portfolio view |
| Ad platforms | Channel metrics | No initiative truth |
| Notion | Documentation | No live ERP connection |
| Spreadsheet | Flexibility | No compounding memory |

**Command Center job:** Be the **judgment layer** none of them provide.

---

## Success Criteria

The Command Center succeeds when a founder says:

- “I know what to do in the first minute.”
- “I trust that if something important happened, it’s in the queue.”
- “I don’t feel guilty for not exploring every page.”

It fails when a founder says:

- “It’s another dashboard I have to interpret.”
- “I still need spreadsheets to decide.”
- “I’m not sure what changed since yesterday.”

---

## Information Architecture Summary

```
TIER 0 (always visible)
├── Portfolio status line
├── Attention queue (max 3)
├── Primary verdict / risk headline
└── Period context

TIER 1 (first scroll)
├── Initiative health strip
├── Capital at work
├── Decision debt indicator
└── Unattributed money alert

TIER 2 (click to drill)
├── Initiative command view
├── Decision inbox
├── Attribution queue
└── Venture rollup

TIER 3 (hidden until needed)
├── Archives, settings, raw data, operational modules
```

**Product mantra:** Brief first. Depth on demand. Judgment over metrics.
