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
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading billing data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Billing & Revenue Analytics</h2>
          <p className="text-gray-600">Track revenue performance and billing metrics</p>
        </div>
        <div className="flex space-x-2">
          {['month', 'quarter', 'year'].map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded text-sm ${
                selectedPeriod === period
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Key Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <span className="text-green-600 text-xl">💰</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Current MRR</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(metrics.monthlyRecurringRevenue)}</dd>
              </dl>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center text-sm">
              <span className={`${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
              </span>
              <span className="text-gray-500 ml-1">vs last period</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <span className="text-blue-600 text-xl">📈</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Forecast MRR</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(revenueForecast.forecast)}</dd>
              </dl>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center text-sm">
              <span className="text-blue-600 font-medium">
                +{formatCurrency(revenueForecast.potential)}
              </span>
              <span className="text-gray-500 ml-1">potential</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <span className="text-purple-600 text-xl">💳</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Payment Success Rate</dt>
                <dd className="text-lg font-medium text-gray-900">{paymentStats.successRate.toFixed(1)}%</dd>
              </dl>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center text-sm">
              <span className="text-green-600 font-medium">{paymentStats.paid}</span>
              <span className="text-gray-500 ml-1">/ {paymentStats.total} payments</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                <span className="text-orange-600 text-xl">📊</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">ARPU</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(metrics.averageRevenuePerUser)}</dd>
              </dl>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center text-sm">
              <span className="text-gray-600">Average revenue per user</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Revenue by Plan</h3>
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
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">{planName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(revenue)}</span>
                    <div className="text-xs text-gray-500">
                      {((revenue / metrics.monthlyRecurringRevenue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Payment Status</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">Paid</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{paymentStats.paid}</span>
                  <div className="text-xs text-gray-500">
                    {((paymentStats.paid / Math.max(1, paymentStats.total)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">Pending</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{paymentStats.pending}</span>
                  <div className="text-xs text-gray-500">
                    {((paymentStats.pending / Math.max(1, paymentStats.total)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-900">Failed</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{paymentStats.failed}</span>
                  <div className="text-xs text-gray-500">
                    {((paymentStats.failed / Math.max(1, paymentStats.total)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Revenue Companies */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Revenue Contributors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MRR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scale
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topRevenue.map((company, index) => (
                <tr key={company.companyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-medium">#{index + 1}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-xs">
                            {company.companyName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{company.companyName}</div>
                        <div className="text-sm text-gray-500">{company.ownerEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {company.planName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(company.monthlyRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(company.totalRevenueGenerated)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      company.businessScale === 'enterprise' ? 'bg-red-100 text-red-800' :
                      company.businessScale === 'large' ? 'bg-orange-100 text-orange-800' :
                      company.businessScale === 'medium' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
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
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Billing Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingRecords.slice(0, 10).map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.companyName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.planName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      record.status === 'paid' ? 'bg-green-100 text-green-800' :
                      record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      record.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
