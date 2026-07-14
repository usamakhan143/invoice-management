/**
 * Risk level — optional founder signal for prediction and intelligence.
 */

export const MILESTONE_RISK_LEVEL = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type MilestoneRiskLevel =
  (typeof MILESTONE_RISK_LEVEL)[keyof typeof MILESTONE_RISK_LEVEL];

export const MILESTONE_RISK_LEVEL_LABELS: Record<MilestoneRiskLevel, string> = {
  [MILESTONE_RISK_LEVEL.LOW]: "Low",
  [MILESTONE_RISK_LEVEL.MEDIUM]: "Medium",
  [MILESTONE_RISK_LEVEL.HIGH]: "High",
  [MILESTONE_RISK_LEVEL.CRITICAL]: "Critical",
};

const VALID = new Set<string>(Object.values(MILESTONE_RISK_LEVEL));

export function isMilestoneRiskLevel(value: unknown): value is MilestoneRiskLevel {
  return typeof value === "string" && VALID.has(value);
}
