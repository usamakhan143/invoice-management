import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../services/firebase";
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
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] =
    useState<Partial<Customer> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const customersPerPage = 20;

  useEffect(() => {
    if (!user) return;
    const unsubscribe = db.collection(`users/${user.uid}/customers`).onSnapshot(
      (snapshot) => {
        const fetchedCustomers = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Customer,
        );
        setCustomers(fetchedCustomers);
        setFilteredCustomers(fetchedCustomers);
        setCurrentPage(1);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [user]);

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
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, customers]);

  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
  const currentCustomers = filteredCustomers.slice(
    (currentPage - 1) * customersPerPage,
    currentPage * customersPerPage,
  );

  const openModal = (customer?: Customer) => {
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
  };

  const handleSave = async () => {
    if (!user || !currentCustomer) return;

    try {
      if ("id" in currentCustomer && currentCustomer.id) {
        await db
          .collection(`users/${user.uid}/customers`)
          .doc(currentCustomer.id)
          .update(currentCustomer);
      } else {
        await db.collection(`users/${user.uid}/customers`).add(currentCustomer);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!user) return;
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await db
          .collection(`users/${user.uid}/customers`)
          .doc(customerId)
          .delete();
      } catch (error) {
        console.error("Error deleting customer:", error);
        alert(
          "Failed to delete customer. They may be linked to existing invoices.",
        );
      }
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Customers
          </h1>
          <button
            onClick={openModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Add Customer
          </button>
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
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
            ? `Found ${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? "s" : ""} matching "${searchTerm}"`
            : `Total ${customers.length} customer${customers.length !== 1 ? "s" : ""}`}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
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
                  <td className="px-6 py-4 flex space-x-2">
                    <button
                      onClick={() => openModal(customer)}
                      className="text-yellow-500 hover:text-yellow-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
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
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {isModalOpen && currentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {"id" in currentCustomer ? "Edit Customer" : "Add Customer"}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={currentCustomer.name}
                onChange={(e) =>
                  setCurrentCustomer({
                    ...currentCustomer,
                    name: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={currentCustomer.email}
                onChange={(e) =>
                  setCurrentCustomer({
                    ...currentCustomer,
                    email: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={currentCustomer.phone}
                onChange={(e) =>
                  setCurrentCustomer({
                    ...currentCustomer,
                    phone: e.target.value,
                  })
                }
                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <textarea
                placeholder="Address"
                value={currentCustomer.address}
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
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
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

export default CustomersPage;
