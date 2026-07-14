import React from "react";
import { formatBosDate } from "../../../../utils/bosFormat";
import type { InitiativeTimelineEvent } from "./initiativeMilestoneEngine";

interface BosInitiativeBusinessTimelineProps {
  events: InitiativeTimelineEvent[];
}

function timelineIcon(kind: InitiativeTimelineEvent["kind"]): string {
  switch (kind) {
    case "decision":
      return "◆";
    case "investment":
      return "$";
    case "learning":
      return "✦";
    case "planned_start":
    case "planned_end":
      return "◷";
    case "closed":
      return "■";
    default:
      return "·";
  }
}

function dotClass(kind: InitiativeTimelineEvent["kind"]): string {
  switch (kind) {
    case "decision":
      return "bg-violet-500 text-white ring-violet-500/20";
    case "investment":
      return "bg-emerald-600 text-white ring-emerald-600/20";
    case "learning":
      return "bg-violet-600 text-white ring-violet-600/20";
    case "planned_start":
    case "planned_end":
      return "bg-sky-500 text-white ring-sky-500/20";
    case "closed":
      return "bg-gray-900 text-white ring-gray-900/10 dark:bg-white dark:text-gray-900";
    default:
      return "bg-gray-400 text-white ring-gray-400/20";
  }
}

const BosInitiativeBusinessTimeline: React.FC<BosInitiativeBusinessTimelineProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-8 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No business events yet. Decisions, investments, and planned dates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
      <ul className="relative space-y-5">
        <div
          className="pointer-events-none absolute bottom-3 left-3 top-3 w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-700"
          aria-hidden
        />
        {events.map((event) => (
          <li key={event.id} className="relative flex gap-4">
            <div className="relative z-10 flex w-6 shrink-0 justify-center">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-4 ${dotClass(event.kind)}`}
                aria-hidden
              >
                {timelineIcon(event.kind)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
                <time className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {formatBosDate(event.businessDateMs)}
                </time>
              </div>
              {event.detail ? (
                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {event.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BosInitiativeBusinessTimeline;
