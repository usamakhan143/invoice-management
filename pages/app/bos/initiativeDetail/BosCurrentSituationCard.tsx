import React from "react";
import type { MilestoneSituationRow } from "../../../../bos/application/milestoneSituation";

interface BosCurrentSituationCardProps {
  rows: MilestoneSituationRow[];
}

function rowValueClass(emphasis: MilestoneSituationRow["emphasis"]): string {
  switch (emphasis) {
    case "action":
      return "text-gray-900 dark:text-white";
    case "warning":
      return "text-amber-800 dark:text-amber-200";
    default:
      return "text-gray-800 dark:text-gray-100";
  }
}

const BosCurrentSituationCard: React.FC<BosCurrentSituationCardProps> = ({ rows }) => (
  <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
      Current situation
    </p>
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
      What needs your attention right now — based on stored milestone records only.
    </p>
    <ul className="mt-5 space-y-4">
      {rows.map((row) => (
        <li
          key={row.label}
          className={
            row.emphasis === "warning"
              ? "rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20"
              : row.emphasis === "action"
                ? "rounded-xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-950/40"
                : "px-1 py-0.5"
          }
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {row.label}
          </p>
          <p
            className={`mt-1 text-sm leading-relaxed ${rowValueClass(row.emphasis)}${
              row.emphasis === "action" ? " whitespace-pre-line" : ""
            }`}
          >
            {row.value}
          </p>
        </li>
      ))}
    </ul>
  </div>
);

export default BosCurrentSituationCard;
