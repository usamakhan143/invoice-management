/**
 * BosMilestone lifecycle states — initiative-defined milestones (not inferred).
 */

export const MILESTONE_STATUS = {
  PLANNED: "planned",
  READY: "ready",
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked",
  COMPLETED: "completed",
  SKIPPED: "skipped",
} as const;

export type MilestoneStatus = (typeof MILESTONE_STATUS)[keyof typeof MILESTONE_STATUS];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  [MILESTONE_STATUS.PLANNED]: "Planned",
  [MILESTONE_STATUS.READY]: "Ready",
  [MILESTONE_STATUS.IN_PROGRESS]: "In Progress",
  [MILESTONE_STATUS.BLOCKED]: "Blocked",
  [MILESTONE_STATUS.COMPLETED]: "Completed",
  [MILESTONE_STATUS.SKIPPED]: "Skipped",
};

export const TERMINAL_MILESTONE_STATUSES: readonly MilestoneStatus[] = [
  MILESTONE_STATUS.COMPLETED,
  MILESTONE_STATUS.SKIPPED,
];
