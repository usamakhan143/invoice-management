/**
 * BosAttribution lifecycle states — Doc 11 §5.
 */

export const ATTRIBUTION_STATUS = {
  ACTIVE: "active",
  SUPERSEDED: "superseded",
  DISPUTED: "disputed",
  VOID: "void",
} as const;

export type AttributionStatus = (typeof ATTRIBUTION_STATUS)[keyof typeof ATTRIBUTION_STATUS];

export const ATTRIBUTION_STATUS_LABELS: Record<AttributionStatus, string> = {
  [ATTRIBUTION_STATUS.ACTIVE]: "Active",
  [ATTRIBUTION_STATUS.SUPERSEDED]: "Superseded",
  [ATTRIBUTION_STATUS.DISPUTED]: "Disputed",
  [ATTRIBUTION_STATUS.VOID]: "Void",
};

/** Count toward KPI numerators (Doc 11 — DISPUTED excluded until resolved). */
export const KPI_ELIGIBLE_ATTRIBUTION_STATUSES: readonly AttributionStatus[] = [
  ATTRIBUTION_STATUS.ACTIVE,
];

export const TERMINAL_ATTRIBUTION_STATUSES: readonly AttributionStatus[] = [
  ATTRIBUTION_STATUS.SUPERSEDED,
  ATTRIBUTION_STATUS.VOID,
];
