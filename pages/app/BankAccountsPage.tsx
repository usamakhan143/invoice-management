import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import firebase from "firebase/compat/app";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { PAGES } from "../../config/permissions";
import { db, Timestamp } from "../../services/firebase";
import { BankAccountService } from "../../services/bankAccountService";
import { BankReconciliationService } from "../../services/bankReconciliationService";
import { BankDepositService } from "../../services/bankDepositService";
import { ActivityLogger } from "../../services/activityLogger";
import { subscribeCompanyExpenseCategories } from "../../services/expenseCategoryService";
import type {
  BankAccount,
  BankTransfer,
  BankReconciliation,
  BankReconciliationReason,
  BankDeposit,
  BankDepositType,
  ExpenseCategory,
} from "../../types";
import Spinner from "../../components/Spinner";
import {
  formatBankAccountListLabel,
  formatBankAccountSelectLabel,
  getInvoiceBankDisplayName,
  isBankIncludedInInvoicePicker,
} from "../../utils/bankAccountDisplay";
import { getExpenseCompanyId } from "../../utils/expenseCompanyScope";
import ProtectedComponent from "../../components/ProtectedComponent";

const currencies = ["USD", "PKR", "EUR"];

const RECONCILIATION_REASON_OPTIONS: {
  value: BankReconciliationReason;
  label: string;
}[] = [
  { value: "missing_expense", label: "Missing expense" },
  { value: "missing_income", label: "Missing income" },
  { value: "bank_charges", label: "Bank charges / fees" },
  { value: "interest_credit", label: "Interest credit" },
  { value: "opening_balance_correction", label: "Opening balance correction" },
  { value: "manual_adjustment", label: "Manual adjustment" },
  { value: "confirmed_match", label: "Confirmed match (no adjustment)" },
  { value: "other", label: "Other" },
];

function reconciliationReasonLabel(code: string): string {
  return (
    RECONCILIATION_REASON_OPTIONS.find((o) => o.value === code)?.label || code
  );
}

const DEPOSIT_TYPE_OPTIONS: {
  value: BankDepositType;
  label: string;
}[] = [
  { value: "owner_contribution", label: "Owner contribution" },
  { value: "cash_deposit", label: "Cash deposit" },
  { value: "external_transfer", label: "External transfer" },
  { value: "refund_non_expense", label: "Refund (not expense-linked)" },
  { value: "other", label: "Other" },
];

function depositTypeLabel(code: string): string {
  return DEPOSIT_TYPE_OPTIONS.find((o) => o.value === code)?.label || code;
}

function accountStoredBalance(account: BankAccount): number {
  return account.currentBalance ?? account.initialBalance ?? 0;
}

const todayInput = () => new Date().toISOString().split("T")[0];

type XferAmountBasis = "from" | "to";
type BankAccountsWorkspaceTab = "account" | "transfer";

/** Fee is taken from the gross “from” amount; net = gross − fee is converted/credited. */
function deriveTransferNumbers(params: {
  basis: XferAmountBasis;
  fromInput: string;
  toInput: string;
  feeType: "percent" | "fixed";
  feeInputRaw: string;
  crossCurrency: boolean;
  rateRaw: string;
}): {
  ok: boolean;
  grossFrom: number;
  fee: number;
  net: number;
  credited: number;
} {
  const feeParam = parseFloat(params.feeInputRaw);
  const feeInput = Number.isFinite(feeParam) ? feeParam : 0;
  const rate = parseFloat(params.rateRaw) || 0;

  function feeFromGross(F: number): number {
    if (F <= 0) return 0;
    if (params.feeType === "percent") {
      if (feeInput < 0 || feeInput >= 100) return NaN;
      return Math.round(F * (feeInput / 100) * 100) / 100;
    }
    if (feeInput < 0) return NaN;
    return Math.round(feeInput * 100) / 100;
  }

  function grossFromNet(net: number): number {
    if (net <= 0) return 0;
    if (params.feeType === "percent") {
      if (feeInput < 0 || feeInput >= 100) return NaN;
      const denom = 1 - feeInput / 100;
      if (denom <= 0) return NaN;
      return Math.round((net / denom) * 100) / 100;
    }
    if (feeInput < 0) return NaN;
    return Math.round((net + feeInput) * 100) / 100;
  }

  if (params.basis === "from") {
    const F = parseFloat(params.fromInput) || 0;
    if (!(F > 0)) {
      return { ok: false, grossFrom: 0, fee: 0, net: 0, credited: 0 };
    }
    const fee = feeFromGross(F);
    if (!Number.isFinite(fee) || fee > F) {
      return { ok: false, grossFrom: F, fee: 0, net: 0, credited: 0 };
    }
    const net = Math.round((F - fee) * 100) / 100;
    if (!(net > 0)) {
      return { ok: false, grossFrom: F, fee, net: 0, credited: 0 };
    }
    let credited: number;
    if (!params.crossCurrency) {
      credited = net;
    } else if (!(rate > 0)) {
      credited = NaN;
    } else {
      credited = Math.round(net * rate * 100) / 100;
    }
    const ok = Number.isFinite(credited) && credited > 0;
    return { ok, grossFrom: F, fee, net, credited };
  }

  const T = parseFloat(params.toInput) || 0;
  if (!(T > 0)) {
    return { ok: false, grossFrom: 0, fee: 0, net: 0, credited: 0 };
  }
  let netInFrom: number;
  if (!params.crossCurrency) {
    netInFrom = T;
  } else if (!(rate > 0)) {
    return { ok: false, grossFrom: 0, fee: 0, net: 0, credited: NaN };
  } else {
    netInFrom = Math.round((T / rate) * 100) / 100;
  }
  if (!(netInFrom > 0)) {
    return { ok: false, grossFrom: 0, fee: 0, net: 0, credited: T };
  }
  const F = grossFromNet(netInFrom);
  if (!Number.isFinite(F) || !(F > 0)) {
    return { ok: false, grossFrom: 0, fee: 0, net: 0, credited: T };
  }
  const fee = feeFromGross(F);
  if (!Number.isFinite(fee) || fee > F) {
    return { ok: false, grossFrom: F, fee: 0, net: 0, credited: T };
  }
  const net = Math.round((F - fee) * 100) / 100;
  if (Math.abs(net - netInFrom) > 0.02) {
    return { ok: false, grossFrom: F, fee, net, credited: T };
  }
  return { ok: true, grossFrom: F, fee, net, credited: T };
}

function transferPartyLabel(
  t: BankTransfer,
  role: "from" | "to",
  accounts: BankAccount[],
): string {
  const id = role === "from" ? t.fromBankAccountId : t.toBankAccountId;
  const acc = accounts.find((a) => a.id === id);
  if (acc) return formatBankAccountListLabel(acc);
  const name = role === "from" ? t.fromAccountName : t.toAccountName;
  const bankRaw = role === "from" ? t.fromBankName : t.toBankName;
  const bank = bankRaw?.trim();
  return bank ? `${name} · ${bank}` : name;
}

const fieldClass =
  "mt-1.5 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500";
/** Tighter inputs for transfer form */
const fieldClassCompact =
  "mt-1 block w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/25 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500";
const labelClassCompact =
  "block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";
const sectionCard =
  "overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/50 dark:shadow-none";
const sectionHead =
  "border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 dark:border-gray-800 dark:from-gray-900/80 dark:to-gray-900/40";

