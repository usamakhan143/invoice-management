import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { db } from "../../services/firebase";
import { ActivityLogger } from "../../services/activityLogger";
import { CustomerService } from "../../services/customerService";
import type { Customer } from "../../types";
import Spinner from "../../components/Spinner";

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
    canCreateCustomer,
    canEditCustomer,
    canDeleteCustomer,
    isOwner,
    isAdmin
  } = usePermissions();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] =
    useState<Partial<Customer> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const customersPerPage = 20;

  // Check if user has permission to view customers page
  useEffect(() => {
    if (!user || !userProfile) return;

    if (!canViewCustomers()) {
      navigate("/");
      return;
    }
  }, [user, userProfile, canViewCustomers, navigate]);

  // Set up real-time listener for customers
  useEffect(() => {
    if (!user || !userProfile) return;

    // Only proceed if user has permission to view customers
    if (!canViewCustomers()) return;

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
          setFilteredCustomers(customersData);
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
  }, [user, userProfile, canViewCustomers, isOwner, isAdmin]);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.address.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredCustomers(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, customers]);

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

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
  const currentCustomers = filteredCustomers.slice(
    (currentPage - 1) * customersPerPage,
    currentPage * customersPerPage,
  );

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

        {/* Results info */}
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {searchTerm
            ? `Found ${filteredCustomers.length} customer${
                filteredCustomers.length !== 1 ? "s" : ""
              } matching "${searchTerm}"`
            : `Total ${customers.length} customer${customers.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
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
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
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
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {canEditCustomer() && (
                        <button
                          onClick={() => openModal(customer)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          Edit
                        </button>
                      )}
                      {canDeleteCustomer() && (
                        <button
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
              <input
                type="tel"
                placeholder="Phone"
                value={currentCustomer.phone || ""}
                onChange={(e) =>
                  setCurrentCustomer({
                    ...currentCustomer,
                    phone: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
