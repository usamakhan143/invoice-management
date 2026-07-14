import { MILESTONE_STATUS, type MilestoneStatus } from "../../constants/milestoneStatus";

export type MilestoneTransitionEvent =
  | "mark_ready"
  | "start"
  | "complete"
  | "block"
  | "skip"
  | "reopen";

const MILESTONE_TRANSITIONS: Record<
  MilestoneStatus,
  Partial<Record<MilestoneTransitionEvent, MilestoneStatus>>
> = {
  [MILESTONE_STATUS.PLANNED]: {
    mark_ready: MILESTONE_STATUS.READY,
    start: MILESTONE_STATUS.IN_PROGRESS,
    skip: MILESTONE_STATUS.SKIPPED,
  },
  [MILESTONE_STATUS.READY]: {
    start: MILESTONE_STATUS.IN_PROGRESS,
    block: MILESTONE_STATUS.BLOCKED,
    skip: MILESTONE_STATUS.SKIPPED,
  },
  [MILESTONE_STATUS.IN_PROGRESS]: {
    complete: MILESTONE_STATUS.COMPLETED,
    block: MILESTONE_STATUS.BLOCKED,
    skip: MILESTONE_STATUS.SKIPPED,
  },
  [MILESTONE_STATUS.BLOCKED]: {
    start: MILESTONE_STATUS.IN_PROGRESS,
    skip: MILESTONE_STATUS.SKIPPED,
    reopen: MILESTONE_STATUS.PLANNED,
  },
  [MILESTONE_STATUS.COMPLETED]: {},
  [MILESTONE_STATUS.SKIPPED]: {},
};

export function getMilestoneNextStatus(
  current: MilestoneStatus,
  event: MilestoneTransitionEvent,
): MilestoneStatus | undefined {
  return MILESTONE_TRANSITIONS[current]?.[event];
}

export function isMilestoneTransitionAllowed(
  current: MilestoneStatus,
  next: MilestoneStatus,
): boolean {
  const allowed = MILESTONE_TRANSITIONS[current];
  if (!allowed) return false;
  return Object.values(allowed).includes(next);
}