const BankAccountsPage: React.FC = () => {
  usePageTitle("Bank Accounts");
  const { user, userProfile } = useAuth();
  const { canCreate, canEdit, canDelete, hasPageAccess, canCreateExpense,
    canViewBankReconciliations,
    canPostBankReconciliation,
    canReverseBankReconciliation,
    canViewBankDeposits,
    canCreateBankDeposit,
    canReverseBankDeposit,
    canViewBankPickerBalance,
    filterBankAccountsForRole,
  } = usePermissions();
  const showPickerBalance = canViewBankPickerBalance();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const accessibleBankAccounts = useMemo(
    () => filterBankAccountsForRole(bankAccounts),
    [bankAccounts, filterBankAccountsForRole],
  );
  const [transferHistory, setTransferHistory] = useState<BankTransfer[]>([]);
  const [reconciliationHistory, setReconciliationHistory] = useState<
    BankReconciliation[]
  >([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    accountName: "",
    bankName: "",
    invoiceDisplayBankName: "",
    accountNumber: "",
    currency: "USD",
    currencySymbol: "$",
    initialBalance: "",
    includeInInvoicePicker: true,
  });
  const [togglingInvoicePickerId, setTogglingInvoicePickerId] = useState<
    string | null
  >(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [xferFromId, setXferFromId] = useState("");
  const [xferToId, setXferToId] = useState("");
  const [xferAmountBasis, setXferAmountBasis] =
    useState<XferAmountBasis>("from");
  const [xferFromGrossInput, setXferFromGrossInput] = useState("");
  const [xferToCreditedInput, setXferToCreditedInput] = useState("");
  const [xferRate, setXferRate] = useState("");
  const [xferFeeType, setXferFeeType] = useState<"percent" | "fixed">(
    "fixed",
  );
  const [xferFeeValue, setXferFeeValue] = useState("");
  const [xferFeeCategory, setXferFeeCategory] = useState("");
  const [xferMemo, setXferMemo] = useState("");
  const [xferSubmitting, setXferSubmitting] = useState(false);
  const [workspaceTab, setWorkspaceTab] =
    useState<BankAccountsWorkspaceTab>("account");

  const [reconcileAccount, setReconcileAccount] = useState<BankAccount | null>(
    null,
  );
  const [reconcileForm, setReconcileForm] = useState({
    statedActualBalance: "",
    asOfDate: todayInput(),
    reasonCode: "manual_adjustment" as BankReconciliationReason,
    notes: "",
  });
  const [reconcileError, setReconcileError] = useState("");
  const [reconcileSubmitting, setReconcileSubmitting] = useState(false);

  const [depositHistory, setDepositHistory] = useState<BankDeposit[]>([]);
  const [depositAccount, setDepositAccount] = useState<BankAccount | null>(null);
  const [depositForm, setDepositForm] = useState({
    amount: "",
    depositDate: todayInput(),
    depositType: "owner_contribution" as BankDepositType,
    referenceNumber: "",
    notes: "",
  });
  const [depositError, setDepositError] = useState("");
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  // Stable scalar identities so data effects don't re-run on every `userProfile`
  // object-reference change (the user doc listener emits a fresh object frequently,
  // which previously made this whole page flash its loading spinner repeatedly).
  const uid = user?.uid ?? "";
  const profileCompanyId = userProfile?.companyId ?? "";
  const profileIsOwner = userProfile?.isOwner === true;

  const expenseCompanyId = useMemo(
    () => (user && userProfile ? getExpenseCompanyId(user, userProfile) : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid, profileCompanyId, profileIsOwner],
  );
  const bankCompanyId = useMemo(
    () =>
      user && userProfile
        ? BankAccountService.resolveBankCompanyId(user, userProfile)
        : "",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid, profileCompanyId, profileIsOwner],
  );

  const loadBankAccounts = useCallback(async () => {
    if (!user || !userProfile) return;

    setLoading(true);
    try {
      const accounts = await BankAccountService.getBankAccountsForCompany(
        user,
        userProfile,
      );
      setBankAccounts(accounts);
    } catch (error) {
      console.error("Error loading bank accounts:", error);
      setBankAccounts([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, bankCompanyId]);

  useEffect(() => {
    loadBankAccounts();
  }, [loadBankAccounts]);

  useEffect(() => {
    if (!expenseCompanyId) return;
    return subscribeCompanyExpenseCategories(
      expenseCompanyId,
      setExpenseCategories,
    );
  }, [expenseCompanyId]);

  useEffect(() => {
    if (!bankCompanyId) return;
    const q = db
      .collection("bankTransfers")
      .where("companyId", "==", bankCompanyId)
      .orderBy("createdAt", "desc")
      .limit(40);
    const unsub = q.onSnapshot(
      (snap) => {
        setTransferHistory(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BankTransfer),
        );
      },
      (err) => {
        console.error("bankTransfers listener:", err);
        setTransferHistory([]);
      },
    );
    return () => unsub();
  }, [bankCompanyId]);

  useEffect(() => {
    if (!bankCompanyId || !canViewBankReconciliations()) {
      setReconciliationHistory([]);
      return;
    }
    return BankReconciliationService.subscribeForCompany(
      bankCompanyId,
      setReconciliationHistory,
      () => setReconciliationHistory([]),
    );
  }, [bankCompanyId, canViewBankReconciliations]);

  useEffect(() => {
    if (!bankCompanyId || !canViewBankDeposits()) {
      setDepositHistory([]);
      return;
    }
    return BankDepositService.subscribeForCompany(
      bankCompanyId,
      setDepositHistory,
      () => setDepositHistory([]),
    );
  }, [bankCompanyId, canViewBankDeposits]);

  useEffect(() => {
    if (accessibleBankAccounts.length < 2) {
      setWorkspaceTab("account");
    }
  }, [accessibleBankAccounts.length]);

  const xferFrom = useMemo(
    () => bankAccounts.find((a) => a.id === xferFromId),
    [bankAccounts, xferFromId],
  );
  const xferTo = useMemo(
    () => bankAccounts.find((a) => a.id === xferToId),
    [bankAccounts, xferToId],
  );

  const xferDifferentCurrency = Boolean(
    xferFrom &&
      xferTo &&
      xferFrom.currency.trim().toUpperCase() !==
        xferTo.currency.trim().toUpperCase(),
  );

  const parsedXferRate = parseFloat(xferRate) || 0;

  const xferDerived = useMemo(
    () =>
      deriveTransferNumbers({
        basis: xferAmountBasis,
        fromInput: xferFromGrossInput,
        toInput: xferToCreditedInput,
        feeType: xferFeeType,
        feeInputRaw: xferFeeValue,
        crossCurrency: xferDifferentCurrency,
        rateRaw: xferRate,
      }),
    [
      xferAmountBasis,
      xferFromGrossInput,
      xferToCreditedInput,
      xferFeeType,
      xferFeeValue,
      xferDifferentCurrency,
      xferRate,
    ],
  );

  useEffect(() => {
    if (xferAmountBasis === "from" && xferFromGrossInput.trim()) {
      const d = deriveTransferNumbers({
        basis: "from",
        fromInput: xferFromGrossInput,
        toInput: xferToCreditedInput,
        feeType: xferFeeType,
        feeInputRaw: xferFeeValue,
        crossCurrency: xferDifferentCurrency,
        rateRaw: xferRate,
      });
      if (d.ok) {
        setXferToCreditedInput(d.credited.toFixed(2));
      }
    } else if (xferAmountBasis === "to" && xferToCreditedInput.trim()) {
      const d = deriveTransferNumbers({
        basis: "to",
        fromInput: xferFromGrossInput,
        toInput: xferToCreditedInput,
        feeType: xferFeeType,
        feeInputRaw: xferFeeValue,
        crossCurrency: xferDifferentCurrency,
        rateRaw: xferRate,
      });
      if (d.ok) {
        setXferFromGrossInput(d.grossFrom.toFixed(2));
      }
    }
  }, [
    xferFeeType,
    xferFeeValue,
    xferRate,
    xferDifferentCurrency,
    xferFromId,
    xferToId,
    xferAmountBasis,
  ]);

  const syncXferFromGrossInput = (v: string) => {
    setXferAmountBasis("from");
    setXferFromGrossInput(v);
    if (!v.trim()) {
      setXferToCreditedInput("");
      return;
    }
    const r = deriveTransferNumbers({
      basis: "from",
      fromInput: v,
      toInput: xferToCreditedInput,
      feeType: xferFeeType,
      feeInputRaw: xferFeeValue,
      crossCurrency: xferDifferentCurrency,
      rateRaw: xferRate,
    });
    if (r.ok) setXferToCreditedInput(r.credited.toFixed(2));
  };

  const syncXferToCreditedInput = (v: string) => {
    setXferAmountBasis("to");
    setXferToCreditedInput(v);
    if (!v.trim()) {
      setXferFromGrossInput("");
      return;
    }
    const r = deriveTransferNumbers({
      basis: "to",
      fromInput: xferFromGrossInput,
      toInput: v,
      feeType: xferFeeType,
      feeInputRaw: xferFeeValue,
      crossCurrency: xferDifferentCurrency,
      rateRaw: xferRate,
    });
    if (r.ok) setXferFromGrossInput(r.grossFrom.toFixed(2));
  };

  const resetForm = () => {
    setForm({
      accountName: "",
      bankName: "",
      invoiceDisplayBankName: "",
      accountNumber: "",
      currency: "USD",
      currencySymbol: "$",
      initialBalance: "",
      includeInInvoicePicker: true,
    });
    setEditingId(null);
    setError("");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    const companyIdRoot = BankAccountService.resolveBankCompanyId(user, userProfile);
    if (!companyIdRoot) {
      setError("Company is still loading. Try again in a moment.");
      return;
    }
    if (
      !form.accountName ||
      !form.bankName ||
      !form.accountNumber ||
      !form.currency ||
      !form.currencySymbol
    ) {
      setError("Please fill all required fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const initialBalance = form.initialBalance
        ? parseFloat(form.initialBalance)
        : 0;
      // Metadata only — never includes balance fields, so edits can't overwrite a
      // ledger balance built up from expenses/invoices/transfers/etc.
      const metadataFields = {
        userId: user.uid,
        companyId: companyIdRoot,
        accountName: form.accountName,
        bankName: form.bankName,
        invoiceDisplayBankName: form.invoiceDisplayBankName.trim(),
        accountNumber: form.accountNumber,
        currency: form.currency,
        currencySymbol: form.currencySymbol,
        includeInInvoicePicker: form.includeInInvoicePicker,
      };
      if (editingId) {
        // Update metadata only. initialBalance/currentBalance are intentionally
        // left untouched on edit to preserve historical balances.
        await db
          .collection("bankAccounts")
          .doc(editingId)
          .update(metadataFields);
      } else {
        const newDocRef = db.collection("bankAccounts").doc();
        await newDocRef.set({
          ...metadataFields,
          initialBalance: initialBalance,
          currentBalance: initialBalance,
          createdAt: Timestamp.now(),
        });
      }
      resetForm();
      // Auto refresh data after successful operation
      await loadBankAccounts();
    } catch (err) {
      console.error("Failed to save bank account:", err);
      setError("Failed to save bank account.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setForm({
      accountName: account.accountName,
      bankName: account.bankName,
      invoiceDisplayBankName: account.invoiceDisplayBankName || "",
      accountNumber: account.accountNumber,
      currency: account.currency,
      currencySymbol: account.currencySymbol || "$",
      initialBalance: "",
      includeInInvoicePicker: account.includeInInvoicePicker !== false,
    });
    setEditingId(account.id);
    setError("");
  };

  const handleToggleInvoicePickerOnCard = async (account: BankAccount) => {
    if (!user) return;
    const currentlyOn = account.includeInInvoicePicker !== false;
    const newVal = !currentlyOn;
    setTogglingInvoicePickerId(account.id);
    setError("");
    try {
      await db.collection("bankAccounts").doc(account.id).update({
        includeInInvoicePicker: newVal,
      });
      setBankAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id ? { ...a, includeInInvoicePicker: newVal } : a,
        ),
      );
    } catch (err) {
      console.error("Failed to update invoice picker flag:", err);
      setError("Could not update invoice bank list setting.");
    } finally {
      setTogglingInvoicePickerId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this bank account?"))
      return;
    setLoading(true);
    try {
      await db.collection("bankAccounts").doc(id).delete();
      // Auto refresh data after successful deletion
      await loadBankAccounts();
    } catch (err) {
      console.error("Failed to delete bank account:", err);
      setError("Failed to delete bank account.");
    } finally {
      setLoading(false);
    }
  };

  const openReconcileModal = (account: BankAccount) => {
    setReconcileAccount(account);
    setReconcileForm({
      statedActualBalance: "",
      asOfDate: todayInput(),
      reasonCode: "manual_adjustment",
      notes: "",
    });
    setReconcileError("");
  };

  const closeReconcileModal = () => {
    setReconcileAccount(null);
    setReconcileError("");
    setReconcileSubmitting(false);
  };

  const reconcilePreview = useMemo(() => {
    if (!reconcileAccount) return null;
    const ledger = accountStoredBalance(reconcileAccount);
    const stated = parseFloat(reconcileForm.statedActualBalance);
    if (!Number.isFinite(stated)) {
      return { ledger, stated: null as number | null, diff: null as number | null };
    }
    const diff = Math.round((stated - ledger) * 100) / 100;
    return { ledger, stated, diff };
  }, [reconcileAccount, reconcileForm.statedActualBalance]);

  const handlePostReconciliation = async () => {
    if (!user || !userProfile || !reconcileAccount) return;
    const stated = parseFloat(reconcileForm.statedActualBalance);
    if (!Number.isFinite(stated)) {
      setReconcileError("Enter the actual balance from your bank app");
      return;
    }
    if (!reconcileForm.asOfDate) {
      setReconcileError("Select the statement / as-of date");
      return;
    }
    if (
      reconcileForm.reasonCode === "other" &&
      !reconcileForm.notes.trim()
    ) {
      setReconcileError("Notes are required when reason is Other");
      return;
    }

    const ledger = accountStoredBalance(reconcileAccount);
    const diff = Math.round((stated - ledger) * 100) / 100;
    if (
      Math.abs(diff) >= 0.0001 &&
      !window.confirm(
        `Post reconciliation adjustment of ${reconcileAccount.currencySymbol}${diff.toFixed(2)}?\n\nSystem: ${reconcileAccount.currencySymbol}${ledger.toFixed(2)}\nActual: ${reconcileAccount.currencySymbol}${stated.toFixed(2)}`,
      )
    ) {
      return;
    }
    if (
      Math.abs(diff) < 0.0001 &&
      reconcileForm.reasonCode !== "confirmed_match" &&
      !window.confirm(
        "Balances already match. Post as confirmed match with no adjustment?",
      )
    ) {
      return;
    }

    setReconcileSubmitting(true);
    setReconcileError("");
    try {
      const companyId = getExpenseCompanyId(user, userProfile);
      const reasonCode =
        Math.abs(diff) < 0.0001 ? "confirmed_match" : reconcileForm.reasonCode;
      const { reconciliationId, adjustmentAmount, ledgerBalanceAfter } =
        await BankReconciliationService.postReconciliation({
          companyId,
          userId: user.uid,
          createdByDisplayName:
            userProfile.displayName ||
            userProfile.companyName ||
            user.email ||
            "",
          bankAccountId: reconcileAccount.id,
          bankAccountName: formatBankAccountListLabel(reconcileAccount),
          currency: reconcileAccount.currency,
          currencySymbol: reconcileAccount.currencySymbol || "$",
          asOfDate: Timestamp.fromDate(new Date(reconcileForm.asOfDate)),
          statedActualBalance: stated,
          reasonCode,
          notes: reconcileForm.notes,
        });

      await ActivityLogger.logActivity(
        user,
        userProfile,
        "bank_reconciliation_posted",
        `Reconciled ${formatBankAccountListLabel(reconcileAccount)}: ${reconcileAccount.currencySymbol}${ledger.toFixed(2)} → ${reconcileAccount.currencySymbol}${stated.toFixed(2)} (${reconciliationReasonLabel(reasonCode)})`,
        {
          entityId: reconcileAccount.id,
          entityType: "bank_account",
          newValue: {
            reconciliationId,
            adjustmentAmount,
            ledgerBalanceAfter,
            statedActualBalance: stated,
            reasonCode,
          },
        },
      );

      closeReconcileModal();
    } catch (err) {
      console.error("Reconciliation failed:", err);
      setReconcileError(
        err instanceof Error ? err.message : "Failed to post reconciliation",
      );
      setReconcileSubmitting(false);
    }
  };

  const handleReverseReconciliation = async (record: BankReconciliation) => {
    if (!user || !userProfile) return;
    if (
      !window.confirm(
        `Reverse this reconciliation (${record.currencySymbol}${(record.adjustmentAmount || 0).toFixed(2)})? The bank balance will be adjusted back.`,
      )
    ) {
      return;
    }
    try {
      const companyId = getExpenseCompanyId(user, userProfile);
      const { reconciliationId } =
        await BankReconciliationService.reverseReconciliation(record, {
          companyId,
          userId: user.uid,
          createdByDisplayName:
            userProfile.displayName ||
            userProfile.companyName ||
            user.email ||
            "",
        });
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "bank_reconciliation_reversed",
        `Reversed reconciliation for ${record.bankAccountName}`,
        {
          entityId: record.bankAccountId,
          entityType: "bank_account",
          oldValue: record,
          newValue: { reversalId: reconciliationId },
        },
      );
    } catch (err) {
      console.error("Reverse reconciliation failed:", err);
      alert(
        err instanceof Error ? err.message : "Failed to reverse reconciliation",
      );
    }
  };

  const openDepositModal = (account: BankAccount) => {
    setDepositAccount(account);
    setDepositForm({
      amount: "",
      depositDate: todayInput(),
      depositType: "owner_contribution",
      referenceNumber: "",
      notes: "",
    });
    setDepositError("");
  };

  const closeDepositModal = () => {
    setDepositAccount(null);
    setDepositError("");
    setDepositSubmitting(false);
  };

  const handleRecordDeposit = async () => {
    if (!user || !userProfile || !depositAccount) return;
    const amount = parseFloat(depositForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositError("Enter a valid deposit amount greater than 0");
      return;
    }
    if (!depositForm.depositDate) {
      setDepositError("Select the deposit date");
      return;
    }
    setDepositSubmitting(true);
    setDepositError("");
    try {
      const companyId = getExpenseCompanyId(user, userProfile);
      const { depositId } = await BankDepositService.recordDeposit({
        companyId,
        userId: user.uid,
        createdByDisplayName:
          userProfile.displayName ||
          userProfile.companyName ||
          user.email ||
          "",
        bankAccountId: depositAccount.id,
        bankAccountName: formatBankAccountListLabel(depositAccount),
        currency: depositAccount.currency,
        currencySymbol: depositAccount.currencySymbol || "$",
        amount,
        depositDate: Timestamp.fromDate(new Date(depositForm.depositDate)),
        depositType: depositForm.depositType,
        referenceNumber: depositForm.referenceNumber,
        notes: depositForm.notes,
      });

      await ActivityLogger.logActivity(
        user,
        userProfile,
        "bank_deposit_recorded",
        `Deposited ${depositAccount.currencySymbol}${amount.toFixed(2)} into ${formatBankAccountListLabel(depositAccount)} (${depositTypeLabel(depositForm.depositType)})`,
        {
          entityId: depositAccount.id,
          entityType: "bank_account",
          newValue: {
            depositId,
            amount,
            depositType: depositForm.depositType,
            referenceNumber: depositForm.referenceNumber || undefined,
          },
        },
      );

      closeDepositModal();
    } catch (err) {
      console.error("Deposit failed:", err);
      setDepositError(
        err instanceof Error ? err.message : "Failed to record deposit",
      );
      setDepositSubmitting(false);
    }
  };

  const handleReverseDeposit = async (record: BankDeposit) => {
    if (!user || !userProfile) return;
    if (
      !window.confirm(
        `Reverse this deposit (${record.currencySymbol}${(record.amount || 0).toFixed(2)})? The bank balance will be debited back.`,
      )
    ) {
      return;
    }
    try {
      const companyId = getExpenseCompanyId(user, userProfile);
      const { depositId } = await BankDepositService.reverseDeposit(record, {
        companyId,
        userId: user.uid,
        createdByDisplayName:
          userProfile.displayName ||
          userProfile.companyName ||
          user.email ||
          "",
      });
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "bank_deposit_reversed",
        `Reversed deposit for ${record.bankAccountName}`,
        {
          entityId: record.bankAccountId,
          entityType: "bank_account",
          oldValue: record,
          newValue: { reversalId: depositId },
        },
      );
    } catch (err) {
      console.error("Reverse deposit failed:", err);
      alert(err instanceof Error ? err.message : "Failed to reverse deposit");
    }
  };

  const resetTransferForm = () => {
    setXferFromId("");
    setXferToId("");
    setXferAmountBasis("from");
    setXferFromGrossInput("");
    setXferToCreditedInput("");
    setXferRate("");
    setXferFeeType("fixed");
    setXferFeeValue("");
    setXferFeeCategory("");
    setXferMemo("");
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    const cidRoot = BankAccountService.resolveBankCompanyId(user, userProfile);
    const expenseCid = getExpenseCompanyId(user, userProfile);
    if (!cidRoot || !expenseCid) {
      alert("Company is still loading. Try again in a moment.");
      return;
    }
    const from = bankAccounts.find((a) => a.id === xferFromId);
    const to = bankAccounts.find((a) => a.id === xferToId);
    if (!from || !to) {
      alert("Select both accounts.");
      return;
    }
    if (from.id === to.id) {
      alert("From and to accounts must be different.");
      return;
    }
    const d = xferDerived;
    if (!d.ok || !(d.grossFrom > 0)) {
      alert(
        "Enter valid amounts. Fee is taken from the total you send: gross from account must exceed the fee, and the rest converts. For cross-currency, set a valid rate.",
      );
      return;
    }
    const grossFrom = d.grossFrom;
    const netTransfer = d.net;
    const feeAmount = d.fee;
    const credited = d.credited;

    const sameCurrency =
      from.currency.trim().toUpperCase() === to.currency.trim().toUpperCase();
    let exchangeRate: number | null = null;
    if (!sameCurrency) {
      if (!(parsedXferRate > 0)) {
        alert(
          `Enter an exchange rate: 1 ${from.currency} equals how many ${to.currency}?`,
        );
        return;
      }
      exchangeRate = parsedXferRate;
    }

    const parsedFeeParam = parseFloat(xferFeeValue);
    const feeInputStored = Number.isFinite(parsedFeeParam) ? parsedFeeParam : 0;

    if (feeAmount > 0) {
      if (!xferFeeCategory.trim()) {
        alert("Select an expense category for the transfer fee.");
        return;
      }
      if (!canCreateExpense()) {
        alert(
          "You need permission to create expenses to record a transfer fee. Set fee to 0 or ask an admin.",
        );
        return;
      }
    }

    const fromBal = from.currentBalance ?? from.initialBalance ?? 0;
    if (fromBal < grossFrom) {
      alert(
        `Insufficient balance in ${formatBankAccountListLabel(from)}. Need ${from.currencySymbol}${grossFrom.toFixed(2)} total (fee is included in this amount).`,
      );
      return;
    }

    setXferSubmitting(true);
    setError("");
    try {
      const fromRef = db.collection("bankAccounts").doc(from.id);
      const toRef = db.collection("bankAccounts").doc(to.id);
      const transferRef = db.collection("bankTransfers").doc();
      const expRef =
        feeAmount > 0 ? db.collection("expenses").doc() : null;

      const batch = db.batch();
      batch.update(fromRef, {
        currentBalance: firebase.firestore.FieldValue.increment(-netTransfer),
      });
      batch.update(toRef, {
        currentBalance: firebase.firestore.FieldValue.increment(credited),
      });

      if (feeAmount > 0 && expRef) {
        batch.update(fromRef, {
          currentBalance: firebase.firestore.FieldValue.increment(-feeAmount),
        });
        batch.set(expRef, {
          userId: user.uid,
          companyId: expenseCid,
          title: `Transfer fee (${formatBankAccountListLabel(from)} → ${formatBankAccountListLabel(to)})`,
          description: [
            `Transfer record: ${transferRef.id}`,
            `Total debited from source: ${from.currencySymbol}${grossFrom.toFixed(2)} ${from.currency} (fee ${from.currencySymbol}${feeAmount.toFixed(2)} taken from this; net ${from.currencySymbol}${netTransfer.toFixed(2)} sent)`,
            sameCurrency
              ? null
              : `FX: 1 ${from.currency} = ${exchangeRate} ${to.currency}; credited ${to.currencySymbol}${credited.toFixed(2)}`,
            xferMemo.trim() ? `Memo: ${xferMemo.trim()}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          amount: feeAmount,
          category: xferFeeCategory.trim(),
          bankAccountId: from.id,
          bankAccountName: formatBankAccountListLabel(from),
          currency: from.currency,
          currencySymbol: from.currencySymbol || "$",
          date: Timestamp.now(),
          createdAt: Timestamp.now(),
          vendorId: null,
          vendorName: "Bank / Transfer fee",
          oneTimeVendor: true,
        });
      }

      batch.set(transferRef, {
        companyId: cidRoot,
        userId: user.uid,
        fromBankAccountId: from.id,
        toBankAccountId: to.id,
        fromAccountName: from.accountName,
        toAccountName: to.accountName,
        fromBankName: from.bankName,
        toBankName: to.bankName,
        principalAmount: grossFrom,
        netTransferAmount: netTransfer,
        fromCurrency: from.currency,
        fromCurrencySymbol: from.currencySymbol || "$",
        toCurrency: to.currency,
        toCurrencySymbol: to.currencySymbol || "$",
        amountCreditedToDestination: credited,
        exchangeRate,
        feeType:
          feeAmount > 0 ? xferFeeType : ("none" as const),
        feeInput: feeAmount > 0 ? feeInputStored : 0,
        feeAmount,
        expenseId: expRef ? expRef.id : null,
        memo: xferMemo.trim() || null,
        createdAt: Timestamp.now(),
      });

      await batch.commit();

      await ActivityLogger.logActivity(
        user,
        userProfile,
        "bank_transfer_created",
        `Bank transfer ${from.currencySymbol}${grossFrom.toFixed(2)} ${from.currency} total from ${formatBankAccountListLabel(from)} → ${formatBankAccountListLabel(to)} (${from.currencySymbol}${netTransfer.toFixed(2)} net${feeAmount > 0 ? `, fee ${from.currencySymbol}${feeAmount.toFixed(2)}` : ""})`,
        { entityId: transferRef.id, entityType: "bank_transfer" },
      );

      resetTransferForm();
      await loadBankAccounts();
    } catch (err) {
      console.error("Transfer failed:", err);
      alert(
        "Transfer failed. If balances look wrong, refresh and check Firestore rules for bankTransfers.",
      );
    } finally {
      setXferSubmitting(false);
    }
  };

  if (!hasPageAccess(PAGES.BANK_ACCOUNTS)) {
    return (
      <div className="min-h-[50vh] bg-slate-50/90 px-4 py-16 dark:bg-gray-950">
        <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg
              className="h-6 w-6 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Access denied
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You don&apos;t have permission to view bank accounts.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50/90 dark:bg-gray-950">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/90 pb-16 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col gap-4 border-b border-gray-200/80 pb-8 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Bank accounts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Balances, internal transfers, and payout accounts for invoices —
              all in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadBankAccounts()}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        <div className="space-y-10">
          {/* —— Balances —— */}
          <section className={sectionCard}>
            <div className={sectionHead}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your balances
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {bankAccounts.length === 0
                  ? "Add an account below to see live balances here."
                  : `${bankAccounts.length} account${bankAccounts.length === 1 ? "" : "s"} linked.`}
              </p>
            </div>
            <div className="p-5 sm:p-6">
              {bankAccounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-slate-50/50 py-12 text-center dark:border-gray-700 dark:bg-gray-900/30">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    No bank accounts yet
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                    Add your first account in the section below. Internal
                    transfers need at least two accounts.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {bankAccounts.map((account) => (
                    <article
                      key={account.id}
                      className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-900/50"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="text-base font-semibold leading-snug text-gray-900 break-words dark:text-white">
                            {account.accountName?.trim() || "Account"}
                          </h3>
                          <p className="text-sm leading-snug text-gray-600 break-words dark:text-gray-300">
                            {account.bankName?.trim() || "—"}
                          </p>
                          {account.invoiceDisplayBankName?.trim() ? (
                            <p className="text-xs leading-snug text-indigo-600 break-words dark:text-indigo-400">
                              <span className="font-medium text-gray-500 dark:text-gray-400">
                                On invoices:{" "}
                              </span>
                              {getInvoiceBankDisplayName(account)}
                            </p>
                          ) : null}
                          <p className="pt-0.5 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {account.accountNumber}
                          </p>
                        </div>
                        <span className="inline-flex w-fit shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-300">
                          {account.currency}
                        </span>
                      </div>
                      <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Initial</span>
                          <span className="tabular-nums text-gray-700 dark:text-gray-300">
                            {account.currencySymbol || "$"}
                            {(account.initialBalance || 0).toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Symbol</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {account.currencySymbol || "$"}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2 pt-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Current
                          </span>
                          <span className="text-xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                            {account.currencySymbol || "$"}
                            {(
                              account.currentBalance ??
                              account.initialBalance ??
                              0
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                      {account.lastReconciledAt ? (
                        <p className="mt-3 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                          Last reconciled{" "}
                          {account.lastReconciledAt.toDate?.()?.toLocaleDateString?.() ??
                            "—"}
                          {typeof account.lastReconciledStatedBalance ===
                          "number"
                            ? ` · stated ${account.currencySymbol}${account.lastReconciledStatedBalance.toFixed(2)}`
                            : ""}
                        </p>
                      ) : null}
                      <div className="mt-4 rounded-lg border border-gray-100 bg-slate-50/90 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                              Invoice dropdown
                            </p>
                            <p className="text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                              {isBankIncludedInInvoicePicker(account)
                                ? "Shown when creating invoices"
                                : "Hidden from invoice bank list"}
                            </p>
                          </div>
                          <ProtectedComponent
                            page={PAGES.BANK_ACCOUNTS}
                            action="edit"
                          >
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isBankIncludedInInvoicePicker(
                                account,
                              )}
                              disabled={togglingInvoicePickerId === account.id}
                              onClick={() =>
                                handleToggleInvoicePickerOnCard(account)
                              }
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900 ${
                                isBankIncludedInInvoicePicker(account)
                                  ? "bg-indigo-600"
                                  : "bg-gray-200 dark:bg-gray-600"
                              }`}
                            >
                              <span
                                className={`pointer-events-none my-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                                  isBankIncludedInInvoicePicker(account)
                                    ? "translate-x-5"
                                    : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </ProtectedComponent>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        {canCreateBankDeposit() ? (
                          <button
                            type="button"
                            onClick={() => openDepositModal(account)}
                            className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                          >
                            Add deposit
                          </button>
                        ) : null}
                        {canPostBankReconciliation() ? (
                          <button
                            type="button"
                            onClick={() => openReconcileModal(account)}
                            className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-900 transition hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200 dark:hover:bg-indigo-900/30"
                          >
                            Reconcile balance
                          </button>
                        ) : null}
                      <div className="flex gap-2">
                        <ProtectedComponent
                          page={PAGES.BANK_ACCOUNTS}
                          action="edit"
                        >
                          <button
                            type="button"
                            onClick={() => handleEdit(account)}
                            className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/30"
                          >
                            Edit
                          </button>
                        </ProtectedComponent>
                        <ProtectedComponent
                          page={PAGES.BANK_ACCOUNTS}
                          action="delete"
                        >
                          <button
                            type="button"
                            onClick={() => handleDelete(account.id)}
                            className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Delete
                          </button>
                        </ProtectedComponent>
                      </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* —— Add / edit account & transfers (tabbed when user can create) —— */}
          {(canCreate(PAGES.BANK_ACCOUNTS) || canEdit(PAGES.BANK_ACCOUNTS)) && (
          <section className={sectionCard}>
            {canCreate(PAGES.BANK_ACCOUNTS) ? (
              <div
                className="flex gap-0 border-b border-gray-100 dark:border-gray-800"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={workspaceTab === "account"}
                  onClick={() => setWorkspaceTab("account")}
                  className={`relative flex-1 px-4 py-3.5 text-sm font-semibold transition ${
                    workspaceTab === "account"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  Add / edit account
                  {workspaceTab === "account" ? (
                    <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  ) : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={workspaceTab === "transfer"}
                  disabled={accessibleBankAccounts.length < 2}
                  onClick={() =>
                    accessibleBankAccounts.length >= 2 && setWorkspaceTab("transfer")
                  }
                  title={
                    accessibleBankAccounts.length < 2
                      ? "Add at least two accounts to transfer"
                      : undefined
                  }
                  className={`relative flex-1 px-4 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    workspaceTab === "transfer"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  Internal transfer
                  {workspaceTab === "transfer" ? (
                    <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  ) : null}
                </button>
              </div>
            ) : (
              <div className={sectionHead}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingId ? "Edit account" : "Account"}
                  </h2>
                  {editingId ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                      Editing
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Update this bank account&apos;s details.
                </p>
              </div>
            )}

            <div className="p-4 sm:p-5">
              {(!canCreate(PAGES.BANK_ACCOUNTS) ||
                workspaceTab === "account") && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </p>
                ) : null}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label htmlFor="ba-accountName" className={labelClass}>
                      Account name
                    </label>
                    <input
                      id="ba-accountName"
                      type="text"
                      name="accountName"
                      value={form.accountName}
                      onChange={handleInputChange}
                      className={fieldClass}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ba-bankName" className={labelClass}>
                      Bank name
                    </label>
                    <input
                      id="ba-bankName"
                      type="text"
                      name="bankName"
                      value={form.bankName}
                      onChange={handleInputChange}
                      className={fieldClass}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label
                      htmlFor="ba-invoiceDisplayBankName"
                      className={labelClass}
                    >
                      Invoice label (optional)
                    </label>
                    <input
                      id="ba-invoiceDisplayBankName"
                      type="text"
                      name="invoiceDisplayBankName"
                      value={form.invoiceDisplayBankName}
                      onChange={handleInputChange}
                      placeholder="Shown on invoices/PDFs instead of bank name"
                      className={fieldClass}
                    />
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      Leave empty to use the real bank name. Customers only see
                      this label when picking a bank on invoices.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="ba-accountNumber" className={labelClass}>
                      Account number
                    </label>
                    <input
                      id="ba-accountNumber"
                      type="text"
                      name="accountNumber"
                      value={form.accountNumber}
                      onChange={handleInputChange}
                      className={fieldClass}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ba-currency" className={labelClass}>
                      Currency
                    </label>
                    <select
                      id="ba-currency"
                      name="currency"
                      value={form.currency}
                      onChange={handleInputChange}
                      className={fieldClass}
                      required
                    >
                      {currencies.map((cur) => (
                        <option key={cur} value={cur}>
                          {cur}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ba-currencySymbol" className={labelClass}>
                      Currency symbol
                    </label>
                    <input
                      id="ba-currencySymbol"
                      type="text"
                      name="currencySymbol"
                      value={form.currencySymbol}
                      onChange={handleInputChange}
                      placeholder="$  €  ₨"
                      className={fieldClass}
                      required
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label htmlFor="ba-initialBalance" className={labelClass}>
                      Initial balance (optional)
                    </label>
                    <input
                      id="ba-initialBalance"
                      type="number"
                      name="initialBalance"
                      value={form.initialBalance}
                      onChange={handleInputChange}
                      className={fieldClass}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900/30">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className={labelClass}>Invoice bank dropdown</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        On: this account appears in the bank list on the invoice
                        form. Off: hidden there only (still available for transfers
                        and expenses).
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.includeInInvoicePicker}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          includeInInvoicePicker: !prev.includeInInvoicePicker,
                        }))
                      }
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-gray-900 ${
                        form.includeInInvoicePicker
                          ? "bg-indigo-600"
                          : "bg-gray-200 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none my-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                          form.includeInInvoicePicker
                            ? "translate-x-6"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
                {(canCreate(PAGES.BANK_ACCOUNTS) ||
                  canEdit(PAGES.BANK_ACCOUNTS)) && (
                  <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      {editingId ? "Discard edit" : "Clear form"}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {editingId ? "Save changes" : "Add account"}
                    </button>
                  </div>
                )}
              </form>
              )}

              {canCreate(PAGES.BANK_ACCOUNTS) &&
                workspaceTab === "transfer" &&
                (accessibleBankAccounts.length >= 2 ? (
                  <form
                    onSubmit={handleTransferSubmit}
                    className="space-y-4"
                  >
                    <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      Fee is taken from the gross debit on the source. Type
                      either gross debit or amount credited — the other field
                      updates. FX: 1 {xferFrom?.currency ?? "from"} = ?{" "}
                      {xferTo?.currency ?? "to"}.
                    </p>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClassCompact}>From *</label>
                        <select
                          value={xferFromId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setXferFromId(v);
                            setXferToId((prev) =>
                              !v || prev === v ? "" : prev,
                            );
                          }}
                          className={fieldClassCompact}
                          required
                        >
                          <option value="">Source</option>
                          {accessibleBankAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {formatBankAccountSelectLabel(a, showPickerBalance)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClassCompact}>To *</label>
                        <select
                          value={xferToId}
                          onChange={(e) => setXferToId(e.target.value)}
                          disabled={!xferFromId}
                          className={`${fieldClassCompact} disabled:cursor-not-allowed disabled:opacity-50`}
                          required={Boolean(xferFromId)}
                        >
                          <option value="">
                            {xferFromId ? "Destination" : "Pick source first"}
                          </option>
                          {accessibleBankAccounts
                            .filter((a) => a.id !== xferFromId)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {formatBankAccountListLabel(a)} ({a.currency})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {xferDifferentCurrency ? (
                      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                        <div className="min-w-[8rem] flex-1">
                          <label className={labelClassCompact}>
                            Rate (1 {xferFrom?.currency ?? ""} = ?{" "}
                            {xferTo?.currency ?? ""}) *
                          </label>
                          <input
                            type="number"
                            min="0.0000001"
                            step="any"
                            value={xferRate}
                            onChange={(e) => setXferRate(e.target.value)}
                            placeholder="278"
                            className={fieldClassCompact}
                            required
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClassCompact}>Fee type</label>
                        <select
                          value={xferFeeType}
                          onChange={(e) =>
                            setXferFeeType(
                              e.target.value as "percent" | "fixed",
                            )
                          }
                          className={fieldClassCompact}
                        >
                          <option value="fixed">Fixed</option>
                          <option value="percent">Percent</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClassCompact}>
                          Fee {xferFeeType === "percent" ? "(%)" : ""}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          max={
                            xferFeeType === "percent" ? "99.99" : undefined
                          }
                          value={xferFeeValue}
                          onChange={(e) => setXferFeeValue(e.target.value)}
                          placeholder={xferFeeType === "percent" ? "1.5" : "0"}
                          className={fieldClassCompact}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClassCompact}>
                          Gross debit ({xferFrom?.currency ?? "—"}) *
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={xferFromGrossInput}
                          onChange={(e) =>
                            syncXferFromGrossInput(e.target.value)
                          }
                          disabled={!xferFrom || !xferTo}
                          className={`${fieldClassCompact} disabled:cursor-not-allowed disabled:opacity-50`}
                          required
                        />
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          Includes fee; remainder credits &quot;to&quot;.
                        </p>
                      </div>
                      <div>
                        <label className={labelClassCompact}>
                          Credited ({xferTo?.currency ?? "—"}) *
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={xferToCreditedInput}
                          onChange={(e) =>
                            syncXferToCreditedInput(e.target.value)
                          }
                          disabled={!xferFrom || !xferTo}
                          className={`${fieldClassCompact} disabled:cursor-not-allowed disabled:opacity-50`}
                          required
                        />
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          Or type here to back-solve gross.
                        </p>
                      </div>
                    </div>

                    {xferDerived.ok &&
                    xferFrom &&
                    xferTo &&
                    xferFrom.id !== xferTo.id ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-emerald-200/80 bg-emerald-50/60 px-3 py-2 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/25">
                        <span className="font-medium text-emerald-900 dark:text-emerald-200">
                          Fee{" "}
                          <span className="tabular-nums">
                            {xferFrom.currencySymbol || "$"}
                            {xferDerived.fee.toFixed(2)}
                          </span>
                        </span>
                        <span className="text-emerald-800 dark:text-emerald-300/90">
                          Net:{" "}
                          <span className="font-semibold tabular-nums">
                            {xferFrom.currencySymbol || "$"}
                            {xferDerived.net.toFixed(2)}
                          </span>
                        </span>
                        <span className="text-emerald-800 dark:text-emerald-300/90">
                          Credit:{" "}
                          <span className="font-semibold tabular-nums">
                            {xferTo.currencySymbol || "$"}
                            {Number.isFinite(xferDerived.credited)
                              ? xferDerived.credited.toFixed(2)
                              : "—"}
                          </span>
                        </span>
                      </div>
                    ) : null}

                    {xferDerived.fee > 0 ? (
                      <div>
                        <label className={labelClassCompact}>
                          Fee expense category *
                        </label>
                        <select
                          value={xferFeeCategory}
                          onChange={(e) => setXferFeeCategory(e.target.value)}
                          className={fieldClassCompact}
                          required={xferDerived.fee > 0}
                        >
                          <option value="">Category</option>
                          {expenseCategories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        {!canCreateExpense() ? (
                          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                            No expense permission — use fee 0 or ask admin.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <label className={labelClassCompact}>Memo</label>
                      <input
                        type="text"
                        value={xferMemo}
                        onChange={(e) => setXferMemo(e.target.value)}
                        className={fieldClassCompact}
                        placeholder="Optional reference"
                      />
                    </div>

                    {xferFrom &&
                    xferTo &&
                    xferFrom.id !== xferTo.id &&
                    (xferFromGrossInput.trim() ||
                      xferToCreditedInput.trim()) &&
                    !xferDerived.ok ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                        Fix fee, gross, rate, or credited amount.
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <button
                        type="submit"
                        disabled={
                          xferSubmitting ||
                          !xferDerived.ok ||
                          (!canCreateExpense() && xferDerived.fee > 0) ||
                          (xferDifferentCurrency &&
                            (!(parsedXferRate > 0) ||
                              !Number.isFinite(xferDerived.credited)))
                        }
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {xferSubmitting ? "Processing…" : "Execute transfer"}
                      </button>
                      <button
                        type="button"
                        onClick={resetTransferForm}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Reset
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                    Add at least <strong>two</strong> bank accounts to run an
                    internal transfer.
                  </div>
                ))}
            </div>
          </section>
          )}

          {transferHistory.length > 0 ? (
            <section className={sectionCard}>
              <div className={sectionHead}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent transfers
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Latest internal moves (newest first).
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-gray-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Date</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="whitespace-nowrap px-4 py-3">Debit (gross)</th>
                      <th className="whitespace-nowrap px-4 py-3">Credited</th>
                      <th className="px-4 py-3">FX</th>
                      <th className="whitespace-nowrap px-4 py-3">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300">
                    {transferHistory.map((t) => (
                      <tr
                        key={t.id}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-gray-800/50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          {t.createdAt?.toDate
                            ? t.createdAt.toDate().toLocaleString()
                            : "—"}
                        </td>
                        <td className="min-w-0 max-w-md px-4 py-3 text-xs leading-snug break-words sm:text-sm">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {transferPartyLabel(t, "from", bankAccounts)}
                          </span>
                          <span className="text-gray-400"> → </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {transferPartyLabel(t, "to", bankAccounts)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums font-medium">
                          {t.fromCurrencySymbol}
                          {t.principalAmount?.toFixed?.(2) ?? t.principalAmount}{" "}
                          {t.fromCurrency}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                          {t.toCurrencySymbol}
                          {t.amountCreditedToDestination?.toFixed?.(2) ??
                            t.amountCreditedToDestination}{" "}
                          {t.toCurrency}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          {t.exchangeRate != null ? (
                            <span>
                              1 {t.fromCurrency} = {t.exchangeRate}{" "}
                              {t.toCurrency}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-xs">
                          {t.feeAmount > 0 ? (
                            <>
                              {t.fromCurrencySymbol}
                              {t.feeAmount.toFixed(2)}
                              {t.expenseId ? (
                                <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                                  · exp
                                </span>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {canViewBankReconciliations() && reconciliationHistory.length > 0 ? (
            <section className={sectionCard}>
              <div className={sectionHead}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Reconciliation history
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Book vs actual balance adjustments (newest first).
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="border-b border-gray-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Date</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">
                        System
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">
                        Actual
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">
                        Adjustment
                      </th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300">
                    {reconciliationHistory.map((r) => {
                      const reversed = reconciliationHistory.some(
                        (x) => x.reversalOfId === r.id,
                      );
                      const showReverse =
                        canReverseBankReconciliation() &&
                        !r.reversalOfId &&
                        !reversed &&
                        Math.abs(r.adjustmentAmount ?? 0) >= 0.0001;
                      return (
                        <tr
                          key={r.id}
                          className="transition-colors hover:bg-slate-50/80 dark:hover:bg-gray-800/50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                            {r.asOfDate?.toDate?.()?.toLocaleDateString?.() ??
                              "—"}
                          </td>
                          <td className="min-w-0 px-4 py-3 text-xs sm:text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {r.bankAccountName}
                            </span>
                            {r.reversalOfId ? (
                              <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">
                                (reversal)
                              </span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                            {r.currencySymbol}
                            {(r.ledgerBalanceBefore ?? 0).toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                            {r.currencySymbol}
                            {(r.statedActualBalance ?? 0).toFixed(2)}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium ${
                              (r.adjustmentAmount ?? 0) >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {(r.adjustmentAmount ?? 0) >= 0 ? "+" : ""}
                            {r.currencySymbol}
                            {(r.adjustmentAmount ?? 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {reconciliationReasonLabel(r.reasonCode)}
                            {r.notes ? (
                              <div className="mt-0.5 max-w-xs truncate text-gray-500 dark:text-gray-400">
                                {r.notes}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {showReverse ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleReverseReconciliation(r)
                                }
                                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                              >
                                Reverse
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {canViewBankDeposits() && depositHistory.length > 0 ? (
            <section className={sectionCard}>
              <div className={sectionHead}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Deposit history
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manual deposits (owner contributions, cash, external
                  transfers) — newest first.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="border-b border-gray-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-400">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Date</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">
                        Amount
                      </th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Reference / notes</th>
                      <th className="px-4 py-3 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300">
                    {depositHistory.map((d) => {
                      const reversed = depositHistory.some(
                        (x) => x.reversalOfId === d.id,
                      );
                      const showReverse =
                        canReverseBankDeposit() &&
                        !d.reversalOfId &&
                        !reversed &&
                        (d.amount ?? 0) > 0;
                      return (
                        <tr
                          key={d.id}
                          className="transition-colors hover:bg-slate-50/80 dark:hover:bg-gray-800/50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                            {d.depositDate?.toDate?.()?.toLocaleDateString?.() ??
                              "—"}
                          </td>
                          <td className="min-w-0 px-4 py-3 text-xs sm:text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {d.bankAccountName}
                            </span>
                            {d.reversalOfId ? (
                              <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">
                                (reversal)
                              </span>
                            ) : null}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium ${
                              (d.amount ?? 0) >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {(d.amount ?? 0) >= 0 ? "+" : ""}
                            {d.currencySymbol}
                            {(d.amount ?? 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {depositTypeLabel(d.depositType)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {d.referenceNumber ? (
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {d.referenceNumber}
                              </span>
                            ) : null}
                            {d.notes ? (
                              <div className="mt-0.5 max-w-xs truncate text-gray-500 dark:text-gray-400">
                                {d.notes}
                              </div>
                            ) : !d.referenceNumber ? (
                              <span className="text-gray-400">—</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {showReverse ? (
                              <button
                                type="button"
                                onClick={() => void handleReverseDeposit(d)}
                                className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                              >
                                Reverse
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {reconcileAccount && reconcilePreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Reconcile balance
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formatBankAccountListLabel(reconcileAccount)}
              </p>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    System balance (book)
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                    {reconcileAccount.currencySymbol}
                    {reconcilePreview.ledger.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Difference
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold tabular-nums ${
                      reconcilePreview.diff == null
                        ? "text-gray-400"
                        : reconcilePreview.diff >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {reconcilePreview.diff == null
                      ? "—"
                      : `${reconcilePreview.diff >= 0 ? "+" : ""}${reconcileAccount.currencySymbol}${reconcilePreview.diff.toFixed(2)}`}
                  </p>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Actual balance (from bank app) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={reconcileForm.statedActualBalance}
                  onChange={(e) =>
                    setReconcileForm({
                      ...reconcileForm,
                      statedActualBalance: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>As-of date *</label>
                <input
                  type="date"
                  value={reconcileForm.asOfDate}
                  onChange={(e) =>
                    setReconcileForm({
                      ...reconcileForm,
                      asOfDate: e.target.value,
                    })
                  }
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Reason *</label>
                <select
                  value={reconcileForm.reasonCode}
                  onChange={(e) =>
                    setReconcileForm({
                      ...reconcileForm,
                      reasonCode: e.target.value as BankReconciliationReason,
                    })
                  }
                  className={fieldClass}
                >
                  {RECONCILIATION_REASON_OPTIONS.filter(
                    (o) => o.value !== "confirmed_match",
                  ).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  If balances already match, no adjustment is posted (confirmed
                  match).
                </p>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={reconcileForm.notes}
                  onChange={(e) =>
                    setReconcileForm({ ...reconcileForm, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Optional — required if reason is Other"
                  className={fieldClass}
                />
              </div>

              {reconcileError ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {reconcileError}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                type="button"
                onClick={closeReconcileModal}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reconcileSubmitting}
                onClick={() => void handlePostReconciliation()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {reconcileSubmitting ? "Posting…" : "Post reconciliation"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {depositAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Add deposit
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formatBankAccountListLabel(depositAccount)}
                {showPickerBalance
                  ? ` — current balance ${depositAccount.currencySymbol}${accountStoredBalance(depositAccount).toFixed(2)}`
                  : null}
              </p>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className={labelClass}>
                  Amount ({depositAccount.currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depositForm.amount}
                  onChange={(e) =>
                    setDepositForm({ ...depositForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Deposit date *</label>
                <input
                  type="date"
                  value={depositForm.depositDate}
                  onChange={(e) =>
                    setDepositForm({
                      ...depositForm,
                      depositDate: e.target.value,
                    })
                  }
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Source / type *</label>
                <select
                  value={depositForm.depositType}
                  onChange={(e) =>
                    setDepositForm({
                      ...depositForm,
                      depositType: e.target.value as BankDepositType,
                    })
                  }
                  className={fieldClass}
                >
                  {DEPOSIT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Reference number</label>
                <input
                  type="text"
                  value={depositForm.referenceNumber}
                  onChange={(e) =>
                    setDepositForm({
                      ...depositForm,
                      referenceNumber: e.target.value,
                    })
                  }
                  placeholder="Optional — slip no., cheque no., txn id"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={depositForm.notes}
                  onChange={(e) =>
                    setDepositForm({ ...depositForm, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </div>

              {depositError ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {depositError}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                type="button"
                onClick={closeDepositModal}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={depositSubmitting}
                onClick={() => void handleRecordDeposit()}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {depositSubmitting ? "Saving…" : "Record deposit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BankAccountsPage;
