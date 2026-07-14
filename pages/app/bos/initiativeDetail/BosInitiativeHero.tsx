import React from "react";
import type { BosInitiative } from "../../../../bos/domain/entities/initiative";
import type { MilestoneSituationSnapshot } from "../../../../bos/application/milestoneSituation";
import { INITIATIVE_STATUS, INITIATIVE_STATUS_LABELS } from "../../../../bos/constants/initiativeStatus";
import { formatBosDate } from "../../../../utils/bosFormat";

interface BosInitiativeHeroProps {
  initiative: BosInitiative;
  statusLabel: string;
  budgetDisplay: string;
  investedDisplay: string;
  remainingBudgetDisplay: string;
  revenueDisplay: string;
  roiDisplay: string;
  nextAction: string | null;
  ownerLabel: string;
  budgetUtilizationPercent: number | null;
  milestoneSnapshot: MilestoneSituationSnapshot;
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

const metricCardClass =
  "min-w-0 w-full self-start rounded-xl border border-gray-200/80 px-3 py-2.5 dark:border-gray-800";

const Metric: React.FC<{
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  primary?: boolean;
  className?: string;
}> = ({ label, value, highlight, primary, className }) => (
  <div
    className={`${metricCardClass} ${
      highlight
        ? "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20"
        : primary
          ? "border-gray-200/90 bg-gray-50 ring-1 ring-gray-900/5 dark:border-gray-700 dark:bg-gray-950/50 dark:ring-white/10"
          : "bg-white/60 dark:bg-gray-900/30"
    } ${className ?? ""}`}
  >
    <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {label}
    </dt>
    <dd
      className={`mt-1 font-semibold tracking-tight ${
        primary
          ? "line-clamp-3 text-sm leading-snug text-gray-900 dark:text-white"
          : "truncate text-sm text-gray-900 dark:text-white"
      }`}
      title={typeof value === "string" ? value : undefined}
    >
      {value}
    </dd>
  </div>
);

const CountPill: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
    <span className="tabular-nums">{count}</span>
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
  </span>
);

const BosInitiativeHero: React.FC<BosInitiativeHeroProps> = ({
  initiative,
  statusLabel,
  budgetDisplay,
  investedDisplay,
  remainingBudgetDisplay,
  revenueDisplay,
  roiDisplay,
  nextAction,
  ownerLabel,
  budgetUtilizationPercent,
  milestoneSnapshot,
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
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
            <div>
              <dt className="inline font-medium text-gray-400">Owner: </dt>
              <dd className="inline text-gray-700 dark:text-gray-200">{ownerLabel}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-gray-400">Planned: </dt>
              <dd className="inline text-gray-700 dark:text-gray-200">
                {initiative.startDate ? formatBosDate(initiative.startDate) : "—"}
                {" → "}
                {initiative.endDate ? formatBosDate(initiative.endDate) : "—"}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-gray-400">Utilization: </dt>
              <dd className="inline text-gray-700 dark:text-gray-200">
                {budgetUtilizationPercent !== null ? `${budgetUtilizationPercent.toFixed(1)}%` : "—"}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-gray-400">Created: </dt>
              <dd className="inline text-gray-700 dark:text-gray-200">{formatBosDate(initiative.createdAt)}</dd>
            </div>
          </dl>
        </div>
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>
    </div>

    <dl className="grid grid-cols-2 items-start gap-4 border-b border-gray-100 px-6 py-6 dark:border-gray-800 sm:grid-cols-3 lg:grid-cols-6 sm:px-8">
      <Metric label="Budget" value={budgetDisplay} />
      <Metric label="Invested" value={investedDisplay} />
      <Metric label="Remaining budget" value={remainingBudgetDisplay} highlight />
      <Metric label="Revenue" value={revenueDisplay} />
      <Metric label="ROI" value={roiDisplay} />
      <Metric label="Next action" value={nextAction ?? "—"} primary />
    </dl>

    <div className="flex flex-wrap items-center gap-2 px-6 py-4 sm:px-8">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Milestones</span>
      <CountPill label="Completed" count={milestoneSnapshot.completed.length} />
      <CountPill label="In progress" count={milestoneSnapshot.inProgress.length} />
      <CountPill label="Blocked" count={milestoneSnapshot.blocked.length} />
      <CountPill
        label="Planned"
        count={milestoneSnapshot.planned.length + milestoneSnapshot.ready.length}
      />
    </div>
  </header>
);

export default BosInitiativeHero;
