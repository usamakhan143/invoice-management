# 05 — Reusable Components

Inventory of existing UI components that AOS could reuse or extend. All paths relative to repository root.

---

## Layout & Shell

| Component | Path | Purpose | Reuse potential |
|-----------|------|---------|-----------------|
| `Sidebar` | `components/Sidebar.tsx` (~687 lines) | Main navigation with permission-gated items, nested groups, profile icon, screen lock | **Extend** — add AOS nav group |
| `AppLayout` | `layouts/AppLayout.tsx` | Page shell with sidebar + footer + impersonation banner | **Reuse directly** |
| `AuthLayout` | `layouts/AuthLayout.tsx` | Auth page wrapper | **Reuse directly** |
| `DashboardSection` | `components/DashboardSection.tsx` | Section header with title + optional action | **Reuse directly** |
| `DashboardCard` | `components/DashboardCard.tsx` | Stat card with label, value, trend; includes `DashboardMiniStat` | **Reuse directly** |
| `Spinner` | `components/Spinner.tsx` | Loading indicator (used in Suspense fallback) | **Reuse directly** |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | React error boundary | **Reuse directly** |

---

## Forms & Inputs

| Component | Path | Purpose | Reuse potential |
|-----------|------|---------|-----------------|
| `SearchableListSelect` | `components/SearchableListSelect.tsx` (~228 lines) | Generic searchable dropdown with keyboard nav | **Reuse directly** — any entity picker |
| `SearchableLeadOptionSelect` | `components/SearchableLeadOptionSelect.tsx` | Lead-specific searchable select with phone display | **Extend** for AOS entity pickers |
| `InternationalPhoneInput` | `components/InternationalPhoneInput.tsx` | Phone input with country code + validation | **Reuse directly** |
| `FieldInfoTip` | `components/FieldInfoTip.tsx` | Inline info tooltip for form labels | **Reuse directly** |
| `FloatingFieldTooltip` | `components/FloatingFieldTooltip.tsx` | Floating tooltip for field help | **Reuse directly** |
| `BosFormFieldLabel` | `pages/app/bos/BosFormFieldLabel.tsx` | Label + tip pattern used across BOS forms | **Reuse directly** |
| `BosModal` | `pages/app/bos/initiativeDetail/BosModal.tsx` | Modal shell for BOS dialogs | **Reuse directly** |
| `BosSectionShell` | `pages/app/bos/initiativeDetail/BosSectionShell.tsx` | Section container with anchor ID | **Reuse directly** |

**Shared field CSS:** `BOS_FIELD_CLASS` in `utils/bosFormat.ts` — standard input styling used across ERP and BOS.

---

## Tables & Lists

No dedicated generic data-table component exists. Tables are **inline in page files** with repeated patterns:

- Sortable column headers
- Row action buttons via `RowIconButton`
- Bulk select + delete
- Pagination (client-side in most pages)
- Filter bars (status, date, creator)

**Closest reusable pieces:**

| Component | Path | Purpose |
|-----------|------|---------|
| `RowIconButton` | `components/RowIconButton.tsx` | Icon buttons for table rows (Edit, Delete, Return, Receive, History, View) |
| `CampaignTagPill` | `components/CampaignTagPill.tsx` | Colored tag pill with `tagPillClass()` helper |

**Gap for AOS:** A shared `<DataTable>` component does not exist. AOS would benefit from extracting one.

---

## Filters & Search

Filter patterns are page-local, not componentized. Common patterns found:

- Date range presets (month/quarter/year/custom) — `ReportsPage.tsx`
- Status dropdown filters — `LeadsPage.tsx`, `InvoicesListPage.tsx`
- Creator/assignee filters — multiple pages
- Search input with debounce — `CustomersPage.tsx`, `LeadsPage.tsx`

**Reusable utility:** `utils/leadSearchPhone.ts` — phone-based lead search normalization.

---

## Dialogs & Modals

