import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { db } from "../../services/firebase";
import { resolveCompanyIdForUser } from "../../services/companyId";
import { downloadCsv } from "../../utils/csvExport";
import { runBalanceIntegrityCheck } from "../../services/balanceIntegrityService";
import Spinner from "../../components/Spinner";
import type firebase from "firebase/compat/app";
import type {
  Expense,
  ExpenseReturn,
  Loan,
  LoanRepayment,
  BankReconciliation,
  BankDeposit,
  BankAccount,
  BankTransfer,
  Invoice,
} from "../../types";

type ReportTab =
  | "cashflow"
  | "expenses"
  | "returns"
  | "loans"
  | "deposits"
  | "reconciliations"
  | "accounts"
  | "integrity";

type RangePreset = "month" | "quarter" | "year" | "all" | "custom";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "cashflow", label: "Cash flow" },
  { id: "expenses", label: "Expenses" },
  { id: "returns", label: "Returns" },
  { id: "loans", label: "Loans" },
  { id: "deposits", label: "Deposits" },
  { id: "reconciliations", label: "Reconciliations" },
  { id: "accounts", label: "Accounts" },
  { id: "integrity", label: "Balance check" },
];

const toInput = (d: Date) => d.toISOString().split("T")[0];

function presetRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  const today = toInput(now);
  switch (preset) {
    case "month":
      return { from: toInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return { from: toInput(new Date(now.getFullYear(), q * 3, 1)), to: today };
    }
    case "year":
      return { from: toInput(new Date(now.getFullYear(), 0, 1)), to: today };
    default:
      return { from: "", to: "" };
  }
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function tsToDate(ts?: firebase.firestore.Timestamp): Date | null {
  return ts?.toDate?.() ?? null;
}

function dateLabel(ts?: firebase.firestore.Timestamp): string {
  return tsToDate(ts)?.toLocaleDateString() ?? "—";
}

/** Sum amounts grouped by currency symbol → "$1,200.00 · ₨50,000.00". */
function totalsByCurrency(
  rows: { amount: number; currencySymbol?: string }[],
): string {
  const map = new Map<string, number>();
  for (const r of rows) {
    const sym = r.currencySymbol || "$";
    map.set(sym, (map.get(sym) ?? 0) + (Number(r.amount) || 0));
  }
  if (map.size === 0) return "—";
  return [...map.entries()].map(([sym, total]) => `${sym}${fmt(total)}`).join(" · ");
}

