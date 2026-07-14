import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import firebase from "firebase/compat/app";
import { db, Timestamp } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import { BankAccountService } from "../../services/bankAccountService";
import { ExpenseReturnService } from "../../services/expenseReturnService";
import { subscribeCompanyVendors } from "../../services/vendorService";
import {
  renameCategoryOnExpenses,
  subscribeCompanyExpenseCategories,
} from "../../services/expenseCategoryService";
import type {
  Expense,
  BankAccount,
  Vendor,
  ExpenseCategory,
  ExpenseReturn,
  ExpenseReturnType,
} from "../../types";
import Spinner from "../../components/Spinner";
import {
  RowIconButton,
  IconEdit,
  IconDelete,
  IconReturn,
} from "../../components/RowIconButton";
import { GRANULAR_PERMISSIONS } from "../../config/permissions";
import {
  backfillExpenseCompanyIdsIfNeeded,
  getExpenseCompanyId,
} from "../../utils/expenseCompanyScope";
import {
  formatBankAccountListLabel,
  formatBankAccountSelectLabel,
} from "../../utils/bankAccountDisplay";

/** Expense form: directory payee or one-time payee (this sentinel value). */
const OTHER_PAYEE_VALUE = "__other__";

/** Return/refund/cashback types shown in the Receive Return modal. */
const EXPENSE_RETURN_TYPE_OPTIONS: { value: ExpenseReturnType; label: string }[] = [
  { value: "cashback", label: "Cashback" },
  { value: "vendor_refund", label: "Vendor refund" },
  { value: "partial_refund", label: "Partial refund" },
  { value: "full_refund", label: "Full refund" },
  { value: "other", label: "Other" },
];

function expenseReturnTypeLabel(type: string): string {
  return (
    EXPENSE_RETURN_TYPE_OPTIONS.find((o) => o.value === type)?.label || "Return"
  );
}

/** Only expenses explicitly marked for expected return may receive refunds/cashbacks. */
function expenseAllowsReturnRecording(expense: Expense): boolean {
  return expense.expectedReturnAvailable === true;
}

/** Distinct badge colors per category name (stable hash → palette index). */
const EXPENSE_CATEGORY_BADGE_PALETTE = [
  "bg-violet-100 text-violet-800 ring-violet-200/80 dark:bg-violet-900/45 dark:text-violet-200 dark:ring-violet-700/60",
  "bg-sky-100 text-sky-800 ring-sky-200/80 dark:bg-sky-900/45 dark:text-sky-200 dark:ring-sky-700/60",
  "bg-emerald-100 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-900/45 dark:text-emerald-200 dark:ring-emerald-700/60",
  "bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-900/45 dark:text-amber-200 dark:ring-amber-700/60",
  "bg-rose-100 text-rose-800 ring-rose-200/80 dark:bg-rose-900/45 dark:text-rose-200 dark:ring-rose-700/60",
  "bg-cyan-100 text-cyan-800 ring-cyan-200/80 dark:bg-cyan-900/45 dark:text-cyan-200 dark:ring-cyan-700/60",
  "bg-indigo-100 text-indigo-800 ring-indigo-200/80 dark:bg-indigo-900/45 dark:text-indigo-200 dark:ring-indigo-700/60",
  "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200/80 dark:bg-fuchsia-900/45 dark:text-fuchsia-200 dark:ring-fuchsia-700/60",
  "bg-teal-100 text-teal-800 ring-teal-200/80 dark:bg-teal-900/45 dark:text-teal-200 dark:ring-teal-700/60",
  "bg-orange-100 text-orange-900 ring-orange-200/80 dark:bg-orange-900/45 dark:text-orange-200 dark:ring-orange-700/60",
] as const;

function expenseCategoryBadgeClass(category?: string | null): string {
  const label = (category || "").trim();
  if (!label || label === "—") {
    return "bg-gray-100 text-gray-600 ring-gray-200/80 dark:bg-gray-700/60 dark:text-gray-300 dark:ring-gray-600/60";
  }
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return EXPENSE_CATEGORY_BADGE_PALETTE[hash % EXPENSE_CATEGORY_BADGE_PALETTE.length];
}

/** Snapshot when editing — used to credit back the prior deduction during validation. */
type ExpenseEditSnapshot = { amount: number; bankAccountId: string };

function bankStoredBalance(bank: BankAccount): number {
  return bank.currentBalance ?? bank.initialBalance ?? 0;
}

/**
 * Adjust stored bank balances when an expense is edited (delta-only; backward compatible).
 * Same account: increment by -(newAmount - oldAmount). Different accounts: credit old, debit new.
 */
function applyExpenseEditBankBalanceUpdates(
  transaction: firebase.firestore.Transaction,
  oldAmount: number,
  oldBankId: string,
  newAmount: number,
  newBankId: string,
): void {
  const oldAmt = Number.isFinite(oldAmount) ? oldAmount : 0;
  const newAmt = Number.isFinite(newAmount) ? newAmount : 0;
  const oldBank = (oldBankId || "").trim();
  const newBank = (newBankId || "").trim();

  if (oldBank && newBank && oldBank === newBank) {
    const delta = newAmt - oldAmt;
    if (delta !== 0) {
      transaction.update(db.collection("bankAccounts").doc(oldBank), {
        currentBalance: firebase.firestore.FieldValue.increment(-delta),
      });
    }
    return;
  }

  if (oldBank && oldAmt > 0) {
    transaction.update(db.collection("bankAccounts").doc(oldBank), {
      currentBalance: firebase.firestore.FieldValue.increment(oldAmt),
    });
  }
  if (newBank && newAmt > 0) {
    transaction.update(db.collection("bankAccounts").doc(newBank), {
      currentBalance: firebase.firestore.FieldValue.increment(-newAmt),
    });
  }
}

