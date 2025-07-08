import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { db, Timestamp } from "../../services/firebase";
import type { Expense, BankAccount } from "../../types";
import Spinner from "../../components/Spinner";

const ExpensesPage: React.FC = () => {
  usePageTitle("Expenses");
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Partial<Expense> | null>(
    null,
  );
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(
    {},
  );
  const [filter, setFilter] = useState({
    period: "month", // month, week, year, all
    bankAccountId: "",
    category: "",
    search: "",
  });

  const expenseCategories = [
    "Office Supplies",
    "Marketing",
    "Travel",
    "Utilities",
    "Software & Tools",
    "Equipment",
    "Professional Services",
    "Training & Education",
    "Rent",
    "Insurance",
    "Food & Entertainment",
    "Other",
  ];

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Load exchange rates
      try {
        const response = await fetch(
          "https://api.exchangerate-api.com/v4/latest/USD",
        );
        const data = await response.json();
        if (data && data.rates) {
          setExchangeRates(data.rates);
        }
      } catch (error) {
        console.error("Failed to load exchange rates:", error);
        // Use default rates if API fails
        setExchangeRates({ USD: 1, PKR: 278, EUR: 0.85 });
      }
    };

    loadData();

    // Load bank accounts with real-time updates
    const bankAccountsUnsubscribe = db
      .collection("bankAccounts")
      .where("userId", "==", user.uid)
      .onSnapshot(
        (snapshot) => {
          const bankAccountsData = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as BankAccount,
          );
          setBankAccounts(bankAccountsData);
        },
        (error) => {
          console.error("Error loading bank accounts:", error);
        },
      );

    // Load expenses with real-time updates
    const unsubscribe = db
      .collection("expenses")
      .where("userId", "==", user.uid)
      .orderBy("date", "desc")
      .onSnapshot(
        (snapshot) => {
          const expensesData = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Expense,
          );
          setExpenses(expensesData);
          setLoading(false);
        },
        (error) => {
          console.error("Error loading expenses:", error);
          setLoading(false);
        },
      );

    return () => {
      unsubscribe();
      bankAccountsUnsubscribe();
    };
  }, [user]);

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
          expense.category.toLowerCase().includes(searchLower),
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
        acc[expense.category] = (acc[expense.category] || 0) + convertedAmount;
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
    if (expense) {
      setCurrentExpense(expense);
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
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentExpense(null);
  };

  const handleSave = async () => {
    if (!user || !currentExpense) return;

    try {
      const selectedBank = bankAccounts.find(
        (b) => b.id === currentExpense.bankAccountId,
      );
      if (!selectedBank) {
        alert("Please select a bank account");
        return;
      }

      const expenseData = {
        ...currentExpense,
        userId: user.uid,
        bankAccountName: selectedBank.accountName,
        currency: selectedBank.currency,
        currencySymbol: selectedBank.currencySymbol,
        createdAt: Timestamp.now(),
      };

      if ("id" in currentExpense && currentExpense.id) {
        await db
          .collection("expenses")
          .doc(currentExpense.id)
          .update(expenseData);
      } else {
        await db.collection("expenses").add(expenseData);

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
      }

      closeModal();
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Failed to save expense");
    }
  };

  const handleDelete = async (expenseId: string, expense: Expense) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await db.collection("expenses").doc(expenseId).delete();

        // Restore bank account balance
        const selectedBank = bankAccounts.find(
          (b) => b.id === expense.bankAccountId,
        );
        if (selectedBank) {
          await db
            .collection("bankAccounts")
            .doc(selectedBank.id)
            .update({
              currentBalance:
                (selectedBank.currentBalance ||
                  selectedBank.initialBalance ||
                  0) + expense.amount,
            });
        }
      } catch (error) {
        console.error("Error deleting expense:", error);
        alert("Failed to delete expense");
      }
    }
  };

  const stats = getExpenseStats();
  const filteredExpenses = getFilteredExpenses();

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Expenses Management
        </h1>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Add Expense
        </button>
      </div>

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
                  {bank.accountName} ({bank.currencySymbol})
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
              {expenseCategories.map((category) => (
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
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Category</th>
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
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">{expense.bankAccountName}</td>
                    <td className="px-6 py-4 font-semibold text-red-600 dark:text-red-400">
                      {expense.currencySymbol}
                      {expense.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 flex space-x-2">
                      <button
                        onClick={() => openModal(expense)}
                        className="text-yellow-500 hover:text-yellow-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id, expense)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={currentExpense.amount || ""}
                  onChange={(e) =>
                    setCurrentExpense({
                      ...currentExpense,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
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
              <select
                value={currentExpense.category}
                onChange={(e) =>
                  setCurrentExpense({
                    ...currentExpense,
                    category: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Select Category</option>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                value={currentExpense.bankAccountId}
                onChange={(e) =>
                  setCurrentExpense({
                    ...currentExpense,
                    bankAccountId: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Select Bank Account</option>
                {bankAccounts.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.accountName} - {bank.bankName} ({bank.currencySymbol})
                  </option>
                ))}
              </select>
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
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
