import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { db } from "../../services/firebase";
import { InvoiceService } from "../../services/invoiceService";
import { CustomerService } from "../../services/customerService";
import type { Invoice } from "../../types";
import Spinner from "../../components/Spinner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import InvoicePDF from "../../components/InvoicePDF";
import PaymentTrackingModal from "../../components/PaymentTrackingModal";

const currencySymbols: { [key: string]: string } = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PKR: "₨",
  INR: "₹",
  JPY: "¥",
  CNY: "¥",
  AUD: "A$",
  CAD: "C$",
  CHF: "CHF",
  // Add more as needed
};

const formatCurrency = (amount: number, currencyCode: string = "USD") => {
  const symbol = currencySymbols[currencyCode] || currencyCode;
  return `${symbol}${amount.toFixed(2)}`;
};

const InvoicesListPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const {
    canViewInvoices,
    canCreateInvoice,
    canEditInvoice,
    canDeleteInvoice,
    canViewInvoicePDF,
    canAccessPaymentTracking,
    canViewInvoiceStatus,
    isOwner,
    isAdmin
  } = usePermissions();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    invoiceId: string | null;
  }>({ isOpen: false, invoiceId: null });
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    invoice: Invoice | null;
  }>({ isOpen: false, invoice: null });
  const [filterType, setFilterType] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{
    start: string;
    end: string;
  }>({ start: "", end: "" });
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const invoicesPerPage = 20;
  const navigate = useNavigate();

  // Check if user has permission to view invoices page
  useEffect(() => {
    if (!user || !userProfile) return;

    if (!canViewInvoices()) {
      console.log("User doesn't have permission to view invoices, redirecting to dashboard");
      navigate("/");
      return;
    }
  }, [user, userProfile, canViewInvoices, navigate]);

  useEffect(() => {
    if (!user || !userProfile) return;

    // Only proceed if user has permission to view invoices
    if (!canViewInvoices()) return;

    setLoading(true);

    // Failsafe: Stop loading after 8 seconds
    const timeoutId = setTimeout(() => {
      console.warn("Invoices loading timeout");
      setLoading(false);
    }, 8000);

    try {
      // Set up real-time listener for invoices using InvoiceService
      const unsubscribe = InvoiceService.getInvoicesRealTime(
        user,
        userProfile,
        isOwner,
        isAdmin,
        (invoicesData) => {
          setInvoices(invoicesData);
          // Always stop loading when data is received (even if empty)
          setLoading(false);
        },
      );

      // Load additional data (customers and bank accounts) safely
      const loadAdditionalData = async () => {
        // Load customers safely using centralized service
        try {
          const fetchedCustomers = await CustomerService.getCustomers(
            user,
            userProfile,
            isOwner,
            isAdmin,
          );
          setCustomers(fetchedCustomers);
        } catch (customerError) {
          console.error("Error loading customers:", customerError);
          setCustomers([]);
        }

        // Load bank accounts safely
        try {
          const companyId = userProfile?.isOwner
            ? user.uid
            : userProfile?.companyId;
          const bankAccountsSnapshot = await db
            .collection("bankAccounts")
            .get();
          const allBankAccounts = bankAccountsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          // Filter for company bank accounts
          const fetchedBankAccounts = allBankAccounts.filter(
            (account: any) => account.userId === (companyId || user.uid),
          );
          setBankAccounts(fetchedBankAccounts);
        } catch (bankError) {
          console.error("Error loading bank accounts:", bankError);
          setBankAccounts([]);
        }
      };

      loadAdditionalData();

      // Cleanup function
      return () => {
        clearTimeout(timeoutId);
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error("Error setting up invoices page:", error);
      setLoading(false);
    }
  }, [user, userProfile, isOwner, isAdmin]);

  const handleDelete = async () => {
    if (!user || !deleteModal.invoiceId) return;
    try {
      await InvoiceService.deleteInvoice(deleteModal.invoiceId);
      setDeleteModal({ isOpen: false, invoiceId: null });
    } catch (error) {
      console.error("Error deleting invoice:", error);
    }
  };

  const openDeleteModal = (invoiceId: string) => {
    setDeleteModal({ isOpen: true, invoiceId });
  };

  const handleStatusChange = async (
    invoiceId: string,
    newStatus: string,
    invoice: Invoice,
  ) => {
    if (!user) return;

    // Optimistic update for better performance
    setInvoices((prevInvoices) =>
      prevInvoices.map((inv) =>
        inv.id === invoiceId ? { ...inv, status: newStatus as any } : inv,
      ),
    );

    try {
      await InvoiceService.updateInvoiceStatus(invoiceId, newStatus, invoice);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      // Revert optimistic update on error
      setInvoices((prevInvoices) =>
        prevInvoices.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: invoice.status } : inv,
        ),
      );
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  const filterInvoices = (invoices: Invoice[]) => {
    const now = new Date();
    let filtered = invoices;
    switch (filterType) {
      case "weekly": {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        filtered = filtered.filter((inv) => {
          const issueDate = inv.issueDate.toDate();
          return issueDate >= weekAgo && issueDate <= now;
        });
        break;
      }
      case "monthly": {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        filtered = filtered.filter((inv) => {
          const issueDate = inv.issueDate.toDate();
          return issueDate >= monthAgo && issueDate <= now;
        });
        break;
      }
      case "yearly": {
        const yearAgo = new Date();
        yearAgo.setFullYear(now.getFullYear() - 1);
        filtered = filtered.filter((inv) => {
          const issueDate = inv.issueDate.toDate();
          return issueDate >= yearAgo && issueDate <= now;
        });
        break;
      }
      case "custom": {
        if (!customDateRange.start || !customDateRange.end) break;
        const startDate = new Date(customDateRange.start);
        const endDate = new Date(customDateRange.end);
        filtered = filtered.filter((inv) => {
          const issueDate = inv.issueDate.toDate();
          return issueDate >= startDate && issueDate <= endDate;
        });
        break;
      }
    }

    if (selectedBankAccount) {
      filtered = filtered.filter(
        (inv) => inv.bankAccountId === selectedBankAccount,
      );
    }
    if (selectedStatus) {
      filtered = filtered.filter((inv) => inv.status === selectedStatus);
    }
    if (selectedCustomer) {
      filtered = filtered.filter(
        (inv) => inv.customerName === selectedCustomer,
      );
    }

    return filtered;
  };

  const filteredInvoices = filterInvoices(invoices);
  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
  const currentInvoices = filteredInvoices.slice(
    (currentPage - 1) * invoicesPerPage,
    currentPage * invoicesPerPage,
  );

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
          Invoices
        </h1>
        {canCreateInvoice() && (
          <Link
            to="/invoices/new"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Create Invoice
          </Link>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-wrap gap-4 items-center">
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[120px]"
        >
          <option value="all">All</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom Range</option>
        </select>
        {filterType === "custom" && (
          <div className="flex space-x-2">
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) => {
                setCustomDateRange({
                  ...customDateRange,
                  start: e.target.value,
                });
                setCurrentPage(1);
              }}
              className="p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[140px]"
            />
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) => {
                setCustomDateRange({
                  ...customDateRange,
                  end: e.target.value,
                });
                setCurrentPage(1);
              }}
              className="p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[140px]"
            />
          </div>
        )}
        <select
          value={selectedBankAccount}
          onChange={(e) => {
            setSelectedBankAccount(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[180px]"
        >
          <option value="">All Bank Accounts</option>
          {bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.accountName} - {b.bankName}
            </option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[140px]"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          value={selectedCustomer}
          onChange={(e) => {
            setSelectedCustomer(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[160px]"
        >
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Number
                </th>
                <th scope="col" className="px-6 py-3">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3">
                  Issue Date
                </th>
                <th scope="col" className="px-6 py-3">
                  Total
                </th>
                {canViewInvoiceStatus() && (
                  <th scope="col" className="px-6 py-3">
                    Status
                  </th>
                )}
                {(isOwner || isAdmin) && (
                  <th scope="col" className="px-6 py-3">
                    Created By
                  </th>
                )}
                <th scope="col" className="px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentInvoices.length > 0 ? (
                currentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4">{invoice.customerName}</td>
                    <td className="px-6 py-4">
                      {invoice.issueDate.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {formatCurrency(
                        invoice.total,
                        invoice.bankAccountCurrency || "USD",
                      )}
                    </td>
                    {canViewInvoiceStatus() && (
                      <td className="px-6 py-4">
                        <select
                          value={invoice.status}
                          onChange={(e) =>
                            handleStatusChange(
                              invoice.id,
                              e.target.value,
                              invoice,
                            )
                          }
                          className={`px-2 py-1 text-xs font-medium rounded border-0 cursor-pointer w-24 text-center ${
                            invoice.status === "paid"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : invoice.status === "sent"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                : invoice.status === "overdue"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option
                            value="paid"
                            disabled={
                              invoice.paymentType === "milestone" ||
                              invoice.paymentType === "upfront"
                            }
                          >
                            {invoice.paymentType === "milestone" ||
                            invoice.paymentType === "upfront"
                              ? "Paid (Auto-tracked)"
                              : "Paid"}
                          </option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </td>
                    )}
                    {(isOwner || isAdmin) && (
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {invoice.createdBy || "Unknown User"}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        {/* PDF Download */}
                        {canViewInvoicePDF() && (
                          <PDFDownloadLink
                            document={
                              <InvoicePDF
                                invoice={invoice}
                                userProfile={userProfile}
                              />
                            }
                            fileName={`invoice-${invoice.invoiceNumber}.pdf`}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                            title="Download PDF"
                          >
                            {({ blob, url, loading, error }) =>
                              loading ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              )
                            }
                          </PDFDownloadLink>
                        )}

                        {/* Payment Tracking Button - Only for milestone/upfront invoices */}
                        {canAccessPaymentTracking() && (invoice.paymentType === "milestone" || invoice.paymentType === "upfront") && (
                          <button
                            onClick={() => {
                              setPaymentModal({ isOpen: true, invoice });
                            }}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-200 dark:hover:bg-green-900/20 rounded-md transition-colors"
                            title="Payment Tracking"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                        )}

                        {/* Edit Button */}
                        {canEditInvoice() && (
                          <button
                            onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
                            className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-200 dark:hover:bg-yellow-900/20 rounded-md transition-colors"
                            title="Edit Invoice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {/* Delete Button */}
                        {canDeleteInvoice() && (
                          <button
                            onClick={() => openDeleteModal(invoice.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-200 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Delete Invoice"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={
                      (isOwner || isAdmin ? 1 : 0) +
                      (canViewInvoiceStatus() ? 1 : 0) +
                      5 // Number, Customer, Issue Date, Total, Actions
                    }
                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                  >
                    No invoices yet.{" "}
                    {canCreateInvoice() && (
                      <Link
                        to="/invoices/new"
                        className="text-primary-600 hover:underline"
                      >
                        Create one!
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          {[...Array(totalPages)].map((_, index) => {
            return (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${
                  currentPage === index + 1 ? "font-bold underline" : ""
                }`}
              >
                {index + 1}
              </button>
            );
          })}
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Payment Tracking Modal */}
      {paymentModal.isOpen && paymentModal.invoice && (
        <PaymentTrackingModal
          invoice={paymentModal.invoice}
          onClose={() => setPaymentModal({ isOpen: false, invoice: null })}
          onPaymentUpdate={() => {
            // Reload invoices to reflect payment changes
            loadInvoices();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Delete Invoice
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Are you sure you want to delete this invoice? This action
                  cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-4 mt-4">
                <button
                  onClick={() =>
                    setDeleteModal({ isOpen: false, invoiceId: null })
                  }
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesListPage;
