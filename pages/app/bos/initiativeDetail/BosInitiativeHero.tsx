import React from "react";
import type { BosInitiative } from "../../../../bos/domain/entities/initiative";
import { INITIATIVE_STATUS, INITIATIVE_STATUS_LABELS } from "../../../../bos/constants/initiativeStatus";

interface BosInitiativeHeroProps {
  initiative: BosInitiative;
  statusLabel: string;
  budgetDisplay: string;
  investedDisplay: string;
  revenueDisplay: string;
  roiDisplay: string;
  nextAction: string | null;
  toolbar?: React.ReactNode;
}

function statusTone(status: string): string {
  switch (status) {
    case INITIATIVE_STATUS.ACTIVE:
      return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300";
    case INITIATIVE_STATUS.DRAFT:
      return "bg-gray-500/10 text-gray-700 ring-gray-500/20 dark:text-gray-300";
    case INITIATIVE_STATUS.PAUSED:
      return "bg-amber-500/10 text-amber-800 ring-amber-500/20 dark:text-amber-300";
    case INITIATIVE_STATUS.CLOSED:
      return "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300";
    default:
      return "bg-gray-500/10 text-gray-700 ring-gray-500/20";
  }
}

const Metric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {label}
    </dt>
    <dd className="mt-1 truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
      {value}
    </dd>
  </div>
);

const BosInitiativeHero: React.FC<BosInitiativeHeroProps> = ({
  initiative,
  statusLabel,
  budgetDisplay,
  investedDisplay,
  revenueDisplay,
  roiDisplay,
  nextAction,
  toolbar,
}) => (
  <header className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
    <div className="border-b border-gray-100 bg-gradient-to-br from-gray-50/80 via-white to-white px-6 py-8 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-900/60 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusTone(initiative.status)}`}
          >
            {statusLabel}
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {initiative.name}
          </h1>
        </div>
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>
    </div>
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 px-6 py-6 sm:grid-cols-3 lg:grid-cols-6 sm:px-8">
      <Metric label="Status" value={INITIATIVE_STATUS_LABELS[initiative.status] ?? initiative.status} />
      <Metric label="Budget" value={budgetDisplay} />
      <Metric label="Invested" value={investedDisplay} />
      <Metric label="Revenue" value={revenueDisplay} />
      <Metric label="ROI" value={roiDisplay} />
      <Metric label="Next action" value={nextAction ?? "—"} />
    </dl>
  </header>
);

export default BosInitiativeHero;
