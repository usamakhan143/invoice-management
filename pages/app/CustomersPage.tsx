import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCompanyUserOptions } from "../../hooks/useCompanyUserOptions";
import { usePermissions } from "../../hooks/usePermissions";
import { ActivityLogger } from "../../services/activityLogger";
import { CustomerService } from "../../services/customerService";
import type { Customer } from "../../types";
import Spinner from "../../components/Spinner";
import { InternationalPhoneInput } from "../../components/InternationalPhoneInput";

const PaginationControls: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex justify-center items-center space-x-2 mt-4">
      <button
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
      >
        Previous
      </button>
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${
            currentPage === page ? "font-bold underline" : ""
          }`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

const CustomersPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const {
    canViewCustomers,
    canAccessCustomerDetailPage,
    canCreateCustomer,
    canEditCustomer,
    canDeleteCustomer,
    canBulkDeleteCustomers,
    isOwner,
    isAdmin
  } = usePermissions();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCreatedBy, setFilterCreatedBy] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] =
    useState<Partial<Customer> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const customersPerPage = 20;
  const companyUserOptions = useCompanyUserOptions(user, userProfile);
  const allowBulkRowSelect = canBulkDeleteCustomers();
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const selectAllCustomersRef = useRef<HTMLInputElement>(null);

  const mayViewCustomers = canViewCustomers();
  const mayOpenCustomerDetail = canAccessCustomerDetailPage();

  // Check if user has permission to view customers page
  useEffect(() => {
    if (!user || !userProfile) return;

    if (!mayViewCustomers) {
      navigate("/");
      return;
    }
  }, [user, userProfile, mayViewCustomers, navigate]);

  // Set up real-time listener for customers
  useEffect(() => {
    if (!user || !userProfile) return;

    // Only proceed if user has permission to view customers
    if (!mayViewCustomers) return;

    let unsubscribe: () => void;

    try {
      // Set up real-time listener using CustomerService
      unsubscribe = CustomerService.getCustomersRealTime(
        user,
        userProfile,
        isOwner,
        isAdmin,
        (customersData) => {
          setCustomers(customersData);
          setLoading(false);
        },
      );
    } catch (error) {
      console.error("Error setting up customers real-time listener:", error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, userProfile, mayViewCustomers, isOwner, isAdmin]);

  const filteredCustomers = useMemo(() => {
    let list = customers;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (customer) =>
          customer.name.toLowerCase().includes(q) ||
          customer.email.toLowerCase().includes(q) ||
          customer.phone.toLowerCase().includes(q) ||
          customer.address.toLowerCase().includes(q),
      );
    }
    if (filterCreatedBy && (isOwner || isAdmin)) {
      list = list.filter((c) => (c.createdById || "") === filterCreatedBy);
    }
    return list;
  }, [customers, searchTerm, filterCreatedBy, isOwner, isAdmin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCreatedBy]);

  const selectedCustomerSet = useMemo(
    () => new Set(selectedCustomerIds),
    [selectedCustomerIds],
  );

  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
  const currentCustomers = filteredCustomers.slice(
    (currentPage - 1) * customersPerPage,
    currentPage * customersPerPage,
  );

  const allCustomersOnPageSelected =
    allowBulkRowSelect &&
    currentCustomers.length > 0 &&
    currentCustomers.every((c) => selectedCustomerSet.has(c.id));

  const allFilteredCustomerIdsSelected =
    allowBulkRowSelect &&
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedCustomerSet.has(c.id));

  useEffect(() => {
    const el = selectAllCustomersRef.current;
    if (!el || !allowBulkRowSelect || currentCustomers.length === 0) {
      if (el) el.indeterminate = false;
      return;
    }
    const onPage = currentCustomers.filter((c) =>
      selectedCustomerSet.has(c.id),
    ).length;
    el.indeterminate = onPage > 0 && onPage < currentCustomers.length;
  }, [allowBulkRowSelect, currentCustomers, selectedCustomerSet]);

  const toggleCustomerSelected = useCallback((id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleSelectAllCustomersOnPage = useCallback(() => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      const everyOnPage =
        currentCustomers.length > 0 &&
        currentCustomers.every((c) => next.has(c.id));
      if (everyOnPage) {
        currentCustomers.forEach((c) => next.delete(c.id));
      } else {
        currentCustomers.forEach((c) => next.add(c.id));
      }
      return Array.from(next);
    });
  }, [currentCustomers]);

  const selectAllFilteredCustomers = useCallback(() => {
    setSelectedCustomerIds(filteredCustomers.map((c) => c.id));
  }, [filteredCustomers]);

  const clearCustomerSelection = useCallback(() => {
    setSelectedCustomerIds([]);
  }, []);

  const handleBulkDeleteCustomers = async () => {
    if (!user || !userProfile || !allowBulkRowSelect || selectedCustomerIds.length === 0) {
      return;
    }
    const n = selectedCustomerIds.length;
    if (
      !window.confirm(
        `Delete ${n} customer${n === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    try {
      for (const customerId of selectedCustomerIds) {
        const customerToDelete = customers.find((c) => c.id === customerId);
        await CustomerService.deleteCustomer(customerId);
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "customer_deleted",
          `Bulk deleted customer: ${customerToDelete?.name || "Unknown"}`,
          {
            entityId: customerId,
            entityType: "customer",
            oldValue: customerToDelete,
          },
        );
      }
      clearCustomerSelection();
    } catch (error) {
      console.error("Bulk delete customers:", error);
      alert(
        "Some customers could not be deleted. They may be linked to invoices.",
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !userProfile || !currentCustomer || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const isUpdate = "id" in currentCustomer && currentCustomer.id;

      // Validate required fields
      if (!currentCustomer.name?.trim()) {
        alert("Name is required");
        return;
      }
      if (!currentCustomer.email?.trim()) {
        alert("Email is required");
        return;
      }

      // Prepare customer data
      const customerData = {
        name: currentCustomer.name.trim(),
        email: currentCustomer.email.trim(),
        phone: currentCustomer.phone?.trim() || "",
        address: currentCustomer.address?.trim() || "",
      };

      // Use CustomerService to save (handles creator tracking automatically)
      const customerId = await CustomerService.saveCustomer(
        customerData,
        user,
        userProfile,
        isUpdate ? currentCustomer.id : undefined,
      );

      // Log activity
      await ActivityLogger.logActivity(
        user,
        userProfile,
        isUpdate ? "customer_updated" : "customer_created",
        `${isUpdate ? "Updated" : "Created new"} customer: ${customerData.name}`,
        {
          entityId: customerId,
          entityType: "customer",
          newValue: customerData,
        },
      );

      closeModal();
      // Data will auto-refresh due to real-time listener
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("Failed to save customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!user || !userProfile) return;

    // Check permission before allowing delete
    if (!canDeleteCustomer()) {
      return;
    }

    const customerToDelete = customers.find((c) => c.id === customerId);

    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        // Use CustomerService to delete
        await CustomerService.deleteCustomer(customerId);

        // Log delete activity
        await ActivityLogger.logActivity(
          user,
          userProfile,
          "customer_deleted",
          `Deleted customer: ${customerToDelete?.name || "Unknown"}`,
          {
            entityId: customerId,
            entityType: "customer",
            oldValue: customerToDelete,
          },
        );

        // Data will auto-refresh due to real-time listener
      } catch (error) {
        console.error("Error deleting customer:", error);
        alert(
          "Failed to delete customer. They may be linked to existing invoices.",
        );
      }
    }
  };

  const openModal = (customer?: Customer) => {
    // Check permissions before opening modal
    if (customer && !canEditCustomer()) {
      return;
    }
    if (!customer && !canCreateCustomer()) {
      return;
    }

    if (customer) {
      setCurrentCustomer(customer);
    } else {
      setCurrentCustomer({ name: "", email: "", phone: "", address: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentCustomer(null);
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="page-header mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            Customers
          </h1>
          <div className="button-group">
            {canCreateCustomer() && (
              <button
                onClick={() => openModal()}
                className="mobile-btn px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 whitespace-nowrap"
              >
                Add Customer
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search customers by name, email, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {(isOwner || isAdmin) && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <label htmlFor="customers-filter-created-by" className="sr-only">
              Filter by creator
            </label>
            <select
              id="customers-filter-created-by"
              value={filterCreatedBy}
              onChange={(e) => setFilterCreatedBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[11rem]"
              aria-label="Filter by creator"
            >
              <option value="">All creators</option>
              {companyUserOptions.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.label}
                </option>
              ))}
            </select>
            {filterCreatedBy && (
              <button
                type="button"
                onClick={() => setFilterCreatedBy("")}
                className="text-sm text-primary-600 hover:underline dark:text-primary-400"
              >
                Clear creator filter
              </button>
            )}
          </div>
        )}

        {/* Results info */}
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {searchTerm || filterCreatedBy
            ? `Showing ${filteredCustomers.length} of ${customers.length} customer${
                filteredCustomers.length !== 1 ? "s" : ""
              }${searchTerm ? ` matching "${searchTerm}"` : ""}`
            : `Total ${customers.length} customer${customers.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {allowBulkRowSelect && selectedCustomerIds.length > 0 ? (
        <div
          className="mb-3 flex flex-col gap-3 rounded-lg border border-primary-200 bg-primary-50/90 p-3 dark:border-primary-800 dark:bg-primary-950/40 sm:flex-row sm:flex-wrap sm:items-end"
          role="region"
          aria-label="Bulk actions for customers"
        >
          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {selectedCustomerIds.length} customer
            {selectedCustomerIds.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={() => void handleBulkDeleteCustomers()}
              className="text-sm px-3 py-1.5 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeleting ? "Deleting…" : "Delete selected"}
            </button>
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={clearCustomerSelection}
              className="text-sm px-2 py-1.5 text-gray-600 hover:underline dark:text-gray-300"
            >
              Clear selection
            </button>
          </div>
          {!allFilteredCustomerIdsSelected &&
          filteredCustomers.length > currentCustomers.length ? (
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={selectAllFilteredCustomers}
              className="text-sm text-primary-700 hover:underline dark:text-primary-400 sm:ml-auto"
            >
              Select all {filteredCustomers.length} matching customers
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
                      ref={selectAllCustomersRef}
                      type="checkbox"
                      checked={allCustomersOnPageSelected}
                      onChange={toggleSelectAllCustomersOnPage}
                      disabled={currentCustomers.length === 0}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                      aria-label="Select all customers on this page"
                    />
                  </th>
                ) : null}
                <th scope="col" className="px-6 py-3">
                  Name
                </th>
                <th scope="col" className="px-6 py-3">
                  Email
                </th>
                <th scope="col" className="px-6 py-3">
                  Phone
                </th>
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
              {currentCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => {
                    if (mayOpenCustomerDetail) {
                      navigate(`/customers/${customer.id}`);
                    }
                  }}
                  className={
                    "bg-white border-b dark:bg-gray-800 dark:border-gray-700 " +
                    (mayOpenCustomerDetail
                      ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
                      : "")
                  }
                >
                  {allowBulkRowSelect ? (
                    <td
                      className="w-10 px-2 py-4 align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustomerSet.has(customer.id)}
                        onChange={() => toggleCustomerSelected(customer.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                        aria-label={`Select customer ${customer.name}`}
                      />
                    </td>
                  ) : null}
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4">{customer.email}</td>
                  <td className="px-6 py-4">{customer.phone}</td>
                  {(isOwner || isAdmin) && (
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 dark:text-white">
                          {customer.createdBy || "Unknown User"}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {customer.createdAt
                            ? customer.createdAt.toDate
                              ? customer.createdAt.toDate().toLocaleDateString()
                              : new Date(customer.createdAt as any).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex space-x-2">
                      {canEditCustomer() && (
                        <button
                          type="button"
                          onClick={() => openModal(customer)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          Edit
                        </button>
                      )}
                      {canDeleteCustomer() && (
                        <button
                          type="button"
                          onClick={() => handleDelete(customer.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Modal */}
      {isModalOpen && currentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {"id" in currentCustomer ? "Edit Customer" : "Add Customer"}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name *"
                value={currentCustomer.name || ""}
                onChange={(e) =>
                  setCurrentCustomer({
                    ...currentCustomer,
                    name: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <input
                type="email"
                placeholder="Email *"
                value={currentCustomer.email || ""}
                onChange={(e) =>
                  setCurrentCustomer({
                    ...currentCustomer,
                    email: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <InternationalPhoneInput
                placeholder="Phone (start with + and country code for spacing)"
                value={currentCustomer.phone || ""}
                onChange={(v) =>
                  setCurrentCustomer((c) => ({
                    ...c,
                    phone: v,
                  }))
                }
              />
              <textarea
                placeholder="Address (optional)"
                value={currentCustomer.address || ""}
                onChange={(e) =>
                  setCurrentCustomer({
                    ...currentCustomer,
                    address: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !currentCustomer?.name?.trim() || !currentCustomer?.email?.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
