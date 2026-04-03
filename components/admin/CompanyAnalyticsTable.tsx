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
      trial: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getScaleBadge = (scale: string) => {
    const badges = {
      small: 'bg-blue-100 text-blue-800',
      medium: 'bg-purple-100 text-purple-800',
      large: 'bg-orange-100 text-orange-800',
      enterprise: 'bg-red-100 text-red-800'
    };
    
    return badges[scale as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getRiskBadge = (risk: string) => {
    const badges = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    
    return badges[risk as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading company analytics...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Company Analytics</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{companies.length} companies</span>
          <button
            onClick={onRefresh}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('companyName')}
              >
                Company
                {sortBy === 'companyName' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('subscriptionStatus')}
              >
                Status
                {sortBy === 'subscriptionStatus' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('businessScale')}
              >
                Scale
                {sortBy === 'businessScale' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalUsers')}
              >
                Users
                {sortBy === 'totalUsers' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalInvoices')}
              >
                Invoices
                {sortBy === 'totalInvoices' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('highestInvoiceAmount')}
              >
                Highest Invoice
                {sortBy === 'highestInvoiceAmount' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalRevenueGenerated')}
              >
                Total Revenue
                {sortBy === 'totalRevenueGenerated' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('monthlyRevenue')}
              >
                MRR
                {sortBy === 'monthlyRevenue' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('riskLevel')}
              >
                Risk
                {sortBy === 'riskLevel' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCompanies.map((company) => (
              <tr key={company.companyId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {company.companyName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {company.companyName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {company.ownerEmail}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(company.subscriptionStatus)}`}>
                    {company.subscriptionStatus}
                  </span>
                  {company.subscriptionStatus === 'trial' && company.trialDaysRemaining !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      {company.trialDaysRemaining} days left
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScaleBadge(company.businessScale)}`}>
                    {company.businessScale}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    Score: {company.scaleScore}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="font-medium">{company.totalUsers}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-500">{company.maxUsersAllowed}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(100, company.userUtilization)}%` }}
                    ></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <span className="font-medium">{company.totalInvoices}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-500">{company.maxInvoicesAllowed}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {company.thisMonthInvoices} this month
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${company.highestInvoiceAmount.toLocaleString()}
                  <div className="text-xs text-gray-500 mt-1">
                    Avg: ${company.averageInvoiceAmount.toFixed(0)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${company.totalRevenueGenerated.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${company.monthlyRevenue.toLocaleString()}
                  <div className="text-xs text-gray-500 mt-1">
                    {company.planName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskBadge(company.riskLevel)}`}>
                    {company.riskLevel}
                  </span>
                  {company.riskFactors.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {company.riskFactors.length} factors
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedCompany(company)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {companies.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
          <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
        </div>
      )}

      {/* Company Details Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedCompany.companyName} - Detailed Analytics
              </h3>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Owner</label>
                  <p className="text-sm text-gray-900">{selectedCompany.ownerName}</p>
                  <p className="text-xs text-gray-500">{selectedCompany.ownerEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="text-sm text-gray-900">{selectedCompany.createdAt.toLocaleDateString()}</p>
                </div>
              </div>

              {/* Subscription Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Subscription Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedCompany.subscriptionStatus)}`}>
                      {selectedCompany.subscriptionStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Plan:</span>
                    <span className="ml-2 font-medium">{selectedCompany.planName}</span>
                  </div>
                  {selectedCompany.nextBillingDate && (
                    <div>
                      <span className="text-gray-500">Next Billing:</span>
                      <span className="ml-2">{selectedCompany.nextBillingDate.toLocaleDateString()}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">MRR:</span>
                    <span className="ml-2 font-medium">${selectedCompany.monthlyRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Usage Statistics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Users</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{selectedCompany.totalUsers}/{selectedCompany.maxUsersAllowed}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, selectedCompany.userUtilization)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{selectedCompany.userUtilization}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Invoices</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{selectedCompany.totalInvoices}/{selectedCompany.maxInvoicesAllowed}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, selectedCompany.invoiceUtilization)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{selectedCompany.invoiceUtilization}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Storage</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{selectedCompany.storageUsed}MB/{selectedCompany.maxStorageAllowed}MB</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, selectedCompany.storageUtilization)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{selectedCompany.storageUtilization}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Scale */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Business Scale Analysis</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Scale:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getScaleBadge(selectedCompany.businessScale)}`}>
                      {selectedCompany.businessScale}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Score:</span>
                    <span className="ml-2 font-medium">{selectedCompany.scaleScore}/100</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Highest Invoice:</span>
                    <span className="ml-2 font-medium">${selectedCompany.highestInvoiceAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Revenue:</span>
                    <span className="ml-2 font-medium">${selectedCompany.totalRevenueGenerated.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Risk Analysis */}
              {selectedCompany.riskFactors.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Risk Factors</h4>
                  <div className="space-y-2">
                    {selectedCompany.riskFactors.map((factor, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-yellow-500">⚠️</span>
                        <span className="text-sm text-gray-700">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feature Usage */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Feature Usage</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">PDF Downloads:</span>
                    <span className="ml-2 font-medium">{selectedCompany.featureUsage.pdfDownloads}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Customer Mgmt:</span>
                    <span className="ml-2 font-medium">{selectedCompany.featureUsage.customerManagement}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Product Mgmt:</span>
                    <span className="ml-2 font-medium">{selectedCompany.featureUsage.productManagement}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Expense Tracking:</span>
                    <span className="ml-2 font-medium">{selectedCompany.featureUsage.expenseTracking}</span>
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