| Component | Path | Purpose | Reuse potential |
|-----------|------|---------|-----------------|
| `PaymentTrackingModal` | `components/PaymentTrackingModal.tsx` (~457 lines) | Invoice payment recording with bank account selection | **Observe** — payment modal pattern |
| `AgentWorkspaceModals` | `components/leads/AgentWorkspaceModals.tsx` (~1,165 lines) | Lead quick-action modals (call, note, status change) | **Observe** — workspace modal pattern |
| `BosModal` | `pages/app/bos/initiativeDetail/BosModal.tsx` | Generic modal wrapper | **Reuse directly** |
| `BosMilestoneCompleteModal` | `pages/app/bos/initiativeDetail/BosMilestoneCompleteModal.tsx` (~752 lines) | Multi-step completion form | **Observe** — wizard modal pattern |
| `BosMilestoneForm` | `pages/app/bos/initiativeDetail/BosMilestoneForm.tsx` (~707 lines) | Full milestone create/edit form | **Observe** — complex form pattern |

---

## Finance Components

| Component | Path | Purpose | Reuse potential |
|-----------|------|---------|-----------------|
| `InvoicePDF` | `components/InvoicePDF.tsx` (~332 lines) | React-PDF invoice document | **Reuse directly** |
| `PDFDownloadWrapper` | `components/PDFDownloadWrapper.tsx` | PDF download trigger + generation | **Reuse directly** |
| `InvoiceVerificationSection` | `components/InvoiceVerificationSection.tsx` (~314 lines) | Invoice auth code verification widget | **Reuse directly** |
| `DataBackupManager` | `components/DataBackupManager.tsx` (~575 lines) | Backup export/import UI with progress | **Extend** for AOS data |

---

## CRM Components

| Component | Path | Purpose | Reuse potential |
|-----------|------|---------|-----------------|
| `CampaignTagPill` | `components/CampaignTagPill.tsx` | Colored campaign tag with color options | **Reuse directly** |
| `DuplicateContactTip` | `components/DuplicateContactTip.tsx` | Warning when duplicate phone/email detected | **Reuse directly** |
| `LeadPitchReadyIcon` | `components/LeadPitchReadyIcon.tsx` | Icon indicating lead has pitch notes | **Observe** |
| `OutreachEventAdminControls` | `components/leads/OutreachEventAdminControls.tsx` | Admin controls on outreach events | **Observe** |
| `CallLogAdminControls` | `components/leads/CallLogAdminControls.tsx` | Legacy call log admin controls | **Observe** (legacy) |

---

## Dashboard Widgets

| Component | Path | Purpose | Reuse potential |
|-----------|------|---------|-----------------|
| `DashboardCallActivityMonitor` | `components/dashboard/DashboardCallActivityMonitor.tsx` (~244 lines) | Call activity summary widget | **Extend** |
| `LeadAssignmentDailyReport` | `components/dashboard/LeadAssignmentDailyReport.tsx` (~307 lines) | Daily assignment report table | **Extend** |
| `AgentPerformanceReport` | `components/dashboard/AgentPerformanceReport.tsx` (~617 lines) | Agent performance metrics | **Extend** |
| `MyTodayCallActivity` | `components/dashboard/MyTodayCallActivity.tsx` (~488 lines) | Personal call activity for today | **Extend** |
| `AgentWorkspaceHero` | `components/dashboard/AgentWorkspaceHero.tsx` | Hero section for agent workspace | **Extend** |

---

## Admin Components

| Component | Path | Purpose | Reuse potential |
|-----------|------|---------|-----------------|
| `RoleManagement` | `components/RoleManagement.tsx` (~596 lines) | Custom role CRUD with permission checkboxes | **Extend** — add AOS permissions |
| `CompanyAnalyticsTable` | `components/admin/CompanyAnalyticsTable.tsx` (~498 lines) | Cross-company analytics table | **Observe** |
| `SubscriptionPlansManager` | `components/admin/SubscriptionPlansManager.tsx` (~579 lines) | Platform subscription plan CRUD | **Observe** |
| `BillingOverview` | `components/admin/BillingOverview.tsx` (~487 lines) | Platform billing dashboard | **Observe** |
| `PlatformMetricsCards` | `components/admin/PlatformMetricsCards.tsx` (~285 lines) | Platform KPI cards | **Observe** |

---

## Security & Access Components

| Component | Path | Purpose | Reuse potential |
|-----------|------|---------|-----------------|
| `ProtectedComponent` | `components/ProtectedComponent.tsx` | Permission-gated UI wrapper + `withPageProtection` HOC | **Reuse directly** |
| `ImpersonationBanner` | `components/ImpersonationBanner.tsx` | Banner during admin impersonation | **Reuse directly** |
| `ConnectionStatus` | `components/ConnectionStatus.tsx` (~134 lines) | Firebase connection status indicator | **Reuse directly** |
| `NetworkStatus` | `components/NetworkStatus.tsx` | Network connectivity indicator | **Reuse directly** |
| `OfflineModeIndicator` | `components/OfflineModeIndicator.tsx` | Emergency offline mode banner | **Reuse directly** |
| `BosAccessDenied` | `pages/app/bos/BosAccessDenied.tsx` | BOS permission denied page | **Reuse directly** |

---

## BOS-Specific Components (initiativeDetail/)

| Component | Path | Purpose |
|-----------|------|---------|
| `BosInitiativeHero` | `initiativeDetail/BosInitiativeHero.tsx` | Initiative header with metrics |
| `BosMilestoneList` | `initiativeDetail/BosMilestoneList.tsx` (~715 lines) | Milestone cards with actions |
| `BosCurrentSituationCard` | `initiativeDetail/BosCurrentSituationCard.tsx` | Current situation facts |
| `BosDecisionTimeline` | `initiativeDetail/BosDecisionTimeline.tsx` | Decision history timeline |
| `BosInitiativeBusinessTimeline` | `initiativeDetail/BosInitiativeBusinessTimeline.tsx` | Business event timeline |
| `BosInitiativeExecutionHistory` | `initiativeDetail/BosInitiativeExecutionHistory.tsx` | Execution history events |
| `BosHypothesisCard` | `initiativeDetail/BosHypothesisCard.tsx` | Initiative hypothesis display |
| `BosMilestoneDraftEditor` | `initiativeDetail/BosMilestoneDraftEditor.tsx` | Template step editor |
| `initiativeMilestoneEngine` | `initiativeDetail/initiativeMilestoneEngine.ts` | Business facts, ROI, timeline builder |

**Button styles:** `initiativeDetail/bosButtonClasses.ts` — shared BOS button CSS classes.

---

## Charts & Visualization

**No charting library is installed.** All metrics are displayed as:
- Stat cards (`DashboardCard`)
- HTML tables (inline in pages)
- Text-based timelines (BOS decision/business timelines)
- Progress indicators (text percentages)

**Gap for AOS:** If AOS needs charts/graphs, a charting library must be added.

---

## Upload & Import

| Component/Utility | Path | Purpose |
|-------------------|------|---------|
| Lead CSV import | `pages/app/LeadImportPage.tsx` + `services/leadImportService.ts` | Full CSV import wizard |
| CSV export | `utils/csvExport.ts`, `utils/csvStream.ts` | Report CSV export |
| File input pattern | Inline in BOS milestone completion modal | Evidence file upload (local only, not cloud storage) |
| Data backup | `components/DataBackupManager.tsx` | JSON export/import |

**No cloud file storage integration** (Firebase Storage not used). File uploads in BOS are client-side only.

---

## Component Architecture Summary

| Category | Count | Reusable as-is | Needs extraction |
|----------|-------|----------------|------------------|
| Layout/Shell | 7 | 7 | 0 |
| Forms/Inputs | 8 | 6 | 0 |
| Tables | 0 (inline) | 0 | **DataTable needed** |
| Modals | 5 | 2 | 0 |
| Finance | 4 | 4 | 0 |
| CRM | 5 | 3 | 0 |
| Dashboard widgets | 5 | 0 | 5 (extend) |
| Admin | 5 | 0 | 1 (RoleManagement) |
| Security | 6 | 6 | 0 |
| BOS-specific | 10+ | 5 | 0 |
| Charts | 0 | 0 | **Library needed** |

**Key finding:** The ERP has strong **atomic components** (inputs, buttons, cards, modals) but lacks **composite patterns** (data tables, filter bars, form wizards) as shared abstractions. Most composite UI lives inside monolithic page files.
