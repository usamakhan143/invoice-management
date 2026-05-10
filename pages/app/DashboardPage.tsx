import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DashboardCard from "../../components/DashboardCard";
import { CustomerIcon, InvoiceIcon, RevenueIcon } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { usePermissionRefresh } from "../../hooks/usePermissionRefresh";
import { db } from "../../services/firebase";
import { InvoiceService } from "../../services/invoiceService";
import { CustomerService } from "../../services/customerService";
import { BankAccountService } from "../../services/bankAccountService";
import type { Invoice, Customer, BankAccount, Expense, Lead, CompanyUser } from "../../types";
import { LeadService } from "../../services/leadService";
import Spinner from "../../components/Spinner";
import InvoiceVerificationSection from "../../components/InvoiceVerificationSection";

const DashboardPage: React.FC = () => {
  usePageTitle("Dashboard");
  const location = useLocation();
  const { user, userProfile } = useAuth();

  // Check if we arrived via impersonation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('impersonated') || params.get('test_impersonated')) {
    }
  }, [location.search, userProfile]);

  const {
    canViewTotalRevenue,
    canViewOutstandingRevenue,
    canViewMonthlyExpenses,
    canViewTotalCustomers,
    canViewDashboardBankAccounts,
    canViewRecentInvoices,
    canAccessInvoiceVerification,
    canViewDebugInfo,
    canViewDashboardMyAssignedLeads,
    canViewLeadGenAnalytics,
    canViewLeadGenCreated,
    canViewLeadGenAssigned,
    canViewLeadGenConverted,
    canAccessMyAssignedLeadsPage,
    canAccessLeadsPage,
    leadsListViewAll,
    canAssignLeads,
    isOwner,
    isAdmin
  } = usePermissions();
  const { refreshPermissions, setupRealTimeListeners } = usePermissionRefresh();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [myAssignedLeads, setMyAssignedLeads] = useState<Lead[]>([]);
  const [companyLeadsTeamView, setCompanyLeadsTeamView] = useState<Lead[]>([]);
  const [teamAssigneeLabels, setTeamAssigneeLabels] = useState<{ uid: string; label: string }[]>([]);
  const [leadAnalyticsLeads, setLeadAnalyticsLeads] = useState<Lead[]>([]);

  const leadsViewAll = leadsListViewAll();
  const canAssign = canAssignLeads();
  const canLeadsPage = canAccessLeadsPage();
  /** Admins / assigners: dashboard shows team-wide assignment stats instead of “my” counts */
  const teamLeadsDashboardMode = (leadsViewAll || canAssign) && canLeadsPage;

  const mayViewMyAssignedDash = canViewDashboardMyAssignedLeads();
  const showLeadGenAnalytics = canViewLeadGenAnalytics();

  useEffect(() => {
    if (!user || !userProfile) return;
    if (!showLeadGenAnalytics) return;
    const unsub = LeadService.getLeadsRealTime(user, userProfile, leadsViewAll, setLeadAnalyticsLeads);
    return () => unsub();
  }, [user, userProfile, leadsViewAll, showLeadGenAnalytics]);

  useEffect(() => {
    if (!user || !userProfile || teamLeadsDashboardMode) return;
    if (!mayViewMyAssignedDash) return;
    const unsub = LeadService.getLeadsAssignedToMeRealTime(user, userProfile, setMyAssignedLeads);
    return () => unsub();
  }, [user, userProfile, mayViewMyAssignedDash, teamLeadsDashboardMode]);

  useEffect(() => {
    if (!user || !userProfile || !teamLeadsDashboardMode) return;
    const unsub = LeadService.getLeadsRealTime(user, userProfile, true, setCompanyLeadsTeamView);
    return () => unsub();
  }, [user, userProfile, teamLeadsDashboardMode]);

  useEffect(() => {
    if (!teamLeadsDashboardMode || !user || !userProfile) return;
    const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;
    if (!companyId) return;

    const load = async () => {
      const out: { uid: string; label: string }[] = [];
      const ownerSnap = await db.collection("users").doc(companyId).get();
      if (ownerSnap.exists) {
        const d = ownerSnap.data();
        out.push({
          uid: companyId,
          label: d?.displayName || d?.companyName || "Owner",
        });
      }
      const snap = await db.collection("companyUsers").where("companyId", "==", companyId).get();
      snap.docs.forEach((docSnap) => {
        const u = docSnap.data() as CompanyUser;
        const uid = u.uid || docSnap.id;
        if (!out.some((x) => x.uid === uid)) {
          out.push({
            uid,
            label: u.displayName || u.email || uid,
          });
        }
      });
      if (!out.some((x) => x.uid === user.uid)) {
        out.push({
          uid: user.uid,
          label: userProfile.displayName || userProfile.email || "Me",
        });
      }
      setTeamAssigneeLabels(out);
    };
    void load();
  }, [teamLeadsDashboardMode, user, userProfile]);

  const myAssignedLeadStats = React.useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAhead = now + 7 * 24 * 60 * 60 * 1000;
    let active = 0;
    let assignedWeek = 0;
    let followDue = 0;
    for (const l of myAssignedLeads) {
      if (l.status !== "Won" && l.status !== "Lost") active += 1;
      const created = l.createdAt?.toMillis?.() ?? 0;
      if (created >= weekAgo) assignedWeek += 1;
      const fu = l.nextFollowUpDate?.toMillis?.();
      if (fu != null && !Number.isNaN(fu) && fu <= sevenDaysAhead) followDue += 1;
    }
    return {
      total: myAssignedLeads.length,
      active,
      assignedWeek,
      followDue,
    };
  }, [myAssignedLeads]);

  const teamLeadAssignmentRows = React.useMemo(() => {
    const label = (uid: string) =>
      uid === "__unassigned__"
        ? "Unassigned"
        : teamAssigneeLabels.find((a) => a.uid === uid)?.label || uid;
    const now = Date.now();
    const sevenDaysAhead = now + 7 * 24 * 60 * 60 * 1000;
    const byUid = new Map<string, { total: number; active: number; followDue: number }>();
    for (const l of companyLeadsTeamView) {
      const uid = (l.assignedUserId || "").trim();
      const key = uid || "__unassigned__";
      if (!byUid.has(key)) {
        byUid.set(key, { total: 0, active: 0, followDue: 0 });
      }
      const row = byUid.get(key)!;
      row.total += 1;
      if (l.status !== "Won" && l.status !== "Lost") row.active += 1;
      const fu = l.nextFollowUpDate?.toMillis?.();
      if (fu != null && !Number.isNaN(fu) && fu <= sevenDaysAhead) row.followDue += 1;
    }
    const keys = [...byUid.keys()].sort((a, b) => {
      if (a === "__unassigned__") return 1;
      if (b === "__unassigned__") return -1;
      return label(a).localeCompare(label(b), undefined, { sensitivity: "base" });
    });
    return keys.map((k) => ({ uid: k, label: label(k), ...byUid.get(k)! }));
  }, [companyLeadsTeamView, teamAssigneeLabels]);

  const leadAnalyticsStats = React.useMemo(() => {
    const companyScope = leadsViewAll || canAssign;
    const base = companyScope
      ? leadAnalyticsLeads
      : leadAnalyticsLeads.filter((l) => (l.createdById || "") === user?.uid);

    const totalAdded = base.length;
    const assigned = base.filter((l) => !!(l.assignedUserId || "").trim()).length;
    const converted = base.filter((l) => !!(l.convertedCustomerId || "").trim()).length;
    const unassigned = Math.max(0, totalAdded - assigned);
    const conversionRate =
      totalAdded > 0 ? Math.round((converted / totalAdded) * 1000) / 10 : 0;

    return {
      companyScope,
      totalAdded,
      assigned,
      converted,
      unassigned,
      conversionRate,
    };
  }, [leadAnalyticsLeads, leadsViewAll, canAssign, user?.uid]);

  useEffect(() => {
    if (!user || !userProfile) return;

    setLoading(true);

    // Set up real-time permission listeners
    setupRealTimeListeners();

    // Failsafe: Stop loading after 10 seconds
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 10000);

    const unsubscribers: Array<() => void> = [];

    // Set up real-time listeners for invoices
    try {
      const invoicesUnsubscribe = InvoiceService.getInvoicesRealTime(
        user,
        userProfile,
        isOwner,
        isAdmin,
        (invoicesData) => {
          setInvoices(invoicesData);
          setLoading(false);
        },
      );
      unsubscribers.push(invoicesUnsubscribe);
    } catch (error) {
      console.error("Error setting up invoice listener:", error);
      setInvoices([]);
    }

    // Set up real-time listeners for customers
    try {
      const customersUnsubscribe = CustomerService.getCustomersRealTime(
        user,
        userProfile,
        isOwner,
        isAdmin,
        (customersData) => {
          setCustomers(customersData);
        },
      );
      unsubscribers.push(customersUnsubscribe);
    } catch (error) {
      console.error("Error setting up customers listener:", error);
      setCustomers([]);
    }

    try {
      const bankAccountsUnsubscribe = BankAccountService.subscribeBankAccountsForCompany(
        user,
        userProfile,
        (bankAccountsData) => {
          setBankAccounts(bankAccountsData);
        },
      );
      unsubscribers.push(bankAccountsUnsubscribe);
    } catch (error) {
      console.error("Error setting up bank accounts listener:", error);
      setBankAccounts([]);
    }

    // Set up real-time listener for expenses
    try {
      const expensesQuery = db
        .collection("expenses")
        .where("userId", "==", user.uid);
      
      const expensesUnsubscribe = expensesQuery.onSnapshot(
        (snapshot) => {
          const expensesData = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Expense,
          );
          setExpenses(expensesData);
        },
        (error) => {
          console.error("Error in expenses real-time listener:", error);
          setExpenses([]);
        }
      );
      unsubscribers.push(expensesUnsubscribe);
    } catch (error) {
      console.error("Error setting up expenses listener:", error);
      setExpenses([]);
    }

    // Load exchange rates (not real-time, updated periodically)
    const loadExchangeRates = async () => {
      try {
        const exchangeRatesResponse = await fetch(
          "https://open.er-api.com/v6/latest/USD",
        );
        const data = await exchangeRatesResponse.json();
        if (data && data.rates) {
          setExchangeRates(data.rates);
        } else {
          setExchangeRates({ USD: 1, PKR: 278, EUR: 0.85 });
        }
      } catch (ratesError) {
        console.error("Error loading exchange rates:", ratesError);
        setExchangeRates({ USD: 1, PKR: 278, EUR: 0.85 });
      }
    };

    loadExchangeRates();

    // Refresh exchange rates every 5 minutes
    const exchangeRatesInterval = setInterval(loadExchangeRates, 5 * 60 * 1000);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      clearInterval(exchangeRatesInterval);
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [user, userProfile, isOwner, isAdmin]);

  const formatCurrency = (
    amount: number,
    currency: string = "USD",
    symbol: string = "$",
  ) => {
    const formattedAmount = amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return symbol + formattedAmount;
  };

  // Calculate real-time totals
  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => {
      const rate = exchangeRates[inv.bankAccountCurrency || "USD"] || 1;
      const convertedTotal = inv.total / rate;
      return sum + convertedTotal;
    }, 0);

  const outstandingRevenue = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => {
      const rate = exchangeRates[inv.bankAccountCurrency || "USD"] || 1;
      const convertedTotal = inv.total / rate;
      return sum + convertedTotal;
    }, 0);

  const thisMonthExpenses = expenses
    .filter((exp) => {
      const expenseDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
      const now = new Date();
      return (
        expenseDate.getMonth() === now.getMonth() &&
        expenseDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, exp) => {
      const rate = exchangeRates[exp.currency || "USD"] || 1;
      const convertedAmount = exp.amount / rate;
      return sum + convertedAmount;
    }, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  // Check if user has any dashboard permissions
  const hasAnyDashboardPermission =
    canViewTotalRevenue() ||
    canViewOutstandingRevenue() ||
    canViewMonthlyExpenses() ||
    canViewTotalCustomers() ||
    canViewDashboardBankAccounts() ||
    canViewRecentInvoices() ||
    canAccessInvoiceVerification() ||
    canViewDashboardMyAssignedLeads() ||
    canViewLeadGenAnalytics() ||
    teamLeadsDashboardMode;

  // Calculate real-time bank balances
  const bankBalances = bankAccounts.map((account) => {
    const paidInvoicesTotal = invoices
      .filter(
        (inv) => inv.status === "paid" && inv.bankAccountId === account.id,
      )
      .reduce((sum, inv) => sum + inv.total, 0);

    const expensesTotal = expenses
      .filter((exp) => exp.bankAccountId === account.id)
      .reduce((sum, exp) => sum + exp.amount, 0);

    const currentBalance =
      (account.initialBalance || 0) + paidInvoicesTotal - expensesTotal;
    return {
      ...account,
      currentBalance,
    };
  });

  return (
    <div className="mobile-p-4 p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="mobile-text-2xl text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          Dashboard
        </h1>
      </div>

      {!hasAnyDashboardPermission && !isOwner && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Dashboard Access Limited
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permissions to view dashboard sections. Contact your administrator to request access.
          </p>
        </div>
      )}

      {/* Stats Cards - All now update in real-time */}
      <div className="grid mobile-grid-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {canViewTotalRevenue() && (
          <div className="relative">
            <DashboardCard
              title="Total Revenue (Paid)"
              value={formatCurrency(totalRevenue)}
              icon={<RevenueIcon />}
              color="bg-green-500"
            />
          </div>
        )}
        {canViewOutstandingRevenue() && (
          <div className="relative">
            <DashboardCard
              title="Outstanding Revenue"
              value={formatCurrency(outstandingRevenue)}
              icon={<InvoiceIcon />}
              color="bg-yellow-500"
            />
          </div>
        )}
        {canViewMonthlyExpenses() && (
          <div className="relative">
            <DashboardCard
              title="This Month Expenses"
              value={formatCurrency(thisMonthExpenses)}
              icon={
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
              color="bg-red-500"
            />
          </div>
        )}
        {canViewTotalCustomers() && (
          <div className="relative">
            <DashboardCard
              title="Total Customers"
              value={customers.length.toString()}
              icon={<CustomerIcon />}
              color="bg-blue-500"
            />
          </div>
        )}
      </div>

      {canViewLeadGenAnalytics() && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-white">
                Lead generation analytics
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {leadAnalyticsStats.companyScope
                  ? "Company-wide lead generation progress."
                  : "Your lead generation progress (leads created by you)."}
              </p>
            </div>
            {canLeadsPage ? (
              <Link
                to="/leads"
                className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400 shrink-0"
              >
                Open leads →
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {canViewLeadGenCreated() && (
              <div className="rounded-lg border border-gray-100 dark:border-gray-600 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Leads added
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {leadAnalyticsStats.totalAdded}
                </p>
              </div>
            )}
            {canViewLeadGenAssigned() && (
              <div className="rounded-lg border border-gray-100 dark:border-gray-600 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Assigned to agents
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {leadAnalyticsStats.assigned}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Unassigned: {leadAnalyticsStats.unassigned}
                </p>
              </div>
            )}
            {canViewLeadGenConverted() && (
              <div className="rounded-lg border border-gray-100 dark:border-gray-600 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Converted
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {leadAnalyticsStats.converted}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Converted to customer
                </p>
              </div>
            )}
            {canViewLeadGenCreated() && canViewLeadGenConverted() && (
              <div className="rounded-lg border border-gray-100 dark:border-gray-600 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Conversion rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {leadAnalyticsStats.conversionRate}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Converted / added
                </p>
              </div>
            )}
          </div>
          {!canViewLeadGenCreated() &&
            !canViewLeadGenAssigned() &&
            !canViewLeadGenConverted() && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                No lead analytics metrics are enabled for your role. Ask your admin to enable metric permissions.
              </p>
            )}
        </div>
      )}

      {teamLeadsDashboardMode && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-white">
                Team lead assignments
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
                Live counts per user across your company&apos;s leads (who has how many assigned, active pipeline,
                and follow-ups in the next 7 days). Use Leads to assign or reassign.
              </p>
            </div>
            <Link
              to="/leads"
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400 shrink-0"
            >
              Open leads →
            </Link>
          </div>
          {teamLeadAssignmentRows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No leads in this company yet.</p>
          ) : (
            <div className="table-responsive -mx-2 sm:mx-0">
              <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium text-right">Assigned</th>
                    <th className="px-3 py-2 font-medium text-right">Active</th>
                    <th className="px-3 py-2 font-medium text-right">Follow-ups (7d)</th>
                  </tr>
                </thead>
                <tbody>
                  {teamLeadAssignmentRows.map((row) => (
                    <tr
                      key={row.uid}
                      className="border-b border-gray-100 dark:border-gray-700/80 last:border-0"
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.total}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.active}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.followDue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {canViewDashboardMyAssignedLeads() && !teamLeadsDashboardMode && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-white">
                My assigned leads
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Live counts for leads currently assigned to you. Open the full page for date-wise history and
                detailed progress.
              </p>
            </div>
            {canAccessMyAssignedLeadsPage() ? (
              <Link
                to="/leads/my-assigned"
                className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400 shrink-0"
              >
                View full page →
              </Link>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 max-w-[12rem] text-right">
                Ask your admin for “My assigned leads” page access to open the full view.
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-gray-100 dark:border-gray-600 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Total assigned
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {myAssignedLeadStats.total}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-600 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Active pipeline
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {myAssignedLeadStats.active}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Excludes won &amp; lost</p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-600 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                New leads (7 days)
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {myAssignedLeadStats.assignedWeek}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">By lead created date</p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-600 p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Follow-ups due
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {myAssignedLeadStats.followDue}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Next 7 days or overdue</p>
            </div>
          </div>
        </div>
      )}

      {/* Bank Accounts Overview - Now updates in real-time */}
      {canViewDashboardBankAccounts() && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-white">
              Bank Accounts
            </h2>
          </div>
          {bankBalances.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No bank accounts found.
              </p>
              <Link
                to="/bank-accounts"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Bank Account
              </Link>
            </div>
          ) : (
            <div className="grid mobile-grid-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bankBalances.map((account) => (
                <div
                  key={account.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                >
                  <h3 className="font-semibold text-gray-800 dark:text-white">
                    {account.accountName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {account.bankName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {account.currency}
                  </p>
                  <p className="text-lg font-bold text-green-600 mt-2">
                    {formatCurrency(
                      account.currentBalance || 0,
                      account.currency,
                      account.currencySymbol || "$",
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Invoices - Already has real-time updates */}
      {canViewRecentInvoices() && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-white">
              Recent Invoices
            </h2>
            <div className="flex items-center gap-4">
              <Link
                to="/invoices"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View All
              </Link>
            </div>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                No invoices found.
              </p>
              <Link
                to="/invoices/new"
                className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Create First Invoice
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Invoice #
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Status
                    </th>
                    {(isOwner || isAdmin) && (
                      <th scope="col" className="px-6 py-3">
                        Created By
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 5).map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">{invoice.customerName}</td>
                      <td className="px-6 py-4">
                        {(() => {
                          const bankAccount = bankAccounts.find(
                            (b) => b.id === invoice.bankAccountId,
                          );
                          return formatCurrency(
                            invoice.total,
                            invoice.bankAccountCurrency || "USD",
                            bankAccount?.currencySymbol || "$",
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            invoice.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : invoice.status === "sent"
                                ? "bg-blue-100 text-blue-800"
                                : invoice.status === "overdue"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {invoice.status.charAt(0).toUpperCase() +
                            invoice.status.slice(1)}
                        </span>
                      </td>
                      {(isOwner || isAdmin) && (
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {invoice.createdBy || "Unknown User"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoice Verification Section */}
      {canAccessInvoiceVerification() && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
          <InvoiceVerificationSection />
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
