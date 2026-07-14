import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { usePageTitle } from "../../hooks/usePageTitle";
import { Timestamp } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import { BankAccountService } from "../../services/bankAccountService";
import { LoanService } from "../../services/loanService";
import type { Loan, LoanRepayment, LoanStatus, BankAccount } from "../../types";
import {
  aggregateAmountsByCurrency,
  buildFinanceStatDisplay,
  financeStatHint,
} from "../../utils/financeCurrencyDisplay";
import {
  RowIconButton,
  IconEdit,
  IconDelete,
  IconReceive,
  IconHistory,
} from "../../components/RowIconButton";
import Spinner from "../../components/Spinner";
import { getExpenseCompanyId } from "../../utils/expenseCompanyScope";
import {
  formatBankAccountListLabel,
  formatBankAccountSelectLabel,
} from "../../utils/bankAccountDisplay";

const STATUS_META: Record<LoanStatus, { label: string; className: string }> = {
  outstanding: {
    label: "Outstanding",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  partially_repaid: {
    label: "Partially repaid",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  closed: {
    label: "Closed",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  written_off: {
    label: "Written off",
    className: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  },
};

function fmtDate(ts?: { toDate?: () => Date } | null): string {
  const d = ts?.toDate?.();
  if (!d) return "—";
  return d.toLocaleDateString();
}

function toDateInput(ts?: { toDate?: () => Date } | null): string {
  const d = ts?.toDate?.();
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

type GiveLoanForm = {
  borrowerName: string;
  amount: string;
  sourceBankAccountId: string;
  disbursedDate: string;
  dueDate: string;
  notes: string;
};

type RepayForm = {
  amount: string;
  destinationBankAccountId: string;
  receivedDate: string;
  notes: string;
};

type EditLoanForm = {
  borrowerName: string;
  dueDate: string;
  notes: string;
};

const todayInput = () => new Date().toISOString().split("T")[0];

const LoansPage: React.FC = () => {
  usePageTitle("Loans");
  const { user, userProfile } = useAuth();
  const {
    canViewLoans,
    canManageCompanyLoans,
    canCreateLoan,
    canEditLoan,
    canDeleteLoan,
    canReceiveLoanRepayment,
    canViewBankPickerBalance,
    filterBankAccountsForRole,
    canViewExpenseUsdTotal,
    isOwner,
  } = usePermissions();
  const showPickerBalance = canViewBankPickerBalance();
  const showFinanceUsdTotal = canViewExpenseUsdTotal();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const accessibleBankAccounts = useMemo(
    () => filterBankAccountsForRole(bankAccounts),
    [bankAccounts, filterBankAccountsForRole],
  );
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<"all" | LoanStatus>("all");
  const [search, setSearch] = useState("");

  const [giveModalOpen, setGiveModalOpen] = useState(false);
  const [giveForm, setGiveForm] = useState<GiveLoanForm>({
    borrowerName: "",
    amount: "",
    sourceBankAccountId: "",
    disbursedDate: todayInput(),
    dueDate: "",
    notes: "",
  });
  const [giveError, setGiveError] = useState("");
  const [giveSubmitting, setGiveSubmitting] = useState(false);

  const [repayModalLoan, setRepayModalLoan] = useState<Loan | null>(null);
  const [repayForm, setRepayForm] = useState<RepayForm>({
    amount: "",
    destinationBankAccountId: "",
    receivedDate: todayInput(),
    notes: "",
  });
  const [repayError, setRepayError] = useState("");
  const [repaySubmitting, setRepaySubmitting] = useState(false);

  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [editForm, setEditForm] = useState<EditLoanForm>({
    borrowerName: "",
    dueDate: "",
    notes: "",
  });
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [detailLoanId, setDetailLoanId] = useState<string | null>(null);

  const companyWide = isOwner || canManageCompanyLoans();
  const companyId =
    user && userProfile ? getExpenseCompanyId(user, userProfile) : "";

  const loadExchangeRates = useCallback(async () => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      if (data?.rates) setExchangeRates(data.rates);
    } catch {
      // Non-fatal: fall back to 1:1 (single-currency users unaffected).
    }
  }, []);

  useEffect(() => {
    if (!user || !userProfile) return;

    const loansUnsub = LoanService.subscribeLoansForScope(
      { companyWide: companyWide && !!companyId, companyId, userId: user.uid },
      (rows) => {
        rows.sort((a, b) => {
          const at = a.disbursedDate?.toMillis?.() ?? 0;
          const bt = b.disbursedDate?.toMillis?.() ?? 0;
          return bt - at;
        });
        setLoans(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );

    const repaymentsUnsub = LoanService.subscribeRepaymentsForScope(
      { companyWide: companyWide && !!companyId, companyId, userId: user.uid },
      (rows) => setRepayments(rows),
      () => setRepayments([]),
    );

    const bankUnsub = BankAccountService.subscribeBankAccountsForCompany(
      user,
      userProfile,
      (rows) => setBankAccounts(rows),
    );

    loadExchangeRates();

    return () => {
      loansUnsub();
      repaymentsUnsub();
      bankUnsub();
    };
  }, [user, userProfile, companyWide, companyId, loadExchangeRates]);

  const repaymentsByLoanId = useMemo(() => {
    const map = new Map<string, LoanRepayment[]>();
    for (const r of repayments) {
      const arr = map.get(r.loanId) ?? [];
      arr.push(r);
      map.set(r.loanId, arr);
    }
    for (const arr of map.values()) {
      arr.sort(
        (a, b) =>
          (b.receivedDate?.toMillis?.() ?? 0) -
          (a.receivedDate?.toMillis?.() ?? 0),
      );
    }
    return map;
  }, [repayments]);

  const repaidForLoan = useCallback(
    (loan: Loan): number => {
      const cached = loan.totalRepaidAmount;
      if (typeof cached === "number" && cached > 0) return cached;
      const rows = repaymentsByLoanId.get(loan.id);
      if (!rows || rows.length === 0) return 0;
      return rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    },
    [repaymentsByLoanId],
  );

  const outstandingForLoan = useCallback(
    (loan: Loan): number =>
      Math.max(0, round2((loan.principalAmount || 0) - repaidForLoan(loan))),
    [repaidForLoan],
  );

  const filteredLoans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter((loan) => {
      if (statusFilter !== "all" && loan.status !== statusFilter) return false;
      if (q && !(loan.borrowerName || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [loans, statusFilter, search]);

  const detailLoan = useMemo(() => {
    if (!detailLoanId) return null;
    return loans.find((l) => l.id === detailLoanId) ?? null;
  }, [detailLoanId, loans]);

  const stats = useMemo(() => {
    const toUsd = (amount: number, currency?: string) =>
      amount / (exchangeRates[currency || "USD"] || 1);
    let lent = 0;
    let repaid = 0;
    let outstanding = 0;
    for (const loan of filteredLoans) {
      lent += toUsd(loan.principalAmount || 0, loan.currency);
      repaid += toUsd(repaidForLoan(loan), loan.currency);
      outstanding += toUsd(outstandingForLoan(loan), loan.currency);
    }
    return { lent, repaid, outstanding };
  }, [filteredLoans, exchangeRates, repaidForLoan, outstandingForLoan]);

  const lentByCurrency = useMemo(
    () =>
      aggregateAmountsByCurrency(
        filteredLoans,
        (l) => Number(l.principalAmount) || 0,
        (l) => l.currency,
        (l) => l.currencySymbol,
      ),
    [filteredLoans],
  );

  const repaidByCurrency = useMemo(
    () =>
      aggregateAmountsByCurrency(
        filteredLoans,
        (l) => repaidForLoan(l),
        (l) => l.currency,
        (l) => l.currencySymbol,
      ),
    [filteredLoans, repaidForLoan],
  );

  const outstandingByCurrency = useMemo(
    () =>
      aggregateAmountsByCurrency(
        filteredLoans,
        (l) => outstandingForLoan(l),
        (l) => l.currency,
        (l) => l.currencySymbol,
      ),
    [filteredLoans, outstandingForLoan],
  );

  const lentDisplay = useMemo(
    () =>
      buildFinanceStatDisplay(
        lentByCurrency,
        stats.lent,
        showFinanceUsdTotal,
        "gross",
        exchangeRates,
      ),
    [lentByCurrency, stats.lent, showFinanceUsdTotal, exchangeRates],
  );

  const repaidDisplay = useMemo(
    () =>
      buildFinanceStatDisplay(
        repaidByCurrency,
        stats.repaid,
        showFinanceUsdTotal,
        "gross",
        exchangeRates,
      ),
    [repaidByCurrency, stats.repaid, showFinanceUsdTotal, exchangeRates],
  );

  const outstandingDisplay = useMemo(
    () =>
      buildFinanceStatDisplay(
        outstandingByCurrency,
        stats.outstanding,
        showFinanceUsdTotal,
        "gross",
        exchangeRates,
      ),
    [
      outstandingByCurrency,
      stats.outstanding,
      showFinanceUsdTotal,
      exchangeRates,
    ],
  );

  const displayName =
    userProfile?.displayName ||
    userProfile?.companyName ||
    user?.email ||
    "";

  // ---- Give loan ----
  const openGiveModal = () => {
    setGiveForm({
      borrowerName: "",
      amount: "",
      sourceBankAccountId: accessibleBankAccounts[0]?.id || "",
      disbursedDate: todayInput(),
      dueDate: "",
      notes: "",
    });
    setGiveError("");
    setGiveModalOpen(true);
  };

  const handleGiveLoan = async () => {
    if (!user || !userProfile) return;
    const amount = parseFloat(giveForm.amount) || 0;
    if (!giveForm.borrowerName.trim()) {
      setGiveError("Enter the borrower name");
      return;
    }
    if (amount <= 0) {
      setGiveError("Enter a valid amount greater than 0");
      return;
    }
    if (!giveForm.sourceBankAccountId) {
      setGiveError("Select a source account");
      return;
    }
    if (!giveForm.disbursedDate) {
      setGiveError("Select the disbursed date");
      return;
    }
    const sourceBank = bankAccounts.find(
      (b) => b.id === giveForm.sourceBankAccountId,
    );
    if (!sourceBank) {
      setGiveError("Source account not found");
      return;
    }

    setGiveSubmitting(true);
    setGiveError("");
    try {
      const { loanId } = await LoanService.createLoan({
        companyId: companyId || sourceBank.companyId || user.uid,
        userId: user.uid,
        createdByDisplayName: displayName,
        borrowerName: giveForm.borrowerName.trim(),
        principalAmount: amount,
        disbursedDate: Timestamp.fromDate(new Date(giveForm.disbursedDate)),
        sourceBankAccountId: sourceBank.id,
        sourceBankAccountName: formatBankAccountListLabel(sourceBank),
        currency: sourceBank.currency,
        currencySymbol: sourceBank.currencySymbol,
        dueDate: giveForm.dueDate
          ? Timestamp.fromDate(new Date(giveForm.dueDate))
          : null,
        notes: giveForm.notes,
      });

      await ActivityLogger.logActivity(
        user,
        userProfile,
        "loan_created",
        `Gave loan ${sourceBank.currencySymbol}${amount.toFixed(2)} to ${giveForm.borrowerName.trim()}`,
        {
          entityId: loanId,
          entityType: "loan",
          newValue: {
            borrowerName: giveForm.borrowerName.trim(),
            principalAmount: amount,
            sourceBankAccountId: sourceBank.id,
          },
        },
      );

      setGiveModalOpen(false);
    } catch (error) {
      console.error("Error giving loan:", error);
      setGiveError(
        error instanceof Error ? error.message : "Failed to create loan",
      );
    } finally {
      setGiveSubmitting(false);
    }
  };

  const openLoanDetail = (loan: Loan) => {
    setDetailLoanId(loan.id);
  };

  const closeLoanDetail = () => {
    setDetailLoanId(null);
  };

  const stopRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // ---- Receive repayment ----
  const openRepayModal = (loan: Loan) => {
    closeLoanDetail();
    setRepayModalLoan(loan);
    setRepayForm({
      amount: "",
      destinationBankAccountId:
        accessibleBankAccounts.find((b) => b.id === loan.sourceBankAccountId)?.id ||
        accessibleBankAccounts[0]?.id ||
        "",
      receivedDate: todayInput(),
      notes: "",
    });
    setRepayError("");
  };

  const handleReceiveRepayment = async () => {
    if (!user || !userProfile || !repayModalLoan) return;
    const loan = repayModalLoan;
    const amount = parseFloat(repayForm.amount) || 0;
    if (amount <= 0) {
      setRepayError("Enter a valid amount greater than 0");
      return;
    }
    if (!repayForm.destinationBankAccountId) {
      setRepayError("Select a destination account");
      return;
    }
    if (!repayForm.receivedDate) {
      setRepayError("Select the received date");
      return;
    }
    const remaining = outstandingForLoan(loan);
    if (amount > remaining + 0.0001) {
      setRepayError(
        `Repayment exceeds outstanding balance (${loan.currencySymbol}${remaining.toFixed(2)}).`,
      );
      return;
    }
    const destBank = bankAccounts.find(
      (b) => b.id === repayForm.destinationBankAccountId,
    );
    if (!destBank) {
      setRepayError("Destination account not found");
      return;
    }

    setRepaySubmitting(true);
    setRepayError("");
    try {
      const { totalRepaidAmount, status } = await LoanService.receiveRepayment({
        companyId: loan.companyId || companyId,
        userId: user.uid,
        createdByDisplayName: displayName,
        loanId: loan.id,
        borrowerName: loan.borrowerName,
        principalAmount: loan.principalAmount || 0,
        amount,
        receivedDate: Timestamp.fromDate(new Date(repayForm.receivedDate)),
        destinationBankAccountId: destBank.id,
        destinationBankAccountName: formatBankAccountListLabel(destBank),
        currency: destBank.currency,
        currencySymbol: destBank.currencySymbol,
        notes: repayForm.notes,
      });

      await ActivityLogger.logActivity(
        user,
        userProfile,
        "loan_repayment_received",
        `Received repayment ${destBank.currencySymbol}${amount.toFixed(2)} from ${loan.borrowerName}`,
        {
          entityId: loan.id,
          entityType: "loan",
          newValue: {
            amount,
            destinationBankAccountId: destBank.id,
            totalRepaidAmount,
            status,
          },
        },
      );

      setRepayForm((f) => ({ ...f, amount: "", notes: "" }));
      // Keep modal open so the user can see updated history; refresh loan ref.
      setRepayModalLoan((prev) =>
        prev ? { ...prev, totalRepaidAmount, status } : prev,
      );
    } catch (error) {
      console.error("Error receiving repayment:", error);
      setRepayError(
        error instanceof Error ? error.message : "Failed to record repayment",
      );
    } finally {
      setRepaySubmitting(false);
    }
  };

  const handleDeleteRepayment = async (repayment: LoanRepayment) => {
    if (!user || !userProfile) return;
    if (
      !window.confirm(
        `Remove this repayment of ${repayment.currencySymbol}${(repayment.amount || 0).toFixed(2)}? The destination account balance will be reduced back.`,
      )
    ) {
      return;
    }
    try {
      const { totalRepaidAmount, status } =
        await LoanService.deleteRepayment(repayment);
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "loan_repayment_deleted",
        `Removed repayment ${repayment.currencySymbol}${(repayment.amount || 0).toFixed(2)} from ${repayment.borrowerName || repayment.loanId}`,
        {
          entityId: repayment.loanId,
          entityType: "loan",
          oldValue: repayment,
        },
      );
      setRepayModalLoan((prev) =>
        prev && prev.id === repayment.loanId
          ? { ...prev, totalRepaidAmount, status }
          : prev,
      );
    } catch (error) {
      console.error("Error removing repayment:", error);
      alert("Failed to remove repayment");
    }
  };

  // ---- Edit loan ----
  const openEditModal = (loan: Loan) => {
    closeLoanDetail();
    setEditLoan(loan);
    setEditForm({
      borrowerName: loan.borrowerName || "",
      dueDate: toDateInput(loan.dueDate),
      notes: loan.notes || "",
    });
    setEditError("");
  };

  const handleEditLoan = async () => {
    if (!user || !userProfile || !editLoan) return;
    if (!editForm.borrowerName.trim()) {
      setEditError("Borrower name cannot be empty");
      return;
    }
    setEditSubmitting(true);
    setEditError("");
    try {
      await LoanService.updateLoanMeta(editLoan.id, {
        borrowerName: editForm.borrowerName,
        dueDate: editForm.dueDate
          ? Timestamp.fromDate(new Date(editForm.dueDate))
          : null,
        notes: editForm.notes,
      });
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "loan_updated",
        `Updated loan details for ${editForm.borrowerName.trim()}`,
        { entityId: editLoan.id, entityType: "loan" },
      );
      setEditLoan(null);
    } catch (error) {
      console.error("Error updating loan:", error);
      setEditError(
        error instanceof Error ? error.message : "Failed to update loan",
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  // ---- Delete loan ----
  const handleDeleteLoan = async (loan: Loan) => {
    if (!user || !userProfile) return;
    const repaid = repaidForLoan(loan);
    if (repaid > 0) {
      alert(
        "This loan has recorded repayments. Remove the repayments first before deleting the loan.",
      );
      return;
    }
    if (
      !window.confirm(
        `Delete the loan of ${loan.currencySymbol}${(loan.principalAmount || 0).toFixed(2)} to ${loan.borrowerName}? The source account (${loan.sourceBankAccountName}) will be credited back.`,
      )
    ) {
      return;
    }
    try {
      await LoanService.deleteLoan(loan);
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "loan_deleted",
        `Deleted loan ${loan.currencySymbol}${(loan.principalAmount || 0).toFixed(2)} to ${loan.borrowerName}`,
        { entityId: loan.id, entityType: "loan", oldValue: loan },
      );
      if (detailLoanId === loan.id) closeLoanDetail();
    } catch (error) {
      console.error("Error deleting loan:", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete loan",
      );
    }
  };

  const handleToggleWriteOff = async (loan: Loan) => {
    if (!user || !userProfile) return;
    const writeOff = loan.status !== "written_off";
    if (
      writeOff &&
      !window.confirm(
        `Write off the loan of ${loan.currencySymbol}${(loan.principalAmount || 0).toFixed(2)} to ${loan.borrowerName}? This marks it unrecoverable. No money moves; the original disbursement stays recorded.`,
      )
    ) {
      return;
    }
    try {
      await LoanService.setWriteOff(loan.id, writeOff);
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "loan_updated",
        `${writeOff ? "Wrote off" : "Reopened"} loan ${loan.currencySymbol}${(loan.principalAmount || 0).toFixed(2)} to ${loan.borrowerName}`,
        { entityId: loan.id, entityType: "loan", oldValue: loan },
      );
    } catch (error) {
      console.error("Error updating loan write-off:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update loan status",
      );
    }
  };

  if (!canViewLoans() && !canManageCompanyLoans() && !canCreateLoan()) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-300">
          You don’t have permission to view loans.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  const modalRepayments = repayModalLoan
    ? repaymentsByLoanId.get(repayModalLoan.id) ?? []
    : [];

  return (
    <div className="p-6">
      <div className="page-header mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            Loans &amp; Advances
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {companyWide
              ? "Recoverable money lent out across the company. Loans are not expenses."
              : "Recoverable money you’ve lent out. Loans are not expenses."}
          </p>
        </div>
        {canCreateLoan() && (
          <button
            onClick={openGiveModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            + Give loan
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total lent</p>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white tabular-nums">
            {lentDisplay.primary}
          </p>
          {lentDisplay.secondary ? (
            <div className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {lentDisplay.secondary}
            </div>
          ) : null}
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            {financeStatHint(showFinanceUsdTotal, "Lent by currency")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Recovered
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
            {repaidDisplay.primary}
          </p>
          {repaidDisplay.secondary ? (
            <div className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {repaidDisplay.secondary}
            </div>
          ) : null}
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            {financeStatHint(showFinanceUsdTotal, "Recovered by currency")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Outstanding receivable
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {outstandingDisplay.primary}
          </p>
          {outstandingDisplay.secondary ? (
            <div className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              {outstandingDisplay.secondary}
            </div>
          ) : null}
          <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            {financeStatHint(showFinanceUsdTotal, "Outstanding by currency")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search borrower…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | LoanStatus)
          }
          className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="all">All statuses</option>
          <option value="outstanding">Outstanding</option>
          <option value="partially_repaid">Partially repaid</option>
          <option value="closed">Closed</option>
          <option value="written_off">Written off</option>
        </select>
      </div>

      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Click a row to view full loan details.
      </p>

      {/* Table — essential columns only; details open in modal */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Borrower
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Outstanding
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Principal
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Disbursed
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-36">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLoans.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  No loans recorded yet.
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan) => {
                const repaid = repaidForLoan(loan);
                const outstanding = outstandingForLoan(loan);
                const meta = STATUS_META[loan.status] ?? STATUS_META.outstanding;
                const hasRepayments =
                  (repaymentsByLoanId.get(loan.id)?.length ?? 0) > 0;
                return (
                  <tr
                    key={loan.id}
                    onClick={() => openLoanDetail(loan)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 dark:text-white">
                        {loan.borrowerName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                      {loan.currencySymbol}
                      {outstanding.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                      {loan.currencySymbol}
                      {(loan.principalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {fmtDate(loan.disbursedDate)}
                    </td>
                    <td
                      className="px-4 py-3 text-right whitespace-nowrap"
                      onClick={stopRowClick}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        {canReceiveLoanRepayment() && outstanding > 0 ? (
                          <RowIconButton
                            onClick={() => openRepayModal(loan)}
                            title="Record repayment"
                            variant="green"
                          >
                            <IconReceive />
                          </RowIconButton>
                        ) : null}
                        {hasRepayments || outstanding <= 0 ? (
                          <RowIconButton
                            onClick={() => openRepayModal(loan)}
                            title="Repayment history"
                            variant="gray"
                          >
                            <IconHistory />
                          </RowIconButton>
                        ) : null}
                        {canEditLoan() ? (
                          <RowIconButton
                            onClick={() => openEditModal(loan)}
                            title="Edit loan"
                            variant="yellow"
                          >
                            <IconEdit />
                          </RowIconButton>
                        ) : null}
                        {canDeleteLoan() && repaid <= 0 ? (
                          <RowIconButton
                            onClick={() => void handleDeleteLoan(loan)}
                            title="Delete loan"
                            variant="red"
                          >
                            <IconDelete />
                          </RowIconButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Loan detail modal */}
      {detailLoan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={closeLoanDetail}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={stopRowClick}
          >
            {(() => {
              const loan = detailLoan;
              const repaid = repaidForLoan(loan);
              const outstanding = outstandingForLoan(loan);
              const meta = STATUS_META[loan.status] ?? STATUS_META.outstanding;
              const overdue =
                loan.dueDate &&
                outstanding > 0 &&
                (loan.dueDate.toDate?.()?.getTime() ?? 0) < Date.now();
              const history = repaymentsByLoanId.get(loan.id) ?? [];

              return (
                <>
                  <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {loan.borrowerName}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Loan / advance details
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-4 space-y-5">
                    <section>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                        Financial summary
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Principal
                          </p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {loan.currencySymbol}
                            {(loan.principalAmount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Recovered
                          </p>
                          <p className="mt-1 font-semibold text-green-600 dark:text-green-400">
                            {loan.currencySymbol}
                            {repaid.toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Outstanding
                          </p>
                          <p className="mt-1 font-bold text-amber-700 dark:text-amber-300">
                            {loan.currencySymbol}
                            {outstanding.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                        Dates &amp; account
                      </h4>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">
                            Disbursed
                          </dt>
                          <dd className="font-medium text-gray-900 dark:text-white">
                            {fmtDate(loan.disbursedDate)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">
                            Due date
                          </dt>
                          <dd
                            className={
                              overdue
                                ? "font-medium text-red-600 dark:text-red-400"
                                : "font-medium text-gray-900 dark:text-white"
                            }
                          >
                            {fmtDate(loan.dueDate)}
                            {overdue ? " (overdue)" : ""}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-gray-500 dark:text-gray-400">
                            Source account
                          </dt>
                          <dd className="font-medium text-gray-900 dark:text-white">
                            {loan.sourceBankAccountName || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">
                            Currency
                          </dt>
                          <dd className="font-medium text-gray-900 dark:text-white">
                            {loan.currency || "USD"}
                          </dd>
                        </div>
                        {loan.createdByDisplayName ? (
                          <div>
                            <dt className="text-gray-500 dark:text-gray-400">
                              Recorded by
                            </dt>
                            <dd className="font-medium text-gray-900 dark:text-white">
                              {loan.createdByDisplayName}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </section>

                    {loan.notes ? (
                      <section>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                          Notes
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
                          {loan.notes}
                        </p>
                      </section>
                    ) : null}

                    <section>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Repayment history
                        {history.length > 0 ? (
                          <span className="ml-1 font-normal normal-case text-gray-400">
                            ({history.length})
                          </span>
                        ) : null}
                      </h4>
                      {history.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
                          No repayments recorded yet.
                        </p>
                      ) : (
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                          {history.map((r) => (
                            <li
                              key={r.id}
                              className="flex items-center justify-between text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2"
                            >
                              <div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">
                                  {r.currencySymbol}
                                  {(r.amount || 0).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {fmtDate(r.receivedDate)} ·{" "}
                                  {r.destinationBankAccountName}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-wrap justify-end gap-2">
                    {canReceiveLoanRepayment() && outstanding > 0 ? (
                      <button
                        type="button"
                        onClick={() => openRepayModal(loan)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                      >
                        Record repayment
                      </button>
                    ) : null}
                    {canEditLoan() ? (
                      <button
                        type="button"
                        onClick={() => openEditModal(loan)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                    ) : null}
                    {canEditLoan() && outstanding > 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleToggleWriteOff(loan)}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          loan.status === "written_off"
                            ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/30"
                            : "bg-amber-600 text-white hover:bg-amber-700"
                        }`}
                      >
                        {loan.status === "written_off"
                          ? "Reopen loan"
                          : "Write off"}
                      </button>
                    ) : null}
                    {canDeleteLoan() && repaid <= 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleDeleteLoan(loan)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={closeLoanDetail}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 text-sm font-medium"
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Give loan modal */}
      {giveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Give loan / advance
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Borrower name
                </label>
                <input
                  type="text"
                  value={giveForm.borrowerName}
                  onChange={(e) =>
                    setGiveForm({ ...giveForm, borrowerName: e.target.value })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. Ahmed"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={giveForm.amount}
                    onChange={(e) =>
                      setGiveForm({ ...giveForm, amount: e.target.value })
                    }
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Disbursed date
                  </label>
                  <input
                    type="date"
                    value={giveForm.disbursedDate}
                    onChange={(e) =>
                      setGiveForm({ ...giveForm, disbursedDate: e.target.value })
                    }
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source account (will be debited)
                </label>
                <select
                  value={giveForm.sourceBankAccountId}
                  onChange={(e) =>
                    setGiveForm({
                      ...giveForm,
                      sourceBankAccountId: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select account…</option>
                  {accessibleBankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {formatBankAccountSelectLabel(b, showPickerBalance)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due date (optional)
                </label>
                <input
                  type="date"
                  value={giveForm.dueDate}
                  onChange={(e) =>
                    setGiveForm({ ...giveForm, dueDate: e.target.value })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={giveForm.notes}
                  onChange={(e) =>
                    setGiveForm({ ...giveForm, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Purpose, terms, etc."
                />
              </div>
              {giveError ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {giveError}
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setGiveModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleGiveLoan}
                disabled={giveSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {giveSubmitting ? "Saving…" : "Give loan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive repayment modal */}
      {repayModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Repayments — {repayModalLoan.borrowerName}
            </h3>
            {(() => {
              const repaid = repaidForLoan(repayModalLoan);
              const remaining = outstandingForLoan(repayModalLoan);
              return (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Principal {repayModalLoan.currencySymbol}
                  {(repayModalLoan.principalAmount || 0).toFixed(2)} · Recovered{" "}
                  {repayModalLoan.currencySymbol}
                  {repaid.toFixed(2)} · Outstanding{" "}
                  {repayModalLoan.currencySymbol}
                  {remaining.toFixed(2)}
                </p>
              );
            })()}

            {canReceiveLoanRepayment() && outstandingForLoan(repayModalLoan) > 0 ? (
              <div className="space-y-3 border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={repayForm.amount}
                      onChange={(e) =>
                        setRepayForm({ ...repayForm, amount: e.target.value })
                      }
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Received date
                    </label>
                    <input
                      type="date"
                      value={repayForm.receivedDate}
                      onChange={(e) =>
                        setRepayForm({
                          ...repayForm,
                          receivedDate: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Destination account (will be credited)
                  </label>
                  <select
                    value={repayForm.destinationBankAccountId}
                    onChange={(e) =>
                      setRepayForm({
                        ...repayForm,
                        destinationBankAccountId: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select account…</option>
                    {accessibleBankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {formatBankAccountSelectLabel(b, showPickerBalance)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={repayForm.notes}
                    onChange={(e) =>
                      setRepayForm({ ...repayForm, notes: e.target.value })
                    }
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                {repayError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {repayError}
                  </p>
                ) : null}
                <div className="flex justify-end">
                  <button
                    onClick={handleReceiveRepayment}
                    disabled={repaySubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {repaySubmitting ? "Saving…" : "Record repayment"}
                  </button>
                </div>
              </div>
            ) : null}

            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              History
            </h4>
            {modalRepayments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No repayments recorded yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {modalRepayments.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {r.currencySymbol}
                        {(r.amount || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {fmtDate(r.receivedDate)} · {r.destinationBankAccountName}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </div>
                    </div>
                    {canDeleteLoan() ? (
                      <button
                        onClick={() => handleDeleteRepayment(r)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setRepayModalLoan(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit loan modal */}
      {editLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Edit loan
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Borrower name
                </label>
                <input
                  type="text"
                  value={editForm.borrowerName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, borrowerName: e.target.value })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due date
                </label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dueDate: e.target.value })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Amount and source account can’t be edited to keep balances
                accurate. Delete and re-create if those are wrong.
              </p>
              {editError ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {editError}
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditLoan(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleEditLoan}
                disabled={editSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {editSubmitting ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoansPage;
