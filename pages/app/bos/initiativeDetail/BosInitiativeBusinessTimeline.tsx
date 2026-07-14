import React from "react";
import { formatBosDate } from "../../../../utils/bosFormat";
import type { InitiativeTimelineEvent } from "./initiativeMilestoneEngine";

interface BosInitiativeBusinessTimelineProps {
  events: InitiativeTimelineEvent[];
}

function dotClass(kind: InitiativeTimelineEvent["kind"]): string {
  switch (kind) {
    case "decision":
      return "bg-violet-500 ring-violet-500/20";
    case "planned_start":
    case "planned_end":
      return "bg-blue-500 ring-blue-500/20";
    case "created":
      return "bg-gray-500 ring-gray-500/20";
    case "closed":
      return "bg-gray-900 ring-gray-900/10 dark:bg-white dark:ring-white/10";
    default:
      return "bg-gray-400 ring-gray-400/20";
  }
}

const BosInitiativeBusinessTimeline: React.FC<BosInitiativeBusinessTimelineProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-8 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No business-dated events yet. Decisions require a decision date to appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="absolute bottom-6 left-[23px] top-6 w-px bg-gray-200 dark:bg-gray-700" />
      <ul className="space-y-5">
        {events.map((event) => (
          <li key={event.id} className="relative pl-8">
            <span
              className={`absolute left-0 top-1.5 h-[10px] w-[10px] rounded-full ring-4 ${dotClass(event.kind)}`}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</p>
              <time className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {formatBosDate(event.businessDateMs)}
              </time>
            </div>
            {event.detail ? (
              <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{event.detail}</p>
            ) : null}
            {event.recordedAtMs ? (
              <p className="mt-1 text-[11px] text-gray-400">
                Recorded {formatBosDate(event.recordedAtMs)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BosInitiativeBusinessTimeline;
