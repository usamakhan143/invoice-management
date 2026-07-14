import React from "react";
import type { BosInitiative } from "../../../../bos/domain/entities/initiative";
import type { InitiativeInvestmentSummary } from "../../../../bos/application/BosAttributionApplicationService";
import { formatBosDate, formatBosMoney } from "../../../../utils/bosFormat";

interface BosOverviewSecondaryMetricsProps {
  initiative: BosInitiative;
  investment: InitiativeInvestmentSummary | null;
  ownerLabel: string;
  displayCurrency: string;
}

const BosOverviewSecondaryMetrics: React.FC<BosOverviewSecondaryMetricsProps> = ({
  initiative,
  investment,
  ownerLabel,
  displayCurrency,
}) => {
  const invested = investment?.totalInvested ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
        Initiative details
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Owner</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{ownerLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Planned start</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {initiative.startDate ? formatBosDate(initiative.startDate) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Planned end</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {initiative.endDate ? formatBosDate(initiative.endDate) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Budget remaining</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {investment?.budgetRemaining !== undefined
              ? formatBosMoney(investment.budgetRemaining, displayCurrency)
              : initiative.budget?.amount !== undefined
                ? formatBosMoney(Math.max(0, initiative.budget.amount - invested), initiative.budget.currency)
                : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Utilization</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {investment?.budgetUtilizationPercent !== undefined
              ? `${investment.budgetUtilizationPercent.toFixed(1)}%`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500 dark:text-gray-400">Created</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {formatBosDate(initiative.createdAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export default BosOverviewSecondaryMetrics;
