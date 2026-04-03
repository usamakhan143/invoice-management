import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import type { PlatformMetrics, CompanyAnalytics } from '../../services/adminAnalyticsService';

interface BillingOverviewProps {
  metrics: PlatformMetrics;
  companies: CompanyAnalytics[];
}

interface BillingRecord {
  id: string;
  companyId: string;
  companyName: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  billingDate: Date;
  paidDate?: Date;
  planName: string;
}

const BillingOverview: React.FC<BillingOverviewProps> = ({ metrics, companies }) => {
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [error, setError] = useState('');

  useEffect(() => {
    loadBillingData();
  }, [selectedPeriod]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError('');

      // For now, we'll generate mock billing data based on active companies
      // In a real implementation, this would come from your billing system
      const mockBillingRecords: BillingRecord[] = companies
        .filter(company => company.subscriptionStatus === 'active')
        .map(company => ({
          id: `billing_${company.companyId}_${Date.now()}`,
          companyId: company.companyId,
          companyName: company.companyName,
          subscriptionId: `sub_${company.companyId}`,
          amount: company.monthlyRevenue,
          currency: 'USD',
          status: Math.random() > 0.1 ? 'paid' : 'pending' as 'paid' | 'pending',
          billingDate: new Date(),
          paidDate: Math.random() > 0.1 ? new Date() : undefined,
          planName: company.planName
        }));

      setBillingRecords(mockBillingRecords);
    } catch (err: any) {
      console.error('Error loading billing data:', err);
      setError('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRevenueGrowth = () => {
    // Mock calculation - in real implementation, compare with previous period
    const currentMRR = metrics.monthlyRecurringRevenue;
    const previousMRR = currentMRR * 0.85; // Simulate 15% growth
    const growth = ((currentMRR - previousMRR) / previousMRR) * 100;
    return growth;
  };

  const getPaymentStatusStats = () => {
    const total = billingRecords.length;
    const paid = billingRecords.filter(record => record.status === 'paid').length;
    const pending = billingRecords.filter(record => record.status === 'pending').length;
    const failed = billingRecords.filter(record => record.status === 'failed').length;

    return {
      total,
      paid,
      pending,
      failed,
      successRate: total > 0 ? (paid / total) * 100 : 0
    };
  };

  const getTopRevenueCompanies = () => {
    return [...companies]
      .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
      .slice(0, 10);
  };

  const getRevenueForecast = () => {
    const currentMRR = metrics.monthlyRecurringRevenue;
    const trialCompanies = companies.filter(c => c.subscriptionStatus === 'trial').length;
    const conversionRate = metrics.conversionRate / 100;
    const avgRevenue = companies.filter(c => c.subscriptionStatus === 'active')
      .reduce((sum, c) => sum + c.monthlyRevenue, 0) / Math.max(1, companies.filter(c => c.subscriptionStatus === 'active').length);

    const potentialNewMRR = trialCompanies * conversionRate * avgRevenue;
    const forecastMRR = currentMRR + potentialNewMRR;

    return {
      current: currentMRR,
      potential: potentialNewMRR,
      forecast: forecastMRR
    };
  };

  const paymentStats = getPaymentStatusStats();
  const topRevenue = getTopRevenueCompanies();
  const revenueForecast = getRevenueForecast();
  const revenueGrowth = getRevenueGrowth();

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading billing data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">Revenue</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">Billing &amp; revenue</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Track performance and billing metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["month", "quarter", "year"].map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setSelectedPeriod(period)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedPeriod === period
                  ? "bg-primary-600 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Key Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Current MRR</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatCurrency(metrics.monthlyRecurringRevenue)}
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <span className={`font-medium ${revenueGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {revenueGrowth >= 0 ? "+" : ""}
              {revenueGrowth.toFixed(1)}%
            </span>
            <span className="ml-1 text-gray-500 dark:text-gray-400">vs last period</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-950/50">
              <svg className="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Forecast MRR</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatCurrency(revenueForecast.forecast)}
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <span className="font-medium text-primary-600 dark:text-primary-400">+{formatCurrency(revenueForecast.potential)}</span>
            <span className="ml-1 text-gray-500 dark:text-gray-400">potential</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/50">
              <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Payment success rate</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {paymentStats.successRate.toFixed(1)}%
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{paymentStats.paid}</span>
            <span className="text-gray-500 dark:text-gray-400"> / {paymentStats.total} payments</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/50">
              <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">ARPU</dt>
                <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatCurrency(metrics.averageRevenuePerUser)}
                </dd>
              </dl>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Average revenue per user</p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Revenue by plan</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Object.entries(
                companies.reduce((acc, company) => {
                  if (company.subscriptionStatus === 'active') {
                    acc[company.planName] = (acc[company.planName] || 0) + company.monthlyRevenue;
                  }
                  return acc;
                }, {} as Record<string, number>)
              ).map(([planName, revenue]) => (
                <div key={planName} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="mr-3 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{planName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{formatCurrency(revenue)}</span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {((revenue / metrics.monthlyRecurringRevenue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Payment status</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Paid</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{paymentStats.paid}</span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {((paymentStats.paid / Math.max(1, paymentStats.total)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Pending</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{paymentStats.pending}</span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {((paymentStats.pending / Math.max(1, paymentStats.total)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Failed</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{paymentStats.failed}</span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {((paymentStats.failed / Math.max(1, paymentStats.total)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Revenue Companies */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top revenue contributors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  MRR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Scale
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {topRevenue.map((company, index) => (
                <tr key={company.companyId} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">#{index + 1}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950/50">
                          <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                            {company.companyName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{company.companyName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{company.ownerEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {company.planName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(company.monthlyRevenue)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(company.totalRevenueGenerated)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        company.businessScale === "enterprise"
                          ? "bg-rose-100 text-rose-900 dark:bg-rose-900/35 dark:text-rose-200"
                          : company.businessScale === "large"
                            ? "bg-orange-100 text-orange-900 dark:bg-orange-900/35 dark:text-orange-200"
                            : company.businessScale === "medium"
                              ? "bg-violet-100 text-violet-900 dark:bg-violet-900/35 dark:text-violet-200"
                              : "bg-primary-100 text-primary-900 dark:bg-primary-950/50 dark:text-primary-200"
                      }`}
                    >
                      {company.businessScale}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Billing Activity */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent billing activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {billingRecords.slice(0, 10).map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {record.companyName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {record.planName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        record.status === "paid"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-200"
                          : record.status === "pending"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-200"
                            : record.status === "failed"
                              ? "bg-red-100 text-red-900 dark:bg-red-900/35 dark:text-red-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {record.billingDate.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingOverview;
