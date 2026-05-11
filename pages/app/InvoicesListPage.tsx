import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompanyUserOptions } from "../../hooks/useCompanyUserOptions";
import { usePermissions } from "../../hooks/usePermissions";
import { ActivityLogger } from "../../services/activityLogger";
import { InvoiceService } from "../../services/invoiceService";
import { CustomerService } from "../../services/customerService";
import { BankAccountService } from "../../services/bankAccountService";
import type { Invoice } from "../../types";
import Spinner from "../../components/Spinner";
import PDFDownloadWrapper from "../../components/PDFDownloadWrapper";
import PaymentTrackingModal from "../../components/PaymentTrackingModal";
import { formatBankAccountListLabel } from "../../utils/bankAccountDisplay";

const currencySymbols: { [key: string]: string } = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  PKR: "₨",
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
    canBulkDeleteInvoices,
    canViewInvoicePDF,
    canAccessPaymentTracking,
    canViewInvoiceStatus,
    canMarkInvoicePaid,
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
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const invoicesPerPage = 20;
  const navigate = useNavigate();
  const companyUserOptions = useCompanyUserOptions(user, userProfile);
  const allowBulkRowSelect = canBulkDeleteInvoices();
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [bulkDeletingInvoices, setBulkDeletingInvoices] = useState(false);
  const selectAllInvoicesRef = useRef<HTMLInputElement>(null);

  // Check if user has permission to view invoices page
  useEffect(() => {
    if (!user || !userProfile) return;

    if (!canViewInvoices()) {

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

        try {
          const fetchedBankAccounts = await BankAccountService.getBankAccountsForCompany(
            user,
            userProfile,
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

    const touchesPaid =
      newStatus === "paid" || invoice.status === "paid";
    if (touchesPaid && newStatus !== invoice.status && !canMarkInvoicePaid()) {
      window.alert(
        "You do not have permission to mark invoices as Paid or change Paid status. Ask an administrator to grant “Mark invoices as paid”.",
      );
      return;
    }

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

  const filteredInvoices = useMemo(() => {
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
    if (selectedCreatedBy && (isOwner || isAdmin)) {
      filtered = filtered.filter(
        (inv) => (inv.createdById || "") === selectedCreatedBy,
      );
    }

    return filtered;
  }, [
    invoices,
    filterType,
    customDateRange,
    selectedBankAccount,
    selectedStatus,
    selectedCustomer,
    selectedCreatedBy,
    isOwner,
    isAdmin,
  ]);

  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage) || 1;
  const currentInvoices = useMemo(
    () =>
      filteredInvoices.slice(
        (currentPage - 1) * invoicesPerPage,
        currentPage * invoicesPerPage,
      ),
    [filteredInvoices, currentPage, invoicesPerPage],
  );

  const selectedInvoiceSet = useMemo(
    () => new Set(selectedInvoiceIds),
    [selectedInvoiceIds],
  );

  const allInvoicesOnPageSelected =
    allowBulkRowSelect &&
    currentInvoices.length > 0 &&
    currentInvoices.every((inv) => selectedInvoiceSet.has(inv.id));

  const allFilteredInvoicesSelected =
    allowBulkRowSelect &&
    filteredInvoices.length > 0 &&
    filteredInvoices.every((inv) => selectedInvoiceSet.has(inv.id));

  useEffect(() => {
    const el = selectAllInvoicesRef.current;
    if (!el || !allowBulkRowSelect || currentInvoices.length === 0) {
      if (el) el.indeterminate = false;
      return;
    }
    const onPage = currentInvoices.filter((inv) =>
      selectedInvoiceSet.has(inv.id),
    ).length;
    el.indeterminate = onPage > 0 && onPage < currentInvoices.length;
  }, [allowBulkRowSelect, currentInvoices, selectedInvoiceSet]);

  const toggleInvoiceSelected = useCallback((id: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleSelectAllInvoicesOnPage = useCallback(() => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      const everyOnPage =
        currentInvoices.length > 0 &&
        currentInvoices.every((inv) => next.has(inv.id));
      if (everyOnPage) {
        currentInvoices.forEach((inv) => next.delete(inv.id));
      } else {
        currentInvoices.forEach((inv) => next.add(inv.id));
      }
      return Array.from(next);
    });
  }, [currentInvoices]);

  const selectAllFilteredInvoices = useCallback(() => {
    setSelectedInvoiceIds(filteredInvoices.map((inv) => inv.id));
  }, [filteredInvoices]);

  const clearInvoiceSelection = useCallback(() => {
    setSelectedInvoiceIds([]);
  }, []);

  const handleBulkDeleteInvoicesList = useCallback(async () => {
    if (!user || !userProfile || !allowBulkRowSelect || selectedInvoiceIds.length === 0) {
      return;
    }
    const n = selectedInvoiceIds.length;
    if (
      !window.confirm(
        `Delete ${n} invoice${n === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkDeletingInvoices(true);
    try {
      for (const invoiceId of selectedInvoiceIds) {
        const inv = invoices.find((i) => i.id === invoiceId);
        await InvoiceService.deleteInvoice(invoiceId);
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "invoice_deleted",
          `Bulk deleted invoice: ${inv?.invoiceNumber ?? invoiceId}`,
          {
            entityId: invoiceId,
            entityType: "invoice",
            oldValue: inv ? { invoiceNumber: inv.invoiceNumber } : undefined,
          },
        );
      }
      clearInvoiceSelection();
    } catch (error) {
      console.error(error);
      alert("Some invoices could not be deleted.");
    } finally {
      setBulkDeletingInvoices(false);
    }
  }, [
    user,
    userProfile,
    allowBulkRowSelect,
    selectedInvoiceIds,
    invoices,
    clearInvoiceSelection,
  ]);

  if (loading || !userProfile) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 page-header">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          Invoices
        </h1>
        <div className="button-group">
          {canCreateInvoice() && (
            <Link
              to="/invoices/new"
              className="mobile-btn px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 whitespace-nowrap"
            >
              Create Invoice
            </Link>
          )}
        </div>
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
              {formatBankAccountListLabel(b)}
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
        {(isOwner || isAdmin) && (
          <select
            value={selectedCreatedBy}
            onChange={(e) => {
              setSelectedCreatedBy(e.target.value);
              setCurrentPage(1);
            }}
            className="p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[160px]"
            aria-label="Filter by creator"
          >
            <option value="">All creators</option>
            {companyUserOptions.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {allowBulkRowSelect && selectedInvoiceIds.length > 0 ? (
        <div
          className="mb-3 flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/90 p-3 dark:border-primary-800 dark:bg-primary-950/40 sm:flex-row sm:flex-wrap sm:items-end"
          role="region"
          aria-label="Bulk actions for invoices"
        >
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {selectedInvoiceIds.length} invoice
            {selectedInvoiceIds.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkDeletingInvoices}
              onClick={() => void handleBulkDeleteInvoicesList()}
              className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeletingInvoices ? "Deleting…" : "Delete selected"}
            </button>
            <button
              type="button"
              disabled={bulkDeletingInvoices}
              onClick={clearInvoiceSelection}
              className="text-sm px-2 py-1.5 text-gray-600 hover:underline dark:text-gray-300"
            >
              Clear selection
            </button>
          </div>
          {!allFilteredInvoicesSelected &&
          filteredInvoices.length > currentInvoices.length ? (
            <button
              type="button"
              disabled={bulkDeletingInvoices}
              onClick={selectAllFilteredInvoices}
              className="text-sm text-primary-700 hover:underline dark:text-primary-400 sm:ml-auto"
            >
              Select all {filteredInvoices.length} matching invoices
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                {allowBulkRowSelect ? (
                  <th scope="col" className="w-10 px-2 py-3">
                    <span className="sr-only">Select row</span>
                    <input
                      ref={selectAllInvoicesRef}
                      type="checkbox"
                      checked={allInvoicesOnPageSelected}
                      onChange={toggleSelectAllInvoicesOnPage}
                      disabled={currentInvoices.length === 0}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                      aria-label="Select all invoices on this page"
                    />
                  </th>
                ) : null}
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
                    {allowBulkRowSelect ? (
                      <td className="w-10 px-2 py-4 align-top">
                        <input
                          type="checkbox"
                          checked={selectedInvoiceSet.has(invoice.id)}
                          onChange={() => toggleInvoiceSelected(invoice.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                          aria-label={`Select invoice ${invoice.invoiceNumber}`}
                        />
                      </td>
                    ) : null}
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
                        {!canMarkInvoicePaid() &&
                        invoice.status === "paid" ? (
                          <span
                            className="inline-block px-2 py-1 text-xs font-medium rounded w-24 text-center bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            title="Only users with permission can change Paid status"
                          >
                            Paid
                          </span>
                        ) : (
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
                            {canMarkInvoicePaid() && (
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
                            )}
                            <option value="overdue">Overdue</option>
                          </select>
                        )}
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
                          <PDFDownloadWrapper
                            invoiceId={invoice.id}
                            invoiceNumber={invoice.invoiceNumber}
                            userProfile={userProfile}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                            title="Download PDF"
                          />
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
                      (allowBulkRowSelect ? 1 : 0) +
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
            // Force a fresh fetch from the service to get latest data immediately
            const fetchLatestInvoices = async () => {
              try {
                const latestInvoices = await InvoiceService.getInvoices(
                  user,
                  userProfile,
                  isOwner,
                  isAdmin
                );
                setInvoices(latestInvoices);
              } catch (error) {
                console.error("Error fetching latest invoices:", error);
              }
            };
            fetchLatestInvoices();
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
