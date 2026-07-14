# 04 — Data Lifecycle

**Purpose:** Define how business data evolves over time—what stays fixed, what changes, what gets versioned, and what survives forever for 10-year ROI and prediction integrity.

**Principle:** Operational facts are immutable; strategic interpretation is versioned; judgment is append-only; learning is never deleted.

---

## 1. Lifecycle Overview

```
CREATE → ACTIVE → (EDIT / VERSION / SUPERSEDE) → CLOSE → ARCHIVE → READ-ONLY FOREVER
```

Different entity types follow different rules.

---

## 2. Immutability Rules

### 2.1 Never Mutate (ERP Layer)

| Data | Rule | Why |
|------|------|-----|
| Posted expense amount/date | Correct via reversal/return, not silent edit | Accounting integrity |
| Paid invoice facts | Same | Revenue integrity |
| Lead creation timestamp | Immutable | Funnel math |
| Bank transaction | Immutable | Cash reconciliation |

**BOS never writes these.** Read-only bridge only.

### 2.2 Immutable After Milestone (BOS Layer)

| Data | Milestone | Why |
|------|-----------|-----|
| Initiative closure outcome | On close | Label for prediction |
| Lesson learned | On close | Institutional memory |
| Final ROI snapshot | On close | Historical comparison |
| Decision evaluation | On evaluate | Calibration record |
| Attribution to closed initiative | On initiative close | Prevent retroactive gaming |

### 2.3 Immutable Keys (Always)

| Field | Rule |
|-------|------|
| `companyId` | Never change on document |
| `ventureId` on initiative | Never change (successor link instead) |
| `sourceType` + `sourceId` on attribution | Never change (supersede instead) |
| Document `id` | Never change |

---

## 3. Editable Data

### 3.1 Editable Before Close

| Entity | Editable fields | Why |
|--------|-----------------|-----|
| **Venture** | name, description, ownerUserId | Clarification, reassignment |
| **Initiative** | name, hypothesis, successCriteria, budget, dates | Refinement while learning |
| **Decision** | title, context, expectedOutcome (until evaluated) | Draft quality |
| **Attribution** | notes only (not source link) | Context |

### 3.2 Editable After Close (Restricted)

| Entity | Allowed | Requires |
|--------|---------|----------|
| Venture | status → archived | All initiatives closed |
| Initiative | **Nothing material** | Reopen = new decision |
| Decision | append evaluation only | — |
| Attribution | void/supersede audit | Finance permission + reason |

---

## 4. Versioning & Supersede Patterns

### 4.1 Attribution

| Action | When | Effect on ROI |
|--------|------|---------------|
| **Create** | Link expense to initiative | Adds investment |
| **Supersede** | Wrong initiative | Old marked superseded; new active |
| **Void** | Error / non-strategic | Removes from active ROI; reason stored |

**History preserved:** All versions kept for audit and restatement analysis.

### 4.2 Decisions

| Action | When |
|--------|------|
| **Supersede** | New decision replaces old |
| **Reverse** | Explicit "we changed our mind" |

Link via `supersedesDecisionId`—never delete old decision.

### 4.3 Initiatives (Pivot)

| Action | When |
|--------|------|
| **Pivot** | Close with outcome=pivoted; create successor with `predecessorInitiativeId` |

ROI chain preserved across pivot lineage.

---

## 5. Archive Rules

| Entity | Archive trigger | Archived behavior |
|--------|-----------------|-------------------|
| **Initiative** | close | Read-only; ROI frozen |
| **Venture** | all initiatives closed + archive decision | Read-only portfolio record |
| **Attribution** | initiative archived | No new links; existing locked |
| **Decision** | never archived separately | Always searchable |

**Archive ≠ delete.** Archived data powers prediction.

---

## 6. Never Delete

| Data | Reason |
|------|--------|
| BosDecision | Judgment history is the moat |
| Closed BosInitiative | Training labels |
| BosAttribution (including voided) | ROI audit trail |
| ERP facts | Legal / accounting |
| Decision evaluations | Calibration |
| Lessons learned | Cross-venture learning |

**Firestore rules already block delete** on core BOS collections—aligns with this strategy.

---

## 7. Time-Based Evolution

### Year 0–1 (Active Bet)

- High edit tolerance on initiative metadata
- Attributions added continuously
- Decisions appended
- ROI **provisional**

### Year 1–2 (Closed Bet)

- Initiative frozen
- ROI **final** (with optional restatement audit)
- Data feeds portfolio benchmarks

### Year 3–10 (Portfolio Memory)

- Archived initiatives queried for priors
- Patterns extracted for BI/prediction
- No retroactive edits without explicit reopen protocol

---

## 8. Data Quality Lifecycle

| Stage | Action |
|-------|--------|
| **Ingest** | ERP fact created |
| **Attribute** | BOS sidecar links to initiative |
| **Validate** | Unattributed queue → zero target weekly |
| **Close** | Lesson + outcome required if invested |
| **Evaluate** | Decisions scored |
| **Freeze** | Snapshot at close |
| **Learn** | Portfolio queries across frozen records |

---

## 9. Reopen Protocol (Rare)

When material error discovered after close:

1. Founder decision recorded
2. Initiative status → reopened (audit event)
3. Attribution corrections via supersede only
4. New close with **amended** ROI snapshot; original preserved

**Never silent edit of closed ROI.**

---

## 10. Multi-Business / 10-Year Portfolio

| Concern | Approach |
|---------|----------|
| Company A vs B data | `companyId` isolation |
| Same founder, new venture | New venture; history links via portfolio view |
| Sold business | Venture → archived; data retained read-only |
| GDPR / user delete | Anonymize user refs; **never delete financial/strategic records** |

---

## 11. Summary Table

| Category | Immutable | Editable | Versioned | Archived | Never delete |
|----------|-----------|----------|-----------|----------|--------------|
| ERP expense/invoice | ✓ fact | corrections via reversal | — | — | ✓ |
| Venture | keys | name, owner, description | — | ✓ | ✓ |
| Initiative | keys after close | before close | pivot chain | ✓ | ✓ |
| Decision | after evaluate | before evaluate | supersede | — | ✓ |
| Attribution | source link | notes | supersede/void | with initiative | ✓ |
| ROI snapshot | at close | reopen only | amend record | ✓ | ✓ |

---

*Next: `05_Founder_Intelligence_Roadmap.md` — Year 1–5 growth path.*
