# 04 — Notifications

**Purpose:** Define when BOS should interrupt a founder—and when it must stay silent.

**Principle:** A great BOS notification feels like a **trusted advisor tapping your shoulder once**, not a SaaS app begging for engagement.

---

## Notification Philosophy

### The Three Laws

1. **Materiality** — Only events that would change a founder’s decision or schedule deserve interruption.
2. **Actionability** — Every notification links to a decision or action, not a page view.
3. **Batching** — Non-urgent signals roll into daily briefing or weekly review, never real-time spam.

### What We Reject

| Anti-pattern | Why |
|--------------|-----|
| “3 initiatives updated” | No judgment |
| “New expense recorded” | Operational noise |
| “You haven’t logged in today” | Engagement hacking |
| “Weekly digest of everything” | Unfiltered dashboard email |
| Push for every team action | Founder is not PM for all work |

---

## Notification Tiers

### Tier 1 — Interrupt Now (Rare)

**Channel:** Push / SMS / immediate in-app (max 1–2 per day in normal operation)

**Criteria:** Financial or strategic consequence within 48 hours if ignored.

| Event | Message shape | Action |
|-------|---------------|--------|
| Initiative budget exceeded | “Digikinz passed $10k budget — pause spend or approve override” | Decide |
| Initiative budget 90% with high burn | “Digikinz at 90% budget in 22 days — review before month-end” | Review |
| Unattributed spend above threshold | “$2,400 in ads unattributed this week — assign or dismiss” | Attribute |
| Kill threshold met | “Referral pilot: 60 days, $0 attributed revenue — kill review due” | Decide |
| Scale signal + capacity | “Digikinz ROI +45% — scale decision recommended” | Decide |
| Decision explicitly overdue | “You committed to decide on Meta scale by today” | Decide |
| Initiative orphaned (no owner / no touch 30d) | “Agency rebrand initiative untouched 32 days — pause or assign” | Act |

**Rule:** If the founder would reasonably say “I’m glad I knew that today,” it qualifies.

---

### Tier 2 — Morning Briefing (Daily Batch)

**Channel:** In-app Command Center + optional email at founder’s chosen time

**Criteria:** Useful for orientation but not urgent enough to interrupt sleep.

| Event | Briefing line |
|-------|---------------|
| Initiative checkpoint reached | “Digikinz: 30-day checkpoint — early ROI direction: unclear” |
| New decision recorded by team | “Sarah logged: ‘Pause cold email’ — ratify or amend?” |
| Material investment change | “+$1,200 attributed to Digikinz this week” |
| Initiative status change | “Referral pilot paused by ops lead” |
| Revenue attributed (future) | “First invoice linked to Digikinz — $8,500” |
| Negative progress signal (future) | “Digikinz: 14 days, 0 qualified leads” |

**Rule:** Batched into **one morning surface**, not individual pings.

---

### Tier 3 — Weekly Review Pack (No Interruption)

**Channel:** Weekly review agenda only

| Event | Review section |
|-------|----------------|
| Decision outcome evaluation due | “Decisions to score this week” |
| Initiatives with no progress signal | “Stalled bets” |
| Portfolio allocation drift | “Budget vs actual by venture” |
| Lessons from closed initiatives | “What we learned” |
| Repeated unattributed spend pattern | “Process gap: marketing spend” |

**Rule:** Never push mid-week unless escalated to Tier 1.

---

### Tier 4 — Silent (Log Only)

**Never notify the founder.**

| Event | Why silent |
|-------|------------|
| Routine expense in ERP | Operational |
| CRM lead created | Unless initiative-linked milestone |
| Permission changes | Admin |
| Team member viewed initiative | Not material |
| Attribution confirmed without anomaly | Expected workflow |
| Initiative edited (name, hypothesis) | Low stakes |
| Successful close with lesson captured | Celebrate in review, not ping |

---

## Notification → Founder Question Map

Every notification must answer one founder question from `02_Founder_Questions.md`:

| Notification | Question answered |
|--------------|-------------------|
| Budget exceeded | “Am I about to get surprised by spend?” |
| Scale recommended | “Should I scale?” |
| Kill review due | “Should I stop?” |
| Unattributed spend | “Is this spend part of a strategic bet?” |
| Decision overdue | “What decision am I avoiding?” |
| Checkpoint reached | “Is this initiative working?” |
| First attributed revenue | “Which initiative is making money?” |

If it doesn’t map to a founder question, don’t send it.

---

## Channel Strategy

| Channel | Use |
|---------|-----|
| **In-app attention queue** | Primary—always |
| **Email morning briefing** | Opt-in, single email, skimmable |
| **Push / mobile** | Tier 1 only, user-configured |
| **SMS** | Extreme opt-in (budget blown, fraud-level)—likely never v1 |

**Default:** In-app only. Founders opt *up* into more interruption, never opt *out* of spam they didn’t ask for.

---

## Personalization & Thresholds

Founders should configure **their** materiality thresholds—not notification types à la carte.

| Setting | Example |
|---------|---------|
| Budget alert at | 80% / 90% / 100% |
| Unattributed spend alert | > $500 / week |
| Decision overdue | 7 / 14 / 30 days |
| Quiet hours | No push 8pm–7am |
| Max Tier 1 per day | 2 (hard cap) |

**Product insight:** Settings are thresholds and quiet hours—not 40 checkboxes for event types.

---

## Team vs Founder Notifications

| Recipient | Gets notified about |
|-----------|---------------------|
| **Founder** | Portfolio judgment, budget, kill/scale, decision debt |
| **Initiative owner** | Day-to-day progress, attribution tasks, checkpoint prep |
| **Finance** | Unattributed spend resolution (task, not strategic ping) |

Founder notifications **decrease** as the team matures—good BOS routes noise to owners first, escalates to founder only when thresholds hit.

---

## Examples: Good vs Bad

### Good

> **Digikinz · Budget 92%**  
> $9,200 of $10,000 spent · 12 days left in month  
> **Recommended:** Pause Meta until scale decision  
> [Decide now] [Snooze to weekly review]

### Bad

> **Expense added**  
> Google Ads — $847.00  
> [View expense]

### Good

> **Weekly briefing · Monday**  
> 1 needs you · 2 checkpoints · $840 unattributed  
> [Open Command Center]

### Bad

> **You have 7 unread updates in BOS**

---

## Success Metrics (Product, Not Engineering)

| Metric | Target |
|--------|--------|
| Tier 1 notifications per founder per week | < 5 |
| Attention queue items acted on within 48h | > 70% |
| Founders who disable all notifications | < 10% (because they’re valuable, not annoying) |
| “This notification saved me money/time” (qualitative) | Common in interviews |

---

## Summary

**Notify when:** Money, decisions, or strategic bets need founder judgment.  
**Batch when:** Orientation and progress updates.  
**Never notify when:** The ERP already recorded a fact and nothing changed strategically.

The goal is a founder who thinks: **“If BOS tells me something, I should pay attention.”**

That trust is destroyed by the second spam ping.
