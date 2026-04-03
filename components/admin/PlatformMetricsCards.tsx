import React from "react";
import type { PlatformMetrics } from "../../services/adminAnalyticsService";

interface PlatformMetricsCardsProps {
  metrics: PlatformMetrics;
}

const cardShell =
  "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800";
const cardFooter =
  "border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/50";
const iconWrap = (bg: string) =>
  `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`;

const IconBuilding = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const IconCurrency = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconChart = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconTrend = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);
const IconUsers = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconScale = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const PlatformMetricsCards: React.FC<PlatformMetricsCardsProps> = ({ metrics }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const scaleLabel =
    metrics.scaleDistribution.enterprise > 0
      ? "Enterprise leading"
      : metrics.scaleDistribution.large > 0
        ? "Large businesses"
        : metrics.scaleDistribution.medium > 0
          ? "Medium scale"
          : "Small scale";

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Platform snapshot</h2>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">High-level counts and revenue</p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className={cardShell}>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className={iconWrap("bg-primary-100 dark:bg-primary-950/50")}>
                <IconBuilding className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total companies</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {metrics.totalCompanies.toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
          <div className={cardFooter}>
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <span className="text-emerald-600 dark:text-emerald-400">Active: {metrics.activeCompanies}</span>
              <span className="text-amber-600 dark:text-amber-400">Trial: {metrics.trialCompanies}</span>
              <span className="text-red-600 dark:text-red-400">Expired: {metrics.expiredCompanies}</span>
              <span className="text-primary-600 dark:text-primary-400">New (mo): {metrics.newSignupsThisMonth}</span>
            </div>
          </div>
        </div>

        <div className={cardShell}>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className={iconWrap("bg-emerald-100 dark:bg-emerald-950/50")}>
                <IconCurrency className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Monthly recurring revenue</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatCurrency(metrics.monthlyRecurringRevenue)}
                </dd>
              </dl>
            </div>
          </div>
          <div className={cardFooter}>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>ARR</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(metrics.annualRecurringRevenue)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>ARPU</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(metrics.averageRevenuePerUser)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={cardShell}>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className={iconWrap("bg-violet-100 dark:bg-violet-950/50")}>
                <IconChart className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total revenue processed</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatCurrency(metrics.totalRevenueProcessed)}
                </dd>
              </dl>
            </div>
          </div>
          <div className={cardFooter}>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Invoices</span>
                <span className="font-medium text-gray-900 dark:text-white">{metrics.totalInvoicesCreated.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Avg / company</span>
                <span className="font-medium text-gray-900 dark:text-white">{metrics.averageInvoicesPerCompany.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={cardShell}>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className={iconWrap("bg-orange-100 dark:bg-orange-950/50")}>
                <IconTrend className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Conversion rate</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatPercentage(metrics.conversionRate)}
                </dd>
              </dl>
            </div>
          </div>
          <div className={cardFooter}>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Trial → paid</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {metrics.activeCompanies}/{metrics.activeCompanies + metrics.trialCompanies}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Churn (mo)</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatPercentage(metrics.churnRateThisMonth)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={cardShell}>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className={iconWrap("bg-indigo-100 dark:bg-indigo-950/50")}>
                <IconUsers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total users</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {metrics.totalUsers.toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
          <div className={cardFooter}>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Avg / company</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {(metrics.totalUsers / Math.max(1, metrics.totalCompanies)).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className={cardShell}>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className={iconWrap("bg-rose-100 dark:bg-rose-950/50")}>
                <IconScale className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Business scale</dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">{scaleLabel}</dd>
              </dl>
            </div>
          </div>
          <div className={cardFooter}>
            <div className="space-y-1.5 text-sm">
              {(
                [
                  ["small", "bg-blue-500", metrics.scaleDistribution.small],
                  ["medium", "bg-violet-500", metrics.scaleDistribution.medium],
                  ["large", "bg-orange-500", metrics.scaleDistribution.large],
                  ["enterprise", "bg-rose-500", metrics.scaleDistribution.enterprise],
                ] as const
              ).map(([label, dot, count]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="flex items-center gap-2 capitalize text-gray-600 dark:text-gray-400">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    {label}
                  </span>
                  <span className="font-medium tabular-nums text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${cardShell} md:col-span-2`}>
          <div className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className={iconWrap("bg-gray-100 dark:bg-gray-700/80")}>
                <IconChart className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scale distribution</h3>
            </div>

            <div className="space-y-3">
              {Object.entries(metrics.scaleDistribution).map(([scale, count]) => {
                const percentage = (count / Math.max(1, metrics.totalCompanies)) * 100;
                const colors = {
                  small: "bg-blue-500",
                  medium: "bg-violet-500",
                  large: "bg-orange-500",
                  enterprise: "bg-rose-500",
                };

                return (
                  <div key={scale} className="flex items-center gap-3">
                    <div className="w-24 shrink-0 text-sm capitalize text-gray-600 dark:text-gray-400">{scale}</div>
                    <div className="mx-1 min-w-0 flex-1">
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`${colors[scale as keyof typeof colors]} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-28 shrink-0 text-right text-sm tabular-nums text-gray-900 dark:text-white">
                      {count} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformMetricsCards;
