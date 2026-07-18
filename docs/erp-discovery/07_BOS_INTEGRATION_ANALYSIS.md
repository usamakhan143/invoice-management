# 07 — BOS Integration Analysis

How BOS (Business Operating System) currently integrates with the ERP. This documents current state only — no redesign recommendations.

---

## Integration Architecture

BOS uses a **sidecar + read ports** pattern:

```
BOS UI (pages/app/bos/*)
  → Application services (bos/application/*)
      → BOS Firestore repos (writes bos* collections only)
      → ERP read ports (bos/integration/ports/*)
          → Firestore read adapters (bos/integration/adapters/*)
              → ERP collections (read-only)
```

### Core Laws (Enforced in Code)

| Law | Location |
|-----|----------|
| Sidecar — BOS never writes ERP fields | `bos/constants/index.ts` (`SIDECAR_LAW_ERP_COLLECTIONS`) |
| ERP unaware of BOS | No `import …/bos` in ERP pages or services |
| BOS reads via ports only | `bos/integration/index.ts` (`defaultBosErpReadPorts`) |
| Attribution writes go to `bosAttributions` only | `BosAttributionApplicationService.ts` |

**Tenant scoping** reuses ERP's company model via `hooks/useBosScope.ts` → `resolveCompanyIdForUser()`.

---

## BOS Domain Entities

| Entity | File | ERP relationship |
|--------|------|------------------|
| BosVenture | `bos/domain/entities/venture.ts` | Pure BOS; explicitly not ERP `businesses` |
| BosInitiative | `bos/domain/entities/initiative.ts` | Pure BOS; hub for attributions/decisions/milestones |
| BosDecision | `bos/domain/entities/decision.ts` | Pure BOS |
| BosAttribution | `bos/domain/entities/attribution.ts` | Sidecar linking `(sourceType, sourceId)` to initiative |
| BosMilestone | `bos/domain/entities/milestone.ts` | Evidence can store ERP doc IDs but no ERP read on save |
| BosMilestoneTemplate | `bos/domain/entities/milestoneTemplate.ts` | Pure BOS |
| BosMetricDefinition/Snapshot | `bos/domain/entities/kpi.ts` | Domain only; no Firestore repo |

**Forbidden aliases** (`bos/domain/relationships.ts`): venture ≠ business; initiative ≠ campaign/project.

---

## ERP Modules BOS Consumes

### Expenses — FULLY CONNECTED ✅

| Layer | Status | File |
|-------|--------|------|
| Port contract | Complete | `bos/integration/ports/ErpExpenseReadPort.ts` |
| Firestore adapter | Complete | `bos/integration/adapters/FirestoreErpExpenseReadAdapter.ts` |
| Application service | Complete | `BosAttributionApplicationService.listCompanyExpenses()`, `createExpenseAttribution()` |
| Sidecar persistence | Complete | `FirestoreBosAttributionRepository.ts` |
| UI | Complete | `BosInitiativeDetailPage.tsx` — expense picker, investment summary |

**Data consumed:** expenseId, title/description, amount, currency, date/createdAt.

**Flow:** User selects ERP expense → BOS creates `bosAttributions` sidecar doc → investment summary computed from attributed expenses.

---

### Invoices — PARTIALLY CONNECTED ⚠️

| Layer | Status | File |
|-------|--------|------|
| Port contract | Complete | `bos/integration/ports/ErpInvoiceReadPort.ts` |
| Firestore adapter | Complete | `bos/integration/adapters/FirestoreErpInvoiceReadAdapter.ts` |
| Application service | **Missing** | No `createInvoiceAttribution()` method |
| ROI calculation | Partial | `initiativeMilestoneEngine.ts` reads invoice totals directly |
| UI | Partial | Milestone invoice picker from existing attributions only |

**Data consumed:** total/amount, currency, customerName (denormalized on invoice doc).

**Gap:** No invoice picker from live ERP catalog. Invoice attributions only work if sidecar records already exist. `initiativeMilestoneEngine.ts` bypasses application layer and calls adapter directly.

---

### Leads — PORT ONLY, NOT CONSUMED ❌

| Layer | Status |
|-------|--------|
| Port + adapter | Implemented (`ErpLeadReadPort`, `FirestoreErpLeadReadAdapter`) |
| Application service | Missing |
| Runtime usage | **None** — adapter never imported outside integration index |
| Domain hooks | `attributionSourceType.LEAD`, milestone evidence type `lead` defined |
| UI | Lead count from sidecar only (no ERP read) |

---

### Reports — PORT ONLY, NOT CONSUMED ❌

| Layer | Status |
|-------|--------|
| Port + adapter | Implemented (`ErpReportReadPort`, `FirestoreErpReportReadAdapter`) |
| Runtime usage | **None** |
| ERP ReportsPage enrichment | **Not implemented** |

---

### Customers / Businesses / Campaigns — NO INTEGRATION ❌

| Module | Status |
|--------|--------|
| Customers | No port; invoice adapter reads denormalized `customerName` only |
| Businesses | Listed in sidecar law only |
| Campaigns | Listed in sidecar law only; BOS forbids initiative = campaign |

