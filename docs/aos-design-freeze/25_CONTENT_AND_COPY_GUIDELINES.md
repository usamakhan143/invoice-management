# 25 — Content and Copy Guidelines

**Stage D1.5 — AOS Design Freeze**  
**Status:** Frozen — language of AOS

Copy is **precise, domain-aligned, and evidence-oriented**. Founders read labels as contracts.

---

## Tone of Voice

| Attribute | Expression |
|-----------|------------|
| **Direct** | Say what happens — no “Oops!” |
| **Calm** | No urgency theater — severity via words |
| **Domain-native** | Requirement Set, Prompt Pack, Delivery Engagement |
| **Accountable** | Name artifact version in every gate action |
| **Honest about AI** | “AI draft”, “AI suggested” — never “smart” or “magic” |
| **Professional** | Agency founder audience |

**Not:** playful error messages, exclamation marks on success, Jira slang (“story”, “epic”, “sprint”).

---

## Naming Conventions

| Entity | UI label | Never use |
|--------|----------|-----------|
| Delivery Engagement | Engagement | Project, deal |
| Requirement Set | Requirement set v{n} | Backlog, stories |
| Prompt Pack | Prompt pack v{n} | Task group |
| Prompt Artifact | Prompt artifact | Task, ticket |
| Cursor Session | Cursor session | Job, run (alone) |
| Evaluation | Evaluation | QA score (alone) |
| Module (registry) | Module | Package (unless npm context) |
| Knowledge Pattern | Pattern | Wiki page |
| Delivery Lead | Delivery lead | Assignee |
| Founder | Founder (second person “you” in dashboard) | Admin user |

Capitalization: **Sentence case** for headings and buttons; **Title Case** only for proper nouns (ERP, BOS, Cursor).

---

## Button Labels

| Pattern | Example |
|---------|---------|
| Verb + object | Create engagement |
| Verb + artifact + version | Approve requirement set v3 |
| Specific not generic | Submit capture — not Submit |
| Sidecar | View in ERP · Open in BOS |
| Danger | Cancel engagement — not Delete |
| Secondary | Request revision — not Reject draft (unless domain reject) |

**Forbidden button labels:** OK, Yes, Continue (without object), Save (on approve gates), Submit (on approve gates), Got it.

---

## Titles and Headings

| Level | Pattern |
|-------|---------|
| Page title | {Engagement title} or {Screen name} |
| Section | {Artifact type} or {Action area} |
| Card title | {Pack name} v{n} |

Include client name in PageHeader subtitle when engagement-scoped: “Acme Corp · Website redesign”.

---

## Errors

| Rule | Example |
|------|---------|
| State problem + cause if known | Could not load engagement. Network error. |
| Action | Retry |
| No blame | Not “You entered invalid data” → “Enter a cancel reason” |
| Domain errors | Approval failed: requirement set is no longer draft. |

**Forbidden:** Oops, Something went wrong (alone), Error 500, Uh oh.

---

## Warnings

| Use | Copy pattern |
|-----|--------------|
| Borderline evaluation | Evaluation borderline — review rubric before proceeding. |
| Stale session | Cursor session inactive for 48 hours. |
| AI inference | AI explanation — verify before approving. |
| Gate blocked | Prompt pack approval blocked — complete requirements gate. |

---

## Approval Wording (Locked)

| Step | Copy |
|------|------|
| AiDraftPanel banner | AI Draft · Not approved |
| Approved banner | Approved · {actor} · {timestamp} |
| ApprovalPanel primary | Approve {artifact type} v{n} |
| ApprovalDialog title | Approve {artifact type} v{n}? |
| ApprovalDialog body | This locks {artifact type} v{n}. Further changes require a new version. |
| AI approval addendum | You are approving AI-generated content you have reviewed. |
| Request revision | Request revision — not Send back |

---

## AI Wording

| Context | Copy |
|---------|------|
| Generation in progress | Generating draft… |
| Suggestion | AI suggested |
| Explanation header | AI explanation |
| Confidence | Model confidence — not approval |
| Regenerate | Regenerate draft |
| Failure | Draft generation failed |

**Forbidden:** Smart fill, Magic, Copilot (unless product name Cursor context), Auto-approved.

---

## Cursor Wording

| Context | Copy |
|---------|------|
| Handoff | Copy prompt for Cursor |
| External open | Open in Cursor |
| Session start | Record session start (Phase 1 manual) |
| Capture | Submit capture |
| Capture pending | Capture pending |
| Validation | Capture validation failed |

---

## Founder Wording (Dashboard)

| Context | Copy |
|---------|------|
| Attention queue title | Needs your attention |
| Empty attention | Nothing needs your attention |
| NBA prefix | Next step |
| Risk title | Delivery risks |

Second person “you” acceptable on dashboard; third person on audit/timeline.

---

## Empty States

Structure: **Title** (neutral) + **Description** (one sentence) + **Primary action**

| Screen | Title |
|--------|-------|
| Engagements | No engagements yet |
| Requirements tab | No requirements yet |
| Attention queue | Nothing needs your attention |
| Registry | No modules registered |
| Knowledge | No knowledge patterns yet |

**Forbidden:** “It's empty here”, “No data found” without action.

---

## Notifications

| Type | Pattern |
|------|---------|
| Success toast | {Artifact} approved |
| Error toast | {Action} failed — {reason} |
| Info toast | Copied to clipboard |

Max 80 characters where possible.

---

## Success Messages

- Requirement set v3 approved  
- Capture submitted  
- Engagement created  
- Evaluation complete — passed  

No exclamation marks.

---

## Consistency Rules

1. Version always `v{n}` lowercase v — `v3` not `V3` or `version 3` in buttons  
2. Timestamps relative in lists (“2 hours ago”), absolute in audit (“Jul 18, 2026 10:00 AM”)  
3. Client name from ERP read port — never truncated below recognition without tooltip  
4. Lifecycle states: domain enum strings formatted for display (`discovery` → “Discovery”)  
5. Sidecar links suffix “· ERP” or “· BOS” when ambiguous  

---

## Forbidden Wording

| Term | Reason |
|------|--------|
| Task, subtask | ADR-012 |
| Sprint, backlog, story points | ADR-012 |
| Ticket | Jira metaphor |
| Pipeline (alone) | DevOps confusion — use lifecycle phase |
| Done | vague — use domain state |
| Wizard | implies gamification |
| Dashboard KPI | FXD excludes analytics hub |
| Smart, intelligent | AI hype |
| Simply, just | condescending |

---

## Grammar Rules

- Oxford comma: yes  
- Active voice on buttons  
- Present tense for states (“Evaluation in progress”)  
- Past tense for timeline events (“Requirement set v3 approved”)  
- Numbers: spell out one–nine in prose; digits in tables and versions  

---

## Localization (Locked)

**English only Phase 1.** All copy hardcoded or single locale file — i18n Phase 2.

---

## Related Documents

- [28 Design Decision Principles](./28_DESIGN_DECISION_PRINCIPLES.md)
- [FXD Decision Map](../aos-founder-experience/07_DECISION_MAP.md)
- [Domain Model — Delivery](../aos-domain-model/01_DELIVERY_DOMAIN.md)
