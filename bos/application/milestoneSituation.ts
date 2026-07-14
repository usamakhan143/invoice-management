import type { BosMilestone } from "../domain/entities/milestone";
import { MILESTONE_STATUS } from "../constants/milestoneStatus";
import { milestoneReferenceLabel } from "../domain/milestoneNumbering";
import { formatBosDate } from "../../utils/bosFormat";

export interface MilestoneSituationRow {
  label: string;
  value: string;
  emphasis?: "default" | "action" | "warning";
}

export interface MilestoneSituationSnapshot {
  completed: BosMilestone[];
  inProgress: BosMilestone[];
  planned: BosMilestone[];
  ready: BosMilestone[];
  blocked: BosMilestone[];
  skipped: BosMilestone[];
  active: BosMilestone | null;
  next: BosMilestone | null;
  totalCount: number;
  upcomingDeadline: BosMilestone | null;
  currentBlocker: string | null;
}

export type MilestoneExecutionEventKind =
  | "milestone_started"
  | "milestone_blocked"
  | "milestone_completed"
  | "milestone_skipped"
  | "milestone_reopened";

export interface MilestoneExecutionEvent {
  id: string;
  kind: MilestoneExecutionEventKind;
  /** Execution date — when the state change occurred in the business record. */
  executionDateMs: number;
  milestoneId: string;
  milestoneNumber?: string;
  milestoneTitle: string;
  actionLabel: string;
  performedByUserId?: string;
  notes?: string;
  /** @deprecated Use structured fields */
  title?: string;
  /** @deprecated Use notes */
  detail?: string;
  recordedAtMs?: number;
}

const EXECUTION_ACTION_LABELS: Record<MilestoneExecutionEventKind, string> = {
  milestone_started: "Started",
  milestone_blocked: "Blocked",
  milestone_completed: "Completed",
  milestone_skipped: "Skipped",
  milestone_reopened: "Reopened",
};

function pushExecutionEvent(
  events: MilestoneExecutionEvent[],
  params: Omit<MilestoneExecutionEvent, "title" | "detail">,
): void {
  events.push({
    ...params,
    title: `${params.actionLabel}: ${params.milestoneTitle}`,
  });
}

function sortBySequence(milestones: BosMilestone[]): BosMilestone[] {
  return [...milestones].sort((a, b) => a.sequence - b.sequence);
}

function formatMilestoneList(items: BosMilestone[]): string {
  if (!items.length) return "None";
  return items.map((m) => milestoneReferenceLabel(m)).join(", ");
}

export function computeMilestoneSituation(milestones: BosMilestone[]): MilestoneSituationSnapshot {
  const sorted = sortBySequence(milestones);
  const totalCount = sorted.length;
  const completed = sorted.filter((m) => m.status === MILESTONE_STATUS.COMPLETED);
  const skipped = sorted.filter((m) => m.status === MILESTONE_STATUS.SKIPPED);
  const blocked = sorted.filter((m) => m.status === MILESTONE_STATUS.BLOCKED);
  const inProgress = sorted.filter((m) => m.status === MILESTONE_STATUS.IN_PROGRESS);
  const ready = sorted.filter((m) => m.status === MILESTONE_STATUS.READY);
  const planned = sorted.filter((m) => m.status === MILESTONE_STATUS.PLANNED);

  const active = inProgress[0] ?? ready[0] ?? null;

  const next =
    sorted.find(
      (m) =>
        m.status === MILESTONE_STATUS.PLANNED ||
        m.status === MILESTONE_STATUS.READY ||
        m.status === MILESTONE_STATUS.IN_PROGRESS,
    ) ?? null;

  const withTargetDates = sorted.filter(
    (m) =>
      m.plannedEndDate !== undefined &&
      m.status !== MILESTONE_STATUS.COMPLETED &&
      m.status !== MILESTONE_STATUS.SKIPPED,
  );
  const upcomingDeadline =
    withTargetDates.length > 0
      ? [...withTargetDates].sort((a, b) => (a.plannedEndDate ?? 0) - (b.plannedEndDate ?? 0))[0]
      : null;

  const currentBlocker = blocked[0]?.blockedReason?.trim() || null;

  return {
    completed,
    inProgress,
    planned,
    ready,
    blocked,
    skipped,
    active,
    next,
    totalCount,
    upcomingDeadline,
    currentBlocker,
  };
}

/** Action-oriented founder guidance from stored milestone states only. */
export function buildNextFounderAction(
  snapshot: MilestoneSituationSnapshot,
  options?: { canManage?: boolean; initiativeClosed?: boolean },
): string | null {
  if (options?.initiativeClosed) return null;
  if (snapshot.blocked.length > 0) {
    return `Resolve blocker on:\n${milestoneReferenceLabel(snapshot.blocked[0])}`;
  }
  if (snapshot.inProgress.length > 0) {
    return `Complete milestone:\n${milestoneReferenceLabel(snapshot.inProgress[0])}`;
  }
  if (snapshot.ready.length > 0) {
    return `Start milestone:\n${milestoneReferenceLabel(snapshot.ready[0])}`;
  }
  if (snapshot.planned.length > 0) {
    return `Start milestone:\n${milestoneReferenceLabel(snapshot.planned[0])}`;
  }
  if (snapshot.totalCount === 0) {
    return options?.canManage ? "Define your first milestone" : null;
  }
  return "All milestones complete or skipped";
}

