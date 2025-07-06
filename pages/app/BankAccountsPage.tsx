import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { db, Timestamp } from "../../services/firebase";
import type { BankAccount } from "../../types";
import Spinner from "../../components/Spinner";

const currencies = ["USD", "PKR", "EUR"];

const BankAccountsPage: React.FC = () => {
  const { user } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    currency: "USD",
    initialBalance: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubscribe = db
      .collection("bankAccounts")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          const accounts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as BankAccount[];
          setBankAccounts(accounts);
          setLoading(false);
        },
        (err) => {
          console.error("Failed to fetch bank accounts:", err);
          setLoading(false);
        },
      );
    return () => unsubscribe();
  }, [user]);

  const resetForm = () => {
    setForm({
      accountName: "",
      bankName: "",
      accountNumber: "",
      currency: "USD",
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
      !form.currency
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
    } catch (err) {
      console.error("Failed to delete bank account:", err);
      setError("Failed to delete bank account.");
    } finally {
      setLoading(false);
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
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        Bank Accounts Management
      </h1>

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
        </div>
      </form>

      <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
        Your Bank Accounts
      </h2>
      {bankAccounts.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-300">
          No bank accounts found.
        </p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className="px-4 py-2">Account Name</th>
              <th className="px-4 py-2">Bank Name</th>
              <th className="px-4 py-2">Account Number</th>
              <th className="px-4 py-2">Currency</th>
              <th className="px-4 py-2">Initial Balance</th>
              <th className="px-4 py-2">Current Balance</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bankAccounts.map((account) => (
              <tr
                key={account.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-2">{account.accountName}</td>
                <td className="px-4 py-2">{account.bankName}</td>
                <td className="px-4 py-2">{account.accountNumber}</td>
                <td className="px-4 py-2">{account.currency}</td>
                <td className="px-4 py-2">{account.initialBalance || 0}</td>
                <td className="px-4 py-2 font-semibold text-green-600">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: account.currency,
                  }).format(
                    (account as any).currentBalance ||
                      account.initialBalance ||
                      0,
                  )}
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button
                    onClick={() => handleEdit(account)}
                    className="px-2 py-1 bg-yellow-400 rounded hover:bg-yellow-500 text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="px-2 py-1 bg-red-500 rounded hover:bg-red-600 text-white"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BankAccountsPage;
