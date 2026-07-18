# 04 — Component Library

**Stage D1 — AOS Design System**  
Master catalog and specification schema.

---

## Component Specification Schema

Every component documented in files 05–15 **must** include these sections:

1. **Purpose** — why it exists  
2. **Responsibilities** — what it does / does not do  
3. **Allowed Usage** — where it may appear  
4. **Forbidden Usage** — ADR-012 and UX violations  
5. **States** — default, hover, focus, active  
6. **Loading** — skeleton/spinner behavior  
7. **Empty** — when no data  
8. **Disabled** — visual + no interaction  
9. **Permission Locked** — see [17](./17_PERMISSION_AND_FEATURE_FLAG_UI.md)  
10. **Feature Flag Locked** — hidden vs disabled  
11. **Success / Warning / Error** — semantic variants  
12. **AI Generated** — draft labeling  
13. **Human Approved** — immutable labeling  
14. **Sizing Rules** — sm / md / lg  
15. **Spacing Rules** — internal/external tokens  
16. **Typography Rules** — token mapping  
17. **Icons** — which, placement  
18. **Interaction Rules** — click, keyboard  
19. **Accessibility** — role, label, focus  
20. **Examples** — narrative (no wireframes)  
21. **Anti-patterns** — common mistakes  
22. **Future Extension Notes** — optional evolution  

---

## Component Catalog

### Foundation (05–08)

| ID | Component | Doc |
|----|-----------|-----|
| C-001 | Button | [05](./05_BUTTON_SYSTEM.md) |
| C-002 | IconButton | [05](./05_BUTTON_SYSTEM.md) |
| C-003 | ButtonGroup | [05](./05_BUTTON_SYSTEM.md) |
| C-004 | LinkButton | [05](./05_BUTTON_SYSTEM.md) |
| C-005 | FormField | [06](./06_FORM_SYSTEM.md) |
| C-006 | TextInput | [06](./06_FORM_SYSTEM.md) |
| C-007 | TextArea | [06](./06_FORM_SYSTEM.md) |
| C-008 | Select | [06](./06_FORM_SYSTEM.md) |
| C-009 | SearchInput | [06](./06_FORM_SYSTEM.md) |
| C-010 | Checkbox / Radio / Switch | [06](./06_FORM_SYSTEM.md) |
| C-011 | FormSection | [06](./06_FORM_SYSTEM.md) |
| C-012 | DataTable | [07](./07_TABLE_SYSTEM.md) |
| C-013 | TableToolbar | [07](./07_TABLE_SYSTEM.md) |
| C-014 | FilterBar | [07](./07_TABLE_SYSTEM.md) |
| C-015 | FilterChip | [07](./07_TABLE_SYSTEM.md) |
| C-016 | Pagination | [07](./07_TABLE_SYSTEM.md) |
| C-017 | Card | [08](./08_CARD_SYSTEM.md) |
| C-018 | CardHeader / Body / Footer | [08](./08_CARD_SYSTEM.md) |

### Dashboard & Decision (09, 12)

| ID | Component | Doc |
|----|-----------|-----|
| C-020 | AttentionQueue | [09](./09_AI_COMPONENTS.md) |
| C-021 | AttentionItem | [09](./09_AI_COMPONENTS.md) |
| C-022 | NextBestActionCard | [12](./12_ENGAGEMENT_COMPONENTS.md) |
| C-023 | WaitingStatePanel | [12](./12_ENGAGEMENT_COMPONENTS.md) |
| C-024 | RiskPanel | [09](./09_AI_COMPONENTS.md) |

### AI & Approval (09)

| ID | Component | Doc |
|----|-----------|-----|
| C-030 | AiDraftPanel | [09](./09_AI_COMPONENTS.md) |
| C-031 | ApprovalPanel | [09](./09_AI_COMPONENTS.md) |
| C-032 | ContextPanel | [09](./09_AI_COMPONENTS.md) |
| C-033 | EvidencePanel | [09](./09_AI_COMPONENTS.md) |
| C-034 | AiExplainBlock | [09](./09_AI_COMPONENTS.md) |
| C-035 | AiConfidenceIndicator | [09](./09_AI_COMPONENTS.md) |

### Domain Cards (09–12)

