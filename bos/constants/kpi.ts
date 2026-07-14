/**
 * KPI scope — Doc 08 (Initiative / Channel / Business / Portfolio).
 */

export const KPI_SCOPE = {
  INITIATIVE: "initiative",
  CHANNEL: "channel",
  EXPERIMENT: "experiment",
  VENTURE: "venture",
  PORTFOLIO: "portfolio",
} as const;

export type KpiScope = (typeof KPI_SCOPE)[keyof typeof KPI_SCOPE];

export const KPI_SCOPE_LABELS: Record<KpiScope, string> = {
  [KPI_SCOPE.INITIATIVE]: "Initiative",
  [KPI_SCOPE.CHANNEL]: "Channel",
  [KPI_SCOPE.EXPERIMENT]: "Experiment",
  [KPI_SCOPE.VENTURE]: "Venture",
  [KPI_SCOPE.PORTFOLIO]: "Portfolio",
};

/**
 * Canonical KPI keys — Doc 08.
 * Values are stable identifiers for BosMetricDefinition and snapshots.
 */
export const KPI_KEY = {
  TOTAL_INVESTMENT: "total_investment",
  NET_INVESTMENT: "net_investment",
  BUDGET_UTILIZATION: "budget_utilization",
  BURN_RATE: "burn_rate",
  TOTAL_REVENUE: "total_revenue",
  GROSS_ROI: "gross_roi",
  NET_ROI: "net_roi",
  ACTIVE_INITIATIVES: "active_initiatives",
  CPL: "cost_per_lead",
  CAC: "customer_acquisition_cost",
  CLOSE_RATE: "close_rate",
  ATTRIBUTION_COVERAGE: "attribution_coverage",
} as const;

export type KpiKey = (typeof KPI_KEY)[keyof typeof KPI_KEY];

export const KPI_KEY_LABELS: Record<KpiKey, string> = {
  [KPI_KEY.TOTAL_INVESTMENT]: "Total Investment",
  [KPI_KEY.NET_INVESTMENT]: "Net Investment",
  [KPI_KEY.BUDGET_UTILIZATION]: "Budget Utilization",
  [KPI_KEY.BURN_RATE]: "Burn Rate",
  [KPI_KEY.TOTAL_REVENUE]: "Total Revenue",
  [KPI_KEY.GROSS_ROI]: "Gross ROI",
  [KPI_KEY.NET_ROI]: "Net ROI",
  [KPI_KEY.ACTIVE_INITIATIVES]: "Active Initiatives",
  [KPI_KEY.CPL]: "Cost Per Lead",
  [KPI_KEY.CAC]: "Customer Acquisition Cost",
  [KPI_KEY.CLOSE_RATE]: "Close Rate",
  [KPI_KEY.ATTRIBUTION_COVERAGE]: "Attribution Coverage",
};

/** Phase 1A dashboard — counts from BOS entities only (no ERP reads). */
export const PHASE_1A_KPI_KEYS: readonly KpiKey[] = [
  KPI_KEY.ACTIVE_INITIATIVES,
];

/** Phase 1B — investment KPIs after attribution integration. */
export const PHASE_1B_KPI_KEYS: readonly KpiKey[] = [
  KPI_KEY.TOTAL_INVESTMENT,
  KPI_KEY.NET_INVESTMENT,
  KPI_KEY.BUDGET_UTILIZATION,
  KPI_KEY.ATTRIBUTION_COVERAGE,
];

export const METRIC_DEFINITION_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  DEPRECATED: "deprecated",
} as const;

export type MetricDefinitionStatus =
  (typeof METRIC_DEFINITION_STATUS)[keyof typeof METRIC_DEFINITION_STATUS];
