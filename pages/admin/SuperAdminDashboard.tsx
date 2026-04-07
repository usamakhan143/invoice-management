import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import {
  AdminAnalyticsService,
  type CompanyAnalytics,
  type PlatformMetrics,
} from "../../services/adminAnalyticsService";
import CompanyAnalyticsTable from "../../components/admin/CompanyAnalyticsTable";
import PlatformMetricsCards from "../../components/admin/PlatformMetricsCards";
import SubscriptionPlansManager from "../../components/admin/SubscriptionPlansManager";
import BillingOverview from "../../components/admin/BillingOverview";
import Spinner from "../../components/Spinner";

type AdminTab = "overview" | "companies" | "subscriptions" | "billing";

const IconChart = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconBuilding = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const IconCreditCard = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);
const IconCurrency = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconShield = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const IconRefresh = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const TABS: { id: AdminTab; label: string; Icon: typeof IconChart }[] = [
  { id: "overview", label: "Platform overview", Icon: IconChart },
  { id: "companies", label: "Companies", Icon: IconBuilding },
  { id: "subscriptions", label: "Subscription plans", Icon: IconCreditCard },
  { id: "billing", label: "Billing & revenue", Icon: IconCurrency },
];

const SuperAdminDashboard: React.FC = () => {
  usePageTitle("Super Admin");
  const { user, userProfile } = useAuth();
  const { isOwner } = usePermissions();
  
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [companies, setCompanies] = useState<CompanyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<{
    subscriptionStatus?: string;
    businessScale?: string;
    riskLevel?: string;
  }>({});

  const isSuperAdmin = isOwner && userProfile?.companyName?.toLowerCase().includes("it veins");

  useEffect(() => {
    if (!isSuperAdmin) {
      setError("Access denied. Super admin privileges required.");
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [isSuperAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [metricsData, companiesData] = await Promise.all([
        AdminAnalyticsService.getPlatformMetrics(),
        AdminAnalyticsService.getAllCompaniesAnalytics(),
      ]);

      setPlatformMetrics(metricsData);
      setCompanies(companiesData);
    } catch (err: unknown) {
      console.error("Error loading dashboard data:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setError("Failed to load dashboard data: " + message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setError("");
      setLoading(true);
      const filteredCompanies = await AdminAnalyticsService.searchCompanies(searchQuery, filters);
      setCompanies(filteredCompanies);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError("Search failed: " + message);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = async () => {
    setSearchQuery("");
    setFilters({});
    await loadDashboardData();
  };

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
          <IconShield className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Access restricted</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Super admin access is limited to authorized platform operators.
        </p>
      </div>
    );
  }

  if (loading && !platformMetrics) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <Spinner />
      </div>
    );
  }

  if (error && !platformMetrics) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/25">
          <svg className="h-7 w-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Couldn&apos;t load dashboard</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <button
          type="button"
            onClick={loadDashboardData}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
          Try again
          </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500";

  const selectClass =
    "rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white";

  const btnPrimary =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-gray-800";

  const btnSecondary =
    "inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700";

  const statCardClass =
    "flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800";

  const panelClass =
    "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Platform administration
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Super Admin
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              InvoicePro metrics, tenant companies, subscription plans, and revenue — in one place.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-900/50">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Signed in</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-white">
                {userProfile?.displayName || user?.email || "—"}
              </p>
              <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-500">
                Updated {new Date().toLocaleTimeString()}
              </p>
            </div>
            <button type="button" onClick={loadDashboardData} disabled={loading} className={btnPrimary}>
              <IconRefresh className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing…" : "Refresh data"}
              </button>
            </div>
          </div>
          
        <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-700">
          <nav className="flex flex-wrap gap-2" aria-label="Super admin sections">
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
              <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary-600 text-white shadow-sm dark:bg-primary-600"
                      : "border border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-900/40"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-primary-600 dark:text-primary-400"}`} />
                  {label}
              </button>
              );
            })}
          </nav>
        </div>
      </div>

      {error && platformMetrics && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {activeTab === "overview" && platformMetrics && (
          <div className="space-y-8">
            <PlatformMetricsCards metrics={platformMetrics} />
            
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Key indicators</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Snapshot from live platform metrics</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "MRR",
                  value: `$${platformMetrics.monthlyRecurringRevenue.toLocaleString()}`,
                  sub: "Monthly recurring revenue",
                  icon: IconCurrency,
                  tone: "text-emerald-600 dark:text-emerald-400",
                  bg: "bg-emerald-50 dark:bg-emerald-950/40",
                },
                {
                  label: "Conversion",
                  value: `${platformMetrics.conversionRate.toFixed(1)}%`,
                  sub: "Trial to paid signal",
                  icon: IconChart,
                  tone: "text-primary-600 dark:text-primary-400",
                  bg: "bg-primary-50 dark:bg-primary-950/40",
                },
                {
                  label: "ARPU",
                  value: `$${platformMetrics.averageRevenuePerUser.toFixed(0)}`,
                  sub: "Avg revenue per user",
                  icon: IconCurrency,
                  tone: "text-violet-600 dark:text-violet-400",
                  bg: "bg-violet-50 dark:bg-violet-950/40",
                },
                {
                  label: "Invoices",
                  value: platformMetrics.totalInvoicesCreated.toLocaleString(),
                  sub: "Total created on platform",
                  icon: IconChart,
                  tone: "text-orange-600 dark:text-orange-400",
                  bg: "bg-orange-50 dark:bg-orange-950/40",
                },
              ].map((item) => (
                <div key={item.label} className={statCardClass}>
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                    <item.icon className={`h-6 w-6 ${item.tone}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                    <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{item.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{item.sub}</p>
                  </div>
                </div>
              ))}
                </div>
              </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Top tenants</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Ranked lists for quick review</p>
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[
                {
                  title: "By revenue",
                  rows: platformMetrics.topCompaniesByRevenue.slice(0, 5),
                  valueKey: "totalRevenueGenerated" as const,
                  format: (n: number) => `$${n.toLocaleString()}`,
                  sub: (c: (typeof platformMetrics.topCompaniesByRevenue)[0]) =>
                    `${c.totalInvoices} invoices · ${c.businessScale}`,
                },
                {
                  title: "By invoice count",
                  rows: platformMetrics.topCompaniesByInvoices.slice(0, 5),
                  valueKey: "totalInvoices" as const,
                  format: (n: number) => n.toLocaleString(),
                  sub: (c: (typeof platformMetrics.topCompaniesByInvoices)[0]) =>
                    `$${c.averageInvoiceAmount.toFixed(0)} avg · ${c.businessScale}`,
                },
                {
                  title: "By team size",
                  rows: platformMetrics.topCompaniesByUsers.slice(0, 5),
                  valueKey: "totalUsers" as const,
                  format: (n: number) => `${n} users`,
                  sub: (c: (typeof platformMetrics.topCompaniesByUsers)[0]) =>
                    `${c.userUtilization}% utilized · ${c.businessScale}`,
                },
              ].map((section) => (
                <div key={section.title} className={panelClass}>
                  <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {section.rows.map((company, index) => (
                      <li key={company.companyId} className="flex items-start gap-3 px-5 py-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {index + 1}
                          </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {company.companyName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{section.sub(company)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                            {section.format(company[section.valueKey] as number)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        )}

      {activeTab === "companies" && (
          <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Search & filters</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Narrow the company list, then run search</p>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="super-admin-search" className="sr-only">
                  Search companies
                </label>
                  <input
                  id="super-admin-search"
                  type="search"
                  placeholder="Name, email, or keyword…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  className={inputClass}
                  />
                </div>
              <div className="flex flex-wrap gap-2">
                  <select
                  value={filters.subscriptionStatus || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, subscriptionStatus: e.target.value || undefined }))
                  }
                  className={selectClass}
                  aria-label="Subscription status"
                >
                  <option value="">All statuses</option>
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                  value={filters.businessScale || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, businessScale: e.target.value || undefined }))
                  }
                  className={selectClass}
                  aria-label="Business scale"
                >
                  <option value="">All scales</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <select
                  value={filters.riskLevel || ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, riskLevel: e.target.value || undefined }))}
                  className={selectClass}
                  aria-label="Risk level"
                >
                  <option value="">All risk levels</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  </select>
                <button type="button" onClick={handleSearch} disabled={loading} className={btnPrimary}>
                    Search
                  </button>
                <button type="button" onClick={clearFilters} className={btnSecondary}>
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <CompanyAnalyticsTable companies={companies} loading={loading} onRefresh={loadDashboardData} />
          </div>
        )}

      {activeTab === "subscriptions" && <SubscriptionPlansManager />}

      {activeTab === "billing" && platformMetrics && (
          <BillingOverview metrics={platformMetrics} companies={companies} />
        )}
    </div>
  );
};

export default SuperAdminDashboard;
