/**
 * Milestone priority — founder-defined planning signal (optional on create).
 */

export const MILESTONE_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type MilestonePriority = (typeof MILESTONE_PRIORITY)[keyof typeof MILESTONE_PRIORITY];

export const MILESTONE_PRIORITY_LABELS: Record<MilestonePriority, string> = {
  [MILESTONE_PRIORITY.LOW]: "Low",
  [MILESTONE_PRIORITY.MEDIUM]: "Medium",
  [MILESTONE_PRIORITY.HIGH]: "High",
  [MILESTONE_PRIORITY.CRITICAL]: "Critical",
};

const VALID = new Set<string>(Object.values(MILESTONE_PRIORITY));

export function isMilestonePriority(value: unknown): value is MilestonePriority {
  return typeof value === "string" && VALID.has(value);
}
