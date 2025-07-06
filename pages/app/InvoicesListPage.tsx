import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { db } from "../../services/firebase"
import type { Invoice } from "../../types"
import Spinner from "../../components/Spinner"
import { PDFDownloadLink } from "@react-pdf/renderer"
import InvoicePDF from "../../components/InvoicePDF"

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
}

const formatCurrency = (amount: number, currencyCode: string = "USD") => {
  const symbol = currencySymbols[currencyCode] || currencyCode
  return `${symbol}${amount.toFixed(2)}`
}

const InvoicesListPage: React.FC = () => {
  const { user, userProfile } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    invoiceId: string | null
  }>({ isOpen: false, invoiceId: null })
  const [filterType, setFilterType] = useState<string>("all")
  const [customDateRange, setCustomDateRange] = useState<{
    start: string
    end: string
  }>({ start: "", end: "" })
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    const unsubscribe = db
      .collection(`users/${user.uid}/invoices`)
      .orderBy("issueDate", "desc")
      .onSnapshot(
        (snapshot) => {
          const fetchedInvoices = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Invoice),
          )
          setInvoices(fetchedInvoices)
          setLoading(false)
        },
        (err) => {
          console.error(err)
          setLoading(false)
        },
      )
    // Fetch customers
    db.collection(`users/${user.uid}/customers`)
      .get()
      .then((snapshot) => {
        const fetchedCustomers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setCustomers(fetchedCustomers)
      })
      .catch((err) => console.error(err))
    // Fetch bank accounts
    db.collection("bankAccounts")
      .where("userId", "==", user.uid)
      .get()
      .then((snapshot) => {
        const fetchedBankAccounts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setBankAccounts(fetchedBankAccounts)
      })
      .catch((err) => console.error(err))
    return () => unsubscribe()
  }, [user])

  const handleDelete = async () => {
    if (!user || !deleteModal.invoiceId) return
    try {
      await db
        .collection(`users/${user.uid}/invoices`)
        .doc(deleteModal.invoiceId)
        .delete()
      setDeleteModal({ isOpen: false, invoiceId: null })
    } catch (error) {
      console.error("Error deleting invoice:", error)
    }
  }

  const openDeleteModal = (invoiceId: string) => {
    setDeleteModal({ isOpen: true, invoiceId })
  }

  const handleStatusChange = async (
    invoiceId: string,
    newStatus: string,
    invoice: Invoice,
  ) => {
    if (!user) return

    try {
      const invoiceRef = db
        .collection(`users/${user.uid}/invoices`)
        .doc(invoiceId)

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
            .doc(invoice.bankAccountId)
          const bankAccountDoc = await transaction.get(bankAccountRef)

          // WRITES SECOND: Update invoice status
          transaction.update(invoiceRef, { status: newStatus })

          // Update bank account balance
          if (bankAccountDoc.exists) {
            const currentBalance =
              bankAccountDoc.data()?.currentBalance ||
              bankAccountDoc.data()?.initialBalance ||
              0
            transaction.update(bankAccountRef, {
              currentBalance: currentBalance + invoice.total,
            })
          }
        })
      } else {
        // Just update the status
        await invoiceRef.update({ status: newStatus })
      }
    } catch (error) {
      console.error("Error updating invoice status:", error)
    }
  }

  if (loading || !userProfile) {
    return (
      <div className='flex justify-center items-center h-full'>
        <Spinner />
      </div>
    )
  }

  const filterInvoices = (invoices: Invoice[]) => {
    const now = new Date()
    let filtered = invoices
    switch (filterType) {
      case "weekly": {
        const weekAgo = new Date()
        weekAgo.setDate(now.getDate() - 7)
        filtered = filtered.filter((inv) => {
          const issueDate = inv.issueDate.toDate()
          return issueDate >= weekAgo && issueDate <= now
        })
        break
      }
      case "monthly": {
        const monthAgo = new Date()
        monthAgo.setMonth(now.getMonth() - 1)
        filtered = filtered.filter((inv) => {
          const issueDate = inv.issueDate.toDate()
          return issueDate >= monthAgo && issueDate <= now
        })
        break
      }
      case "yearly": {
        const yearAgo = new Date()
        yearAgo.setFullYear(now.getFullYear() - 1)
        filtered = filtered.filter((inv) => {
          const issueDate = inv.issueDate.toDate()
          return issueDate >= yearAgo && issueDate <= now
        })
        break
      }
      case "custom": {
        if (!customDateRange.start || !customDateRange.end) break
        const startDate = new Date(customDateRange.start)
        const endDate = new Date(customDateRange.end)
        filtered = filtered.filter((inv) => {
          const issueDate = inv.issueDate.toDate()
          return issueDate >= startDate && issueDate <= endDate
        })
        break
      }
    }

    if (selectedBankAccount) {
      filtered = filtered.filter(
        (inv) => inv.bankAccountId === selectedBankAccount,
      )
    }
    if (selectedStatus) {
      filtered = filtered.filter((inv) => inv.status === selectedStatus)
    }
    if (selectedCustomer) {
      filtered = filtered.filter((inv) => inv.customerName === selectedCustomer)
    }

    return filtered
  }

  const filteredInvoices = filterInvoices(invoices)

  return (
    <div>
      <div className='mb-6 flex justify-between items-center'>
        <h1 className='text-3xl font-bold text-gray-800 dark:text-white mb-4'>
          Invoices
        </h1>
        <Link
          to='/invoices/new'
          className='px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700'
        >
          Create Invoice
        </Link>
      </div>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex flex-wrap gap-4 items-center'>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className='p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[120px]'
        >
          <option value='all'>All</option>
          <option value='weekly'>Weekly</option>
          <option value='monthly'>Monthly</option>
          <option value='yearly'>Yearly</option>
          <option value='custom'>Custom Range</option>
        </select>
        {filterType === "custom" && (
          <div className='flex space-x-2'>
            <input
              type='date'
              value={customDateRange.start}
              onChange={(e) =>
                setCustomDateRange({
                  ...customDateRange,
                  start: e.target.value,
                })
              }
              className='p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[140px]'
            />
            <input
              type='date'
              value={customDateRange.end}
              onChange={(e) =>
                setCustomDateRange({
                  ...customDateRange,
                  end: e.target.value,
                })
              }
              className='p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[140px]'
            />
          </div>
        )}
        <select
          value={selectedBankAccount}
          onChange={(e) => setSelectedBankAccount(e.target.value)}
          className='p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[180px]'
        >
          <option value=''>All Bank Accounts</option>
          {bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.accountName} - {b.bankName}
            </option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className='p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[140px]'
        >
          <option value=''>All Statuses</option>
          <option value='draft'>Draft</option>
          <option value='sent'>Sent</option>
          <option value='paid'>Paid</option>
          <option value='overdue'>Overdue</option>
        </select>
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          className='p-2 border rounded-md dark:bg-gray-700 dark:text-white min-w-[160px]'
        >
          <option value=''>All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm text-left text-gray-500 dark:text-gray-400'>
            <thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400'>
              <tr>
                <th scope='col' className='px-6 py-3'>
                  Number
                </th>
                <th scope='col' className='px-6 py-3'>
                  Customer
                </th>
                <th scope='col' className='px-6 py-3'>
                  Issue Date
                </th>
                <th scope='col' className='px-6 py-3'>
                  Total
                </th>
                <th scope='col' className='px-6 py-3'>
                  Status
                </th>
                <th scope='col' className='px-6 py-3'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className='bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  >
                    <td className='px-6 py-4 font-medium text-gray-900 dark:text-white'>
                      {invoice.invoiceNumber}
                    </td>
                    <td className='px-6 py-4'>{invoice.customerName}</td>
                    <td className='px-6 py-4'>
                      {invoice.issueDate.toDate().toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4'>
                      {formatCurrency(
                        invoice.total,
                        invoice.bankAccountCurrency || "USD",
                      )}
                    </td>
                    <td className='px-6 py-4'>
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
                        <option value='draft'>Draft</option>
                        <option value='sent'>Sent</option>
                        <option value='paid'>Paid</option>
                        <option value='overdue'>Overdue</option>
                      </select>
                    </td>
                    <td className='px-6 py-4 flex items-center space-x-2'>
                      <PDFDownloadLink
                        document={
                          <InvoicePDF
                            invoice={invoice}
                            userProfile={userProfile}
                          />
                        }
                        fileName={`invoice-${invoice.invoiceNumber}.pdf`}
                        className='text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200'
                      >
                        {({ blob, url, loading, error }) =>
                          loading ? "..." : "PDF"
                        }
                      </PDFDownloadLink>
                      <button
                        onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
                        className='text-yellow-500 hover:text-yellow-700'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(invoice.id)}
                        className='text-red-500 hover:text-red-700'
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
                    className='text-center py-10 text-gray-500 dark:text-gray-400'
                  >
                    No invoices yet.{" "}
                    <Link
                      to='/invoices/new'
                      className='text-primary-600 hover:underline'
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
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md'>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
              Delete Invoice
            </h3>
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
              Are you sure you want to delete this invoice? This action cannot
              be undone.
            </p>
            <div className='mt-6 flex justify-end space-x-3'>
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, invoiceId: null })
                }
                className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className='px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoicesListPage
