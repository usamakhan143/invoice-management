# 08 — AOS Integration Points

Potential reuse points for Agency Operating System (AOS) against existing ERP capabilities. **No AOS design — only identification and classification.**

Classification key:
- **Reuse directly** — use as-is, no changes needed
- **Extend** — add fields, permissions, or UI on top of existing module
- **Observe only** — study patterns, don't integrate at runtime
- **Needs abstraction** — works but must be wrapped/refactored before AOS can use cleanly
- **Needs replacement** — current implementation inadequate for AOS needs

---

## Platform Layer

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| Firebase Auth (email/password) | **Reuse directly** | Mature, handles signup/login/impersonation |
| Firestore client SDK | **Reuse directly** | All data lives here; AOS adds collections |
| Company tenancy (`companyId`) | **Reuse directly** | Agency = company; same model |
| HashRouter | **Reuse directly** | AOS routes added alongside ERP routes |
| AppLayout + Sidebar | **Extend** | Add AOS nav group to existing sidebar |
| Lazy loading + Suspense | **Reuse directly** | Pattern works for AOS pages |
| Screen lock (PIN) | **Reuse directly** | Security feature applies to AOS views |
| Offline mode | **Observe only** | Emergency fallback; not primary AOS concern |
| Vite + Tailwind build | **Reuse directly** | Same toolchain |

---

## Authentication & Identity

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| `useAuth` hook + AuthProvider | **Reuse directly** | Profile, impersonation, session |
| TokenService (session tokens) | **Reuse directly** | Multi-device session management |
| UserMonitoringService | **Reuse directly** | Force logout on deactivation |
| Impersonation flow | **Reuse directly** | Admin login-as for support |
| Auto-login tokens | **Needs abstraction** | Works but lacks security rules |
| SignUp (owner provisioning) | **Extend** | May need agency-specific signup fields |
| Screen PIN | **Reuse directly** | Sensitive data protection |

---

## Permissions & Roles

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| Granular permission registry | **Extend** | Add AOS permission keys to `config/permissions.ts` |
| `usePermissions` hook | **Extend** | Add AOS helper functions |
| Custom roles (RoleManagement) | **Extend** | AOS permissions appear in role editor |
| RealTimePermissionService | **Reuse directly** | Live permission sync |
| ProtectedComponent HOC | **Reuse directly** | UI gating |
| Owner bypass | **Reuse directly** | Agency owner gets all AOS perms |
| BOS permission keys (30+ unwired) | **Extend** | Many BOS keys overlap with future AOS needs |

---

## CRM (Leads, Customers, Campaigns)

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| Lead pipeline (New→Won/Lost) | **Consume** | AOS reads lead data; doesn't rebuild CRM |
| Lead → Customer conversion | **Consume** | Conversion logic stays in ERP |
| Customer directory | **Consume** | Client records are ERP-owned |
| Business entities | **Consume** | Sub-entities under customers |
| Campaign + tags | **Observe only** | Tagging pattern useful; campaigns ≠ AOS projects |
| Outreach events timeline | **Consume** | Activity data for agency dashboards |
| Lead import (CSV) | **Reuse directly** | Generic import pipeline |
| Lead assignment | **Consume** | Assignment stays in ERP |
| Duplicate contact detection | **Reuse directly** | Phone/email dedupe utility |
| International phone input | **Reuse directly** | Shared component |

---

## Finance (Invoices, Expenses, Banking)

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| Invoice CRUD + PDF | **Consume** | Client billing stays in ERP |
| Invoice payment tracking | **Consume** | Payment state is ERP truth |
| Mark paid + bank impact | **Consume** | Financial integrity in ERP |
| Product catalog | **Consume** | Service catalog for invoicing |
| Expense tracking | **Consume** | Cost data for project attribution |
| Expense returns/refunds | **Consume** | Financial truth |
| Vendor (payee) directory | **Consume** | Payee data |
| Expense categories | **Consume** | Category taxonomy |
| Bank accounts + balances | **Consume** | Cash management truth |
| Bank transfers | **Consume** | Internal transfers |
| Bank reconciliation | **Consume** | Reconciliation snapshots |
| Bank deposits | **Consume** | Manual deposits |
| Loans + repayments | **Consume** | Loan tracking |
| Balance integrity check | **Reuse directly** | Financial verification utility |
| Multi-currency (USD/PKR/EUR) | **Reuse directly** | Exchange rate utilities |
| Financial reports (8 tabs) | **Extend** | Add AOS-specific report tabs |
| CSV export | **Reuse directly** | Generic export utility |

---

## Team & Operations

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| User management | **Reuse directly** | Team CRUD, activate/deactivate |
| Custom roles | **Extend** | Add AOS permissions |
| Login-as (impersonation) | **Reuse directly** | Support workflow |
| Session management | **Reuse directly** | Device token control |
| Activity logging | **Extend** | Add AOS event types to ActivityLogger |
| Company activity (admin log) | **Extend** | Include AOS events |
| Performance hub | **Extend** | Agency team performance overlays |
| Call activity metrics | **Extend** | Workday-based metrics for agency KPIs |
| Company workday settings | **Extend** | Agency-specific workday config |

---

## Dashboard & Reporting

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| Dashboard stat cards | **Extend** | Add AOS KPI cards |
| DashboardCard component | **Reuse directly** | Card pattern |
| DashboardSection component | **Reuse directly** | Section pattern |
| Lead gen analytics | **Observe only** | Pattern for AOS analytics blocks |
| Invoice verification widget | **Observe only** | Niche ERP feature |
| Reports page (client-side aggregation) | **Needs abstraction** | Works but won't scale; AOS may need server-side aggregation |
| No charting library | **Needs replacement** | AOS likely needs visual analytics |

---

## Data Management

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| Backup export (JSON v5) | **Extend** | Include AOS collections |
| Backup import | **Extend** | Include AOS collections |
| Backup history | **Reuse directly** | Audit trail pattern |
| DatabaseMigrationService | **Extend** | Add AOS collection mappings |
| BOS excluded from backup | **Needs abstraction** | Must fix before AOS launch |

---

## BOS (Strategic Layer)

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| BOS domain architecture | **Extend** | AOS evolves from BOS patterns |
| BOS application services | **Extend** | Add AOS-specific services |
| BOS repository pattern | **Reuse directly** | Persistence abstraction |
| BOS ERP read ports | **Reuse directly** | Cross-module read boundary |
| BOS sidecar law | **Reuse directly** | AOS reads ERP, writes own collections |
| BOS expense attribution | **Reuse directly** | Working end-to-end integration |
| BOS milestone engine | **Extend** | Project milestone patterns for AOS |
| BOS decision timeline | **Extend** | Decision logging for agency ops |
| BOS initiative lifecycle | **Extend** | Initiative = agency project/strategy |
| BOS feature flags (unused) | **Needs abstraction** | Must wire or remove before AOS |
| BOS KPI contracts (no impl) | **Needs replacement** | Defined but not implemented |

---

## UI Components

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| SearchableListSelect | **Reuse directly** | Entity pickers |
| BosModal | **Reuse directly** | Dialog shell |
| BosFormFieldLabel | **Reuse directly** | Form label + tip |
| RowIconButton | **Reuse directly** | Table row actions |
| FieldInfoTip / FloatingFieldTooltip | **Reuse directly** | Form help |
| CampaignTagPill | **Reuse directly** | Tag display |
| Spinner / ErrorBoundary | **Reuse directly** | Loading/error states |
| ProtectedComponent | **Reuse directly** | Permission gating |
| Inline page tables | **Needs abstraction** | No shared DataTable component |
| Monolithic page files | **Needs abstraction** | Business logic not extractable |

---

## Utilities

| ERP Capability | Classification | Rationale |
|----------------|---------------|-----------|
| bosFormat (date/money/field CSS) | **Reuse directly** | Formatting helpers |
| exchangeRates | **Reuse directly** | Multi-currency |
| csvExport / csvStream | **Reuse directly** | Data export |
| screenPin | **Reuse directly** | PIN security |
| internationalPhone | **Reuse directly** | Phone handling |
| expenseCompanyScope | **Reuse directly** | Scope resolution |
| companyId resolution | **Reuse directly** | Tenant scoping |
| localDayKey | **Reuse directly** | Business day keys |
| emailValidation | **Reuse directly** | Input validation |

---

## Not Available (AOS Must Build)

| Capability | Why not in ERP |
|------------|---------------|
| Project management | No project entity exists |
| Task tracking | No task entity |
| Time tracking | Not implemented |
| Resource allocation | Not implemented |
| Client portal | Not implemented |
| Document management (cloud) | Firebase Storage not used |
| Email/notifications | Not implemented |
| API/webhooks | No server-side code |
| Workflow automation | Not implemented |
| Agency-specific billing (retainers, SOWs) | Invoice model is simple (one-off) |
| Team capacity planning | Not implemented |
| Client communication hub | Outreach is lead-focused, not client-focused |
| Server-side aggregation | All reporting is client-side |

---

## Integration Priority Matrix

| Priority | Integration | Action |
|----------|------------|--------|
| P0 | Auth + permissions + tenancy | Reuse directly |
| P0 | Company/user/role management | Reuse directly |
| P0 | BOS sidecar + port pattern | Reuse directly as AOS architecture model |
| P1 | CRM data (leads, customers) | Consume via read ports |
| P1 | Finance data (expenses, invoices) | Consume via read ports (extend BOS adapters) |
| P1 | Activity logging | Extend with AOS event types |
| P2 | Dashboard widgets | Extend with AOS KPIs |
| P2 | Reports | Extend with AOS tabs |
| P2 | Data backup | Extend to include AOS collections |
| P3 | Performance metrics | Extend for agency team KPIs |
| P3 | CSV import/export | Reuse for AOS data import |

---

## Risk Flags

| Risk | Detail |
|------|--------|
| No server-side logic | All business logic is client-side; AOS at scale may need Cloud Functions |
| No shared DataTable | Every page builds its own table; AOS will repeat this unless abstracted |
| Monolithic pages | Hard to extract logic from 3,000-line pages for AOS consumption |
| Feature flags dead code | BOS flags exist but aren't enforced; AOS must not repeat this |
| BOS not in backup | Strategic data excluded from disaster recovery |
| Dual permission registries | ERP + BOS keys in separate files; AOS adds a third namespace risk |
| Client-side reporting | Won't scale for agency-wide analytics across many clients/projects |
