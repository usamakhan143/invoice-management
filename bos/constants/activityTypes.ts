/**
 * BOS activity types for ERP ActivityLogger integration (Phase 1+).
 * Namespace: bos_* — separate from ERP activity types in types.ts.
 * @see docs/business-operating-system/12_Permission_Matrix.txt
 */

export const BOS_ACTIVITY_TYPE = {
  VENTURE_CREATED: "bos_venture_created",
  VENTURE_UPDATED: "bos_venture_updated",
  VENTURE_STATUS_CHANGED: "bos_venture_status_changed",
  VENTURE_ARCHIVED: "bos_venture_archived",

  INITIATIVE_CREATED: "bos_initiative_created",
  INITIATIVE_UPDATED: "bos_initiative_updated",
  INITIATIVE_STATUS_CHANGED: "bos_initiative_status_changed",
  INITIATIVE_CLOSED: "bos_initiative_closed",

  DECISION_CREATED: "bos_decision_created",
  DECISION_UPDATED: "bos_decision_updated",
  DECISION_STATUS_CHANGED: "bos_decision_status_changed",

  ATTRIBUTION_CREATED: "bos_attribution_created",
  ATTRIBUTION_SUPERSEDED: "bos_attribution_superseded",
  ATTRIBUTION_DISPUTED: "bos_attribution_disputed",
  ATTRIBUTION_VOIDED: "bos_attribution_voided",

  KPI_SNAPSHOT_COMPUTED: "bos_kpi_snapshot_computed",
} as const;

export type BosActivityType = (typeof BOS_ACTIVITY_TYPE)[keyof typeof BOS_ACTIVITY_TYPE];

export const BOS_ACTIVITY_TYPE_LABELS: Record<BosActivityType, string> = {
  [BOS_ACTIVITY_TYPE.VENTURE_CREATED]: "BOS venture created",
  [BOS_ACTIVITY_TYPE.VENTURE_UPDATED]: "BOS venture updated",
  [BOS_ACTIVITY_TYPE.VENTURE_STATUS_CHANGED]: "BOS venture status changed",
  [BOS_ACTIVITY_TYPE.VENTURE_ARCHIVED]: "BOS venture archived",
  [BOS_ACTIVITY_TYPE.INITIATIVE_CREATED]: "BOS initiative created",
  [BOS_ACTIVITY_TYPE.INITIATIVE_UPDATED]: "BOS initiative updated",
  [BOS_ACTIVITY_TYPE.INITIATIVE_STATUS_CHANGED]: "BOS initiative status changed",
  [BOS_ACTIVITY_TYPE.INITIATIVE_CLOSED]: "BOS initiative closed",
  [BOS_ACTIVITY_TYPE.DECISION_CREATED]: "BOS decision created",
  [BOS_ACTIVITY_TYPE.DECISION_UPDATED]: "BOS decision updated",
  [BOS_ACTIVITY_TYPE.DECISION_STATUS_CHANGED]: "BOS decision status changed",
  [BOS_ACTIVITY_TYPE.ATTRIBUTION_CREATED]: "BOS attribution created",
  [BOS_ACTIVITY_TYPE.ATTRIBUTION_SUPERSEDED]: "BOS attribution superseded",
  [BOS_ACTIVITY_TYPE.ATTRIBUTION_DISPUTED]: "BOS attribution disputed",
  [BOS_ACTIVITY_TYPE.ATTRIBUTION_VOIDED]: "BOS attribution voided",
  [BOS_ACTIVITY_TYPE.KPI_SNAPSHOT_COMPUTED]: "BOS KPI snapshot computed",
};

/** Phase 1A — audit events before attribution exists. */
export const PHASE_1A_ACTIVITY_TYPES: readonly BosActivityType[] = [
  BOS_ACTIVITY_TYPE.VENTURE_CREATED,
  BOS_ACTIVITY_TYPE.VENTURE_UPDATED,
  BOS_ACTIVITY_TYPE.VENTURE_STATUS_CHANGED,
  BOS_ACTIVITY_TYPE.VENTURE_ARCHIVED,
  BOS_ACTIVITY_TYPE.INITIATIVE_CREATED,
  BOS_ACTIVITY_TYPE.INITIATIVE_UPDATED,
  BOS_ACTIVITY_TYPE.INITIATIVE_STATUS_CHANGED,
  BOS_ACTIVITY_TYPE.INITIATIVE_CLOSED,
  BOS_ACTIVITY_TYPE.DECISION_CREATED,
  BOS_ACTIVITY_TYPE.DECISION_UPDATED,
  BOS_ACTIVITY_TYPE.DECISION_STATUS_CHANGED,
];
