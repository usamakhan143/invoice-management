import type { BosMilestone } from "./entities/milestone";

/** Formats immutable milestone reference number (e.g. M-001). */
export function formatMilestoneNumber(index: number): string {
  if (!Number.isFinite(index) || index < 1) {
    throw new Error("Milestone number index must be a positive integer.");
  }
  return `M-${String(index).padStart(3, "0")}`;
}

/** Resolves the next milestone number index for an initiative. */
export function resolveNextMilestoneNumberIndex(existing: BosMilestone[]): number {
  let max = 0;
  for (const milestone of existing) {
    if (milestone.milestoneNumberIndex !== undefined && milestone.milestoneNumberIndex > max) {
      max = milestone.milestoneNumberIndex;
    }
  }
  return max + 1;
}

export function milestoneReferenceLabel(milestone: BosMilestone): string {
  if (milestone.milestoneNumber) {
    return `${milestone.milestoneNumber} · ${milestone.title}`;
  }
  return milestone.title;
}