export function buildMilestoneSituationRows(
  snapshot: MilestoneSituationSnapshot,
  nextAction: string | null,
): MilestoneSituationRow[] {
  const rows: MilestoneSituationRow[] = [
    {
      label: "Completed",
      value: formatMilestoneList(snapshot.completed),
    },
    {
      label: "In progress",
      value: formatMilestoneList(snapshot.inProgress),
    },
    {
      label: "Planned",
      value: formatMilestoneList([...snapshot.planned, ...snapshot.ready]),
    },
    {
      label: "Blocked",
      value: formatMilestoneList(snapshot.blocked),
      emphasis: snapshot.blocked.length > 0 ? "warning" : "default",
    },
    {
      label: "Next action",
      value: nextAction ?? (snapshot.totalCount === 0 ? "Define your first milestone" : "None"),
      emphasis: "action",
    },
  ];

  if (snapshot.upcomingDeadline?.plannedEndDate) {
    rows.push({
      label: "Upcoming deadline",
      value: `${milestoneReferenceLabel(snapshot.upcomingDeadline)} — ${formatBosDate(snapshot.upcomingDeadline.plannedEndDate)}`,
    });
  }

  if (snapshot.currentBlocker) {
    rows.push({
      label: "Current blocker",
      value: snapshot.currentBlocker,
      emphasis: "warning",
    });
  }

  return rows;
}

export function buildExecutionHistoryEvents(milestones: BosMilestone[]): MilestoneExecutionEvent[] {
  const events: MilestoneExecutionEvent[] = [];

  for (const milestone of milestones) {
    if (milestone.reopenedAt !== undefined) {
      pushExecutionEvent(events, {
        id: `${milestone.id}-reopened`,
        kind: "milestone_reopened",
        executionDateMs: milestone.reopenedAt,
        milestoneId: milestone.id,
        milestoneNumber: milestone.milestoneNumber,
        milestoneTitle: milestone.title,
        actionLabel: EXECUTION_ACTION_LABELS.milestone_reopened,
        performedByUserId: milestone.updatedById,
        recordedAtMs: milestone.updatedAt,
      });
    }

    if (milestone.startedAt !== undefined) {
      pushExecutionEvent(events, {
        id: `${milestone.id}-started`,
        kind: "milestone_started",
        executionDateMs: milestone.startedAt,
        milestoneId: milestone.id,
        milestoneNumber: milestone.milestoneNumber,
        milestoneTitle: milestone.title,
        actionLabel: EXECUTION_ACTION_LABELS.milestone_started,
        performedByUserId: milestone.startedByUserId ?? milestone.updatedById,
        notes: milestone.startedNotes?.trim() || undefined,
        recordedAtMs: milestone.updatedAt,
      });
    }

    if (milestone.blockedAt !== undefined) {
      pushExecutionEvent(events, {
        id: `${milestone.id}-blocked`,
        kind: "milestone_blocked",
        executionDateMs: milestone.blockedAt,
        milestoneId: milestone.id,
        milestoneNumber: milestone.milestoneNumber,
        milestoneTitle: milestone.title,
        actionLabel: EXECUTION_ACTION_LABELS.milestone_blocked,
        performedByUserId: milestone.updatedById,
        notes: milestone.blockedReason,
        recordedAtMs: milestone.updatedAt,
      });
    }

    if (milestone.completedDate !== undefined) {
      const noteParts = [
        milestone.completionNotes?.trim(),
        milestone.lessonsLearned?.trim()
          ? `Lessons: ${milestone.lessonsLearned.trim()}`
          : undefined,
      ].filter(Boolean);
      pushExecutionEvent(events, {
        id: `${milestone.id}-completed`,
        kind: "milestone_completed",
        executionDateMs: milestone.completedDate,
        milestoneId: milestone.id,
        milestoneNumber: milestone.milestoneNumber,
        milestoneTitle: milestone.title,
        actionLabel: EXECUTION_ACTION_LABELS.milestone_completed,
        performedByUserId: milestone.updatedById,
        notes: noteParts.length ? noteParts.join("\n") : undefined,
        recordedAtMs: milestone.updatedAt,
      });
    }

    if (milestone.skippedAt !== undefined) {
      pushExecutionEvent(events, {
        id: `${milestone.id}-skipped`,
        kind: "milestone_skipped",
        executionDateMs: milestone.skippedAt,
        milestoneId: milestone.id,
        milestoneNumber: milestone.milestoneNumber,
        milestoneTitle: milestone.title,
        actionLabel: EXECUTION_ACTION_LABELS.milestone_skipped,
        performedByUserId: milestone.updatedById,
        notes: milestone.skippedReason,
        recordedAtMs: milestone.updatedAt,
      });
    }
  }

  return events.sort((a, b) => b.executionDateMs - a.executionDateMs);
}

/** @deprecated Use buildExecutionHistoryEvents. */
export function buildMilestoneTimelineEvents(milestones: BosMilestone[]): MilestoneExecutionEvent[] {
  return buildExecutionHistoryEvents(milestones);
}

/** @deprecated Use stored milestone status labels instead of estimated percentages. */
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