const ExpensesPage: React.FC = () => {
  usePageTitle("Expenses");
  const { user, userProfile } = useAuth();
  const {
    canViewExpenses,
    canCreateExpense,
    canEditExpense,
    canDeleteExpense,
    canBulkDeleteExpenses,
    canManageCompanyExpenses,
    canViewExpensePayeesTab,
    canCreateExpensePayee,
    canEditExpensePayee,
    canDeleteExpensePayee,
    canViewExpenseCategoriesTab,
    canCreateExpenseCategory,
    canEditExpenseCategory,
    canDeleteExpenseCategory,
    canViewExpenseReturns,
    canReceiveExpenseReturns,
    canViewExpenseUsdTotal,
    canViewBankPickerBalance,
    filterBankAccountsForRole,
    isOwner,
  } = usePermissions();
  const showPickerBalance = canViewBankPickerBalance();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const accessibleBankAccounts = useMemo(
    () => filterBankAccountsForRole(bankAccounts),
    [bankAccounts, filterBankAccountsForRole],
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "expenses" | "vendors" | "categories"
  >("expenses");
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorForm, setVendorForm] = useState<{
    id?: string;
    name: string;
    notes: string;
  }>({ name: "", notes: "" });
  const [vendorFormChoice, setVendorFormChoice] = useState("");
  const [oneTimeVendorName, setOneTimeVendorName] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{
    id?: string;
    name: string;
    notes: string;
    previousName?: string;
  }>({ name: "", notes: "" });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Partial<Expense> | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(
    {},
  );
  const [filter, setFilter] = useState({
    period: "month", // month, week, year, all, custom
    dateFrom: "",
    dateTo: "",
    bankAccountId: "",
    category: "",
    payee: "",
    search: "",
    monthly: "all" as "all" | "monthly" | "non-monthly",
    returnStatus: "all" as "all" | "none" | "partial" | "full",
    amountMin: "",
    amountMax: "",
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const hasAdvancedFilters = useMemo(
    () =>
      Boolean(
        filter.bankAccountId ||
          filter.category ||
          filter.payee ||
          filter.monthly !== "all" ||
          filter.returnStatus !== "all" ||
          filter.amountMin ||
          filter.amountMax,
      ),
    [filter],
  );

  const showAdvancedFilters = filtersExpanded || hasAdvancedFilters;

  const resetExpenseFilters = () => {
    setFilter({
      period: "month",
      dateFrom: "",
      dateTo: "",
      bankAccountId: "",
      category: "",
      payee: "",
      search: "",
      monthly: "all",
      returnStatus: "all",
      amountMin: "",
      amountMax: "",
    });
    setFiltersExpanded(false);
  };
  const allowBulkRowSelect = canBulkDeleteExpenses();
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [bulkDeletingExpenses, setBulkDeletingExpenses] = useState(false);
  const selectAllExpensesRef = useRef<HTMLInputElement>(null);
  const expenseEditSnapshotRef = useRef<ExpenseEditSnapshot | null>(null);

  const [expenseReturns, setExpenseReturns] = useState<ExpenseReturn[]>([]);
  const [returnModalExpense, setReturnModalExpense] = useState<Expense | null>(null);
  const [returnForm, setReturnForm] = useState<{
    amount: string;
    returnType: ExpenseReturnType;
    receivedDate: string;
    destinationBankAccountId: string;
    notes: string;
  }>({
    amount: "",
    returnType: "vendor_refund",
    receivedDate: "",
    destinationBankAccountId: "",
    notes: "",
  });
  const [returnError, setReturnError] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);

  const detailExpense = useMemo(() => {
    if (!detailExpenseId) return null;
    return expenses.find((e) => e.id === detailExpenseId) ?? null;
  }, [detailExpenseId, expenses]);

  const loadExchangeRates = async () => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      if (data && data.rates) {
        setExchangeRates(data.rates);
      } else {
        throw new Error("Invalid exchange rate data");
      }
    } catch (error) {
      console.error("Failed to load exchange rates:", error);
      setExchangeRates({ USD: 1, PKR: 278, EUR: 0.85 });
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await loadExchangeRates();
    // Real-time listeners will handle the data updates
    setTimeout(() => setLoading(false), 1000);
  };

  // Page access control
  useEffect(() => {
    if (!canViewExpenses()) {
      navigate("/");
      return;
    }
  }, [canViewExpenses, navigate]);

  const showPayeesTab = canViewExpensePayeesTab();
  const showCategoriesTab = canViewExpenseCategoriesTab();
  const canManageExpensePayees =
    canCreateExpensePayee() || canEditExpensePayee() || canDeleteExpensePayee();
  const canManageExpenseCategories =
    canCreateExpenseCategory() ||
    canEditExpenseCategory() ||
    canDeleteExpenseCategory();

  useEffect(() => {
    if (activeTab === "vendors" && !showPayeesTab) setActiveTab("expenses");
    if (activeTab === "categories" && !showCategoriesTab)
      setActiveTab("expenses");
  }, [activeTab, showPayeesTab, showCategoriesTab]);

  const companyWideExpenseQuery =
    isOwner ||
    (userProfile?.granularPermissions?.includes(
      GRANULAR_PERMISSIONS.EXPENSES_COMPANY_MANAGE,
    ) ??
      false);

  const expenseCompanyId =
    user && userProfile ? getExpenseCompanyId(user, userProfile) : "";

  useEffect(() => {
    if (!user || !userProfile) return;

    if (companyWideExpenseQuery && expenseCompanyId) {
      void backfillExpenseCompanyIdsIfNeeded(expenseCompanyId);
    }

    const expensesQuery =
      companyWideExpenseQuery && expenseCompanyId
        ? db.collection("expenses").where("companyId", "==", expenseCompanyId)
        : db.collection("expenses").where("userId", "==", user.uid);

    const expensesUnsubscribe = expensesQuery.onSnapshot(
      (snapshot) => {
        try {
          const expensesData = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Expense,
          );

          expensesData.sort((a, b) => {
            const aTime = a.date?.toDate?.() || new Date();
            const bTime = b.date?.toDate?.() || new Date();
            return bTime.getTime() - aTime.getTime();
          });

          setExpenses(expensesData);
          setLoading(false);
        } catch (error) {
          console.error("Error processing expenses snapshot:", error);
          setExpenses([]);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error in expenses real-time listener:", error);
        setLoading(false);
      },
    );

    const bankAccountsUnsubscribe = BankAccountService.subscribeBankAccountsForCompany(
      user,
      userProfile,
      (bankAccountsData) => {
        setBankAccounts(bankAccountsData);
      },
    );

    const returnsUnsubscribe = ExpenseReturnService.subscribeForScope(
      {
        companyWide: companyWideExpenseQuery && !!expenseCompanyId,
        companyId: expenseCompanyId,
        userId: user.uid,
      },
      (rows) => setExpenseReturns(rows),
      () => setExpenseReturns([]),
    );

    loadExchangeRates();

    return () => {
      expensesUnsubscribe();
      bankAccountsUnsubscribe();
      returnsUnsubscribe();
    };
  }, [user, userProfile, companyWideExpenseQuery, expenseCompanyId]);

  /** Returns grouped by expense id (for per-row badges and net calculations). */
  const returnsByExpenseId = useMemo(() => {
    const map = new Map<string, ExpenseReturn[]>();
    for (const r of expenseReturns) {
      const arr = map.get(r.expenseId) ?? [];
      arr.push(r);
      map.set(r.expenseId, arr);
    }
    return map;
  }, [expenseReturns]);

  /** Sum of returns received against a single expense (cached field preferred, falls back to live docs). */
  const returnedAmountForExpense = useCallback(
    (expense: Expense): number => {
      const cached = expense.totalReturnedAmount;
      if (typeof cached === "number" && cached > 0) return cached;
      const rows = returnsByExpenseId.get(expense.id);
      if (!rows || rows.length === 0) return 0;
      return rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    },
    [returnsByExpenseId],
  );

  const canEditExpenseRow = (e: Expense): boolean =>
    canEditExpense() &&
    (e.userId === user?.uid || canManageCompanyExpenses());

  const canDeleteExpenseRow = (e: Expense): boolean =>
    canDeleteExpense() &&
    (e.userId === user?.uid || canManageCompanyExpenses());

  useEffect(() => {
    if (!user || !userProfile) return;
    const cid = getExpenseCompanyId(user, userProfile);
    if (!cid) return;
    return subscribeCompanyVendors(cid, setVendors);
  }, [user, userProfile]);

  useEffect(() => {
    if (!user || !userProfile) return;
    const cid = getExpenseCompanyId(user, userProfile);
    if (!cid) return;
    return subscribeCompanyExpenseCategories(cid, setExpenseCategories);
  }, [user, userProfile]);

  const filterCategoryOptions = useMemo(() => {
    const names = expenses
      .map((e) => (e.category || "").trim())
      .filter(Boolean);
    const unique = [...new Set(names)];
    if (filter.category && !unique.includes(filter.category)) {
      unique.push(filter.category);
    }
    return unique.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [expenses, filter.category]);

  const filterPayeeOptions = useMemo(() => {
    const names = expenses
      .map((e) => (e.vendorName || "").trim())
      .filter(Boolean);
    const unique = [...new Set(names)];
    if (filter.payee && !unique.includes(filter.payee)) {
      unique.push(filter.payee);
    }
    return unique.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [expenses, filter.payee]);

  const filterBankAccountOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const e of expenses) {
      if (!e.bankAccountId || byId.has(e.bankAccountId)) continue;
      const bank = bankAccounts.find((b) => b.id === e.bankAccountId);
      const label = bank
        ? `${formatBankAccountListLabel(bank)} (${bank.currencySymbol})`
        : e.bankAccountName || e.bankAccountId;
      byId.set(e.bankAccountId, label);
    }
    if (filter.bankAccountId && !byId.has(filter.bankAccountId)) {
      const bank = bankAccounts.find((b) => b.id === filter.bankAccountId);
      byId.set(
        filter.bankAccountId,
        bank
          ? `${formatBankAccountListLabel(bank)} (${bank.currencySymbol})`
          : filter.bankAccountId,
      );
    }
    return [...byId.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      );
  }, [expenses, bankAccounts, filter.bankAccountId]);

  const filterMonthlyOptions = useMemo(() => {
    let hasMonthly = false;
    let hasNonMonthly = false;
    for (const e of expenses) {
      if (e.isMonthlyExpense) hasMonthly = true;
      else hasNonMonthly = true;
    }
    const opts: { value: "monthly" | "non-monthly"; label: string }[] = [];
    if (hasMonthly) opts.push({ value: "monthly", label: "Monthly" });
    if (hasNonMonthly) opts.push({ value: "non-monthly", label: "Non-monthly" });
    return opts;
  }, [expenses]);

  const filterReturnStatusOptions = useMemo(() => {
    let hasNone = false;
    let hasPartial = false;
    let hasFull = false;
    for (const e of expenses) {
      const returned = returnedAmountForExpense(e);
      const gross = e.amount || 0;
      if (returned <= 0.0001) hasNone = true;
      else if (returned >= gross - 0.0001) hasFull = true;
      else hasPartial = true;
    }
    const opts: { value: "none" | "partial" | "full"; label: string }[] = [];
    if (hasNone) opts.push({ value: "none", label: "None" });
    if (hasPartial) opts.push({ value: "partial", label: "Partial" });
    if (hasFull) opts.push({ value: "full", label: "Full" });
    return opts;
  }, [expenses, returnedAmountForExpense]);

  const expenseFormCategoryNames = useMemo(() => {
    const names = expenseCategories.map((c) => c.name);
    const cur = (currentExpense?.category ?? "").trim();
    if (cur && !names.includes(cur)) {
      return [cur, ...names];
    }
    return names;
  }, [expenseCategories, currentExpense?.category]);

  const openVendorModal = (vendor?: Vendor) => {
    if (vendor) {
      setVendorForm({
        id: vendor.id,
        name: vendor.name,
        notes: vendor.notes || "",
      });
    } else {
      setVendorForm({ name: "", notes: "" });
    }
    setVendorModalOpen(true);
  };

  const closeVendorModal = () => {
    setVendorModalOpen(false);
    setVendorForm({ name: "", notes: "" });
  };

  const handleSaveVendor = async () => {
    if (!user || !userProfile) return;
    const name = vendorForm.name.trim();
    if (!name) {
      alert("Payee name is required");
      return;
    }
    if (vendorForm.id) {
      if (!canEditExpensePayee()) return;
    } else if (!canCreateExpensePayee()) {
      return;
    }
    const companyId = getExpenseCompanyId(user, userProfile);
    if (!companyId) return;
    setVendorSaving(true);
    try {
      if (vendorForm.id) {
        await db.collection("vendors").doc(vendorForm.id).update({
          name,
          notes: vendorForm.notes.trim() || "",
          updatedAt: Timestamp.now(),
        });
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "vendor_updated",
          `Updated payee: ${name}`,
          { entityId: vendorForm.id, entityType: "payee" },
        );
      } else {
        const ref = await db.collection("vendors").add({
          companyId,
          name,
          notes: vendorForm.notes.trim() || "",
          createdAt: Timestamp.now(),
        });
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "vendor_created",
          `Added payee: ${name}`,
          { entityId: ref.id, entityType: "payee" },
        );
      }
      closeVendorModal();
    } catch (err) {
      console.error(err);
      alert("Could not save payee");
    } finally {
      setVendorSaving(false);
    }
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (!user || !userProfile) return;
    if (!canDeleteExpensePayee()) return;
    if (
      !window.confirm(
        `Delete payee “${vendor.name}”? Existing expenses keep their stored payee name.`,
      )
    ) {
      return;
    }
    try {
      await db.collection("vendors").doc(vendor.id).delete();
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "vendor_deleted",
        `Deleted payee: ${vendor.name}`,
        { entityId: vendor.id, entityType: "payee", oldValue: vendor },
      );
    } catch (err) {
      console.error(err);
      alert("Could not delete payee");
    }
  };

  const openCategoryModal = (cat?: ExpenseCategory) => {
    if (cat) {
      setCategoryForm({
        id: cat.id,
        name: cat.name,
        notes: cat.notes || "",
        previousName: cat.name,
      });
    } else {
      setCategoryForm({ name: "", notes: "" });
    }
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalOpen(false);
    setCategoryForm({ name: "", notes: "" });
  };

  const handleSaveCategory = async () => {
    if (!user || !userProfile) return;
    const name = categoryForm.name.trim();
    if (!name) {
      alert("Category name is required");
      return;
    }
    const cid = getExpenseCompanyId(user, userProfile);
    if (!cid) {
      alert("Company not found");
      return;
    }
    if (categoryForm.id) {
      if (!canEditExpenseCategory()) return;
    } else if (!canCreateExpenseCategory()) {
      return;
    }
    const nameLower = name.toLowerCase();
    if (
      expenseCategories.some(
        (c) =>
          c.id !== categoryForm.id &&
          c.name.trim().toLowerCase() === nameLower,
      )
    ) {
      alert("A category with this name already exists");
      return;
    }

    setCategorySaving(true);
    try {
      if (categoryForm.id) {
        const prev = categoryForm.previousName ?? "";
        await db.collection("expenseCategories").doc(categoryForm.id).update({
          name,
          notes: categoryForm.notes.trim() || "",
          updatedAt: Timestamp.now(),
        });
        if (prev && prev !== name) {
          await renameCategoryOnExpenses(cid, prev, name);
        }
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "expense_category_updated",
          prev && prev !== name
            ? `Updated expense category: ${prev} → ${name}`
            : `Updated expense category: ${name}`,
          { entityId: categoryForm.id, entityType: "expense_category" },
        );
      } else {
        const nextOrder =
          expenseCategories.length === 0
            ? 0
            : Math.max(
                ...expenseCategories.map((c) => Number(c.sortOrder) || 0),
              ) + 1;
        const ref = await db.collection("expenseCategories").add({
          companyId: cid,
          name,
          notes: categoryForm.notes.trim() || "",
          sortOrder: nextOrder,
          createdAt: Timestamp.now(),
        });
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "expense_category_created",
          `Added expense category: ${name}`,
          { entityId: ref.id, entityType: "expense_category" },
        );
      }
      closeCategoryModal();
    } catch (err) {
      console.error(err);
      alert("Could not save category");
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (cat: ExpenseCategory) => {
    if (!user || !userProfile) return;
    if (!canDeleteExpenseCategory()) return;
    if (
      !window.confirm(
        `Delete category “${cat.name}”? Expenses already filed under this name keep that label until edited.`,
      )
    ) {
      return;
    }
    try {
      await db.collection("expenseCategories").doc(cat.id).delete();
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "expense_category_deleted",
        `Deleted expense category: ${cat.name}`,
        { entityId: cat.id, entityType: "expense_category", oldValue: cat },
      );
    } catch (err) {
      console.error(err);
      alert("Could not delete category");
    }
  };

  const getFilteredExpenses = () => {
    let filtered = expenses;

    // Period filter
    if (filter.period === "custom") {
      // Custom date range (inclusive). Either bound is optional.
      if (filter.dateFrom) {
        const from = new Date(filter.dateFrom);
        from.setHours(0, 0, 0, 0);
        filtered = filtered.filter((expense) => expense.date.toDate() >= from);
      }
      if (filter.dateTo) {
        const to = new Date(filter.dateTo);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter((expense) => expense.date.toDate() <= to);
      }
    } else if (filter.period !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date | null = null;

      switch (filter.period) {
        case "week":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            0,
            23,
            59,
            59,
            999,
          );
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((expense) => {
        const d = expense.date.toDate();
        if (d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }

    // Bank account filter
    if (filter.bankAccountId) {
      filtered = filtered.filter(
        (expense) => expense.bankAccountId === filter.bankAccountId,
      );
    }

    // Category filter
    if (filter.category) {
      filtered = filtered.filter(
        (expense) => expense.category === filter.category,
      );
    }

    // Payee filter
    if (filter.payee) {
      filtered = filtered.filter(
        (expense) => (expense.vendorName || "") === filter.payee,
      );
    }

    // Monthly expense tag filter
    if (filter.monthly === "monthly") {
      filtered = filtered.filter((expense) => expense.isMonthlyExpense === true);
    } else if (filter.monthly === "non-monthly") {
      filtered = filtered.filter((expense) => !expense.isMonthlyExpense);
    }

    // Return status filter
    if (filter.returnStatus !== "all") {
      filtered = filtered.filter((expense) => {
        const returned = returnedAmountForExpense(expense);
        const gross = expense.amount || 0;
        if (filter.returnStatus === "none") return returned <= 0.0001;
        if (filter.returnStatus === "partial")
          return returned > 0.0001 && returned + 0.0001 < gross;
        // full
        return returned > 0.0001 && returned + 0.0001 >= gross;
      });
    }

    // Amount range filter (on gross expense amount, in its own currency)
    const min = parseFloat(filter.amountMin);
    if (Number.isFinite(min)) {
      filtered = filtered.filter((expense) => (expense.amount || 0) >= min);
    }
    const max = parseFloat(filter.amountMax);
    if (Number.isFinite(max)) {
      filtered = filtered.filter((expense) => (expense.amount || 0) <= max);
    }

    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(
        (expense) =>
          expense.title.toLowerCase().includes(searchLower) ||
          expense.description.toLowerCase().includes(searchLower) ||
          (expense.category || "")
            .toLowerCase()
            .includes(searchLower) ||
          (expense.vendorName || "").toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  };

  const getExpenseStats = () => {
    const filteredExpenses = getFilteredExpenses();

    const totalAmount = filteredExpenses.reduce((sum, expense) => {
      const rate = exchangeRates[expense.currency || "USD"] || 1;
      const convertedAmount = expense.amount / rate;
      return sum + convertedAmount;
    }, 0);

    const returnsAmount = filteredExpenses.reduce((sum, expense) => {
      const returned = returnedAmountForExpense(expense);
      if (returned <= 0) return sum;
      const rate = exchangeRates[expense.currency || "USD"] || 1;
      return sum + returned / rate;
    }, 0);

    const netAmount = totalAmount - returnsAmount;

    const currencyTotals = filteredExpenses.reduce(
      (acc, expense) => {
        const cur = expense.currency || "USD";
        const row =
          acc[cur] ??
          ({
            symbol: expense.currencySymbol || "$",
            gross: 0,
            returns: 0,
            net: 0,
          } as { symbol: string; gross: number; returns: number; net: number });
        const returned = returnedAmountForExpense(expense);
        row.gross += expense.amount || 0;
        row.returns += returned;
        row.net += Math.max(0, (expense.amount || 0) - returned);
        if (expense.currencySymbol) row.symbol = expense.currencySymbol;
        acc[cur] = row;
        return acc;
      },
      {} as Record<
        string,
        { symbol: string; gross: number; returns: number; net: number }
      >,
    );

    const categoryTotals = filteredExpenses.reduce(
      (acc, expense) => {
        const rate = exchangeRates[expense.currency || "USD"] || 1;
        const convertedAmount = expense.amount / rate;
        const catKey = expense.category || "—";
        acc[catKey] = (acc[catKey] || 0) + convertedAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const bankTotals = filteredExpenses.reduce(
      (acc, expense) => {
        const rate = exchangeRates[expense.currency || "USD"] || 1;
        const convertedAmount = expense.amount / rate;
        const key = expense.bankAccountName;
        acc[key] = (acc[key] || 0) + convertedAmount;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalAmount,
      returnsAmount,
      netAmount,
      totalCount: filteredExpenses.length,
      categoryTotals,
      bankTotals,
      currencyTotals,
    };
  };

  const openModal = (expense?: Expense) => {
    setDetailExpenseId(null);
    setVendorFormChoice("");
    setOneTimeVendorName("");
    if (expense) {
      expenseEditSnapshotRef.current = {
        amount: expense.amount ?? 0,
        bankAccountId: expense.bankAccountId ?? "",
      };
      setCurrentExpense(expense);
      if (
        expense.oneTimeVendor ||
        (!expense.vendorId && (expense.vendorName || "").trim())
      ) {
        setVendorFormChoice(OTHER_PAYEE_VALUE);
        setOneTimeVendorName(expense.vendorName || "");
      } else if (expense.vendorId) {
        setVendorFormChoice(expense.vendorId);
      }
    } else {
      expenseEditSnapshotRef.current = null;
      setCurrentExpense({
        title: "",
        description: "",
        amount: 0,
        category: "",
        bankAccountId: "",
        date: Timestamp.now(),
        isMonthlyExpense: false,
      });
    }
    setAmountError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentExpense(null);
    expenseEditSnapshotRef.current = null;
    setAmountError("");
    setVendorFormChoice("");
    setOneTimeVendorName("");
  };

  const validateAmount = (amount: number, bankAccountId: string) => {
    if (!bankAccountId) {
      setAmountError("Please select a bank account first");
      return false;
    }

    if (!amount || amount <= 0) {
      setAmountError("Please enter a valid amount greater than 0");
      return false;
    }

    const selectedBank = bankAccounts.find(b => b.id === bankAccountId);
    if (selectedBank) {
      let availableBalance = bankStoredBalance(selectedBank);
      const editSnap = expenseEditSnapshotRef.current;
      if (editSnap && editSnap.bankAccountId === bankAccountId) {
        availableBalance += editSnap.amount;
      }
      if (amount > availableBalance) {
        setAmountError(
          showPickerBalance
            ? `Insufficient balance. Available: ${selectedBank.currencySymbol}${availableBalance.toFixed(2)}`
            : "Insufficient balance in the selected account.",
        );
        return false;
      }
    }

    setAmountError("");
    return true;
  };

  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0;
    setCurrentExpense({
      ...currentExpense,
      amount: amount,
    });

    // Validate amount if bank account is selected
    if (currentExpense?.bankAccountId) {
      validateAmount(amount, currentExpense.bankAccountId);
    }
  };

  const handleBankAccountChange = (bankAccountId: string) => {
    setCurrentExpense({
      ...currentExpense,
      bankAccountId: bankAccountId,
    });

    // Clear amount error when bank account changes
    setAmountError("");

    // Re-validate amount if there's an amount entered
    if (currentExpense?.amount) {
      validateAmount(currentExpense.amount, bankAccountId);
    }
  };

  const handleSave = async () => {
    if (!user || !currentExpense || !userProfile) return;

    // Validate required fields
    if (!currentExpense.title?.trim()) {
      alert("Please enter a title");
      return;
    }
    if (!currentExpense.category?.trim()) {
      alert("Please select a category");
      return;
    }
    if (!currentExpense.bankAccountId) {
      alert("Please select a bank account");
      return;
    }
    if (!vendorFormChoice) {
      alert("Please select a payee");
      return;
    }
    if (
      vendorFormChoice === OTHER_PAYEE_VALUE &&
      !oneTimeVendorName.trim()
    ) {
      alert("Enter the one-time payee name");
      return;
    }
    if (!validateAmount(currentExpense.amount || 0, currentExpense.bankAccountId)) {
      return;
    }
    if (currentExpense.expectedReturnAvailable) {
      const expenseAmount = currentExpense.amount || 0;
      const expectedReturn = currentExpense.expectedReturnAmount;
      if (
        expectedReturn != null &&
        Number.isFinite(expectedReturn) &&
        expectedReturn > expenseAmount + 0.0001
      ) {
        alert(
          "Expected return amount cannot exceed the expense amount.",
        );
        return;
      }
    }

    let resolvedVendorId: string | null = null;
    let resolvedVendorName = "";
    let resolvedOneTime = false;
    if (vendorFormChoice === OTHER_PAYEE_VALUE) {
      resolvedVendorName = oneTimeVendorName.trim();
      resolvedOneTime = true;
    } else {
      const v = vendors.find((x) => x.id === vendorFormChoice);
      if (!v) {
        alert("Selected payee is no longer in the directory. Choose another or use one-time.");
        return;
      }
      resolvedVendorId = v.id;
      resolvedVendorName = v.name;
      resolvedOneTime = false;
    }

    setIsSubmitting(true);

    try {
      const selectedBank = bankAccounts.find(
        (b) => b.id === currentExpense.bankAccountId,
      );
      if (!selectedBank) {
        alert("Selected bank account not found");
        return;
      }

      const companyIdResolved = getExpenseCompanyId(user, userProfile);
      const isUpdate = "id" in currentExpense && currentExpense.id;
      const existing = currentExpense as Expense;
      const expenseData = {
        ...currentExpense,
        userId: isUpdate && existing.userId ? existing.userId : user.uid,
        companyId: existing.companyId || companyIdResolved,
        vendorId: resolvedOneTime ? null : resolvedVendorId,
        vendorName: resolvedVendorName,
        oneTimeVendor: resolvedOneTime,
        bankAccountName: formatBankAccountListLabel(selectedBank),
        currency: selectedBank.currency,
        currencySymbol: selectedBank.currencySymbol,
        createdAt: isUpdate && existing.createdAt ? existing.createdAt : Timestamp.now(),
      };

      if (isUpdate) {
        const alreadyReturned = returnedAmountForExpense(existing);
        if (alreadyReturned > 0 && (currentExpense.amount || 0) + 0.0001 < alreadyReturned) {
          alert(
            `Amount can't be less than returns already received (${selectedBank.currencySymbol}${alreadyReturned.toFixed(2)}). Remove returns first.`,
          );
          setIsSubmitting(false);
          return;
        }
        const expenseId = currentExpense.id!;
        const { id: _omitId, ...updatePayloadRaw } = expenseData as Expense & {
          id?: string;
        };
        void _omitId;
        // Return aggregates are owned by ExpenseReturnService; never overwrite them from the edit form.
        const updatePayload = { ...updatePayloadRaw } as Record<string, unknown>;
        delete updatePayload.totalReturnedAmount;
        delete updatePayload.returnStatus;
        const newAmount = currentExpense.amount || 0;
        const newBankId = currentExpense.bankAccountId || "";

        let priorExpense: Expense | null = null;
        await db.runTransaction(async (transaction) => {
          const expenseRef = db.collection("expenses").doc(expenseId);
          const expenseSnap = await transaction.get(expenseRef);
          if (!expenseSnap.exists) {
            throw new Error("Expense not found");
          }
          priorExpense = { id: expenseSnap.id, ...expenseSnap.data() } as Expense;
          transaction.update(expenseRef, updatePayload);
          applyExpenseEditBankBalanceUpdates(
            transaction,
            priorExpense.amount ?? 0,
            priorExpense.bankAccountId ?? "",
            newAmount,
            newBankId,
          );
        });

        const payeeNote = expenseData.vendorName
          ? ` · Payee: ${expenseData.vendorName}`
          : "";
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "expense_updated",
          `Updated expense: ${expenseData.title}${payeeNote}`,
          {
            entityId: expenseId,
            entityType: "expense",
            oldValue: priorExpense ?? undefined,
            newValue: expenseData,
          },
        );
      } else {
        const { id: _omitId2, ...createPayload } = expenseData as Expense & {
          id?: string;
        };
        void _omitId2;
        const newExpenseAmount = currentExpense.amount || 0;
        const expenseRef = db.collection("expenses").doc();
        // Create the expense and debit the bank in one atomic, concurrency-safe step.
        await db.runTransaction(async (transaction) => {
          const bankRef = db.collection("bankAccounts").doc(selectedBank.id);
          transaction.set(expenseRef, createPayload);
          if (newExpenseAmount > 0) {
            transaction.update(bankRef, {
              currentBalance:
                firebase.firestore.FieldValue.increment(-newExpenseAmount),
            });
          }
        });
        const docRef = expenseRef;

        // Log create activity
        const payeeNoteCreate = expenseData.vendorName
          ? ` · Payee: ${expenseData.vendorName}`
          : "";
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "expense_created",
          `Created new expense: ${expenseData.title}${payeeNoteCreate}`,
          {
            entityId: docRef.id,
            entityType: "expense",
            newValue: expenseData,
          },
        );
      }

      closeModal();
      // Real-time listener will automatically update the expenses list
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpenseRecord = async (expenseId: string, expense: Expense) => {
    if (!user || !userProfile) return;
    await db.collection("expenses").doc(expenseId).delete();

    if (expense.bankAccountId) {
      await db
        .collection("bankAccounts")
        .doc(expense.bankAccountId)
        .update({
          currentBalance: firebase.firestore.FieldValue.increment(expense.amount),
        });
    }

    const payeeNoteDel = expense.vendorName
      ? ` · Payee: ${expense.vendorName}`
      : "";
    await ActivityLogger.logActivity(
      user,
      userProfile,
      "expense_deleted",
      `Deleted expense: ${expense.title}${payeeNoteDel}`,
      {
        entityId: expenseId,
        entityType: "expense",
        oldValue: expense,
      },
    );
  };

  const handleDelete = async (expenseId: string, expense: Expense) => {
    if (!user || !userProfile) return;
    if (returnedAmountForExpense(expense) > 0) {
      alert(
        "This expense has returns recorded against it. Remove the returns first before deleting.",
      );
      return;
    }
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteExpenseRecord(expenseId, expense);
        if (detailExpenseId === expenseId) closeExpenseDetail();
      } catch (error) {
        console.error("Error deleting expense:", error);
        alert("Failed to delete expense");
      }
    }
  };

  const stats = getExpenseStats();
  const filteredExpenses = getFilteredExpenses();
  const showUsdTotals = canViewExpenseUsdTotal();
  const currencyBreakdown = Object.entries(stats.currencyTotals).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  const showCurrencyBreakdown = currencyBreakdown.length >= 2;
  const showUsdReturnCards =
    showUsdTotals && canViewExpenseReturns() && stats.returnsAmount > 0;
  const statsGridCols = showUsdReturnCards
    ? "md:grid-cols-3 lg:grid-cols-6"
    : showUsdTotals
      ? "md:grid-cols-4"
      : "md:grid-cols-3";

  const selectedExpenseSet = useMemo(
    () => new Set(selectedExpenseIds),
    [selectedExpenseIds],
  );

  const allFilteredExpensesSelected =
    allowBulkRowSelect &&
    filteredExpenses.length > 0 &&
    filteredExpenses.every((e) => selectedExpenseSet.has(e.id));

  useEffect(() => {
    const el = selectAllExpensesRef.current;
    if (!el || !allowBulkRowSelect || filteredExpenses.length === 0) {
      if (el) el.indeterminate = false;
      return;
    }
    const n = filteredExpenses.filter((e) => selectedExpenseSet.has(e.id)).length;
    el.indeterminate = n > 0 && n < filteredExpenses.length;
  }, [allowBulkRowSelect, filteredExpenses, selectedExpenseSet]);

  const toggleExpenseSelected = useCallback((id: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleSelectAllFilteredExpenses = useCallback(() => {
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      const every =
        filteredExpenses.length > 0 &&
        filteredExpenses.every((e) => next.has(e.id));
      if (every) {
        filteredExpenses.forEach((e) => next.delete(e.id));
      } else {
        filteredExpenses.forEach((e) => next.add(e.id));
      }
      return Array.from(next);
    });
  }, [filteredExpenses]);

  const clearExpenseSelection = useCallback(() => {
    setSelectedExpenseIds([]);
  }, []);

  const handleBulkDeleteExpenses = async () => {
    if (!user || !userProfile || !allowBulkRowSelect || selectedExpenseIds.length === 0) {
      return;
    }
    const n = selectedExpenseIds.length;
    if (
      !window.confirm(
        `Delete ${n} expense${n === 1 ? "" : "s"}? Bank balances will be adjusted. This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkDeletingExpenses(true);
    try {
      let skippedWithReturns = 0;
      for (const expenseId of selectedExpenseIds) {
        const expense = expenses.find((e) => e.id === expenseId);
        if (!expense || !canDeleteExpenseRow(expense)) continue;
        if (returnedAmountForExpense(expense) > 0) {
          skippedWithReturns += 1;
          continue;
        }
        await deleteExpenseRecord(expenseId, expense);
      }
      clearExpenseSelection();
      if (skippedWithReturns > 0) {
        alert(
          `${skippedWithReturns} expense(s) were skipped because they have returns recorded. Remove the returns first.`,
        );
      }
    } catch (error) {
      console.error(error);
      alert("Some expenses could not be deleted.");
    } finally {
      setBulkDeletingExpenses(false);
    }
  };

  const openExpenseDetail = (expense: Expense) => {
    setDetailExpenseId(expense.id);
  };

  const closeExpenseDetail = () => {
    setDetailExpenseId(null);
  };

  const stopExpenseRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const openReturnModal = (expense: Expense) => {
    setDetailExpenseId(null);
    setReturnError("");
    setReturnForm({
      amount: "",
      returnType: "vendor_refund",
      receivedDate: new Date().toISOString().split("T")[0],
      destinationBankAccountId: expense.bankAccountId || "",
      notes: "",
    });
    setReturnModalExpense(expense);
  };

  const closeReturnModal = () => {
    setReturnModalExpense(null);
    setReturnError("");
    setReturnSubmitting(false);
  };

  const handleReceiveReturn = async () => {
    if (!user || !userProfile || !returnModalExpense) return;
    const expense = returnModalExpense;
    if (!expenseAllowsReturnRecording(expense)) {
      setReturnError(
        "This expense is not marked for expected return. Enable “Expected return available” on the expense first.",
      );
      return;
    }
    const amount = parseFloat(returnForm.amount) || 0;
    if (amount <= 0) {
      setReturnError("Enter a valid amount greater than 0");
      return;
    }
    if (!returnForm.destinationBankAccountId) {
      setReturnError("Select a destination account");
      return;
    }
    if (!returnForm.receivedDate) {
      setReturnError("Select the received date");
      return;
    }
    const expenseAmount = expense.amount || 0;
    const alreadyReturned = returnedAmountForExpense(expense);
    const remaining = Math.round((expenseAmount - alreadyReturned) * 100) / 100;
    if (amount > remaining + 0.0001) {
      setReturnError(
        `Return cannot exceed the expense amount (${expense.currencySymbol}${expenseAmount.toFixed(2)}). Remaining: ${expense.currencySymbol}${remaining.toFixed(2)}.`,
      );
      return;
    }
    const destBank = bankAccounts.find(
      (b) => b.id === returnForm.destinationBankAccountId,
    );
    if (!destBank) {
      setReturnError("Destination account not found");
      return;
    }

    setReturnSubmitting(true);
    setReturnError("");
    try {
      const companyId = getExpenseCompanyId(user, userProfile);
      const { totalReturnedAmount, returnStatus } =
        await ExpenseReturnService.receiveReturn({
          companyId: expense.companyId || companyId,
          userId: user.uid,
          createdByDisplayName:
            userProfile?.displayName || userProfile?.companyName || user.email || "",
          expenseId: expense.id,
          expenseTitle: expense.title,
          expenseAmount: expense.amount || 0,
          amount,
          returnType: returnForm.returnType,
          receivedDate: Timestamp.fromDate(new Date(returnForm.receivedDate)),
          destinationBankAccountId: destBank.id,
          destinationBankAccountName: formatBankAccountListLabel(destBank),
          currency: destBank.currency,
          currencySymbol: destBank.currencySymbol,
          notes: returnForm.notes,
        });

      await ActivityLogger.logActivity(
        user,
        userProfile,
        "expense_return_received",
        `Received ${expenseReturnTypeLabel(returnForm.returnType)} ${destBank.currencySymbol}${amount.toFixed(2)} for expense: ${expense.title}`,
        {
          entityId: expense.id,
          entityType: "expense",
          newValue: {
            amount,
            returnType: returnForm.returnType,
            destinationBankAccountId: destBank.id,
            totalReturnedAmount,
            returnStatus,
          },
        },
      );

      closeReturnModal();
    } catch (error) {
      console.error("Error receiving return:", error);
      setReturnError(
        error instanceof Error ? error.message : "Failed to record return",
      );
      setReturnSubmitting(false);
    }
  };

  const handleDeleteReturn = async (returnRecord: ExpenseReturn) => {
    if (!user || !userProfile) return;
    if (
      !window.confirm(
        `Remove this return of ${returnRecord.currencySymbol}${(returnRecord.amount || 0).toFixed(2)}? The destination account balance will be reduced back.`,
      )
    ) {
      return;
    }
    try {
      await ExpenseReturnService.deleteReturn(returnRecord);
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "expense_return_deleted",
        `Removed return ${returnRecord.currencySymbol}${(returnRecord.amount || 0).toFixed(2)} for expense: ${returnRecord.expenseTitle || returnRecord.expenseId}`,
        {
          entityId: returnRecord.expenseId,
          entityType: "expense",
          oldValue: returnRecord,
        },
      );
    } catch (error) {
      console.error("Error removing return:", error);
      alert("Failed to remove return");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="page-header mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            Expenses Management
          </h1>
          {companyWideExpenseQuery ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Showing expenses for the whole company.
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Showing only expenses you recorded.
            </p>
          )}
        </div>
        <div className="button-group">
          <button
            onClick={() => refreshData()}
            disabled={loading}
            className="mobile-btn-icon p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={loading ? "Loading..." : "Refresh"}
          >
            <svg
              className="w-4 h-4"
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
          </button>
          {canCreateExpense() && (
            <button
              onClick={() => openModal()}
              className="mobile-btn-icon p-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              title="Add Expense"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "expenses"
              ? "border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Expenses
        </button>
        {showPayeesTab ? (
          <button
            type="button"
            onClick={() => setActiveTab("vendors")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "vendors"
                ? "border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Payees
          </button>
        ) : null}
        {showCategoriesTab ? (
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "categories"
                ? "border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Categories
          </button>
        ) : null}
      </div>

      {activeTab === "expenses" ? (
      <>
      {/* Filters — compact toolbar + collapsible advanced row */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[8.5rem] flex-1 sm:flex-none">
            <label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Period
            </label>
            <select
              value={filter.period}
              onChange={(e) => setFilter({ ...filter, period: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="last_month">Last month</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {filter.period === "custom" ? (
            <>
              <div className="min-w-[9rem] flex-1 sm:flex-none">
                <label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  From
                </label>
                <input
                  type="date"
                  value={filter.dateFrom}
                  max={filter.dateTo || undefined}
                  onChange={(e) =>
                    setFilter({ ...filter, dateFrom: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="min-w-[9rem] flex-1 sm:flex-none">
                <label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  To
                </label>
                <input
                  type="date"
                  value={filter.dateTo}
                  min={filter.dateFrom || undefined}
                  onChange={(e) =>
                    setFilter({ ...filter, dateTo: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </>
          ) : null}

          <div className="min-w-[10rem] flex-[2] sm:min-w-[12rem]">
            <label className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Search
            </label>
            <input
              type="text"
              placeholder="Title, payee, category…"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
            <button
              type="button"
              onClick={() => setFiltersExpanded((o) => !o)}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                showAdvancedFilters
                  ? "border-primary-300 bg-primary-50 text-primary-800 dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-200"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
              aria-expanded={showAdvancedFilters}
            >
              More
              {hasAdvancedFilters ? (
                <span className="rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white dark:bg-primary-500">
                  on
                </span>
              ) : null}
              <span aria-hidden className="text-[10px] opacity-60">
                {showAdvancedFilters ? "▲" : "▼"}
              </span>
            </button>
            {(hasAdvancedFilters ||
              filter.period !== "month" ||
              filter.search ||
              filter.period === "custom") ? (
              <button
                type="button"
                onClick={resetExpenseFilters}
                className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>

        <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          {filteredExpenses.length} of {expenses.length} expenses
        </p>

        {showAdvancedFilters ? (
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-100 pt-2 dark:border-gray-700 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                Account
              </label>
              <select
                value={filter.bankAccountId}
                onChange={(e) =>
                  setFilter({ ...filter, bankAccountId: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All</option>
                {filterBankAccountOptions.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                Category
              </label>
              <select
                value={filter.category}
                onChange={(e) =>
                  setFilter({ ...filter, category: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All</option>
                {filterCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                Payee
              </label>
              <select
                value={filter.payee}
                onChange={(e) => setFilter({ ...filter, payee: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All</option>
                {filterPayeeOptions.map((payee) => (
                  <option key={payee} value={payee}>
                    {payee}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                Monthly
              </label>
              <select
                value={filter.monthly}
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    monthly: e.target.value as "all" | "monthly" | "non-monthly",
                  })
                }
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All</option>
                {filterMonthlyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {canViewExpenseReturns() ? (
              <div>
                <label className="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  Returns
                </label>
                <select
                  value={filter.returnStatus}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      returnStatus: e.target.value as
                        | "all"
                        | "none"
                        | "partial"
                        | "full",
                    })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All</option>
                  {filterReturnStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className={canViewExpenseReturns() ? "" : "col-span-2"}>
              <label className="mb-0.5 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                Amount
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Min"
                  value={filter.amountMin}
                  onChange={(e) =>
                    setFilter({ ...filter, amountMin: e.target.value })
                  }
                  className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <span className="text-xs text-gray-400">–</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Max"
                  value={filter.amountMax}
                  onChange={(e) =>
                    setFilter({ ...filter, amountMax: e.target.value })
                  }
                  className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Stats Overview */}
      <div className={`grid grid-cols-1 gap-4 mb-6 ${statsGridCols}`}>
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Total Expenses</h3>
          <p className="text-2xl font-bold">{stats.totalCount}</p>
        </div>
        {showUsdTotals ? (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
            <h3 className="text-sm font-medium">
              {showUsdReturnCards ? "Gross (USD)" : "Total Amount (USD)"}
            </h3>
            <p className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</p>
          </div>
        ) : null}
        {showUsdReturnCards ? (
          <>
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-lg text-white">
              <h3 className="text-sm font-medium">Returns (USD)</h3>
              <p className="text-2xl font-bold">
                -${stats.returnsAmount.toFixed(2)}
              </p>
            </div>
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 rounded-lg text-white">
              <h3 className="text-sm font-medium">Net Expense (USD)</h3>
              <p className="text-2xl font-bold">${stats.netAmount.toFixed(2)}</p>
            </div>
          </>
        ) : null}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Top Category</h3>
          <p className="text-lg font-bold">
            {Object.keys(stats.categoryTotals).length > 0
              ? Object.keys(stats.categoryTotals).reduce((a, b) =>
                  stats.categoryTotals[a] > stats.categoryTotals[b] ? a : b,
                )
              : "None"}
          </p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Period</h3>
          <p className="text-lg font-bold capitalize">
            {filter.period.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {showCurrencyBreakdown ? (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Totals by currency
          </h3>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Native-currency totals for the current filters (not converted to USD).
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currencyBreakdown.map(([currency, row]) => (
              <div
                key={currency}
                className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-900/40"
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {currency}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-gray-600 dark:text-gray-400">Gross</span>
                    <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                      {row.symbol}
                      {row.gross.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {canViewExpenseReturns() && row.returns > 0 ? (
                    <>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-gray-600 dark:text-gray-400">
                          Returns
                        </span>
                        <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                          -{row.symbol}
                          {row.returns.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 border-t border-gray-200 pt-1 dark:border-gray-600">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Net
                        </span>
                        <span className="font-bold tabular-nums text-gray-900 dark:text-white">
                          {row.symbol}
                          {row.net.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Expenses List */}
      {allowBulkRowSelect && selectedExpenseIds.length > 0 ? (
        <div
          className="mb-3 flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/90 p-3 dark:border-primary-800 dark:bg-primary-950/40 sm:flex-row sm:flex-wrap sm:items-end"
          role="region"
          aria-label="Bulk actions for expenses"
        >
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {selectedExpenseIds.length} expense
            {selectedExpenseIds.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkDeletingExpenses}
              onClick={() => void handleBulkDeleteExpenses()}
              className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeletingExpenses ? "Deleting…" : "Delete selected"}
            </button>
            <button
              type="button"
              disabled={bulkDeletingExpenses}
              onClick={clearExpenseSelection}
              className="text-sm px-2 py-1.5 text-gray-600 hover:underline dark:text-gray-300"
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Expense Records ({filteredExpenses.length})
          </h2>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              No expenses found.
            </p>
            {canCreateExpense() && (
              <button
                onClick={() => openModal()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Add First Expense
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="px-6 pt-3 pb-3 text-xs text-gray-500 dark:text-gray-400">
              Click a row to view full expense details.
            </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  {allowBulkRowSelect ? (
                    <th className="w-10 px-2 py-3">
                      <span className="sr-only">Select row</span>
                      <input
                        ref={selectAllExpensesRef}
                        type="checkbox"
                        checked={allFilteredExpensesSelected}
                        onChange={toggleSelectAllFilteredExpenses}
                        disabled={filteredExpenses.length === 0}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        aria-label="Select all expenses in the list"
                      />
                    </th>
                  ) : null}
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 w-36 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => {
                  const returned = returnedAmountForExpense(expense);
                  const net = Math.max(0, (expense.amount || 0) - returned);
                  const hasReturns = returned > 0;
                  const canRecordReturn =
                    canReceiveExpenseReturns() &&
                    expenseAllowsReturnRecording(expense) &&
                    (expense.amount || 0) - returned > 0.0001;
                  const canOpenReturnHistory =
                    !canRecordReturn &&
                    canViewExpenseReturns() &&
                    hasReturns;
                  return (
                  <tr
                    key={expense.id}
                    onClick={() => openExpenseDetail(expense)}
                    className="cursor-pointer bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {allowBulkRowSelect ? (
                      <td
                        className="w-10 px-2 py-4 align-middle"
                        onClick={stopExpenseRowClick}
                      >
                        <input
                          type="checkbox"
                          checked={selectedExpenseSet.has(expense.id)}
                          onChange={() => toggleExpenseSelected(expense.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                          aria-label={`Select expense ${expense.title}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {expense.date.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {expense.title}
                        </div>
                        {expense.isMonthlyExpense ? (
                          <span className="inline-flex min-h-[18px] items-center justify-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-200/80 dark:bg-indigo-900/45 dark:text-indigo-200 dark:ring-indigo-700/60">
                            Monthly
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span
                        className={`inline-flex min-h-[22px] max-w-[9rem] items-center justify-center rounded-full px-2.5 py-0.5 text-center text-[10px] font-semibold leading-tight ring-1 ring-inset ${expenseCategoryBadgeClass(expense.category)}`}
                      >
                        {expense.category || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                      <div>{expense.currencySymbol}{expense.amount.toFixed(2)}</div>
                      {hasReturns ? (
                        <span
                          className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            expense.returnStatus === "full" || net <= 0
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {expense.returnStatus === "full" || net <= 0
                            ? "Fully returned"
                            : "Partially returned"}
                        </span>
                      ) : null}
                    </td>
                    <td
                      className="px-6 py-4"
                      onClick={stopExpenseRowClick}
                    >
                      <div className="flex items-center justify-end gap-0.5">
                        {canRecordReturn || canOpenReturnHistory ? (
                          <RowIconButton
                            onClick={() => openReturnModal(expense)}
                            title={
                              canRecordReturn
                                ? "Record return / refund / cashback"
                                : "View returns"
                            }
                            variant="emerald"
                          >
                            <IconReturn />
                          </RowIconButton>
                        ) : null}
                        {canEditExpenseRow(expense) ? (
                          <RowIconButton
                            onClick={() => openModal(expense)}
                            title="Edit expense"
                            variant="yellow"
                          >
                            <IconEdit />
                          </RowIconButton>
                        ) : null}
                        {canDeleteExpenseRow(expense) ? (
                          <RowIconButton
                            onClick={() => handleDelete(expense.id, expense)}
                            title="Delete expense"
                            variant="red"
                          >
                            <IconDelete />
                          </RowIconButton>
                        ) : null}
                        {!canEditExpenseRow(expense) &&
                          !canDeleteExpenseRow(expense) &&
                          !canRecordReturn &&
                          !canOpenReturnHistory && (
                            <span className="px-2 text-xs text-gray-400">—</span>
                          )}
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      </>
      ) : activeTab === "vendors" ? (
        <div className="space-y-6">
          <div className="page-header">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Payees
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Saved payees show in the expense form. Use &quot;Other
                (one-time)&quot; for a one-off payment without adding them here.
              </p>
            </div>
            {canCreateExpensePayee() ? (
              <button
                type="button"
                onClick={() => openVendorModal()}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Add payee
              </button>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
            {vendors.length === 0 ? (
              <p className="p-8 text-center text-gray-500 dark:text-gray-400">
                No saved payees yet. Add one for repeat recipients, or use a
                one-time payee from the expense form.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Notes</th>
                      {canManageExpensePayees ? (
                        <th className="px-6 py-3 w-40">Actions</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr
                        key={v.id}
                        className="border-b border-gray-100 dark:border-gray-700"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {v.name}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {v.notes || "—"}
                        </td>
                        {canManageExpensePayees ? (
                          <td className="px-6 py-4 space-x-2">
                            {canEditExpensePayee() ? (
                              <button
                                type="button"
                                onClick={() => openVendorModal(v)}
                                className="text-amber-600 hover:underline dark:text-amber-400"
                              >
                                Edit
                              </button>
                            ) : null}
                            {canDeleteExpensePayee() ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteVendor(v)}
                                className="text-red-600 hover:underline dark:text-red-400"
                              >
                                Delete
                              </button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="page-header">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Categories
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Categories listed here appear in expense filters and when adding
                or editing an expense. New companies get a starter set
                automatically once.
              </p>
            </div>
            {canCreateExpenseCategory() ? (
              <button
                type="button"
                onClick={() => openCategoryModal()}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Add category
              </button>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
            {expenseCategories.length === 0 ? (
              <p className="p-8 text-center text-gray-500 dark:text-gray-400">
                Loading categories… If this stays empty, check your connection
                or Firestore rules for{" "}
                <code className="text-xs">expenseCategories</code>.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Notes</th>
                      {canManageExpenseCategories ? (
                        <th className="px-6 py-3 w-40">Actions</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {expenseCategories.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-gray-100 dark:border-gray-700"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {c.name}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {c.notes || "—"}
                        </td>
                        {canManageExpenseCategories ? (
                          <td className="px-6 py-4 space-x-2">
                            {canEditExpenseCategory() ? (
                              <button
                                type="button"
                                onClick={() => openCategoryModal(c)}
                                className="text-amber-600 hover:underline dark:text-amber-400"
                              >
                                Edit
                              </button>
                            ) : null}
                            {canDeleteExpenseCategory() ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteCategory(c)}
                                className="text-red-600 hover:underline dark:text-red-400"
                              >
                                Delete
                              </button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payee directory modal */}
      {vendorModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {vendorForm.id ? "Edit payee" : "Add payee"}
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name *
                </label>
                <input
                  type="text"
                  value={vendorForm.name}
                  onChange={(e) =>
                    setVendorForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  value={vendorForm.notes}
                  onChange={(e) =>
                    setVendorForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeVendorModal}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={vendorSaving}
                onClick={() => void handleSaveVendor()}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {vendorSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {categoryModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {categoryForm.id ? "Edit category" : "Add category"}
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name *
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  value={categoryForm.notes}
                  onChange={(e) =>
                    setCategoryForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              {categoryForm.id ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Renaming updates this company&apos;s expenses that still use the
                  old category name.
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCategoryModal}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={categorySaving}
                onClick={() => void handleSaveCategory()}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {categorySaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Expense detail modal */}
      {detailExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={closeExpenseDetail}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={stopExpenseRowClick}
          >
            {(() => {
              const expense = detailExpense;
              const returned = returnedAmountForExpense(expense);
              const net = Math.max(0, (expense.amount || 0) - returned);
              const returnRows = returnsByExpenseId.get(expense.id) ?? [];

              return (
                <>
                  <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white break-words">
                          {expense.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {expense.date.toDate().toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex min-h-[22px] items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${expenseCategoryBadgeClass(expense.category)}`}
                      >
                        {expense.category || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-4 space-y-5">
                    <section>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                        Amount
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Gross
                          </p>
                          <p className="mt-1 font-semibold text-red-600 dark:text-red-400">
                            {expense.currencySymbol}
                            {(expense.amount || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Returned
                          </p>
                          <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            {expense.currencySymbol}
                            {returned.toFixed(2)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Net
                          </p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {expense.currencySymbol}
                            {net.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                        Payment details
                      </h4>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">
                            Payee
                          </dt>
                          <dd className="font-medium text-gray-900 dark:text-white">
                            {expense.vendorName || "—"}
                            {expense.oneTimeVendor ? (
                              <span className="ml-1 text-xs font-normal text-amber-600 dark:text-amber-400">
                                (one-time)
                              </span>
                            ) : null}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">
                            Currency
                          </dt>
                          <dd className="font-medium text-gray-900 dark:text-white">
                            {expense.currency || "USD"}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-gray-500 dark:text-gray-400">
                            Bank account
                          </dt>
                          <dd className="font-medium text-gray-900 dark:text-white">
                            {expense.bankAccountName || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">
                            Recorded
                          </dt>
                          <dd className="font-medium text-gray-900 dark:text-white">
                            {expense.createdAt?.toDate?.()?.toLocaleDateString?.() ||
                              "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">
                            Monthly tag
                          </dt>
                          <dd className="font-medium text-gray-900 dark:text-white">
                            {expense.isMonthlyExpense ? (
                              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-900/45 dark:text-indigo-200">
                                Monthly recurring
                              </span>
                            ) : (
                              "Not tagged"
                            )}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    {expense.description?.trim() ? (
                      <section>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                          Description
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
                          {expense.description}
                        </p>
                      </section>
                    ) : null}

                    {expense.expectedReturnAvailable ? (
                      <section>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                          Expected return (planning)
                        </h4>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm rounded-lg border border-dashed border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
                          <div>
                            <dt className="text-gray-500 dark:text-gray-400">
                              Expected amount
                            </dt>
                            <dd className="font-medium text-gray-900 dark:text-white">
                              {expense.expectedReturnAmount != null
                                ? `${expense.currencySymbol}${Number(expense.expectedReturnAmount).toFixed(2)}`
                                : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500 dark:text-gray-400">
                              Expected date
                            </dt>
                            <dd className="font-medium text-gray-900 dark:text-white">
                              {expense.expectedReturnDate?.toDate?.()?.toLocaleDateString?.() ||
                                "—"}
                            </dd>
                          </div>
                          {expense.expectedReturnNotes?.trim() ? (
                            <div className="col-span-2">
                              <dt className="text-gray-500 dark:text-gray-400">
                                Notes
                              </dt>
                              <dd className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">
                                {expense.expectedReturnNotes}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </section>
                    ) : null}

                    {canViewExpenseReturns() && returnRows.length > 0 ? (
                      <section>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                          Returns recorded ({returnRows.length})
                        </h4>
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                          {returnRows.map((r) => (
                            <li
                              key={r.id}
                              className="flex items-center justify-between text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2"
                            >
                              <div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">
                                  {expenseReturnTypeLabel(r.returnType)} ·{" "}
                                  {r.currencySymbol}
                                  {(r.amount || 0).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {r.receivedDate?.toDate?.()?.toLocaleDateString?.()}{" "}
                                  · {r.destinationBankAccountName}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-wrap justify-end gap-2">
                    {canReceiveExpenseReturns() &&
                    expenseAllowsReturnRecording(expense) &&
                    (expense.amount || 0) - returned > 0.0001 ? (
                      <button
                        type="button"
                        onClick={() => openReturnModal(expense)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium"
                      >
                        Record return
                      </button>
                    ) : null}
                    {canViewExpenseReturns() && returned > 0 ? (
                      <button
                        type="button"
                        onClick={() => openReturnModal(expense)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 text-sm font-medium"
                      >
                        View returns
                      </button>
                    ) : null}
                    {canEditExpenseRow(expense) ? (
                      <button
                        type="button"
                        onClick={() => openModal(expense)}
                        className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 text-sm font-medium"
                      >
                        Edit
                      </button>
                    ) : null}
                    {canDeleteExpenseRow(expense) ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(expense.id, expense)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={closeExpenseDetail}
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

      {/* Modal */}
      {isModalOpen && currentExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex w-full max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="shrink-0 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {"id" in currentExpense ? "Edit Expense" : "Add Expense"}
              </h3>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={currentExpense.title}
                onChange={(e) =>
                  setCurrentExpense({
                    ...currentExpense,
                    title: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={currentExpense.description}
                onChange={(e) =>
                  setCurrentExpense({
                    ...currentExpense,
                    description: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payee *
                </label>
                <select
                  value={vendorFormChoice}
                  onChange={(e) => {
                    const v = e.target.value;
                    setVendorFormChoice(v);
                    if (v !== OTHER_PAYEE_VALUE) {
                      setOneTimeVendorName("");
                    }
                  }}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select payee</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                  <option value={OTHER_PAYEE_VALUE}>
                    Other (one-time payee)…
                  </option>
                </select>
                {vendorFormChoice === OTHER_PAYEE_VALUE ? (
                  <input
                    type="text"
                    placeholder="One-time payee name *"
                    value={oneTimeVendorName}
                    onChange={(e) => setOneTimeVendorName(e.target.value)}
                    className="mt-2 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                ) : null}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Repeat recipients live under the Payees tab. One-time names
                  stay on the expense only.
                </p>
              </div>

              {/* Bank Account Selection - Moved after description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Account *
                </label>
                <select
                  value={currentExpense.bankAccountId}
                  onChange={(e) => handleBankAccountChange(e.target.value)}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select Bank Account</option>
                  {accessibleBankAccounts.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {formatBankAccountSelectLabel(bank, showPickerBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  value={currentExpense.category ?? ""}
                  onChange={(e) =>
                    setCurrentExpense({
                      ...currentExpense,
                      category: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select category</option>
                  {expenseFormCategoryNames.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {expenseFormCategoryNames.length === 0 ? (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Add categories in the Categories tab first.
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount *
                    {showPickerBalance && currentExpense.bankAccountId
                      ? (() => {
                          const selectedBank = bankAccounts.find(
                            (b) => b.id === currentExpense.bankAccountId,
                          );
                          return selectedBank ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              (Available: {selectedBank.currencySymbol}
                              {bankStoredBalance(selectedBank).toFixed(2)})
                            </span>
                          ) : null;
                        })()
                      : null}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={currentExpense.bankAccountId ? "Enter amount" : "Select bank account first"}
                    value={currentExpense.amount || ""}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    disabled={!currentExpense.bankAccountId}
                    className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      !currentExpense.bankAccountId
                        ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed opacity-50'
                        : amountError
                          ? 'border-red-500 dark:border-red-400'
                          : ''
                    }`}
                    required
                  />
                  {amountError && (
                    <p className="text-red-500 dark:text-red-400 text-xs mt-1">
                      {amountError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={
                      currentExpense.date
                        ? currentExpense.date instanceof Date
                          ? currentExpense.date.toISOString().split("T")[0]
                          : currentExpense.date
                              .toDate()
                              .toISOString()
                              .split("T")[0]
                        : ""
                    }
                    onChange={(e) =>
                      setCurrentExpense({
                        ...currentExpense,
                        date: Timestamp.fromDate(new Date(e.target.value)),
                      })
                    }
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Monthly expense tag — for tracking recurring monthly charges */}
              <div className="rounded-md border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!currentExpense.isMonthlyExpense}
                    onChange={(e) =>
                      setCurrentExpense({
                        ...currentExpense,
                        isMonthlyExpense: e.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Monthly expense
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Tag this as a recurring monthly charge so you can filter and
                      track it easily.
                    </span>
                  </span>
                </label>
              </div>

              {/* Expected return (optional) — planning only; no balance effect until received */}
              <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!currentExpense.expectedReturnAvailable}
                    onChange={(e) =>
                      setCurrentExpense({
                        ...currentExpense,
                        expectedReturnAvailable: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  Expected return available (refund / cashback)
                </label>
                {currentExpense.expectedReturnAvailable ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Expected return amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={currentExpense.expectedReturnAmount ?? ""}
                        onChange={(e) =>
                          setCurrentExpense({
                            ...currentExpense,
                            expectedReturnAmount:
                              e.target.value === ""
                                ? null
                                : parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Expected return date
                      </label>
                      <input
                        type="date"
                        value={
                          currentExpense.expectedReturnDate
                            ? currentExpense.expectedReturnDate
                                .toDate()
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          setCurrentExpense({
                            ...currentExpense,
                            expectedReturnDate: e.target.value
                              ? Timestamp.fromDate(new Date(e.target.value))
                              : null,
                          })
                        }
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 20k cashback expected from vendor"
                        value={currentExpense.expectedReturnNotes ?? ""}
                        onChange={(e) =>
                          setCurrentExpense({
                            ...currentExpense,
                            expectedReturnNotes: e.target.value,
                          })
                        }
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <p className="col-span-2 text-xs text-gray-500 dark:text-gray-400">
                      Planning only — the bank balance changes when you record the
                      actual return via the “Return” action.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            </div>
            <div className="flex shrink-0 justify-end space-x-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Return / Refund / Cashback modal */}
      {returnModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Returns — {returnModalExpense.title}
            </h3>
            {(() => {
              const returned = returnedAmountForExpense(returnModalExpense);
              const remaining = Math.max(
                0,
                (returnModalExpense.amount || 0) - returned,
              );
              return (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Gross {returnModalExpense.currencySymbol}
                  {(returnModalExpense.amount || 0).toFixed(2)} · Returned{" "}
                  {returnModalExpense.currencySymbol}
                  {returned.toFixed(2)} · Remaining{" "}
                  {returnModalExpense.currencySymbol}
                  {remaining.toFixed(2)}
                </p>
              );
            })()}

            {/* Existing returns list */}
            {(returnsByExpenseId.get(returnModalExpense.id) ?? []).length > 0 ? (
              <div className="mb-4 rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {(returnsByExpenseId.get(returnModalExpense.id) ?? [])
                  .slice()
                  .sort(
                    (a, b) =>
                      (b.receivedDate?.toMillis?.() ?? 0) -
                      (a.receivedDate?.toMillis?.() ?? 0),
                  )
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-100">
                          {r.currencySymbol}
                          {(r.amount || 0).toFixed(2)} ·{" "}
                          {expenseReturnTypeLabel(r.returnType)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {r.receivedDate?.toDate?.().toLocaleDateString()} →{" "}
                          {r.destinationBankAccountName}
                          {r.notes ? ` · ${r.notes}` : ""}
                        </div>
                      </div>
                      {canReceiveExpenseReturns() ? (
                        <button
                          onClick={() => void handleDeleteReturn(r)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
              </div>
            ) : null}

            {/* New return form */}
            {canReceiveExpenseReturns() &&
            expenseAllowsReturnRecording(returnModalExpense) &&
            (returnModalExpense.amount || 0) -
              returnedAmountForExpense(returnModalExpense) >
              0.0001 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={Math.max(
                        0,
                        (returnModalExpense.amount || 0) -
                          returnedAmountForExpense(returnModalExpense),
                      )}
                      value={returnForm.amount}
                      onChange={(e) =>
                        setReturnForm({ ...returnForm, amount: e.target.value })
                      }
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Type *
                    </label>
                    <select
                      value={returnForm.returnType}
                      onChange={(e) =>
                        setReturnForm({
                          ...returnForm,
                          returnType: e.target.value as ExpenseReturnType,
                        })
                      }
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      {EXPENSE_RETURN_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Received date *
                    </label>
                    <input
                      type="date"
                      value={returnForm.receivedDate}
                      onChange={(e) =>
                        setReturnForm({
                          ...returnForm,
                          receivedDate: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Destination account *
                    </label>
                    <select
                      value={returnForm.destinationBankAccountId}
                      onChange={(e) =>
                        setReturnForm({
                          ...returnForm,
                          destinationBankAccountId: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Select account</option>
                      {accessibleBankAccounts.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {formatBankAccountSelectLabel(bank, showPickerBalance)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={returnForm.notes}
                      onChange={(e) =>
                        setReturnForm({ ...returnForm, notes: e.target.value })
                      }
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                {returnError ? (
                  <p className="text-red-500 dark:text-red-400 text-xs">
                    {returnError}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {!expenseAllowsReturnRecording(returnModalExpense)
                  ? "Returns can only be recorded for expenses marked with “Expected return available (refund / cashback)”."
                  : returnedAmountForExpense(returnModalExpense) > 0 &&
                      (returnModalExpense.amount || 0) -
                        returnedAmountForExpense(returnModalExpense) <=
                        0.0001
                    ? "This expense has been fully returned."
                    : "No remaining amount to return."}
              </p>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeReturnModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Close
              </button>
              {canReceiveExpenseReturns() &&
              expenseAllowsReturnRecording(returnModalExpense) &&
              (returnModalExpense.amount || 0) -
                returnedAmountForExpense(returnModalExpense) >
                0.0001 ? (
                <button
                  onClick={handleReceiveReturn}
                  disabled={returnSubmitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                >
                  {returnSubmitting ? "Saving…" : "Receive Return"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
