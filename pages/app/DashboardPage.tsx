import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DashboardCard, { DashboardMiniStat } from "../../components/DashboardCard";
import { useScreenLock } from "../../contexts/ScreenLockContext";
import DashboardSection from "../../components/DashboardSection";
import {
  CustomerIcon,
  ExpenseIcon,
  InvoiceIcon,
  RevenueIcon,
} from "../../constants";
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
import DashboardCallActivityMonitor from "../../components/dashboard/DashboardCallActivityMonitor";
import { GRANULAR_PERMISSIONS } from "../../config/permissions";
import {
  backfillExpenseCompanyIdsIfNeeded,
  getExpenseCompanyId,
} from "../../utils/expenseCompanyScope";
import { verifyScreenPin } from "../../utils/screenPin";

const BANK_BAL_AUTO_HIDE_MS = 60_000;

function DashboardBankEyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function DashboardBankEyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

const DashboardPage: React.FC = () => {
  usePageTitle("Dashboard");
  const location = useLocation();
  const { user, userProfile } = useAuth();
  const {
    hasScreenPin,
    isRevenueGateOpen,
    openRevenuePinModal,
  } = useScreenLock();

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
    canViewDashboardMyCallActivity,
    canViewLeadGenAnalytics,
    canViewLeadGenCreated,
    canViewLeadGenAssigned,
    canViewLeadGenConverted,
    canAccessMyAssignedLeadsPage,
    canAccessLeadsPage,
    leadsListViewAll,
    canAssignLeads,
    isOwner,
    isAdmin,
  } = usePermissions();
  const { refreshPermissions, setupRealTimeListeners } = usePermissionRefresh();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showBankBalances, setShowBankBalances] = useState(false);
  const [bankBalPinModalOpen, setBankBalPinModalOpen] = useState(false);
  const [bankBalPin, setBankBalPin] = useState("");
  const [bankBalPinBusy, setBankBalPinBusy] = useState(false);
  const [bankBalPinError, setBankBalPinError] = useState<string | null>(null);
  const [bankBalPinShake, setBankBalPinShake] = useState(0);
  const [bankBalanceToast, setBankBalanceToast] = useState<string | null>(null);
  const bankBalanceAutoHideTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const bankBalanceToastTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const bankBalPinInputRef = useRef<HTMLInputElement>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [myAssignedLeads, setMyAssignedLeads] = useState<Lead[]>([]);
  const [companyLeadsTeamView, setCompanyLeadsTeamView] = useState<Lead[]>([]);
  const [teamAssigneeLabels, setTeamAssigneeLabels] = useState<{ uid: string; label: string }[]>([]);
  const [leadAnalyticsLeads, setLeadAnalyticsLeads] = useState<Lead[]>([]);
  const [pinReminderDismissed, setPinReminderDismissed] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setPinReminderDismissed(false);
      return;
    }
    setPinReminderDismissed(
      sessionStorage.getItem(`pin_setup_reminder_dismissed_${user.uid}`) ===
        "1",
    );
  }, [user?.uid]);

  const clearBankBalanceAutoHideTimer = useCallback(() => {
    if (bankBalanceAutoHideTimerRef.current) {
      clearTimeout(bankBalanceAutoHideTimerRef.current);
      bankBalanceAutoHideTimerRef.current = null;
    }
  }, []);

  const flashBankBalanceToast = useCallback(
    (message: string, durationMs = 4000) => {
      if (bankBalanceToastTimerRef.current) {
        clearTimeout(bankBalanceToastTimerRef.current);
        bankBalanceToastTimerRef.current = null;
      }
      setBankBalanceToast(message);
      bankBalanceToastTimerRef.current = setTimeout(() => {
        setBankBalanceToast(null);
        bankBalanceToastTimerRef.current = null;
      }, durationMs);
    },
    [],
  );

  const scheduleBankBalanceAutoHide = useCallback(() => {
    clearBankBalanceAutoHideTimer();
    bankBalanceAutoHideTimerRef.current = setTimeout(() => {
      bankBalanceAutoHideTimerRef.current = null;
      setShowBankBalances(false);
      flashBankBalanceToast(
        "Bank balances were hidden automatically for your privacy.",
      );
    }, BANK_BAL_AUTO_HIDE_MS);
  }, [clearBankBalanceAutoHideTimer, flashBankBalanceToast]);

  useEffect(() => {
    return () => {
      clearBankBalanceAutoHideTimer();
      if (bankBalanceToastTimerRef.current) {
        clearTimeout(bankBalanceToastTimerRef.current);
        bankBalanceToastTimerRef.current = null;
      }
    };
  }, [clearBankBalanceAutoHideTimer]);

  useEffect(() => {
    if (!bankBalPinModalOpen) {
      setBankBalPin("");
      setBankBalPinError(null);
      setBankBalPinShake(0);
      setBankBalPinBusy(false);
    }
  }, [bankBalPinModalOpen]);

  useEffect(() => {
    if (!bankBalPinModalOpen || bankBalPin.length !== 4) return;
    if (!user?.uid || !userProfile?.screenPinHash) return;
    let active = true;
    setBankBalPinBusy(true);
    setBankBalPinError(null);
    void (async () => {
      try {
        const ok = await verifyScreenPin(
          user.uid,
          bankBalPin,
          userProfile.screenPinHash,
        );
        if (!active) return;
        if (!ok) {
          setBankBalPinBusy(false);
          setBankBalPinError("Incorrect PIN");
          setBankBalPinShake((c) => c + 1);
          setBankBalPin("");
          return;
        }
        setBankBalPinBusy(false);
        setBankBalPinModalOpen(false);
        setBankBalPin("");
        setBankBalPinError(null);
        setShowBankBalances(true);
        scheduleBankBalanceAutoHide();
      } catch {
        if (!active) return;
        setBankBalPinBusy(false);
        setBankBalPinError("Could not verify PIN. Try again.");
        setBankBalPinShake((c) => c + 1);
        setBankBalPin("");
      }
    })();
    return () => {
      active = false;
    };
  }, [
    bankBalPin,
    bankBalPinModalOpen,
    user?.uid,
    userProfile?.screenPinHash,
    scheduleBankBalanceAutoHide,
  ]);

  useEffect(() => {
    if (!bankBalPinModalOpen || bankBalPinShake === 0) return;
    bankBalPinInputRef.current?.focus();
  }, [bankBalPinShake, bankBalPinModalOpen]);

  const leadsViewAll = leadsListViewAll();
  const canAssign = canAssignLeads();
  const canLeadsPage = canAccessLeadsPage();
  /** Admins / assigners: dashboard shows team-wide assignment stats instead of “my” counts */
  const teamLeadsDashboardMode = (leadsViewAll || canAssign) && canLeadsPage;

  /** Sales / agent view: personal pipeline + calls first, not team overview. */
  const showPersonalWorkspace =
    !teamLeadsDashboardMode &&
    (canViewDashboardMyAssignedLeads() || canViewDashboardMyCallActivity());

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

  const assignmentReportCompanyId =
    userProfile?.isOwner ? (user?.uid ?? "") : (userProfile?.companyId ?? "");

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

    // Set up real-time listener for expenses (own only vs full company for owner / delegate)
    try {
      const companyWide =
        isOwner ||
        (userProfile.granularPermissions?.includes(
          GRANULAR_PERMISSIONS.EXPENSES_COMPANY_MANAGE,
        ) ??
          false);
      const expenseCompanyId = getExpenseCompanyId(user, userProfile);
      if (companyWide && expenseCompanyId) {
        void backfillExpenseCompanyIdsIfNeeded(expenseCompanyId);
      }
      const expensesQuery =
        companyWide && expenseCompanyId
          ? db.collection("expenses").where("companyId", "==", expenseCompanyId)
          : db.collection("expenses").where("userId", "==", user.uid);

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
        },
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
    canViewDashboardMyCallActivity() ||
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

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const linkPillClass =
    "inline-flex items-center rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-950/50 dark:text-primary-300 dark:hover:bg-primary-900/40";

  const onBankBalanceVisibilityClick = () => {
    if (showBankBalances) {
      clearBankBalanceAutoHideTimer();
      setShowBankBalances(false);
      return;
    }
    if (!hasScreenPin || !userProfile?.screenPinHash) {
      flashBankBalanceToast(
        "Set a 4-digit screen PIN on your profile to reveal balances.",
      );
      return;
    }
    setBankBalPinModalOpen(true);
  };

  const showPinSetupReminder =
    !!userProfile &&
    !userProfile.screenPinHash &&
    !pinReminderDismissed;

  const revenuePinRelevant =
    hasScreenPin &&
    !isRevenueGateOpen &&
    (totalRevenue > 0 || outstandingRevenue > 0);

  const blurTotalRevenue =
    hasScreenPin &&
    !isRevenueGateOpen &&
    totalRevenue > 0 &&
    canViewTotalRevenue();

  const blurOutstandingRevenue =
    hasScreenPin &&
    !isRevenueGateOpen &&
    outstandingRevenue > 0 &&
    canViewOutstandingRevenue();

  const pinBarActive = showPinSetupReminder && !!user?.uid;

  return (
    <>
      {pinBarActive ? (
        <div
          className="-mx-4 -mt-4 shrink-0 border-b border-amber-300/90 bg-amber-50 px-3 py-0.5 dark:border-amber-800/80 dark:bg-amber-950 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8"
          role="status"
        >
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <p className="min-w-0 flex-1 text-[11px] leading-tight text-amber-950 dark:text-amber-100/95 sm:text-xs">
              <span className="font-semibold">Screen PIN</span>
              <span className="text-amber-800/85 dark:text-amber-300/70">: </span>
              Set a 4-digit code on Profile to lock the app and reveal revenue safely.
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Link
                to="/profile"
                className="rounded bg-amber-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white hover:bg-amber-700 sm:text-xs"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem(
                    `pin_setup_reminder_dismissed_${user.uid}`,
                    "1",
                  );
                  setPinReminderDismissed(true);
                }}
                className="rounded border border-amber-700/25 bg-white/90 px-2 py-0.5 text-[11px] font-medium leading-none text-amber-900 hover:bg-white dark:border-amber-500/35 dark:bg-amber-900/70 dark:text-amber-50 sm:text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div
        className={
          pinBarActive
            ? "mx-auto max-w-[1600px] px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 lg:px-8 lg:pb-8 lg:pt-5"
            : "mobile-p-4 mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8"
        }
      >
      <header className="mb-8 border-b border-gray-200/90 pb-6 dark:border-gray-700/80">
        <h1 className="mobile-text-2xl text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{todayLabel}</p>
      </header>

      {/* Stats - real-time (top: revenue & key figures first) */}
      <div className="mb-8 space-y-3">
        {(canViewTotalRevenue() || canViewOutstandingRevenue()) &&
        revenuePinRelevant ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openRevenuePinModal}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              title="Enter PIN to show revenue amounts"
            >
              <svg
                className="h-5 w-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Show revenue
            </button>
          </div>
        ) : null}
        <div className="grid mobile-grid-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {canViewTotalRevenue() && (
            <DashboardCard
              title="Total revenue (paid)"
              value={formatCurrency(totalRevenue)}
              icon={<RevenueIcon />}
              variant="emerald"
              blurValue={blurTotalRevenue}
            />
          )}
          {canViewOutstandingRevenue() && (
            <DashboardCard
              title="Outstanding revenue"
              value={formatCurrency(outstandingRevenue)}
              icon={<InvoiceIcon />}
              variant="amber"
              blurValue={blurOutstandingRevenue}
            />
          )}
          {canViewMonthlyExpenses() && (
            <DashboardCard
              title="This month expenses"
              value={formatCurrency(thisMonthExpenses)}
              icon={<ExpenseIcon />}
              variant="rose"
            />
          )}
          {canViewTotalCustomers() && (
            <DashboardCard
              title="Total customers"
              value={customers.length.toString()}
              icon={<CustomerIcon />}
              variant="sky"
            />
          )}
        </div>
      </div>

      {showPersonalWorkspace && userProfile ? (
        <>
          {canViewDashboardMyAssignedLeads() ? (
            <DashboardSection
              title="Your pipeline"
              description="A quick snapshot of leads assigned to you: what’s active, what’s new, and what needs a follow-up."
              headerAction={
                canAccessMyAssignedLeadsPage() ? (
                  <Link
                    to="/leads/my-assigned"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 dark:hover:bg-primary-500"
                  >
                    Open workspace
                    <span aria-hidden>→</span>
                  </Link>
                ) : (
                  <span className="max-w-[14rem] text-right text-xs leading-snug text-gray-500 dark:text-gray-400">
                    Ask your admin for “My assigned leads” to open the full workspace.
                  </span>
                )
              }
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <DashboardMiniStat
                  label="Assigned to you"
                  value={myAssignedLeadStats.total}
                  tone="violet"
                  hint="All current leads"
                />
                <DashboardMiniStat
                  label="Active pipeline"
                  value={myAssignedLeadStats.active}
                  tone="emerald"
                  hint="Excludes won & lost"
                />
                <DashboardMiniStat
                  label="New (7 days)"
                  value={myAssignedLeadStats.assignedWeek}
                  tone="sky"
                  hint="By lead created date"
                />
                <DashboardMiniStat
                  label="Follow-ups due"
                  value={myAssignedLeadStats.followDue}
                  tone="amber"
                  hint="Next 7 days or overdue"
                />
              </div>
            </DashboardSection>
          ) : null}

          {canViewDashboardMyCallActivity() && assignmentReportCompanyId && user?.uid ? (
            <DashboardCallActivityMonitor companyId={assignmentReportCompanyId} userId={user.uid} />
          ) : null}
        </>
      ) : null}

      {!hasAnyDashboardPermission && !isOwner && (
        <div className="rounded-2xl border border-gray-200/90 bg-gradient-to-b from-white to-gray-50/80 p-10 text-center shadow-sm dark:border-gray-700/80 dark:from-gray-800 dark:to-gray-900/50">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl dark:bg-gray-700">
            📊
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dashboard access limited
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            You don&apos;t have permissions to view dashboard sections. Contact
            your administrator to request access.
          </p>
        </div>
      )}

      {canViewLeadGenAnalytics() && (
        <DashboardSection
          title="Lead generation analytics"
          description={
            leadAnalyticsStats.companyScope
              ? "Company-wide lead generation progress."
              : "Your lead generation progress (leads created by you)."
          }
          headerAction={
            canLeadsPage ? (
              <Link to="/leads" className={linkPillClass}>
                Open leads →
              </Link>
            ) : null
          }
          bodyClassName="!pt-5"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {canViewLeadGenCreated() && (
              <DashboardMiniStat
                label="Leads added"
                value={leadAnalyticsStats.totalAdded}
              />
            )}
            {canViewLeadGenAssigned() && (
              <DashboardMiniStat
                label="Assigned to agents"
                value={leadAnalyticsStats.assigned}
                hint={`Unassigned: ${leadAnalyticsStats.unassigned}`}
              />
            )}
            {canViewLeadGenConverted() && (
              <DashboardMiniStat
                label="Converted"
                value={leadAnalyticsStats.converted}
                hint="Converted to customer"
              />
            )}
            {canViewLeadGenCreated() && canViewLeadGenConverted() && (
              <DashboardMiniStat
                label="Conversion rate"
                value={`${leadAnalyticsStats.conversionRate}%`}
                hint="Converted / added"
              />
            )}
          </div>
          {!canViewLeadGenCreated() &&
            !canViewLeadGenAssigned() &&
            !canViewLeadGenConverted() && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No lead analytics metrics are enabled for your role. Ask your
                admin to enable metric permissions.
              </p>
            )}
        </DashboardSection>
      )}

      {teamLeadsDashboardMode && (
        <DashboardSection
          title="Team lead assignments"
          description="Live counts per user across your company’s leads (assigned, active pipeline, and follow-ups in the next 7 days). Use Leads to assign or reassign."
          headerAction={
            <Link to="/leads" className={linkPillClass}>
              Open leads →
            </Link>
          }
          bodyClassName="!py-0 sm:!py-0"
        >
          {teamLeadAssignmentRows.length === 0 ? (
            <p className="py-4 text-sm text-gray-500 dark:text-gray-400">
              No leads in this company yet.
            </p>
          ) : (
            <div className="table-responsive -mx-5 sm:-mx-6">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="border-b border-gray-200/90 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-3 font-medium sm:px-6">User</th>
                    <th className="px-3 py-3 text-right font-medium">Assigned</th>
                    <th className="px-3 py-3 text-right font-medium">Active</th>
                    <th className="px-5 py-3 text-right font-medium sm:px-6">
                      Follow-ups (7d)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/80">
                  {teamLeadAssignmentRows.map((row) => (
                    <tr
                      key={row.uid}
                      className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white sm:px-6">
                        {row.label}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.total}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.active}</td>
                      <td className="px-5 py-3 text-right tabular-nums sm:px-6">
                        {row.followDue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardSection>
      )}

      {canViewDashboardBankAccounts() && (
        <DashboardSection
          title="Bank accounts"
          description="Balances stay hidden until you enter your screen PIN. They hide again after one minute unless you hide them sooner."
          headerAction={
            bankBalances.length > 0 ? (
              <button
                type="button"
                onClick={onBankBalanceVisibilityClick}
                aria-pressed={showBankBalances}
                aria-label={
                  showBankBalances
                    ? "Hide bank balances on dashboard"
                    : "Show bank balances on dashboard (PIN required)"
                }
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-2.5 py-2.5 text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {showBankBalances ? (
                  <DashboardBankEyeSlashIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <DashboardBankEyeIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            ) : undefined
          }
        >
          {bankBalances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center dark:border-gray-600 dark:bg-gray-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                No bank accounts yet.
              </p>
              <Link
                to="/bank-accounts"
                className={`${linkPillClass} mt-4 inline-flex`}
              >
                Add bank account
              </Link>
            </div>
          ) : (
            <div className="grid mobile-grid-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bankBalances.map((account) => (
                <div
                  key={account.id}
                  className="group flex flex-col rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm ring-1 ring-black/[0.03] transition hover:border-primary-200/80 hover:shadow-md dark:border-gray-700/90 dark:bg-gray-900/60 dark:ring-white/[0.04] dark:hover:border-primary-900/50"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">
                        {account.accountName?.trim() || "Account"}
                      </h3>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Bank
                      </p>
                      <p className="text-sm leading-snug text-gray-600 dark:text-gray-300">
                        {account.bankName?.trim() || "-"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-gray-800 dark:text-slate-200">
                      {account.currency}
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Current balance
                    </p>
                    <div
                      className={`mt-1.5 min-h-[2.5rem] overflow-hidden rounded-lg ${
                        showBankBalances
                          ? ""
                          : "select-none bg-slate-100/95 dark:bg-gray-800/95"
                      }`}
                    >
                      <p
                        className={`text-xl font-bold tabular-nums tracking-tight text-emerald-600 transition dark:text-emerald-400 ${
                          showBankBalances
                            ? ""
                            : "blur-[20px] opacity-50 dark:opacity-45"
                        }`}
                        aria-hidden={!showBankBalances}
                      >
                        {formatCurrency(
                          account.currentBalance || 0,
                          account.currency,
                          account.currencySymbol || "$",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      )}

      {canViewRecentInvoices() && (
        <DashboardSection
          title="Recent invoices"
          description="Latest activity across your account."
          headerAction={
            <Link to="/invoices" className={linkPillClass}>
              View all
            </Link>
          }
          bodyClassName="!py-0 sm:!py-0"
        >
          {invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center dark:border-gray-600 dark:bg-gray-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                No invoices yet.
              </p>
              <Link
                to="/invoices/new"
                className={`${linkPillClass} mt-4 inline-flex bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/35`}
              >
                Create first invoice
              </Link>
            </div>
          ) : (
            <div className="table-responsive -mx-5 sm:-mx-6">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="border-b border-gray-200/90 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-5 py-3 sm:px-6">
                      Invoice #
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Customer
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Amount
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Status
                    </th>
                    {(isOwner || isAdmin) && (
                      <th scope="col" className="px-5 py-3 sm:px-6">
                        Created by
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/80">
                  {invoices.slice(0, 5).map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="transition-colors hover:bg-gray-50/90 dark:hover:bg-gray-900/25"
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white sm:px-6">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-3 py-3.5">{invoice.customerName}</td>
                      <td className="px-3 py-3.5 tabular-nums">
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
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                            invoice.status === "paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : invoice.status === "sent"
                                ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                                : invoice.status === "overdue"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {invoice.status.charAt(0).toUpperCase() +
                            invoice.status.slice(1)}
                        </span>
                      </td>
                      {(isOwner || isAdmin) && (
                        <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 sm:px-6">
                          {invoice.createdBy || "Unknown User"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardSection>
      )}

      {canAccessInvoiceVerification() && (
        <section className="mt-2 mb-6 overflow-hidden rounded-2xl border border-gray-200/90 bg-white/80 shadow-sm ring-1 ring-black/[0.03] dark:border-gray-700/90 dark:bg-gray-800/80 dark:ring-white/[0.05]">
          <div className="p-5 sm:p-6">
            <InvoiceVerificationSection />
          </div>
        </section>
      )}

      {bankBalPinModalOpen ? (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dash-bank-pin-title"
          aria-describedby="dash-bank-pin-desc"
          onClick={() => setBankBalPinModalOpen(false)}
        >
          <div
            className="relative w-full max-w-[380px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-primary-400/35 via-slate-200/80 to-primary-600/25 opacity-90 blur-[0.5px] dark:from-primary-500/25 dark:via-slate-600/50 dark:to-primary-400/20" />
            <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:border-gray-700/80 dark:bg-gray-900/95 dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:ring-white/10">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 dark:via-white/20" />
              <div className="px-7 pb-7 pt-8">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/15 to-primary-600/10 text-primary-600 shadow-inner ring-1 ring-primary-500/20 dark:from-primary-400/20 dark:to-primary-600/10 dark:text-primary-400 dark:ring-primary-400/25">
                  <svg
                    className="h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h2
                  id="dash-bank-pin-title"
                  className="text-center text-xl font-semibold tracking-tight text-slate-900 dark:text-white"
                >
                  Show balances
                </h2>
                <p
                  id="dash-bank-pin-desc"
                  className="mt-2 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400"
                >
                  Enter your 4-digit screen PIN. Balances stay visible for one
                  minute unless you hide them.
                </p>
                <div className="mt-7 space-y-3">
                  <div
                    key={bankBalPinShake}
                    className={
                      bankBalPinShake > 0
                        ? "screen-pin-shake rounded-2xl"
                        : "rounded-2xl"
                    }
                  >
                    <label htmlFor="dash-bank-pin-input" className="sr-only">
                      Four digit PIN
                    </label>
                    <input
                      ref={bankBalPinInputRef}
                      id="dash-bank-pin-input"
                      type="password"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={4}
                      disabled={bankBalPinBusy}
                      className={`block w-full rounded-2xl border-2 px-4 py-3.5 text-center text-2xl font-semibold tabular-nums tracking-[0.55em] text-slate-900 shadow-sm transition-colors duration-200 placeholder:text-slate-300 focus:outline-none focus:ring-4 disabled:opacity-60 dark:text-white dark:placeholder:text-slate-600 ${
                        bankBalPinError
                          ? "border-red-400 bg-red-50/90 ring-red-200/80 focus:border-red-500 focus:ring-red-500/25 dark:border-red-500/60 dark:bg-red-950/40 dark:ring-red-900/50 dark:focus:border-red-400 dark:focus:ring-red-500/20"
                          : "border-slate-200/90 bg-slate-50/80 focus:border-primary-500 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800/80 dark:focus:border-primary-400 dark:focus:ring-primary-400/25"
                      }`}
                      placeholder="••••"
                      value={bankBalPin}
                      onChange={(e) => {
                        setBankBalPinError(null);
                        setBankBalPin(
                          e.target.value.replace(/\D/g, "").slice(0, 4),
                        );
                      }}
                      autoFocus
                      aria-invalid={!!bankBalPinError}
                      aria-describedby={
                        bankBalPinError ? "dash-bank-pin-err" : undefined
                      }
                    />
                  </div>
                  {bankBalPinError ? (
                    <p
                      id="dash-bank-pin-err"
                      className="text-center text-sm font-medium text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      {bankBalPinError}
                    </p>
                  ) : bankBalPinBusy ? (
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                      Verifying…
                    </p>
                  ) : null}
                </div>
                <div className="mt-6 flex justify-center border-t border-slate-100 pt-5 dark:border-gray-700/80">
                  <button
                    type="button"
                    onClick={() => setBankBalPinModalOpen(false)}
                    className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {bankBalanceToast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[160] max-w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-center text-sm leading-snug text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
        >
          {bankBalanceToast}
        </div>
      ) : null}
    </div>
    </>
  );
};

export default DashboardPage;
