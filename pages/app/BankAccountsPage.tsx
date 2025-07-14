import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { PAGES } from "../../config/permissions";
import { db, Timestamp } from "../../services/firebase";
import type { BankAccount } from "../../types";
import Spinner from "../../components/Spinner";
import ProtectedComponent from "../../components/ProtectedComponent";

const currencies = ["USD", "PKR", "EUR"];

const BankAccountsPage: React.FC = () => {
  usePageTitle("Bank Accounts");
  const { user } = useAuth();
  const { canCreate, canEdit, canDelete, hasPageAccess } = usePermissions();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    currency: "USD",
    currencySymbol: "$",
    initialBalance: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadBankAccounts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Change from onSnapshot to get() to avoid index issues
      const snapshot = await db
        .collection("bankAccounts")
        .where("userId", "==", user.uid)
        .get(); // Removed .orderBy("createdAt", "desc") to avoid index requirement

      const accounts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BankAccount[];

      // Sort manually to avoid Firestore index requirement
      accounts.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date();
        const bTime = b.createdAt?.toDate?.() || new Date();
        return bTime.getTime() - aTime.getTime();
      });

      setBankAccounts(accounts);
      setLoading(false);
    } catch (error) {
      console.error("Error loading bank accounts:", error);
      setBankAccounts([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBankAccounts();
  }, [user]);

  const resetForm = () => {
    setForm({
      accountName: "",
      bankName: "",
      accountNumber: "",
      currency: "USD",
      currencySymbol: "$",
      initialBalance: "",
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
    if (!user) return;
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
      const bankAccountData = {
        userId: user.uid,
        accountName: form.accountName,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        currency: form.currency,
        currencySymbol: form.currencySymbol,
        initialBalance: initialBalance,
        currentBalance: initialBalance,
        createdAt: Timestamp.now(),
      };
      if (editingId) {
        // Update existing
        await db
          .collection("bankAccounts")
          .doc(editingId)
          .update(bankAccountData);
      } else {
        // Create new
        const newDocRef = db.collection("bankAccounts").doc();
        await newDocRef.set(bankAccountData);
        // If initialBalance is provided, create a dummy invoice or transaction?
        // For now, initialBalance is optional and not tracked in invoices.
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
      accountNumber: account.accountNumber,
      currency: account.currency,
      currencySymbol: account.currencySymbol || "$",
      initialBalance: "",
    });
    setEditingId(account.id);
    setError("");
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

  if (!hasPageAccess(PAGES.BANK_ACCOUNTS)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have permission to access Bank Accounts.
          </p>
        </div>
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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Bank Accounts Management
        </h1>
        <button
          onClick={() => loadBankAccounts()}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        {error && <p className="text-red-500">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Account Name
            </label>
            <input
              type="text"
              name="accountName"
              value={form.accountName}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bank Name
            </label>
            <input
              type="text"
              name="bankName"
              value={form.bankName}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Account Number
            </label>
            <input
              type="text"
              name="accountNumber"
              value={form.accountNumber}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Currency
            </label>
            <select
              name="currency"
              value={form.currency}
              onChange={handleInputChange}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Currency Symbol
            </label>
            <input
              type="text"
              name="currencySymbol"
              value={form.currencySymbol}
              onChange={handleInputChange}
              placeholder="e.g., $, €, ₨, ₹"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
              maxLength={5}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Initial Balance (optional)
          </label>
          <input
            type="number"
            name="initialBalance"
            value={form.initialBalance}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            min="0"
            step="0.01"
          />
        </div>
        <div className="flex space-x-4">
          {(canCreate(PAGES.BANK_ACCOUNTS) || canEdit(PAGES.BANK_ACCOUNTS)) && (
            <>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {editingId ? "Save Changes" : "Add Bank Account"}
              </button>
            </>
          )}
        </div>
      </form>

      <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
        Your Bank Accounts
      </h2>
      {bankAccounts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            No bank accounts found.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add your first bank account to start managing finances.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((account) => (
            <div
              key={account.id}
              className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {account.accountName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {account.bankName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {account.accountNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                    {account.currency}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Symbol:
                  </span>
                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {account.currencySymbol || "$"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Initial:
                  </span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {account.currencySymbol || "$"}
                    {(account.initialBalance || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Current:
                  </span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {account.currencySymbol || "$"}
                    {(
                      account.currentBalance ||
                      account.initialBalance ||
                      0
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <ProtectedComponent page={PAGES.BANK_ACCOUNTS} action="edit">
                  <button
                    onClick={() => handleEdit(account)}
                    className="flex-1 px-3 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                </ProtectedComponent>
                <ProtectedComponent page={PAGES.BANK_ACCOUNTS} action="delete">
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="flex-1 px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </ProtectedComponent>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BankAccountsPage;
