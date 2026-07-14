/** Founder-assessed outcome when a milestone is completed. */
export const MILESTONE_RESULT = {
  EXCEEDED_EXPECTATIONS: "exceeded_expectations",
  COMPLETED_SUCCESSFULLY: "completed_successfully",
  COMPLETED_WITH_ISSUES: "completed_with_issues",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type MilestoneResult = (typeof MILESTONE_RESULT)[keyof typeof MILESTONE_RESULT];

export const MILESTONE_RESULT_LABELS: Record<MilestoneResult, string> = {
  [MILESTONE_RESULT.EXCEEDED_EXPECTATIONS]: "Exceeded Expectations",
  [MILESTONE_RESULT.COMPLETED_SUCCESSFULLY]: "Completed Successfully",
  [MILESTONE_RESULT.COMPLETED_WITH_ISSUES]: "Completed With Issues",
  [MILESTONE_RESULT.FAILED]: "Failed",
  [MILESTONE_RESULT.CANCELLED]: "Cancelled",
};

const VALID = new Set<string>(Object.values(MILESTONE_RESULT));

export function isMilestoneResult(value: unknown): value is MilestoneResult {
  return typeof value === "string" && VALID.has(value);
}
