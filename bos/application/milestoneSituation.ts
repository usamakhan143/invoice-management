import type { BosMilestone } from "../domain/entities/milestone";
import { MILESTONE_STATUS } from "../constants/milestoneStatus";

export interface MilestoneSituationRow {
  label: string;
  value: string;
}

export interface MilestoneSituationSnapshot {
  completed: BosMilestone[];
  active: BosMilestone | null;
  blocked: BosMilestone[];
  next: BosMilestone | null;
  overallProgressPercent: number;
  totalCount: number;
  completedCount: number;
  skippedCount: number;
}

export interface MilestoneTimelineEvent {
  id: string;
  kind: "milestone_created" | "milestone_started" | "milestone_completed" | "milestone_blocked" | "milestone_skipped";
  businessDateMs: number;
  title: string;
  detail?: string;
  milestoneId: string;
  recordedAtMs?: number;
}

function sortBySequence(milestones: BosMilestone[]): BosMilestone[] {
  return [...milestones].sort((a, b) => a.sequence - b.sequence);
}

export function computeMilestoneSituation(milestones: BosMilestone[]): MilestoneSituationSnapshot {
  const sorted = sortBySequence(milestones);
  const totalCount = sorted.length;
  const completed = sorted.filter((m) => m.status === MILESTONE_STATUS.COMPLETED);
  const skipped = sorted.filter((m) => m.status === MILESTONE_STATUS.SKIPPED);
  const blocked = sorted.filter((m) => m.status === MILESTONE_STATUS.BLOCKED);
  const active =
    sorted.find((m) => m.status === MILESTONE_STATUS.IN_PROGRESS) ??
    sorted.find((m) => m.status === MILESTONE_STATUS.READY) ??
    null;

  const next =
    sorted.find(
      (m) =>
        m.status === MILESTONE_STATUS.PLANNED ||
        m.status === MILESTONE_STATUS.READY ||
        m.status === MILESTONE_STATUS.IN_PROGRESS,
    ) ?? null;

  const completedCount = completed.length + skipped.length;
  const overallProgressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    completed,
    active,
    blocked,
    next,
    overallProgressPercent,
    totalCount,
    completedCount: completed.length,
    skippedCount: skipped.length,
  };
}

export function buildMilestoneSituationRows(snapshot: MilestoneSituationSnapshot): MilestoneSituationRow[] {
  const formatList = (items: BosMilestone[]) =>
    items.length ? items.map((m) => m.title).join(", ") : "None";

  return [
    {
      label: "Completed milestones",
      value: snapshot.completed.length
        ? formatList(snapshot.completed)
        : snapshot.skippedCount > 0
          ? "None (some skipped)"
          : "None",
    },
    {
      label: "Current active milestone",
      value: snapshot.active?.title ?? "None",
    },
    {
      label: "Blocked milestones",
      value: formatList(snapshot.blocked),
    },
    {
      label: "Next milestone",
      value: snapshot.next?.title ?? "None",
    },
    {
      label: "Overall progress",
      value: snapshot.totalCount > 0 ? `${snapshot.overallProgressPercent}%` : "No milestones defined",
    },
  ];
}

export function buildMilestoneTimelineEvents(milestones: BosMilestone[]): MilestoneTimelineEvent[] {
  const events: MilestoneTimelineEvent[] = [];

  for (const milestone of milestones) {
    if (milestone.createdAt) {
      events.push({
        id: `${milestone.id}-created`,
        kind: "milestone_created",
        businessDateMs: milestone.createdAt,
        title: `Milestone created: ${milestone.title}`,
        milestoneId: milestone.id,
        recordedAtMs: milestone.createdAt,
      });
    }

    if (milestone.startedAt !== undefined) {
      events.push({
        id: `${milestone.id}-started`,
        kind: "milestone_started",
        businessDateMs: milestone.startedAt,
        title: `Milestone started: ${milestone.title}`,
        milestoneId: milestone.id,
        recordedAtMs: milestone.updatedAt,
      });
    }

    if (milestone.completedDate !== undefined) {
      events.push({
        id: `${milestone.id}-completed`,
        kind: "milestone_completed",
        businessDateMs: milestone.completedDate,
        title: `Milestone completed: ${milestone.title}`,
        milestoneId: milestone.id,
        recordedAtMs: milestone.updatedAt,
      });
    }

    if (milestone.blockedAt !== undefined) {
      events.push({
        id: `${milestone.id}-blocked`,
        kind: "milestone_blocked",
        businessDateMs: milestone.blockedAt,
        title: `Milestone blocked: ${milestone.title}`,
        detail: milestone.blockedReason,
        milestoneId: milestone.id,
        recordedAtMs: milestone.updatedAt,
      });
    }

    if (milestone.skippedAt !== undefined) {
      events.push({
        id: `${milestone.id}-skipped`,
        kind: "milestone_skipped",
        businessDateMs: milestone.skippedAt,
        title: `Milestone skipped: ${milestone.title}`,
        detail: milestone.skippedReason,
        milestoneId: milestone.id,
        recordedAtMs: milestone.updatedAt,
      });
    }
  }

  return events.sort((a, b) => a.businessDateMs - b.businessDateMs);
}

export function computeMilestoneProgressPercent(milestone: BosMilestone): number {
  switch (milestone.status) {
    case MILESTONE_STATUS.COMPLETED:
    case MILESTONE_STATUS.SKIPPED:
      return 100;
    case MILESTONE_STATUS.IN_PROGRESS:
      return 50;
    case MILESTONE_STATUS.READY:
      return 25;
    case MILESTONE_STATUS.BLOCKED:
      return 10;
    default:
      return 0;
  }
}
