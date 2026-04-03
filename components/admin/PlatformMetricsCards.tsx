import React from 'react';
import type { PlatformMetrics } from '../../services/adminAnalyticsService';

interface PlatformMetricsCardsProps {
  metrics: PlatformMetrics;
}

const PlatformMetricsCards: React.FC<PlatformMetricsCardsProps> = ({ metrics }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Companies */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <span className="text-blue-600 text-xl">🏢</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Companies</dt>
                <dd className="text-lg font-medium text-gray-900">{metrics.totalCompanies.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <div className="flex justify-between">
              <span className="text-green-600">✓ Active: {metrics.activeCompanies}</span>
              <span className="text-yellow-600">⏳ Trial: {metrics.trialCompanies}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-red-600">❌ Expired: {metrics.expiredCompanies}</span>
              <span className="text-blue-600">📈 New: {metrics.newSignupsThisMonth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Recurring Revenue */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <span className="text-green-600 text-xl">💰</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Monthly Recurring Revenue</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(metrics.monthlyRecurringRevenue)}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">ARR:</span>
              <span className="font-medium">{formatCurrency(metrics.annualRecurringRevenue)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-600">ARPU:</span>
              <span className="font-medium">{formatCurrency(metrics.averageRevenuePerUser)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Total Revenue Processed */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <span className="text-purple-600 text-xl">📊</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue Processed</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(metrics.totalRevenueProcessed)}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Invoices:</span>
              <span className="font-medium">{metrics.totalInvoicesCreated.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-600">Avg per Company:</span>
              <span className="font-medium">{metrics.averageInvoicesPerCompany.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Metrics */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                <span className="text-orange-600 text-xl">📈</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                <dd className="text-lg font-medium text-gray-900">{formatPercentage(metrics.conversionRate)}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Trial → Paid:</span>
              <span className="font-medium">{metrics.activeCompanies}/{metrics.activeCompanies + metrics.trialCompanies}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-600">Churn Rate:</span>
              <span className="font-medium">{formatPercentage(metrics.churnRateThisMonth)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Statistics */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-indigo-100 rounded-md flex items-center justify-center">
                <span className="text-indigo-600 text-xl">👥</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                <dd className="text-lg font-medium text-gray-900">{metrics.totalUsers.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Avg per Company:</span>
              <span className="font-medium">{(metrics.totalUsers / Math.max(1, metrics.totalCompanies)).toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Business Scale Distribution */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                <span className="text-red-600 text-xl">📏</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Business Scale Distribution</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {metrics.scaleDistribution.enterprise > 0 ? 'Enterprise Leading' : 
                   metrics.scaleDistribution.large > 0 ? 'Large Businesses' :
                   metrics.scaleDistribution.medium > 0 ? 'Medium Scale' : 'Small Scale'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-blue-600">🔵 Small:</span>
              <span className="font-medium">{metrics.scaleDistribution.small}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-600">🟣 Medium:</span>
              <span className="font-medium">{metrics.scaleDistribution.medium}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-600">🟠 Large:</span>
              <span className="font-medium">{metrics.scaleDistribution.large}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">🔴 Enterprise:</span>
              <span className="font-medium">{metrics.scaleDistribution.enterprise}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scale Distribution Chart */}
      <div className="bg-white overflow-hidden shadow rounded-lg md:col-span-2">
        <div className="p-5">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                <span className="text-gray-600 text-xl">📊</span>
              </div>
            </div>
            <div className="ml-5">
              <h3 className="text-sm font-medium text-gray-500">Business Scale Visualization</h3>
            </div>
          </div>
          
          <div className="space-y-3">
            {Object.entries(metrics.scaleDistribution).map(([scale, count]) => {
              const percentage = (count / Math.max(1, metrics.totalCompanies)) * 100;
              const colors = {
                small: 'bg-blue-500',
                medium: 'bg-purple-500', 
                large: 'bg-orange-500',
                enterprise: 'bg-red-500'
              };
              
              return (
                <div key={scale} className="flex items-center">
                  <div className="w-20 text-sm text-gray-600 capitalize">{scale}:</div>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${colors[scale as keyof typeof colors]} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-16 text-sm text-gray-900 text-right">
                    {count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformMetricsCards;
