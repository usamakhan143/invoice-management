/**
 * Evaluation lifecycle status — frozen domain model §05.
 * @see docs/aos-domain-model/05_EVALUATION_DOMAIN.md
 */

export const EVALUATION_STATUS = {
  PENDING: "pending",
  SCORED: "scored",
  CONFIRMED: "confirmed",
  OVERRIDDEN: "overridden",
} as const;

export type EvaluationStatus =
  (typeof EVALUATION_STATUS)[keyof typeof EVALUATION_STATUS];

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  [EVALUATION_STATUS.PENDING]: "Pending",
  [EVALUATION_STATUS.SCORED]: "Scored",
  [EVALUATION_STATUS.CONFIRMED]: "Confirmed",
  [EVALUATION_STATUS.OVERRIDDEN]: "Overridden",
};

export const TERMINAL_EVALUATION_STATUSES: readonly EvaluationStatus[] = [
  EVALUATION_STATUS.CONFIRMED,
  EVALUATION_STATUS.OVERRIDDEN,
];
