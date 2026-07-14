/** Root cause when a milestone result is Failed or Cancelled. */
export const MILESTONE_FAILURE_ROOT_CAUSE = {
  STRATEGY: "strategy",
  CLIENT: "client",
  BUDGET: "budget",
  TECHNICAL: "technical",
  LEGAL: "legal",
  INTERNAL: "internal",
  MARKET: "market",
  OTHER: "other",
} as const;

export type MilestoneFailureRootCause =
  (typeof MILESTONE_FAILURE_ROOT_CAUSE)[keyof typeof MILESTONE_FAILURE_ROOT_CAUSE];

export const MILESTONE_FAILURE_ROOT_CAUSE_LABELS: Record<MilestoneFailureRootCause, string> = {
  [MILESTONE_FAILURE_ROOT_CAUSE.STRATEGY]: "Strategy",
  [MILESTONE_FAILURE_ROOT_CAUSE.CLIENT]: "Client",
  [MILESTONE_FAILURE_ROOT_CAUSE.BUDGET]: "Budget",
  [MILESTONE_FAILURE_ROOT_CAUSE.TECHNICAL]: "Technical",
  [MILESTONE_FAILURE_ROOT_CAUSE.LEGAL]: "Legal",
  [MILESTONE_FAILURE_ROOT_CAUSE.INTERNAL]: "Internal",
  [MILESTONE_FAILURE_ROOT_CAUSE.MARKET]: "Market",
  [MILESTONE_FAILURE_ROOT_CAUSE.OTHER]: "Other",
};

const VALID = new Set<string>(Object.values(MILESTONE_FAILURE_ROOT_CAUSE));

export function isMilestoneFailureRootCause(value: unknown): value is MilestoneFailureRootCause {
  return typeof value === "string" && VALID.has(value);
}
