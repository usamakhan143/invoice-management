import React, { useState } from 'react';
import type { CompanyAnalytics } from '../../services/adminAnalyticsService';

interface CompanyAnalyticsTableProps {
  companies: CompanyAnalytics[];
  loading: boolean;
  onRefresh: () => void;
}

const CompanyAnalyticsTable: React.FC<CompanyAnalyticsTableProps> = ({
  companies,
  loading,
  onRefresh
}) => {
  const [selectedCompany, setSelectedCompany] = useState<CompanyAnalytics | null>(null);
  const [sortBy, setSortBy] = useState<keyof CompanyAnalytics>('totalRevenueGenerated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: keyof CompanyAnalytics) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const sortedCompanies = [...companies].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      trial:
        'bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-200',
      active:
        'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-200',
      expired: 'bg-red-100 text-red-900 dark:bg-red-900/35 dark:text-red-200',
      cancelled:
        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };

    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getScaleBadge = (scale: string) => {
    const badges = {
      small:
        'bg-primary-100 text-primary-900 dark:bg-primary-950/50 dark:text-primary-200',
      medium:
        'bg-violet-100 text-violet-900 dark:bg-violet-900/35 dark:text-violet-200',
      large:
        'bg-orange-100 text-orange-900 dark:bg-orange-900/35 dark:text-orange-200',
      enterprise:
        'bg-rose-100 text-rose-900 dark:bg-rose-900/35 dark:text-rose-200',
    };

    return badges[scale as keyof typeof badges] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getRiskBadge = (risk: string) => {
    const badges = {
      low:
        'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/35 dark:text-emerald-200',
      medium:
        'bg-amber-100 text-amber-900 dark:bg-amber-900/35 dark:text-amber-200',
      high: 'bg-red-100 text-red-900 dark:bg-red-900/35 dark:text-red-200',
    };

    return badges[risk as keyof typeof badges] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading company analytics…</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Company analytics</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Sort columns, open details, refresh list</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{companies.length} companies</span>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort('companyName')}
              >
                Company
                {sortBy === 'companyName' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort('subscriptionStatus')}
              >
                Status
                {sortBy === 'subscriptionStatus' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort('businessScale')}
              >
                Scale
                {sortBy === 'businessScale' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort('totalUsers')}
              >
                Users
                {sortBy === 'totalUsers' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort('totalInvoices')}
              >
                Invoices
                {sortBy === 'totalInvoices' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort('highestInvoiceAmount')}
              >
                Highest Invoice
                {sortBy === 'highestInvoiceAmount' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort('totalRevenueGenerated')}
              >
                Total Revenue
                {sortBy === 'totalRevenueGenerated' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort('monthlyRevenue')}
              >
                MRR
                {sortBy === 'monthlyRevenue' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 cursor-pointer hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => handleSort('riskLevel')}
              >
                Risk
                {sortBy === 'riskLevel' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {sortedCompanies.map((company) => (
              <tr key={company.companyId} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950/50">
                        <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                          {company.companyName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {company.companyName}
                      </div>
                      <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {company.ownerEmail}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(company.subscriptionStatus)}`}>
                    {company.subscriptionStatus}
                  </span>
                  {company.subscriptionStatus === 'trial' && company.trialDaysRemaining !== undefined && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {company.trialDaysRemaining} days left
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getScaleBadge(company.businessScale)}`}>
                    {company.businessScale}
                  </span>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Score: {company.scaleScore}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                  <div className="flex items-center">
                    <span className="font-medium">{company.totalUsers}</span>
                    <span className="mx-1 text-gray-400 dark:text-gray-500">/</span>
                    <span className="text-gray-500 dark:text-gray-400">{company.maxUsersAllowed}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-1.5 rounded-full bg-primary-600 dark:bg-primary-500"
                      style={{ width: `${Math.min(100, company.userUtilization)}%` }}
                    ></div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                  <div className="flex items-center">
                    <span className="font-medium">{company.totalInvoices}</span>
                    <span className="mx-1 text-gray-400 dark:text-gray-500">/</span>
                    <span className="text-gray-500 dark:text-gray-400">{company.maxInvoicesAllowed}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {company.thisMonthInvoices} this month
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  ${company.highestInvoiceAmount.toLocaleString()}
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Avg: ${company.averageInvoiceAmount.toFixed(0)}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  ${company.totalRevenueGenerated.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  ${company.monthlyRevenue.toLocaleString()}
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {company.planName}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRiskBadge(company.riskLevel)}`}>
                    {company.riskLevel}
                  </span>
                  {company.riskFactors.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {company.riskFactors.length} factors
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setSelectedCompany(company)}
                    className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {companies.length === 0 && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700/80">
            <svg className="h-7 w-7 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">No companies found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting search or filters, then search again.</p>
        </div>
      )}

      {/* Company Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-4 backdrop-blur-sm">
          <div className="relative mt-8 w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 md:max-w-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedCompany.companyName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[min(70vh,28rem)] space-y-6 overflow-y-auto px-5 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Owner</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedCompany.ownerName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedCompany.ownerEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedCompany.createdAt.toLocaleDateString()}</p>
                </div>
              </div>

              {/* Subscription Details */}
              <div>
                <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Subscription details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedCompany.subscriptionStatus)}`}>
                      {selectedCompany.subscriptionStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Plan:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedCompany.planName}</span>
                  </div>
                  {selectedCompany.nextBillingDate && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Next billing:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">{selectedCompany.nextBillingDate.toLocaleDateString()}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">MRR:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">${selectedCompany.monthlyRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div>
                <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Usage statistics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Users</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedCompany.totalUsers}/{selectedCompany.maxUsersAllowed}</span>
                      <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-2 rounded-full bg-primary-600 dark:bg-primary-500"
                          style={{ width: `${Math.min(100, selectedCompany.userUtilization)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{selectedCompany.userUtilization}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Invoices</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedCompany.totalInvoices}/{selectedCompany.maxInvoicesAllowed}</span>
                      <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-2 rounded-full bg-emerald-600 dark:bg-emerald-500"
                          style={{ width: `${Math.min(100, selectedCompany.invoiceUtilization)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{selectedCompany.invoiceUtilization}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Storage</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedCompany.storageUsed}MB/{selectedCompany.maxStorageAllowed}MB</span>
                      <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-2 rounded-full bg-violet-600 dark:bg-violet-500"
                          style={{ width: `${Math.min(100, selectedCompany.storageUtilization)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{selectedCompany.storageUtilization}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Scale */}
              <div>
                <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Business scale</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Scale:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getScaleBadge(selectedCompany.businessScale)}`}>
                      {selectedCompany.businessScale}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Score:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedCompany.scaleScore}/100</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Highest invoice:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">${selectedCompany.highestInvoiceAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Total revenue:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">${selectedCompany.totalRevenueGenerated.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Risk Analysis */}
              {selectedCompany.riskFactors.length > 0 && (
                <div>
                  <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Risk factors</h4>
                  <div className="space-y-2">
                    {selectedCompany.riskFactors.map((factor, index) => (
                      <div key={index} className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/25">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm text-amber-900 dark:text-amber-200/90">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feature Usage */}
              <div>
                <h4 className="mb-2 font-medium text-gray-900 dark:text-white">Feature usage</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">PDF downloads:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedCompany.featureUsage.pdfDownloads}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Customer mgmt:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedCompany.featureUsage.customerManagement}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Product mgmt:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedCompany.featureUsage.productManagement}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Expense tracking:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedCompany.featureUsage.expenseTracking}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAnalyticsTable;
