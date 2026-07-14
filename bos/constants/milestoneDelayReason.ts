/** Why a milestone completed after its target date. */
export const MILESTONE_DELAY_REASON = {
  INTERNAL: "internal",
  CLIENT: "client",
  VENDOR: "vendor",
  BUDGET: "budget",
  TECHNICAL: "technical",
  LEGAL: "legal",
  OTHER: "other",
} as const;

export type MilestoneDelayReason =
  (typeof MILESTONE_DELAY_REASON)[keyof typeof MILESTONE_DELAY_REASON];

export const MILESTONE_DELAY_REASON_LABELS: Record<MilestoneDelayReason, string> = {
  [MILESTONE_DELAY_REASON.INTERNAL]: "Internal",
  [MILESTONE_DELAY_REASON.CLIENT]: "Client",
  [MILESTONE_DELAY_REASON.VENDOR]: "Vendor",
  [MILESTONE_DELAY_REASON.BUDGET]: "Budget",
  [MILESTONE_DELAY_REASON.TECHNICAL]: "Technical",
  [MILESTONE_DELAY_REASON.LEGAL]: "Legal",
  [MILESTONE_DELAY_REASON.OTHER]: "Other",
};

const VALID = new Set<string>(Object.values(MILESTONE_DELAY_REASON));

export function isMilestoneDelayReason(value: unknown): value is MilestoneDelayReason {
  return typeof value === "string" && VALID.has(value);
}
