import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../services/firebase";
import type { Invoice } from "../../types";
import Spinner from "../../components/Spinner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import InvoicePDF from "../../components/InvoicePDF";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );

const InvoicesListPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    invoiceId: string | null;
  }>({ isOpen: false, invoiceId: null });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = db
      .collection(`users/${user.uid}/invoices`)
      .orderBy("issueDate", "desc")
      .onSnapshot(
        (snapshot) => {
          const fetchedInvoices = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Invoice,
          );
          setInvoices(fetchedInvoices);
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
        },
      );
    return () => unsubscribe();
  }, [user]);

  const handleDelete = async () => {
    if (!user || !deleteModal.invoiceId) return;
    try {
      await db
        .collection(`users/${user.uid}/invoices`)
        .doc(deleteModal.invoiceId)
        .delete();
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

    try {
      const invoiceRef = db
        .collection(`users/${user.uid}/invoices`)
        .doc(invoiceId);

      // If marking as paid and has bank account, update the balance
      if (
        newStatus === "paid" &&
        invoice.status !== "paid" &&
        invoice.bankAccountId
      ) {
        await db.runTransaction(async (transaction) => {
          // READS FIRST: Get bank account data
          const bankAccountRef = db
            .collection("bankAccounts")
            .doc(invoice.bankAccountId);
          const bankAccountDoc = await transaction.get(bankAccountRef);

          // WRITES SECOND: Update invoice status
          transaction.update(invoiceRef, { status: newStatus });

          // Update bank account balance
          if (bankAccountDoc.exists) {
            const currentBalance =
              bankAccountDoc.data()?.currentBalance ||
              bankAccountDoc.data()?.initialBalance ||
              0;
            transaction.update(bankAccountRef, {
              currentBalance: currentBalance + invoice.total,
            });
          }
        });
      } else {
        // Just update the status
        await invoiceRef.update({ status: newStatus });
      }
    } catch (error) {
      console.error("Error updating invoice status:", error);
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Invoices
        </h1>
        <Link
          to="/invoices/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Create Invoice
        </Link>
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
                <th scope="col" className="px-6 py-3">
                  Status
                </th>
                <th scope="col" className="px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
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
                      {formatCurrency(invoice.total)}
                    </td>
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
                        className={`px-2 py-1 text-xs font-medium rounded border-0 cursor-pointer ${
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
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 flex items-center space-x-2">
                      <PDFDownloadLink
                        document={
                          <InvoicePDF
                            invoice={invoice}
                            userProfile={userProfile}
                          />
                        }
                        fileName={`invoice-${invoice.invoiceNumber}.pdf`}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                      >
                        {({ blob, url, loading, error }) =>
                          loading ? "..." : "PDF"
                        }
                      </PDFDownloadLink>
                      <button
                        onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
                        className="text-yellow-500 hover:text-yellow-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(invoice.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-10 text-gray-500 dark:text-gray-400"
                  >
                    No invoices yet.{" "}
                    <Link
                      to="/invoices/new"
                      className="text-primary-600 hover:underline"
                    >
                      Create one!
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Delete Invoice
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this invoice? This action cannot
              be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, invoiceId: null })
                }
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
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
      )}
    </div>
  );
};

export default InvoicesListPage;