| ID | Component | Doc |
|----|-----------|-----|
| C-040 | RequirementCard | [12](./12_ENGAGEMENT_COMPONENTS.md) |
| C-041 | PromptCard | [10](./10_CURSOR_COMPONENTS.md) |
| C-042 | CursorSessionCard | [10](./10_CURSOR_COMPONENTS.md) |
| C-043 | EvaluationCard | [11](./11_EVALUATION_COMPONENTS.md) |
| C-044 | KnowledgeCard | [09](./09_AI_COMPONENTS.md) |
| C-045 | RegistryCard | [12](./12_ENGAGEMENT_COMPONENTS.md) |

### Status & Time (12)

| ID | Component | Doc |
|----|-----------|-----|
| C-050 | LifecycleBadge | [12](./12_ENGAGEMENT_COMPONENTS.md) |
| C-051 | StatusChip | [12](./12_ENGAGEMENT_COMPONENTS.md) |
| C-052 | GateChip | [12](./12_ENGAGEMENT_COMPONENTS.md) |
| C-053 | Timeline | [12](./12_ENGAGEMENT_COMPONENTS.md) |
| C-054 | TimelineEvent | [12](./12_ENGAGEMENT_COMPONENTS.md) |

### Navigation (13)

| ID | Component | Doc |
|----|-----------|-----|
| C-060 | AosNavItem | [13](./13_NAVIGATION_COMPONENTS.md) |
| C-061 | EngagementTabBar | [13](./13_NAVIGATION_COMPONENTS.md) |
| C-062 | Breadcrumb | [13](./13_NAVIGATION_COMPONENTS.md) |
| C-063 | SidePanel | [13](./13_NAVIGATION_COMPONENTS.md) |

### Dialogs & Notifications (14–15)

| ID | Component | Doc |
|----|-----------|-----|
| C-070 | Dialog | [14](./14_DIALOG_PATTERNS.md) |
| C-071 | ConfirmationDialog | [14](./14_DIALOG_PATTERNS.md) |
| C-072 | ApprovalDialog | [14](./14_DIALOG_PATTERNS.md) |
| C-073 | DangerDialog | [14](./14_DIALOG_PATTERNS.md) |
| C-074 | Toast | [15](./15_NOTIFICATION_COMPONENTS.md) |
| C-075 | InAppAlert | [15](./15_NOTIFICATION_COMPONENTS.md) |
| C-076 | NotificationBadge | [15](./15_NOTIFICATION_COMPONENTS.md) |

### Universal States (16)

| ID | Component | Doc |
|----|-----------|-----|
| C-080 | EmptyState | [16](./16_EMPTY_LOADING_ERROR_STATES.md) |
| C-081 | LoadingState | [16](./16_EMPTY_LOADING_ERROR_STATES.md) |
| C-082 | ErrorState | [16](./16_EMPTY_LOADING_ERROR_STATES.md) |
| C-083 | SkeletonBlock | [16](./16_EMPTY_LOADING_ERROR_STATES.md) |

### Access Control (17)

| ID | Component | Doc |
|----|-----------|-----|
| C-090 | PermissionGate | [17](./17_PERMISSION_AND_FEATURE_FLAG_UI.md) |
| C-091 | FeatureFlagGate | [17](./17_PERMISSION_AND_FEATURE_FLAG_UI.md) |
| C-092 | LockedOverlay | [17](./17_PERMISSION_AND_FEATURE_FLAG_UI.md) |

**Total cataloged components: 52**

---

## Composition Rules

1. **One primary Button per PageHeader or StickyFooterBar**
2. **Cards contain at most one ApprovalPanel**
3. **AiDraftPanel always pairs with ApprovalPanel or explicit Approve action**
4. **Tables use compact density in queues; comfortable in engagement detail lists**
5. **LifecycleBadge appears once per engagement header — not per row in same view**

---

## ERP Component Reuse

From `docs/erp-discovery/05_REUSABLE_COMPONENTS.md`:

| ERP component | AOS use |
|---------------|---------|
| `Spinner` | LoadingState fallback |
| `ErrorBoundary` | Page-level errors |
| `SearchableListSelect` | ERP customer picker pattern — wrap with AOS FormField |
| `DashboardSection` | Optional section wrapper — prefer AOS PageHeader |

AOS domain components (C-020+) are **AOS-native** — do not force into ERP table patterns.

---

## Versioning

Design system version **1.0** ships with Stage D1. Component IDs (C-xxx) are stable for traceability in UI implementation tickets.

---

## Related Documents

- Files 05–19 for full component specs
- [20 Final Report](./20_FINAL_DESIGN_SYSTEM_REPORT.md)
