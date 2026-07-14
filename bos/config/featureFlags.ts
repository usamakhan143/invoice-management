/**
 * BOS feature flags — toggle integration surfaces without domain changes.
 * Phase 1A: all ERP integration flags false.
 */

export const BOS_FEATURE_FLAG = {
  /** Phase 1A — standalone BOS module only */
  MODULE_ENABLED: "bos_module_enabled",

  /** Phase 1B — BosAttribution UI and bosAttributions persistence */
  ATTRIBUTION_INTEGRATION: "bos_attribution_integration",

  /** Phase 1B — read ERP expenses for attribution picker (read-only) */
  ERP_EXPENSE_READ: "bos_erp_expense_read",

  /** Phase 1B — BosReportsPage with expense join */
  BOS_REPORTS: "bos_reports",

  /** Optional — enrich ERP ReportsPage column (deferred by default) */
  ERP_REPORTS_COLUMN: "bos_erp_reports_column",

  /** Phase 2+ */
  FUNNEL_EVENTS: "bos_funnel_events",
  INVOICE_ATTRIBUTION: "bos_invoice_attribution",
  METRIC_SNAPSHOTS: "bos_metric_snapshots",
} as const;

export type BosFeatureFlag = (typeof BOS_FEATURE_FLAG)[keyof typeof BOS_FEATURE_FLAG];

export interface BosFeatureFlagDefinition {
  key: BosFeatureFlag;
  label: string;
  defaultEnabled: boolean;
  phase: "1a" | "1b" | "2";
}

export const BOS_FEATURE_FLAG_DEFINITIONS: readonly BosFeatureFlagDefinition[] = [
  {
    key: BOS_FEATURE_FLAG.MODULE_ENABLED,
    label: "BOS module",
    defaultEnabled: true,
    phase: "1a",
  },
  {
    key: BOS_FEATURE_FLAG.ATTRIBUTION_INTEGRATION,
    label: "Attribution integration",
    defaultEnabled: false,
    phase: "1b",
  },
  {
    key: BOS_FEATURE_FLAG.ERP_EXPENSE_READ,
    label: "ERP expense read (attribution picker)",
    defaultEnabled: false,
    phase: "1b",
  },
  {
    key: BOS_FEATURE_FLAG.BOS_REPORTS,
    label: "BOS reports page",
    defaultEnabled: false,
    phase: "1b",
  },
  {
    key: BOS_FEATURE_FLAG.ERP_REPORTS_COLUMN,
    label: "ERP Reports initiative column",
    defaultEnabled: false,
    phase: "1b",
  },
  {
    key: BOS_FEATURE_FLAG.FUNNEL_EVENTS,
    label: "Funnel stage events",
    defaultEnabled: false,
    phase: "2",
  },
  {
    key: BOS_FEATURE_FLAG.INVOICE_ATTRIBUTION,
    label: "Invoice revenue attribution",
    defaultEnabled: false,
    phase: "2",
  },
  {
    key: BOS_FEATURE_FLAG.METRIC_SNAPSHOTS,
    label: "Materialized KPI snapshots",
    defaultEnabled: false,
    phase: "2",
  },
] as const;

/** Runtime defaults for Phase 1A vertical slice (Doc 20). */
export const PHASE_1A_FEATURE_DEFAULTS: Record<BosFeatureFlag, boolean> = {
  [BOS_FEATURE_FLAG.MODULE_ENABLED]: true,
  [BOS_FEATURE_FLAG.ATTRIBUTION_INTEGRATION]: false,
  [BOS_FEATURE_FLAG.ERP_EXPENSE_READ]: false,
  [BOS_FEATURE_FLAG.BOS_REPORTS]: false,
  [BOS_FEATURE_FLAG.ERP_REPORTS_COLUMN]: false,
  [BOS_FEATURE_FLAG.FUNNEL_EVENTS]: false,
  [BOS_FEATURE_FLAG.INVOICE_ATTRIBUTION]: false,
  [BOS_FEATURE_FLAG.METRIC_SNAPSHOTS]: false,
};

export function isBosFeatureEnabled(
  flags: Partial<Record<BosFeatureFlag, boolean>>,
  flag: BosFeatureFlag,
): boolean {
  if (flag in flags && flags[flag] !== undefined) return Boolean(flags[flag]);
  return PHASE_1A_FEATURE_DEFAULTS[flag];
}
