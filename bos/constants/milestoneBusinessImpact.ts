/**
 * Business impact — strategic importance, separate from execution priority.
 */

export const MILESTONE_BUSINESS_IMPACT = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type MilestoneBusinessImpact =
  (typeof MILESTONE_BUSINESS_IMPACT)[keyof typeof MILESTONE_BUSINESS_IMPACT];

export const MILESTONE_BUSINESS_IMPACT_LABELS: Record<MilestoneBusinessImpact, string> = {
  [MILESTONE_BUSINESS_IMPACT.LOW]: "Low",
  [MILESTONE_BUSINESS_IMPACT.MEDIUM]: "Medium",
  [MILESTONE_BUSINESS_IMPACT.HIGH]: "High",
  [MILESTONE_BUSINESS_IMPACT.CRITICAL]: "Critical",
};

const VALID = new Set<string>(Object.values(MILESTONE_BUSINESS_IMPACT));

export function isMilestoneBusinessImpact(value: unknown): value is MilestoneBusinessImpact {
  return typeof value === "string" && VALID.has(value);
}
