import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { AdminAnalyticsService, type CompanyAnalytics, type PlatformMetrics } from '../../services/adminAnalyticsService';
import CompanyAnalyticsTable from '../../components/admin/CompanyAnalyticsTable';
import PlatformMetricsCards from '../../components/admin/PlatformMetricsCards';
import SubscriptionPlansManager from '../../components/admin/SubscriptionPlansManager';
import BillingOverview from '../../components/admin/BillingOverview';
import Spinner from '../../components/Spinner';

const SuperAdminDashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { isOwner } = usePermissions();
  
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [companies, setCompanies] = useState<CompanyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'subscriptions' | 'billing'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    subscriptionStatus?: string;
    businessScale?: string;
    riskLevel?: string;
  }>({});

  // Check if user is super admin (owner of IT VEINS LLC)
  const isSuperAdmin = isOwner && userProfile?.companyName?.toLowerCase().includes('it veins');

  useEffect(() => {
    if (!isSuperAdmin) {
      setError('Access denied. Super admin privileges required.');
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [isSuperAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [metricsData, companiesData] = await Promise.all([
        AdminAnalyticsService.getPlatformMetrics(),
        AdminAnalyticsService.getAllCompaniesAnalytics()
      ]);

      setPlatformMetrics(metricsData);
      setCompanies(companiesData);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const filteredCompanies = await AdminAnalyticsService.searchCompanies(searchQuery, filters);
      setCompanies(filteredCompanies);
    } catch (err: any) {
      setError('Search failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = async () => {
    setSearchQuery('');
    setFilters({});
    await loadDashboardData();
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">Super admin privileges required to access this dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading && !platformMetrics) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">InvoicePro Platform Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <button
                onClick={loadDashboardData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex space-x-8 border-b">
            {[
              { id: 'overview', label: 'Platform Overview', icon: '📊' },
              { id: 'companies', label: 'Companies', icon: '🏢' },
              { id: 'subscriptions', label: 'Subscription Plans', icon: '💳' },
              { id: 'billing', label: 'Billing & Revenue', icon: '💰' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && platformMetrics && (
          <div className="space-y-8">
            <PlatformMetricsCards metrics={platformMetrics} />
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <span className="text-green-600 font-semibold">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">MRR</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${platformMetrics.monthlyRecurringRevenue.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {platformMetrics.conversionRate.toFixed(1)}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                      <span className="text-purple-600 font-semibold">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">ARPU</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${platformMetrics.averageRevenuePerUser.toFixed(0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                      <span className="text-orange-600 font-semibold">📊</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {platformMetrics.totalInvoicesCreated.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">🏆 Top by Revenue</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {platformMetrics.topCompaniesByRevenue.slice(0, 5).map((company, index) => (
                      <div key={company.companyId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{company.companyName}</p>
                            <p className="text-xs text-gray-500">{company.businessScale}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ${company.totalRevenueGenerated.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {company.totalInvoices} invoices
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">📄 Top by Invoice Count</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {platformMetrics.topCompaniesByInvoices.slice(0, 5).map((company, index) => (
                      <div key={company.companyId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{company.companyName}</p>
                            <p className="text-xs text-gray-500">{company.businessScale}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {company.totalInvoices}
                          </p>
                          <p className="text-xs text-gray-500">
                            ${company.averageInvoiceAmount.toFixed(0)} avg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">👥 Top by Team Size</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {platformMetrics.topCompaniesByUsers.slice(0, 5).map((company, index) => (
                      <div key={company.companyId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{company.companyName}</p>
                            <p className="text-xs text-gray-500">{company.businessScale}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {company.totalUsers} users
                          </p>
                          <p className="text-xs text-gray-500">
                            {company.userUtilization}% utilized
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search companies by name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filters.subscriptionStatus || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, subscriptionStatus: e.target.value || undefined }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={filters.businessScale || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, businessScale: e.target.value || undefined }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Scales</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <select
                    value={filters.riskLevel || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value || undefined }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Risk Levels</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                  <button
                    onClick={handleSearch}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    disabled={loading}
                  >
                    Search
                  </button>
                  <button
                    onClick={clearFilters}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <CompanyAnalyticsTable companies={companies} loading={loading} onRefresh={loadDashboardData} />
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionPlansManager />
        )}

        {activeTab === 'billing' && platformMetrics && (
          <BillingOverview metrics={platformMetrics} companies={companies} />
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
