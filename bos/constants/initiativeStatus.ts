/**
 * BosInitiative lifecycle states — Doc 11 §2.
 */

export const INITIATIVE_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  CLOSED: "closed",
} as const;

export type InitiativeStatus = (typeof INITIATIVE_STATUS)[keyof typeof INITIATIVE_STATUS];

export const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  [INITIATIVE_STATUS.DRAFT]: "Draft",
  [INITIATIVE_STATUS.ACTIVE]: "Active",
  [INITIATIVE_STATUS.PAUSED]: "Paused",
  [INITIATIVE_STATUS.CLOSED]: "Closed",
};

/** Closure outcomes stored on close — not separate FSM states (Doc 11). */
export const INITIATIVE_CLOSURE_OUTCOME = {
  SUCCESS: "success",
  PARTIAL: "partial",
  FAILED: "failed",
  KILLED: "killed",
  PIVOTED: "pivoted",
} as const;

export type InitiativeClosureOutcome =
  (typeof INITIATIVE_CLOSURE_OUTCOME)[keyof typeof INITIATIVE_CLOSURE_OUTCOME];

export const INITIATIVE_CLOSURE_OUTCOME_LABELS: Record<InitiativeClosureOutcome, string> = {
  [INITIATIVE_CLOSURE_OUTCOME.SUCCESS]: "Success",
  [INITIATIVE_CLOSURE_OUTCOME.PARTIAL]: "Partial",
  [INITIATIVE_CLOSURE_OUTCOME.FAILED]: "Failed",
  [INITIATIVE_CLOSURE_OUTCOME.KILLED]: "Killed",
  [INITIATIVE_CLOSURE_OUTCOME.PIVOTED]: "Pivoted",
};

/** Statuses that accept new attributions (Doc 11 §2). */
export const ATTRIBUTION_ELIGIBLE_INITIATIVE_STATUSES: readonly InitiativeStatus[] = [
  INITIATIVE_STATUS.ACTIVE,
  INITIATIVE_STATUS.PAUSED,
];

export const TERMINAL_INITIATIVE_STATUSES: readonly InitiativeStatus[] = [
  INITIATIVE_STATUS.CLOSED,
];
