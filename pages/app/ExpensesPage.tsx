import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useNavigate } from "react-router-dom";
import firebase from "firebase/compat/app";
import { db, Timestamp } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import { BankAccountService } from "../../services/bankAccountService";
import { subscribeCompanyVendors } from "../../services/vendorService";
import {
  renameCategoryOnExpenses,
  subscribeCompanyExpenseCategories,
} from "../../services/expenseCategoryService";
import type { Expense, BankAccount, Vendor, ExpenseCategory } from "../../types";
import Spinner from "../../components/Spinner";
import { GRANULAR_PERMISSIONS } from "../../config/permissions";
import {
  backfillExpenseCompanyIdsIfNeeded,
  getExpenseCompanyId,
} from "../../utils/expenseCompanyScope";
import { formatBankAccountListLabel } from "../../utils/bankAccountDisplay";

/** Expense form: directory payee or one-time payee (this sentinel value). */
const OTHER_PAYEE_VALUE = "__other__";

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
    isOwner,
  } = usePermissions();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
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
    period: "month", // month, week, year, all
    bankAccountId: "",
    category: "",
    search: "",
  });
  const allowBulkRowSelect = canBulkDeleteExpenses();
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [bulkDeletingExpenses, setBulkDeletingExpenses] = useState(false);
  const selectAllExpensesRef = useRef<HTMLInputElement>(null);

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

    loadExchangeRates();

    return () => {
      expensesUnsubscribe();
      bankAccountsUnsubscribe();
    };
  }, [user, userProfile, companyWideExpenseQuery, expenseCompanyId]);

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
    const fromDb = expenseCategories.map((c) => c.name);
    const fromExpenses = [
      ...new Set(
        expenses
          .map((e) => e.category)
          .filter((c): c is string => Boolean(c && String(c).trim())),
      ),
    ];
    const merged = new Set([...fromDb, ...fromExpenses]);
    return [...merged].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [expenseCategories, expenses]);

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
    if (filter.period !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (filter.period) {
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(
        (expense) => expense.date.toDate() >= startDate,
      );
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
      totalCount: filteredExpenses.length,
      categoryTotals,
      bankTotals,
    };
  };

  const openModal = (expense?: Expense) => {
    setVendorFormChoice("");
    setOneTimeVendorName("");
    if (expense) {
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
      setCurrentExpense({
        title: "",
        description: "",
        amount: 0,
        category: "",
        bankAccountId: "",
        date: Timestamp.now(),
      });
    }
    setAmountError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentExpense(null);
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
      const availableBalance = selectedBank.currentBalance || selectedBank.initialBalance || 0;
      if (amount > availableBalance) {
        setAmountError(`Insufficient balance. Available: ${selectedBank.currencySymbol}${availableBalance.toFixed(2)}`);
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
        const { id: _omitId, ...updatePayload } = expenseData as Expense & {
          id?: string;
        };
        void _omitId;
        await db
          .collection("expenses")
          .doc(currentExpense.id)
          .update(updatePayload);

        // Log update activity
        const payeeNote = expenseData.vendorName
          ? ` · Payee: ${expenseData.vendorName}`
          : "";
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "expense_updated",
          `Updated expense: ${expenseData.title}${payeeNote}`,
          {
            entityId: currentExpense.id,
            entityType: "expense",
            newValue: expenseData,
          },
        );
      } else {
        const { id: _omitId2, ...createPayload } = expenseData as Expense & {
          id?: string;
        };
        void _omitId2;
        const docRef = await db.collection("expenses").add(createPayload);

        // Update bank account balance
        await db
          .collection("bankAccounts")
          .doc(selectedBank.id)
          .update({
            currentBalance:
              (selectedBank.currentBalance ||
                selectedBank.initialBalance ||
                0) - (currentExpense.amount || 0),
          });

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
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteExpenseRecord(expenseId, expense);
      } catch (error) {
        console.error("Error deleting expense:", error);
        alert("Failed to delete expense");
      }
    }
  };

  const stats = getExpenseStats();
  const filteredExpenses = getFilteredExpenses();

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
      for (const expenseId of selectedExpenseIds) {
        const expense = expenses.find((e) => e.id === expenseId);
        if (!expense || !canDeleteExpenseRow(expense)) continue;
        await deleteExpenseRecord(expenseId, expense);
      }
      clearExpenseSelection();
    } catch (error) {
      console.error(error);
      alert("Some expenses could not be deleted.");
    } finally {
      setBulkDeletingExpenses(false);
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
    <div className="p-6">
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
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Period
            </label>
            <select
              value={filter.period}
              onChange={(e) => setFilter({ ...filter, period: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bank Account
            </label>
            <select
              value={filter.bankAccountId}
              onChange={(e) =>
                setFilter({ ...filter, bankAccountId: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Accounts</option>
              {bankAccounts.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {formatBankAccountListLabel(bank)} ({bank.currencySymbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={filter.category}
              onChange={(e) =>
                setFilter({ ...filter, category: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">All Categories</option>
              {filterCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search expenses..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Total Expenses</h3>
          <p className="text-2xl font-bold">{stats.totalCount}</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
          <h3 className="text-sm font-medium">Total Amount (USD)</h3>
          <p className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</p>
        </div>
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
          <p className="text-lg font-bold capitalize">{filter.period}</p>
        </div>
      </div>

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
                  <th className="px-6 py-3">Payee</th>
                  <th className="px-6 py-3">Bank Account</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    {allowBulkRowSelect ? (
                      <td className="w-10 px-2 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selectedExpenseSet.has(expense.id)}
                          onChange={() => toggleExpenseSelected(expense.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                          aria-label={`Select expense ${expense.title}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {expense.date.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{expense.title}</div>
                        {expense.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {expense.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {expense.category || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      <span className="font-medium">
                        {expense.vendorName || "—"}
                      </span>
                      {expense.oneTimeVendor ? (
                        <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                          (one-time)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">{expense.bankAccountName}</td>
                    <td className="px-6 py-4 font-semibold text-red-600 dark:text-red-400">
                      {expense.currencySymbol}
                      {expense.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 flex space-x-2">
                      {canEditExpenseRow(expense) && (
                        <button
                          onClick={() => openModal(expense)}
                          className="text-yellow-500 hover:text-yellow-700"
                        >
                          Edit
                        </button>
                      )}
                      {canDeleteExpenseRow(expense) && (
                        <button
                          onClick={() => handleDelete(expense.id, expense)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                      {!canEditExpenseRow(expense) && !canDeleteExpenseRow(expense) && (
                        <span className="text-gray-400">No actions available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                      <th className="px-6 py-3 w-40">Actions</th>
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
                      <th className="px-6 py-3 w-40">Actions</th>
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

      {/* Modal */}
      {isModalOpen && currentExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {"id" in currentExpense ? "Edit Expense" : "Add Expense"}
            </h3>
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
                  {bankAccounts.map((bank) => {
                    const balance = bank.currentBalance || bank.initialBalance || 0;
                    return (
                      <option key={bank.id} value={bank.id}>
                        {formatBankAccountListLabel(bank)} ({bank.currencySymbol}) — Balance: {bank.currencySymbol}{balance.toFixed(2)}
                      </option>
                    );
                  })}
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
                    {currentExpense.bankAccountId && (() => {
                      const selectedBank = bankAccounts.find(b => b.id === currentExpense.bankAccountId);
                      return selectedBank ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (Available: {selectedBank.currencySymbol}{(selectedBank.currentBalance || selectedBank.initialBalance || 0).toFixed(2)})
                        </span>
                      ) : null;
                    })()}
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
            </div>
            <div className="mt-6 flex justify-end space-x-3">
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
    </div>
  );
};

export default ExpensesPage;
