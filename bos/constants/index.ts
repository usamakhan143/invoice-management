export {
  VENTURE_STATUS,
  VENTURE_STATUS_LABELS,
  TERMINAL_VENTURE_STATUSES,
  type VentureStatus,
} from "./ventureStatus";

export {
  INITIATIVE_STATUS,
  INITIATIVE_STATUS_LABELS,
  INITIATIVE_CLOSURE_OUTCOME,
  INITIATIVE_CLOSURE_OUTCOME_LABELS,
  ATTRIBUTION_ELIGIBLE_INITIATIVE_STATUSES,
  TERMINAL_INITIATIVE_STATUSES,
  type InitiativeStatus,
  type InitiativeClosureOutcome,
} from "./initiativeStatus";

export {
  DECISION_STATUS,
  DECISION_STATUS_LABELS,
  DECISION_TYPE,
  TERMINAL_DECISION_STATUSES,
  type DecisionStatus,
  type DecisionType,
} from "./decisionStatus";

export {
  ATTRIBUTION_STATUS,
  ATTRIBUTION_STATUS_LABELS,
  KPI_ELIGIBLE_ATTRIBUTION_STATUSES,
  TERMINAL_ATTRIBUTION_STATUSES,
  type AttributionStatus,
} from "./attributionStatus";

export {
  ATTRIBUTION_SOURCE_TYPE,
  ATTRIBUTION_SOURCE_TYPE_LABELS,
  PHASE_1B_ATTRIBUTION_SOURCE_TYPES,
  type AttributionSourceType,
} from "./attributionSourceType";

export {
  KPI_SCOPE,
  KPI_SCOPE_LABELS,
  KPI_KEY,
  KPI_KEY_LABELS,
  PHASE_1A_KPI_KEYS,
  PHASE_1B_KPI_KEYS,
  METRIC_DEFINITION_STATUS,
  type KpiScope,
  type KpiKey,
  type MetricDefinitionStatus,
} from "./kpi";

export {
  BOS_ACTIVITY_TYPE,
  BOS_ACTIVITY_TYPE_LABELS,
  PHASE_1A_ACTIVITY_TYPES,
  type BosActivityType,
} from "./activityTypes";

export {
  BOS_PERMISSION_KEY,
  BOS_PERMISSION_CATEGORY,
  type BosPermissionKey,
  type BosPermissionCategory,
  type BosPermissionDefinition,
} from "./permissionKeys";

export {
  MILESTONE_STATUS,
  MILESTONE_STATUS_LABELS,
  TERMINAL_MILESTONE_STATUSES,
  type MilestoneStatus,
} from "./milestoneStatus";

export {
  MILESTONE_PRIORITY,
  MILESTONE_PRIORITY_LABELS,
  type MilestonePriority,
} from "./milestonePriority";

export {
  MILESTONE_PHASE_PRESET,
  MILESTONE_PHASE_PRESET_OPTIONS,
  type MilestonePhasePreset,
} from "./milestonePhasePresets";

export {
  MILESTONE_COMPLETION_REQUIREMENT_KEY,
  MILESTONE_COMPLETION_REQUIREMENT_LABELS,
  EMPTY_MILESTONE_COMPLETION_REQUIREMENTS,
  type MilestoneCompletionRequirementKey,
  type MilestoneCompletionRequirements,
} from "./milestoneCompletionRequirement";

export {
  MILESTONE_EVIDENCE_TYPE,
  MILESTONE_EVIDENCE_TYPE_LABELS,
  type MilestoneEvidenceType,
} from "./milestoneEvidenceType";

export {
  MILESTONE_TEMPLATE_VISIBILITY,
  MILESTONE_TEMPLATE_VISIBILITY_LABELS,
  type MilestoneTemplateVisibility,
} from "./milestoneTemplateVisibility";

export {
  MILESTONE_TYPE_PRESET,
  MILESTONE_TYPE_PRESET_OPTIONS,
  isKnownMilestoneTypePreset,
} from "./milestoneType";

export {
  MILESTONE_DURATION_UNIT,
  MILESTONE_DURATION_UNIT_LABELS,
  type MilestoneDurationUnit,
  isMilestoneDurationUnit,
} from "./milestoneDurationUnit";

export {
  MILESTONE_BUSINESS_IMPACT,
  MILESTONE_BUSINESS_IMPACT_LABELS,
  type MilestoneBusinessImpact,
  isMilestoneBusinessImpact,
} from "./milestoneBusinessImpact";

export {
  MILESTONE_RISK_LEVEL,
  MILESTONE_RISK_LEVEL_LABELS,
  type MilestoneRiskLevel,
  isMilestoneRiskLevel,
} from "./milestoneRiskLevel";

export const BOS_MODULE_NAMESPACE = "bos" as const;

export const BOS_ENTITY_TYPE = {
  VENTURE: "bos_venture",
  INITIATIVE: "bos_initiative",
  DECISION: "bos_decision",
  ATTRIBUTION: "bos_attribution",
  METRIC_DEFINITION: "bos_metric_definition",
  METRIC_SNAPSHOT: "bos_metric_snapshot",
  MILESTONE: "bos_milestone",
  MILESTONE_TEMPLATE: "bos_milestone_template",
} as const;

export type BosEntityType = (typeof BOS_ENTITY_TYPE)[keyof typeof BOS_ENTITY_TYPE];

/** Maximum allocation percent per source when split attributions are enabled. */
export const ATTRIBUTION_MAX_TOTAL_PERCENT = 100;

/** Sidecar law — enforced in domain, not in ERP collections. */
export const SIDECAR_LAW_ERP_COLLECTIONS = [
  "expenses",
  "invoices",
  "leads",
  "businesses",
  "campaigns",
] as const;
