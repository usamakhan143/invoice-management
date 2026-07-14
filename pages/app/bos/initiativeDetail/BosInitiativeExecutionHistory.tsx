import React, { useState } from "react";
import { formatBosDate } from "../../../../utils/bosFormat";
import { executionEventDotClass } from "../../../../utils/bosMilestoneDisplay";
import type { MilestoneExecutionEvent } from "../../../../bos/application/milestoneSituation";

interface BosInitiativeExecutionHistoryProps {
  events: MilestoneExecutionEvent[];
  performerLabelByUserId?: (userId: string) => string;
}

function timelineIcon(kind: MilestoneExecutionEvent["kind"]): string {
  switch (kind) {
    case "milestone_started":
      return "▶";
    case "milestone_completed":
      return "✓";
    case "milestone_blocked":
      return "!";
    case "milestone_skipped":
      return "—";
    case "milestone_reopened":
      return "↺";
    default:
      return "·";
  }
}

const BosInitiativeExecutionHistory: React.FC<BosInitiativeExecutionHistoryProps> = ({
  events,
  performerLabelByUserId,
}) => {
  const [expanded, setExpanded] = useState(events.length > 0 && events.length <= 8);

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-900/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
            Execution history
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Milestone state changes — sorted by execution date (newest first).
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
          {events.length} event{events.length === 1 ? "" : "s"} {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded ? (
        events.length === 0 ? (
          <div className="border-t border-gray-100 px-6 py-8 text-center dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No execution events yet. Starting, blocking, or completing milestones will appear here.
            </p>
          </div>
        ) : (
          <div className="relative border-t border-gray-100 px-6 pb-6 pt-2 dark:border-gray-800">
            <ul className="relative space-y-5">
              <div
                className="pointer-events-none absolute bottom-3 left-3 top-3 w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-700"
                aria-hidden
              />
              {events.map((event) => {
                const performer =
                  event.performedByUserId && performerLabelByUserId
                    ? performerLabelByUserId(event.performedByUserId)
                    : undefined;

                return (
                  <li key={event.id} className="relative flex gap-4">
                    <div className="relative z-10 flex w-6 shrink-0 justify-center">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-4 ${executionEventDotClass(event.kind)}`}
                        aria-hidden
                      >
                        {timelineIcon(event.kind)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/30">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {event.milestoneNumber ? (
                              <span className="font-mono text-xs font-semibold text-gray-400">
                                {event.milestoneNumber}
                              </span>
                            ) : null}
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {event.milestoneTitle}
                            </p>
                          </div>
                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {event.actionLabel}
                          </p>
                        </div>
                      </div>
                      <dl className="mt-2 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex gap-1">
                          <dt className="shrink-0 text-gray-400">Execution date:</dt>
                          <dd>{formatBosDate(event.executionDateMs)}</dd>
                        </div>
                        {performer ? (
                          <div className="flex gap-1">
                            <dt className="shrink-0 text-gray-400">Performed by:</dt>
                            <dd>{performer}</dd>
                          </div>
                        ) : null}
                        {event.notes ? (
                          <div>
                            <dt className="text-gray-400">Execution notes:</dt>
                            <dd className="mt-0.5 whitespace-pre-line leading-relaxed">{event.notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      ) : null}
    </div>
  );
};

export default BosInitiativeExecutionHistory;
