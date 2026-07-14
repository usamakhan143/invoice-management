import type { BosMilestone } from "../bos/domain/entities/milestone";
import type { MilestoneExecutionEventKind } from "../bos/application/milestoneSituation";
import { MILESTONE_STATUS } from "../bos/constants/milestoneStatus";
import { MILESTONE_RESULT } from "../bos/constants/milestoneResult";

/** Founder-facing milestone status — consistent across cards, lists, and history. */
export type MilestoneDisplayStatus =
  | "planning"
  | "in_progress"
  | "blocked"
  | "completed"
  | "skipped"
  | "cancelled";

export const MILESTONE_DISPLAY_STATUS_LABELS: Record<MilestoneDisplayStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  blocked: "Blocked",
  completed: "Completed",
  skipped: "Skipped",
  cancelled: "Cancelled",
};

export function getMilestoneDisplayStatus(milestone: BosMilestone): MilestoneDisplayStatus {
  if (milestone.status === MILESTONE_STATUS.COMPLETED) {
    if (milestone.milestoneResult === MILESTONE_RESULT.CANCELLED) {
      return "cancelled";
    }
    return "completed";
  }
  if (milestone.status === MILESTONE_STATUS.SKIPPED) return "skipped";
  if (milestone.status === MILESTONE_STATUS.BLOCKED) return "blocked";
  if (milestone.status === MILESTONE_STATUS.IN_PROGRESS) return "in_progress";
  return "planning";
}

export function milestoneDisplayStatusBadgeClass(status: MilestoneDisplayStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200";
    case "in_progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200";
    case "blocked":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
    case "skipped":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
    case "cancelled":
      return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200";
    case "planning":
    default:
      return "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200";
  }
}

export function milestoneDisplayStatusDotClass(status: MilestoneDisplayStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500 text-white ring-emerald-500/20";
    case "in_progress":
      return "bg-blue-500 text-white ring-blue-500/20";
    case "blocked":
      return "bg-amber-500 text-white ring-amber-500/20";
    case "skipped":
      return "bg-gray-400 text-white ring-gray-400/20";
    case "cancelled":
      return "bg-violet-500 text-white ring-violet-500/20";
    case "planning":
    default:
      return "bg-sky-500 text-white ring-sky-500/20";
  }
}

export function getMilestoneDisplayStatusLabel(milestone: BosMilestone): string {
  return MILESTONE_DISPLAY_STATUS_LABELS[getMilestoneDisplayStatus(milestone)];
}

export function getMilestoneDisplayStatusBadgeClass(milestone: BosMilestone): string {
  return milestoneDisplayStatusBadgeClass(getMilestoneDisplayStatus(milestone));
}

export function executionEventDotClass(kind: MilestoneExecutionEventKind): string {
  switch (kind) {
    case "milestone_completed":
      return milestoneDisplayStatusDotClass("completed");
    case "milestone_started":
      return milestoneDisplayStatusDotClass("in_progress");
    case "milestone_blocked":
      return milestoneDisplayStatusDotClass("blocked");
    case "milestone_skipped":
      return milestoneDisplayStatusDotClass("skipped");
    case "milestone_reopened":
      return milestoneDisplayStatusDotClass("planning");
    default:
      return milestoneDisplayStatusDotClass("planning");
  }
}
