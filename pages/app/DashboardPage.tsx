import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DashboardCard from "../../components/DashboardCard";
import { CustomerIcon, InvoiceIcon, RevenueIcon } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { usePermissions } from "../../hooks/usePermissions";
import { usePermissionRefresh } from "../../hooks/usePermissionRefresh";
import { db } from "../../services/firebase";
import { FirestoreWrapper } from "../../services/firestoreWrapper";
import { InvoiceService } from "../../services/invoiceService";
import { CustomerService } from "../../services/customerService";
import type { Invoice, Customer, BankAccount, Expense } from "../../types";
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
      console.log('📍 Dashboard loaded via impersonation - checking auth state...');
      console.log('   Current userProfile:', userProfile?.email);
      console.log('   Is impersonating:', userProfile?.isImpersonating);
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
    isOwner,
    isAdmin
  } = usePermissions();
  const { refreshPermissions, setupRealTimeListeners } = usePermissionRefresh();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    if (!user || !userProfile) return;

    setLoading(true);

    // Set up real-time permission listeners
    setupRealTimeListeners();

    // Determine company ID for data loading
    const companyId = userProfile?.isOwner ? user.uid : userProfile?.companyId;

    // Failsafe: Stop loading after 10 seconds
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 10000);

    // Set up real-time listeners for invoices using the service
    let invoicesUnsubscribe: () => void;

    try {
      invoicesUnsubscribe = InvoiceService.getInvoicesRealTime(
        user,
        userProfile,
        isOwner,
        isAdmin,
        (invoicesData) => {
          setInvoices(invoicesData);
          // Stop loading when invoice data is received (even if empty)
          if (!loading) setLoading(false);
        },
      );
    } catch (error) {
      console.error("Error setting up invoice listener:", error);
      setInvoices([]);
      setLoading(false);
    }

    // Load other data with safer approach
    const loadOtherData = async () => {
      try {
        // Load data one by one with individual error handling
        let customersData: Customer[] = [];
        let bankAccountsData: BankAccount[] = [];
        let expensesData: Expense[] = [];

        // Load customers safely
        try {
          customersData = await CustomerService.getCustomers(
            user,
            userProfile,
            isOwner,
            isAdmin,
          );
        } catch (customerError) {
          console.error("Error loading customers:", customerError);
          customersData = [];
        }

        // Load bank accounts safely with retry logic
        try {
          const bankAccountsQuery = db
            .collection("bankAccounts")
            .where("userId", "==", companyId || user.uid);
          const bankAccountsSnapshot = await FirestoreWrapper.query(bankAccountsQuery, {
            maxRetries: 2,
            timeoutMs: 8000
          });
          bankAccountsData = bankAccountsSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as BankAccount,
          );
        } catch (bankError) {
          console.error("Error loading bank accounts:", bankError);
          bankAccountsData = [];
        }

        // Load expenses safely with retry logic
        try {
          const expensesQuery = db
            .collection("expenses")
            .where("userId", "==", user.uid);
          const expensesSnapshot = await FirestoreWrapper.query(expensesQuery, {
            maxRetries: 2,
            timeoutMs: 8000
          });
          expensesData = expensesSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Expense,
          );
        } catch (expenseError) {
          console.error("Error loading expenses:", expenseError);
          expensesData = [];
        }

        // Set the data
        setCustomers(customersData);
        setBankAccounts(bankAccountsData);
        setExpenses(expensesData);

        // Load exchange rates separately
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
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setCustomers([]);
        setBankAccounts([]);
        setExpenses([]);
        setExchangeRates({ USD: 1, PKR: 278, EUR: 0.85 });
      } finally {
        setLoading(false);
      }
    };

    loadOtherData();

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (invoicesUnsubscribe) {
        invoicesUnsubscribe();
      }
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

  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => {
      const rate = exchangeRates[inv.bankAccountCurrency || "USD"] || 1;
      const convertedTotal = inv.total / rate;
      return sum + convertedTotal;
    }, 0);

  const outstandingRevenue = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.total, 0);

  const thisMonthExpenses = expenses
    .filter((exp) => {
      const expenseDate = exp.date.toDate();
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
  const hasAnyDashboardPermission = canViewTotalRevenue() || canViewOutstandingRevenue() ||
    canViewMonthlyExpenses() || canViewTotalCustomers() || canViewDashboardBankAccounts() ||
    canViewRecentInvoices() || canAccessInvoiceVerification();

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
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
        Dashboard
      </h1>



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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {canViewTotalRevenue() && (
          <DashboardCard
            title="Total Revenue (Paid)"
            value={formatCurrency(totalRevenue)}
            icon={<RevenueIcon />}
            color="bg-green-500"
          />
        )}
        {canViewOutstandingRevenue() && (
          <DashboardCard
            title="Outstanding Revenue"
            value={formatCurrency(outstandingRevenue)}
            icon={<InvoiceIcon />}
            color="bg-yellow-500"
          />
        )}
        {canViewMonthlyExpenses() && (
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
        )}
        {canViewTotalCustomers() && (
          <DashboardCard
            title="Total Customers"
            value={customers.length.toString()}
            icon={<CustomerIcon />}
            color="bg-blue-500"
          />
        )}
      </div>

      {/* Bank Accounts Overview */}
      {canViewDashboardBankAccounts() && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">
            Bank Accounts
          </h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Recent Invoices */}
      {canViewRecentInvoices() && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-white">
            Recent Invoices
          </h2>
          <Link
            to="/invoices"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All
          </Link>
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
          <div className="overflow-x-auto">
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
