import React from "react";
import type { MilestoneSituationRow } from "../../../../bos/application/milestoneSituation";

interface BosCurrentSituationCardProps {
  rows: MilestoneSituationRow[];
}

const BosCurrentSituationCard: React.FC<BosCurrentSituationCardProps> = ({ rows }) => (
  <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
      Current situation
    </p>
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
      Derived from stored milestone records — no inferred campaign or ROI milestones.
    </p>
    <dl className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{row.label}</dt>
          <dd className="text-sm font-medium text-gray-900 dark:text-white">{row.value}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export default BosCurrentSituationCard;
