# 26 — Search and Discovery

**Stage D1.5 — AOS Design Freeze**  
**Status:** Frozen — search architecture

Search helps founders **find engagements and artifacts** — not replace gates or AI orchestration.

---

## Search Philosophy

1. **Scoped first** — search within the screen’s domain before global  
2. **Keyword Phase 1** — semantic/vector search deferred with explicit UX contract  
3. **Results navigate** — never mutate state from search result  
4. **Evidence links** — artifact IDs searchable and copyable  
5. **No search-as-approval** — cannot approve from search results  

---

## Global Search

**Phase 1 scope:** **Deferred** — no omnibar in ERP header Phase 1.

**Phase 1b (locked intent):** Single SearchInput in AOS dashboard or delivery list header searching:
- Engagement title
- Client name (ERP)
- Engagement ID

Results grouped: Engagements → Artifacts (by ID exact match only).

**Reason:** Avoid half-built omnibar; scoped searches cover Phase 1 workflows.

---

## Engagement Search

| Field | Location | Behavior |
|-------|----------|----------|
| **Screen** | ST-02 Delivery List | SearchInput in TableToolbar |
| **Fields matched** | Title, client name, engagement ID | Case-insensitive substring |
| **Debounce** | 300ms | |
| **Min chars** | 2 | |
| **Results** | Filter DataTable in place | |
| **Empty search** | Show all (respect filters) | |
| **No results** | EmptyState: “No engagements match ‘{query}’” + Clear search LinkButton |

---

## Requirement Search

| Scope | ST-05 Requirements tab + ST-12 queue |
| **Fields** | Requirement text, acceptance criteria, set version |
| **Implementation** | Client filter on loaded set Phase 1; server search Phase 2 |
| **No results** | “No requirements match ‘{query}’ in this set” |

Queue ST-12: search filters engagement title/client columns only — not full-text requirement body Phase 1.

---

## Prompt Search

| Scope | ST-07 Prompts tab, ST-13 queue |
| **Fields** | Pack name, artifact title, artifact objective |
| **Queue** | Engagement + client filter via SearchInput |

---

## Registry Search

| Scope | ST-16 Module Registry |
| **Fields** | Module name, module ID, tags/agency type metadata |
| **Ranking (locked Phase 1)** | 1. Exact ID match 2. Name prefix 3. Substring 4. Description |
| **AI natural language** | **Deferred** — show keyword results only; no “AI understood” empty state |

---

## Knowledge Search

| Scope | ST-18 Knowledge Library |
| **Fields** | Pattern title, body, agency type, tags |
| **Ranking** | Same as Registry |
| **Semantic search** | Phase 2 — placeholder section below |

---

## Evaluation Search

| Scope | ST-09 tab, ST-15 queue |
| **Fields** | Evaluation ID, session ID, pass/fail status |
| **Queue filter** | Result status via FilterBar — not full-text |

---

## Cursor Session Search

| Scope | ST-08 tab, ST-14 queue |
| **Fields** | Session ID, artifact name, status |
| **Filter** | Status FilterChip: Active, Awaiting capture, Completed |

---

## Customer Search

| Context | ST-03 Create Engagement — ERP customer Select |
| **Source** | ERP read port only — Sidecar Law |
| **Behavior** | Searchable select, async load, debounce 300ms |
| **Empty** | “No customers found in ERP” + Sidecar “Create in ERP” link |
| **Not** | Duplicate customer CRUD in AOS |

---

## Artifact Search

Exact ID lookup (mono input):

| ID type | Example route on match |
|---------|------------------------|
| Engagement ID | ST-04 |
| Requirement set version ID | ST-05 |
| Prompt pack version ID | ST-07 |
| Session ID | ST-08 |
| Evaluation ID | ST-09 |
| Module ID | ST-17 |

Phase 1: available via dedicated “Search by ID” caption field on queue toolbars Phase 1b — optional.

---

## Future Semantic Search

When enabled (ADR-009 Knowledge Engine):

| Rule | UX |
|------|-----|
| Label | AI search — results may be approximate |
| Display | Same card components — KnowledgeCard, RegistryCard |
| Ranking | Show match explanation in AiExplainBlock |
| Forbidden | Auto-apply module from semantic result |

Must amend this doc + `29_IMPLEMENTATION_CONTRACT` before shipping.

---

## Search Ranking Philosophy

1. **Exact ID > prefix > substring**  
2. **Recency** breaks ties on engagement lists (updated desc)  
3. **Gate urgency** breaks ties on queues (server-sorted AttentionQueue — not client re-rank Phase 1)  
4. **Never rank by story points, priority labels, or AI confidence alone**  

---

## Search Filters

Filters combine with search AND logic:

| Screen | Filters |
|--------|---------|
| Delivery list | Lifecycle, lead, agency type |
| Queues | Gate status, stale only (Cursor/Evaluation) |
| Registry | Agency type, status (stable/experimental/deprecated) |
| Knowledge | Agency type |

FilterChip shows active filters; clear all in FilterBar.

---

## Search UX Rules

- SearchInput leading search icon; trailing clear on non-empty  
- Esc clears when focused  
- Preserve query in URL `?q=` for shareable list views  
- Loading: subtle spinner in input — not full page  
- Accessibility: `aria-label="Search engagements"` etc.  

---

## Empty Search vs No Results

| State | Copy |
|-------|------|
| Empty query | Show full list (filtered) |
| Query < min chars | No fetch; show hint “Type at least 2 characters” |
| No results | “No {entity} match ‘{query}’” + clear action |
| ERP customer empty | “No customers in ERP” — different from no results |

---

## Related Documents

- [21 Screen Templates](./21_SCREEN_TEMPLATES.md)
- [07 Table System](../aos-design-system/07_TABLE_SYSTEM.md)
- [ADR-009 Knowledge Engine](../aos-adr/ADR-009_KNOWLEDGE_ENGINE.md)
