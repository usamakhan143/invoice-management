/**
 * BosDecision lifecycle states — Doc 11 §7, Doc 13.
 */

export const DECISION_STATUS = {
  PROPOSED: "proposed",
  APPROVED: "approved",
  ACTIVE: "active",
  SUPERSEDED: "superseded",
  REVOKED: "revoked",
  EVALUATED: "evaluated",
} as const;

export type DecisionStatus = (typeof DECISION_STATUS)[keyof typeof DECISION_STATUS];

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  [DECISION_STATUS.PROPOSED]: "Proposed",
  [DECISION_STATUS.APPROVED]: "Approved",
  [DECISION_STATUS.ACTIVE]: "Active",
  [DECISION_STATUS.SUPERSEDED]: "Superseded",
  [DECISION_STATUS.REVOKED]: "Revoked",
  [DECISION_STATUS.EVALUATED]: "Evaluated",
};

export const DECISION_TYPE = {
  STRATEGIC: "strategic",
  BUDGET: "budget",
  PIVOT: "pivot",
  CHANNEL: "channel",
  OPERATIONAL: "operational",
  OTHER: "other",
} as const;

export type DecisionType = (typeof DECISION_TYPE)[keyof typeof DECISION_TYPE];

export const TERMINAL_DECISION_STATUSES: readonly DecisionStatus[] = [
  DECISION_STATUS.SUPERSEDED,
  DECISION_STATUS.REVOKED,
  DECISION_STATUS.EVALUATED,
];