---

## Integration Completeness Matrix

| Integration | Infrastructure | App layer | UI | ERP reverse awareness |
|-------------|---------------|-----------|-----|----------------------|
| Expense attribution | ✅ Complete | ✅ Complete | ✅ Complete | None |
| Expense investment summary | ✅ Complete | ✅ Complete | ✅ Complete | None |
| Invoice ROI read | ✅ Complete | ❌ Missing | ⚠️ Partial | None |
| Invoice attribution create | Port only | ❌ Missing | ❌ Missing | None |
| Lead attribution | Port only | ❌ Missing | ❌ Missing | None |
| Report aggregates | Port only | ❌ Missing | ❌ Missing | None |
| Customers/businesses/campaigns | Sidecar law | ❌ Missing | ❌ Missing | None |
| KPI snapshots | Contracts only | ❌ Missing | ❌ Missing | None |
| ActivityLogger (bos_* types) | Constants only | ❌ Not wired | N/A | None |
| Feature flags | Defined | ❌ Not enforced | Routes always active | N/A |

---

## ERP → BOS Direction

**Zero reverse integration.** ERP pages contain no BOS imports:

- `ExpensesPage.tsx` — no BOS references
- `ReportsPage.tsx` — no BOS enrichment
- `LeadsPage.tsx`, `InvoicesPage.tsx`, `CustomersPage.tsx` — no BOS references
- All `services/*.ts` — no BOS imports

---

## BOS Application Services

| Service | ERP touch? |
|---------|-----------|
| BosVentureApplicationService | No |
| BosInitiativeApplicationService | No |
| BosDecisionApplicationService | No |
| BosMilestoneApplicationService | No (evidence stores IDs only) |
| BosMilestoneTemplateApplicationService | No |
| **BosAttributionApplicationService** | **Yes — ErpExpenseReadPort only** |

---

## BOS Permissions

### Wired (12 keys in Role Management UI)

| Key | Helper |
|-----|--------|
| `bos_ventures_view/manage` | `canViewBosVentures` / `canManageBosVentures` |
| `bos_initiatives_view/manage` | `canViewBosInitiatives` / `canManageBosInitiatives` |
| `bos_decisions_view/manage` | `canViewBosDecisions` / `canManageBosDecisions` |
| `bos_attributions_view/manage` | `canViewBosAttributions` / `canManageBosAttributions` |
| `bos_milestones_view/manage` | `canViewBosMilestones` / `canManageBosMilestones` |
| `bos_milestone_templates_view/manage` | `canViewBosMilestoneTemplates` / `canManageBosMilestoneTemplates` |

**Module access:** `canAccessBosModule()` — true if any view/manage check passes.

### Defined but NOT wired

~30+ additional keys in `bos/constants/permissionKeys.ts`: portfolio, KPIs, channels, goals, experiments, campaign links, funnel events, lessons, admin, etc.

### Feature Flags

`bos/config/featureFlags.ts` defines flags (`ATTRIBUTION_INTEGRATION`, `ERP_EXPENSE_READ`, etc.) with most defaults `false`. **`isBosFeatureEnabled()` is never called** from pages or services — integration runs unconditionally when permissions allow.

---

## BOS Routes

**Wired in App.tsx:**
- `/bos` → redirect `/bos/initiatives`
- `/bos/ventures`, `/bos/initiatives`, `/bos/initiatives/:initiativeId`, `/bos/milestone-templates`

**Defined but NOT wired:**
- `/bos/decisions`, `/bos/attributions`, `/bos/reports` (in `bos/config/routes.ts`)

---

## Layer Compliance Notes

| Intended | Actual |
|----------|--------|
| UI → application services → ports | ✅ For expenses |
| UI → application services → ports | ❌ `initiativeMilestoneEngine.ts` calls invoice adapter directly from UI layer |
| Feature flags gate integration | ❌ Flags defined but not enforced |
| BOS in backup flow | ❌ BOS collections excluded from `DatabaseMigrationService` |

---

## BOS Phase Status (from code evidence)

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1A | Ventures, initiatives, decisions, milestones | Implemented with UI |
| Phase 1B | Expense attributions (expense + manual source types) | Implemented |
| Phase 1B | Invoice/lead/report attributions | Ports only |
| Future | KPI snapshots, BOS reports page, portfolio view | Contracts/keys only |
| Future | Channels, goals, experiments | Permission keys only |

See `pages/app/bos/initiativeDetail/PHASE_1_FROZEN.md` for Phase 1 freeze marker on initiative detail.

---

## Key Takeaways for AOS

1. **BOS proves the sidecar pattern works** — expense attribution is end-to-end without ERP modification
2. **Port/adapter architecture is ready** for additional ERP reads (leads, invoices, reports)
3. **Application service layer is incomplete** — UI sometimes bypasses it
4. **Feature flags exist but are dead code** — no runtime gating
5. **BOS is architecturally the model** AOS should follow for its own domain layer
6. **ERP remains the financial and CRM truth** — BOS/AOS should consume, not duplicate