const ReportsPage: React.FC = () => {
  usePageTitle("Reports");
  const { user, userProfile } = useAuth();
  const { canViewReports, canExportReports } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("cashflow");
  const [preset, setPreset] = useState<RangePreset>("year");
  const [range, setRange] = useState(() => presetRange("year"));

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [returns, setReturns] = useState<ExpenseReturn[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [deposits, setDeposits] = useState<BankDeposit[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);

  const companyId = useMemo(
    () => (user && userProfile ? resolveCompanyIdForUser(user, userProfile) : ""),
    [user, userProfile],
  );

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    try {
      const byCompany = (col: string) =>
        db.collection(col).where("companyId", "==", companyId).get();

      const [
        expSnap,
        retSnap,
        loanSnap,
        repaySnap,
        reconSnap,
        depSnap,
        acctSnap,
        invSnap,
        xferSnap,
      ] = await Promise.all([
        byCompany("expenses"),
        byCompany("expenseReturns"),
        byCompany("loans"),
        byCompany("loanRepayments"),
        byCompany("bankReconciliations"),
        byCompany("bankDeposits"),
        byCompany("bankAccounts"),
        byCompany("invoices"),
        byCompany("bankTransfers"),
      ]);

      setExpenses(
        expSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense),
      );
      setReturns(
        retSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExpenseReturn),
      );
      setLoans(loanSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Loan));
      setRepayments(
        repaySnap.docs.map((d) => ({ id: d.id, ...d.data() }) as LoanRepayment),
      );
      setReconciliations(
        reconSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as BankReconciliation,
        ),
      );
      setDeposits(
        depSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BankDeposit),
      );
      setAccounts(
        acctSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BankAccount),
      );
      setInvoices(
        invSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice),
      );
      setTransfers(
        xferSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BankTransfer),
      );
    } catch (err) {
      console.error("Failed to load report data:", err);
      setError("Failed to load report data. Try again.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onPresetChange = (next: RangePreset) => {
    setPreset(next);
    if (next !== "custom") setRange(presetRange(next));
  };

  // Inclusive date-range predicate against a Timestamp field.
  const inRange = useCallback(
    (ts?: firebase.firestore.Timestamp): boolean => {
      const d = tsToDate(ts);
      if (!d) return false;
      if (range.from) {
        const from = new Date(range.from);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (range.to) {
        const to = new Date(range.to);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    },
    [range.from, range.to],
  );

  // --- Filtered datasets (transaction reports honor the date range) ---
  const fExpenses = useMemo(
    () => expenses.filter((e) => inRange(e.date)).sort(
      (a, b) => (tsToDate(b.date)?.getTime() ?? 0) - (tsToDate(a.date)?.getTime() ?? 0),
    ),
    [expenses, inRange],
  );
  const fReturns = useMemo(
    () => returns.filter((r) => inRange(r.receivedDate)).sort(
      (a, b) => (tsToDate(b.receivedDate)?.getTime() ?? 0) - (tsToDate(a.receivedDate)?.getTime() ?? 0),
    ),
    [returns, inRange],
  );
  const fDeposits = useMemo(
    () => deposits.filter((d) => inRange(d.depositDate)).sort(
      (a, b) => (tsToDate(b.depositDate)?.getTime() ?? 0) - (tsToDate(a.depositDate)?.getTime() ?? 0),
    ),
    [deposits, inRange],
  );
  const fRepayments = useMemo(
    () => repayments.filter((r) => inRange(r.receivedDate)),
    [repayments, inRange],
  );
  const fLoansDisbursed = useMemo(
    () => loans.filter((l) => inRange(l.disbursedDate)).sort(
      (a, b) => (tsToDate(b.disbursedDate)?.getTime() ?? 0) - (tsToDate(a.disbursedDate)?.getTime() ?? 0),
    ),
    [loans, inRange],
  );
  const fReconciliations = useMemo(
    () => reconciliations.filter((r) => inRange(r.asOfDate)).sort(
      (a, b) => (tsToDate(b.asOfDate)?.getTime() ?? 0) - (tsToDate(a.asOfDate)?.getTime() ?? 0),
    ),
    [reconciliations, inRange],
  );

  const integrityResult = useMemo(
    () =>
      runBalanceIntegrityCheck({
        accounts,
        expenses,
        invoices,
        returns,
        loans,
        repayments,
        deposits,
        reconciliations,
        transfers,
      }),
    [
      accounts,
      expenses,
      invoices,
      returns,
      loans,
      repayments,
      deposits,
      reconciliations,
      transfers,
    ],
  );

  const rangeLabel = range.from || range.to
    ? `${range.from || "start"} → ${range.to || "today"}`
    : "All time";

  const csvSuffix = `${range.from || "all"}_${range.to || "all"}`;

  if (!canViewReports()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to view reports.
          </p>
        </div>
      </div>
    );
  }

  const exportBtn = (onClick: () => void) =>
    canExportReports() ? (
      <button
        type="button"
        onClick={onClick}
        className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        Export CSV
      </button>
    ) : null;

  const cardClass =
    "bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden";
  const theadClass =
    "border-b border-gray-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400";
  const tbodyClass =
    "divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300";

  const sectionHeader = (title: string, subtitle: string, onExport?: () => void) => (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      </div>
      {onExport ? exportBtn(onExport) : null}
    </div>
  );

  const emptyRow = (cols: number, msg: string) => (
    <tr>
      <td
        colSpan={cols}
        className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500"
      >
        {msg}
      </td>
    </tr>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="page-header">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            Financial Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Summaries for audits, accounting, and tax preparation. Range:{" "}
            <span className="font-medium">{rangeLabel}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Range controls (not used on balance check) */}
      {activeTab !== "integrity" ? (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date range
            </label>
            <select
              value={preset}
              onChange={(e) => onPresetChange(e.target.value as RangePreset)}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From
            </label>
            <input
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={(e) => {
                setPreset("custom");
                setRange((r) => ({ ...r, from: e.target.value }));
              }}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To
            </label>
            <input
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(e) => {
                setPreset("custom");
                setRange((r) => ({ ...r, to: e.target.value }));
              }}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === t.id
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          {activeTab === "cashflow" ? (
            <CashFlowReport
              expenses={fExpenses}
              returns={fReturns}
              deposits={fDeposits}
              repayments={fRepayments}
              loansDisbursed={fLoansDisbursed}
              cardClass={cardClass}
              sectionHeader={sectionHeader}
              onExport={
                canExportReports()
                  ? () => {
                      const rows = buildCashFlowCsvRows(
                        fExpenses,
                        fReturns,
                        fDeposits,
                        fRepayments,
                        fLoansDisbursed,
                      );
                      downloadCsv(
                        `cashflow_${csvSuffix}`,
                        ["Currency", "Money in", "Money out", "Net"],
                        rows,
                      );
                    }
                  : undefined
              }
            />
          ) : null}

          {activeTab === "expenses" ? (
            <div className={cardClass}>
              {sectionHeader(
                "Expense report",
                `${fExpenses.length} expenses · Total ${totalsByCurrency(
                  fExpenses.map((e) => ({ amount: e.amount, currencySymbol: e.currencySymbol })),
                )}`,
                () =>
                  downloadCsv(
                    `expenses_${csvSuffix}`,
                    ["Date", "Title", "Category", "Payee", "Account", "Currency", "Amount", "Returned", "Net"],
                    fExpenses.map((e) => {
                      const returned = Number(e.totalReturnedAmount ?? 0);
                      return [
                        dateLabel(e.date),
                        e.title,
                        e.category || "",
                        e.vendorName || "",
                        e.bankAccountName || "",
                        e.currency || "",
                        Number(e.amount || 0).toFixed(2),
                        returned.toFixed(2),
                        (Number(e.amount || 0) - returned).toFixed(2),
                      ];
                    }),
                  ),
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className={theadClass}>
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Title</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Payee</th>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className={tbodyClass}>
                    {fExpenses.length === 0
                      ? emptyRow(7, "No expenses in this range.")
                      : fExpenses.map((e) => {
                          const returned = Number(e.totalReturnedAmount ?? 0);
                          return (
                            <tr key={e.id}>
                              <td className="whitespace-nowrap px-5 py-3 text-xs">
                                {dateLabel(e.date)}
                              </td>
                              <td className="px-5 py-3">{e.title}</td>
                              <td className="px-5 py-3 text-xs">{e.category || "—"}</td>
                              <td className="px-5 py-3 text-xs">{e.vendorName || "—"}</td>
                              <td className="px-5 py-3 text-xs">{e.bankAccountName || "—"}</td>
                              <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                                {e.currencySymbol}{fmt(Number(e.amount || 0))}
                              </td>
                              <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                                {e.currencySymbol}{fmt(Number(e.amount || 0) - returned)}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "returns" ? (
            <div className={cardClass}>
              {sectionHeader(
                "Returns / refunds report",
                `${fReturns.length} returns · Total ${totalsByCurrency(fReturns)}`,
                () =>
                  downloadCsv(
                    `returns_${csvSuffix}`,
                    ["Date", "Expense", "Type", "Destination account", "Currency", "Amount", "Notes"],
                    fReturns.map((r) => [
                      dateLabel(r.receivedDate),
                      r.expenseTitle || "",
                      r.returnType,
                      r.destinationBankAccountName || "",
                      r.currency || "",
                      Number(r.amount || 0).toFixed(2),
                      r.notes || "",
                    ]),
                  ),
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className={theadClass}>
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Expense</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Destination</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className={tbodyClass}>
                    {fReturns.length === 0
                      ? emptyRow(5, "No returns in this range.")
                      : fReturns.map((r) => (
                          <tr key={r.id}>
                            <td className="whitespace-nowrap px-5 py-3 text-xs">
                              {dateLabel(r.receivedDate)}
                            </td>
                            <td className="px-5 py-3">{r.expenseTitle || "—"}</td>
                            <td className="px-5 py-3 text-xs">{r.returnType}</td>
                            <td className="px-5 py-3 text-xs">
                              {r.destinationBankAccountName || "—"}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                              +{r.currencySymbol}{fmt(Number(r.amount || 0))}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "loans" ? (
            <div className={cardClass}>
              {sectionHeader(
                "Loan report",
                `${loans.length} loans · Outstanding ${totalsByCurrency(
                  loans
                    .filter((l) => l.status !== "written_off")
                    .map((l) => ({
                      amount: Math.max(0, Number(l.principalAmount || 0) - Number(l.totalRepaidAmount || 0)),
                      currencySymbol: l.currencySymbol,
                    })),
                )}`,
                () =>
                  downloadCsv(
                    `loans_${csvSuffix}`,
                    ["Disbursed", "Borrower", "Currency", "Principal", "Repaid", "Outstanding", "Status", "Source account", "Due date"],
                    loans.map((l) => {
                      const outstanding = Math.max(
                        0,
                        Number(l.principalAmount || 0) - Number(l.totalRepaidAmount || 0),
                      );
                      return [
                        dateLabel(l.disbursedDate),
                        l.borrowerName,
                        l.currency || "",
                        Number(l.principalAmount || 0).toFixed(2),
                        Number(l.totalRepaidAmount || 0).toFixed(2),
                        outstanding.toFixed(2),
                        l.status,
                        l.sourceBankAccountName || "",
                        l.dueDate ? dateLabel(l.dueDate) : "",
                      ];
                    }),
                  ),
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className={theadClass}>
                    <tr>
                      <th className="px-5 py-3">Disbursed</th>
                      <th className="px-5 py-3">Borrower</th>
                      <th className="px-5 py-3 text-right">Principal</th>
                      <th className="px-5 py-3 text-right">Repaid</th>
                      <th className="px-5 py-3 text-right">Outstanding</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className={tbodyClass}>
                    {loans.length === 0
                      ? emptyRow(6, "No loans recorded.")
                      : loans
                          .slice()
                          .sort(
                            (a, b) =>
                              (tsToDate(b.disbursedDate)?.getTime() ?? 0) -
                              (tsToDate(a.disbursedDate)?.getTime() ?? 0),
                          )
                          .map((l) => {
                            const outstanding = Math.max(
                              0,
                              Number(l.principalAmount || 0) - Number(l.totalRepaidAmount || 0),
                            );
                            return (
                              <tr key={l.id}>
                                <td className="whitespace-nowrap px-5 py-3 text-xs">
                                  {dateLabel(l.disbursedDate)}
                                </td>
                                <td className="px-5 py-3">{l.borrowerName}</td>
                                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                                  {l.currencySymbol}{fmt(Number(l.principalAmount || 0))}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                                  {l.currencySymbol}{fmt(Number(l.totalRepaidAmount || 0))}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-medium">
                                  {l.currencySymbol}{fmt(outstanding)}
                                </td>
                                <td className="px-5 py-3 text-xs capitalize">
                                  {l.status.replace(/_/g, " ")}
                                </td>
                              </tr>
                            );
                          })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "deposits" ? (
            <div className={cardClass}>
              {sectionHeader(
                "Deposit report",
                `${fDeposits.length} deposits · Total ${totalsByCurrency(fDeposits)}`,
                () =>
                  downloadCsv(
                    `deposits_${csvSuffix}`,
                    ["Date", "Account", "Type", "Currency", "Amount", "Reference", "Notes"],
                    fDeposits.map((d) => [
                      dateLabel(d.depositDate),
                      d.bankAccountName || "",
                      d.depositType,
                      d.currency || "",
                      Number(d.amount || 0).toFixed(2),
                      d.referenceNumber || "",
                      d.notes || "",
                    ]),
                  ),
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className={theadClass}>
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className={tbodyClass}>
                    {fDeposits.length === 0
                      ? emptyRow(5, "No deposits in this range.")
                      : fDeposits.map((d) => (
                          <tr key={d.id}>
                            <td className="whitespace-nowrap px-5 py-3 text-xs">
                              {dateLabel(d.depositDate)}
                            </td>
                            <td className="px-5 py-3 text-xs">{d.bankAccountName || "—"}</td>
                            <td className="px-5 py-3 text-xs capitalize">
                              {d.depositType.replace(/_/g, " ")}
                            </td>
                            <td className="px-5 py-3 text-xs">{d.referenceNumber || "—"}</td>
                            <td className={`whitespace-nowrap px-5 py-3 text-right tabular-nums ${
                              (d.amount ?? 0) >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {(d.amount ?? 0) >= 0 ? "+" : ""}{d.currencySymbol}{fmt(Number(d.amount || 0))}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "reconciliations" ? (
            <div className={cardClass}>
              {sectionHeader(
                "Reconciliation report",
                `${fReconciliations.length} reconciliations in range`,
                () =>
                  downloadCsv(
                    `reconciliations_${csvSuffix}`,
                    ["Date", "Account", "Currency", "System", "Actual", "Adjustment", "Reason", "Notes"],
                    fReconciliations.map((r) => [
                      dateLabel(r.asOfDate),
                      r.bankAccountName || "",
                      r.currency || "",
                      Number(r.ledgerBalanceBefore || 0).toFixed(2),
                      Number(r.statedActualBalance || 0).toFixed(2),
                      Number(r.adjustmentAmount || 0).toFixed(2),
                      r.reasonCode,
                      r.notes || "",
                    ]),
                  ),
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className={theadClass}>
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3 text-right">System</th>
                      <th className="px-5 py-3 text-right">Actual</th>
                      <th className="px-5 py-3 text-right">Adjustment</th>
                      <th className="px-5 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className={tbodyClass}>
                    {fReconciliations.length === 0
                      ? emptyRow(6, "No reconciliations in this range.")
                      : fReconciliations.map((r) => (
                          <tr key={r.id}>
                            <td className="whitespace-nowrap px-5 py-3 text-xs">
                              {dateLabel(r.asOfDate)}
                            </td>
                            <td className="px-5 py-3 text-xs">{r.bankAccountName || "—"}</td>
                            <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                              {r.currencySymbol}{fmt(Number(r.ledgerBalanceBefore || 0))}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                              {r.currencySymbol}{fmt(Number(r.statedActualBalance || 0))}
                            </td>
                            <td className={`whitespace-nowrap px-5 py-3 text-right tabular-nums ${
                              (r.adjustmentAmount ?? 0) >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {(r.adjustmentAmount ?? 0) >= 0 ? "+" : ""}{r.currencySymbol}{fmt(Number(r.adjustmentAmount || 0))}
                            </td>
                            <td className="px-5 py-3 text-xs capitalize">
                              {r.reasonCode.replace(/_/g, " ")}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "accounts" ? (
            <div className={cardClass}>
              {sectionHeader(
                "Account balances (current snapshot)",
                `${accounts.length} accounts · Not affected by the date range`,
                () =>
                  downloadCsv(
                    `accounts_${csvSuffix}`,
                    ["Account", "Bank", "Currency", "Opening balance", "Current balance"],
                    accounts.map((a) => [
                      a.accountName,
                      a.bankName,
                      a.currency || "",
                      Number(a.initialBalance ?? 0).toFixed(2),
                      Number(a.currentBalance ?? a.initialBalance ?? 0).toFixed(2),
                    ]),
                  ),
              )}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className={theadClass}>
                    <tr>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3">Bank</th>
                      <th className="px-5 py-3 text-right">Opening</th>
                      <th className="px-5 py-3 text-right">Current</th>
                    </tr>
                  </thead>
                  <tbody className={tbodyClass}>
                    {accounts.length === 0
                      ? emptyRow(4, "No bank accounts.")
                      : accounts.map((a) => (
                          <tr key={a.id}>
                            <td className="px-5 py-3">{a.accountName}</td>
                            <td className="px-5 py-3 text-xs">{a.bankName}</td>
                            <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                              {a.currencySymbol}{fmt(Number(a.initialBalance ?? 0))}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums font-medium">
                              {a.currencySymbol}{fmt(Number(a.currentBalance ?? a.initialBalance ?? 0))}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === "integrity" ? (
            <div className={cardClass}>
              {sectionHeader(
                "Balance integrity check",
                integrityResult.mismatchCount === 0
                  ? `All ${integrityResult.rows.length} accounts match the recomputed ledger (±$0.02 tolerance).`
                  : `${integrityResult.mismatchCount} of ${integrityResult.rows.length} accounts differ from the recomputed ledger.`,
                canExportReports()
                  ? () =>
                      downloadCsv(
                        `balance_integrity_${new Date().toISOString().slice(0, 10)}`,
                        [
                          "Account",
                          "Bank",
                          "Currency",
                          "Opening",
                          "Stored balance",
                          "Computed balance",
                          "Difference",
                          "Status",
                        ],
                        integrityResult.rows.map((r) => [
                          r.accountName,
                          r.bankName,
                          r.currency,
                          r.initialBalance.toFixed(2),
                          r.storedBalance.toFixed(2),
                          r.computedBalance.toFixed(2),
                          r.difference.toFixed(2),
                          r.ok ? "OK" : "Mismatch",
                        ]),
                      )
                  : undefined,
              )}
              <p className="border-b border-gray-100 px-5 pb-4 text-xs leading-relaxed text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Read-only diagnostic: recomputes each account balance from opening balance plus
                paid invoices, expenses, returns, loans, repayments, deposits, reconciliations,
                and transfers. Does not modify data. Small differences may indicate legacy edits
                or manual Firestore changes.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className={theadClass}>
                    <tr>
                      <th className="px-5 py-3">Account</th>
                      <th className="px-5 py-3 text-right">Stored</th>
                      <th className="px-5 py-3 text-right">Computed</th>
                      <th className="px-5 py-3 text-right">Difference</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className={tbodyClass}>
                    {integrityResult.rows.length === 0
                      ? emptyRow(5, "No bank accounts to check.")
                      : integrityResult.rows.map((r) => (
                          <tr key={r.accountId}>
                            <td className="px-5 py-3">
                              <div className="font-medium">{r.accountName}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {r.bankName} · {r.currency}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                              {r.currencySymbol}{fmt(r.storedBalance)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                              {r.currencySymbol}{fmt(r.computedBalance)}
                            </td>
                            <td
                              className={`whitespace-nowrap px-5 py-3 text-right tabular-nums font-medium ${
                                r.ok
                                  ? "text-gray-600 dark:text-gray-300"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {r.difference >= 0 ? "+" : ""}
                              {r.currencySymbol}{fmt(r.difference)}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  r.ok
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
                                }`}
                              >
                                {r.ok ? "OK" : "Mismatch"}
                              </span>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

// --- Cash flow helpers ---

interface CashFlowAgg {
  symbol: string;
  currency: string;
  in: number;
  out: number;
}

function aggregateCashFlow(
  expenses: Expense[],
  returns: ExpenseReturn[],
  deposits: BankDeposit[],
  repayments: LoanRepayment[],
  loansDisbursed: Loan[],
): CashFlowAgg[] {
  const map = new Map<string, CashFlowAgg>();
  const bump = (
    currency: string | undefined,
    symbol: string | undefined,
    field: "in" | "out",
    amount: number,
  ) => {
    const cur = currency || "USD";
    const cur2 = map.get(cur) ?? { symbol: symbol || "$", currency: cur, in: 0, out: 0 };
    cur2[field] += Number(amount) || 0;
    if (symbol) cur2.symbol = symbol;
    map.set(cur, cur2);
  };

  for (const d of deposits) bump(d.currency, d.currencySymbol, "in", Number(d.amount || 0));
  for (const r of returns) bump(r.currency, r.currencySymbol, "in", Number(r.amount || 0));
  for (const r of repayments) bump(r.currency, r.currencySymbol, "in", Number(r.amount || 0));
  for (const e of expenses) bump(e.currency, e.currencySymbol, "out", Number(e.amount || 0));
  for (const l of loansDisbursed) bump(l.currency, l.currencySymbol, "out", Number(l.principalAmount || 0));

  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

function buildCashFlowCsvRows(
  expenses: Expense[],
  returns: ExpenseReturn[],
  deposits: BankDeposit[],
  repayments: LoanRepayment[],
  loansDisbursed: Loan[],
): (string | number)[][] {
  return aggregateCashFlow(expenses, returns, deposits, repayments, loansDisbursed).map(
    (a) => [
      a.currency,
      a.in.toFixed(2),
      a.out.toFixed(2),
      (a.in - a.out).toFixed(2),
    ],
  );
}

const CashFlowReport: React.FC<{
  expenses: Expense[];
  returns: ExpenseReturn[];
  deposits: BankDeposit[];
  repayments: LoanRepayment[];
  loansDisbursed: Loan[];
  cardClass: string;
  sectionHeader: (
    title: string,
    subtitle: string,
    onExport?: () => void,
  ) => React.ReactNode;
  onExport?: () => void;
}> = ({
  expenses,
  returns,
  deposits,
  repayments,
  loansDisbursed,
  cardClass,
  sectionHeader,
  onExport,
}) => {
  const aggs = useMemo(
    () => aggregateCashFlow(expenses, returns, deposits, repayments, loansDisbursed),
    [expenses, returns, deposits, repayments, loansDisbursed],
  );

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        {sectionHeader(
          "Cash flow summary",
          "Money in (deposits, returns, loan repayments) vs money out (expenses, loans given), grouped by currency. Invoice income is tracked in the Invoices module.",
          onExport,
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Currency</th>
                <th className="px-5 py-3 text-right">Money in</th>
                <th className="px-5 py-3 text-right">Money out</th>
                <th className="px-5 py-3 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300">
              {aggs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No cash movements in this range.
                  </td>
                </tr>
              ) : (
                aggs.map((a) => {
                  const net = a.in - a.out;
                  return (
                    <tr key={a.currency}>
                      <td className="px-5 py-3 font-medium">{a.currency}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{a.symbol}{fmt(a.in)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-red-600 dark:text-red-400">
                        -{a.symbol}{fmt(a.out)}
                      </td>
                      <td className={`whitespace-nowrap px-5 py-3 text-right tabular-nums font-semibold ${
                        net >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {net >= 0 ? "+" : ""}{a.symbol}{fmt(net)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
