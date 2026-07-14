/**
 * BOS permission keys — Doc 12 canonical namespace (bos_*).
 * ERP permissions remain in config/permissions.ts — never merge namespaces.
 */

export const BOS_PERMISSION_KEY = {
  // Portfolio & ventures
  PORTFOLIO_VIEW: "bos_portfolio_view",
  VENTURES_VIEW: "bos_ventures_view",
  VENTURES_MANAGE: "bos_ventures_manage",
  BUSINESS_MODELS_VIEW: "bos_business_models_view",
  BUSINESS_MODELS_MANAGE: "bos_business_models_manage",

  // Strategy
  INITIATIVES_VIEW: "bos_initiatives_view",
  INITIATIVES_MANAGE: "bos_initiatives_manage",
  CHANNELS_VIEW: "bos_channels_view",
  CHANNELS_MANAGE: "bos_channels_manage",
  COST_CENTERS_VIEW: "bos_cost_centers_view",
  COST_CENTERS_MANAGE: "bos_cost_centers_manage",
  GOALS_VIEW: "bos_goals_view",
  GOALS_MANAGE: "bos_goals_manage",

  // Execution (Phase 2+)
  EXPERIMENTS_VIEW: "bos_experiments_view",
  EXPERIMENTS_MANAGE: "bos_experiments_manage",
  CAMPAIGN_LINKS_VIEW: "bos_campaign_links_view",
  CAMPAIGN_LINKS_MANAGE: "bos_campaign_links_manage",

  // Attribution (Phase 1B+)
  ATTRIBUTIONS_VIEW: "bos_attributions_view",
  ATTRIBUTIONS_MANAGE: "bos_attributions_manage",
  ATTRIBUTIONS_VOID: "bos_attributions_void",
  FUNNEL_EVENTS_VIEW: "bos_funnel_events_view",
  FUNNEL_EVENTS_MANAGE: "bos_funnel_events_manage",

  // Measurement
  KPIS_VIEW: "bos_kpis_view",
  KPIS_EXPORT: "bos_kpis_export",
  METRICS_DEFINITIONS_VIEW: "bos_metrics_definitions_view",
  METRICS_DEFINITIONS_MANAGE: "bos_metrics_definitions_manage",

  // Intelligence
  DECISIONS_VIEW: "bos_decisions_view",
  DECISIONS_MANAGE: "bos_decisions_manage",
  DECISIONS_SUPERSEDE: "bos_decisions_supersede",
  MILESTONES_VIEW: "bos_milestones_view",
  MILESTONES_MANAGE: "bos_milestones_manage",
  MILESTONE_TEMPLATES_VIEW: "bos_milestone_templates_view",
  MILESTONE_TEMPLATES_MANAGE: "bos_milestone_templates_manage",
  LESSONS_VIEW: "bos_lessons_view",
  LESSONS_MANAGE: "bos_lessons_manage",

  // Admin
  ADMIN: "bos_admin",
} as const;

export type BosPermissionKey = (typeof BOS_PERMISSION_KEY)[keyof typeof BOS_PERMISSION_KEY];

export const BOS_PERMISSION_CATEGORY = {
  PORTFOLIO: "bos-portfolio",
  STRATEGY: "bos-strategy",
  ATTRIBUTION: "bos-attribution",
  MEASUREMENT: "bos-measurement",
  INTELLIGENCE: "bos-intelligence",
  ADMIN: "bos-admin",
} as const;

export type BosPermissionCategory =
  (typeof BOS_PERMISSION_CATEGORY)[keyof typeof BOS_PERMISSION_CATEGORY];

export interface BosPermissionDefinition {
  key: BosPermissionKey;
  label: string;
  description: string;
  category: BosPermissionCategory;
  phase: "1a" | "1b" | "2" | "3";
}
