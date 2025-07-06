import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import DashboardCard from "../../components/DashboardCard"
import { CustomerIcon, InvoiceIcon, RevenueIcon } from "../../constants"
import { useAuth } from "../../hooks/useAuth"
import { db } from "../../services/firebase"
import type { Invoice, Customer, BankAccount } from "../../types"
import Spinner from "../../components/Spinner"

const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        setLoading(true)

        // Load invoices
        const invoicesSnapshot = await db
          .collection(`users/${user.uid}/invoices`)
          .get()
        const invoicesData = invoicesSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Invoice),
        )
        setInvoices(invoicesData)

        // Load customers
        const customersSnapshot = await db
          .collection(`users/${user.uid}/customers`)
          .get()
        const customersData = customersSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Customer),
        )
        setCustomers(customersData)

        // Load bank accounts
        const bankAccountsSnapshot = await db
          .collection("bankAccounts")
          .where("userId", "==", user.uid)
          .get()
        const bankAccountsData = bankAccountsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as BankAccount),
        )
        setBankAccounts(bankAccountsData)

        setLoading(false)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  const currencySymbols: Record<string, string> = {
    USD: "$",
    PKR: "Rs",
    EUR: "€",
    GBP: "£",
    // Add more currency codes and symbols as needed
  }

  const formatCurrency = (amount: number, currency: string = "USD") => {
    const symbol = currencySymbols[currency] || currency
    const formattedAmount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
    return symbol + formattedAmount
  }

  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0)

  const outstandingRevenue = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.total, 0)

  if (loading) {
    return (
      <div className='flex justify-center items-center h-full'>
        <Spinner />
      </div>
    )
  }

  const bankBalances = bankAccounts.map((account) => {
    const paidInvoicesTotal = invoices
      .filter(
        (inv) => inv.status === "paid" && inv.bankAccountId === account.id,
      )
      .reduce((sum, inv) => sum + inv.total, 0)
    const currentBalance = (account.initialBalance || 0) + paidInvoicesTotal
    return {
      ...account,
      currentBalance,
    }
  })

  return (
    <div className='p-6'>
      <h1 className='text-3xl font-bold text-gray-800 dark:text-white mb-6'>
        Dashboard
      </h1>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6'>
        <DashboardCard
          title='Total Revenue (Paid)'
          value={formatCurrency(totalRevenue)}
          icon={<RevenueIcon />}
          color='bg-green-500'
        />
        <DashboardCard
          title='Outstanding Revenue'
          value={formatCurrency(outstandingRevenue)}
          icon={<InvoiceIcon />}
          color='bg-yellow-500'
        />
        <DashboardCard
          title='Total Customers'
          value={customers.length.toString()}
          icon={<CustomerIcon />}
          color='bg-blue-500'
        />
      </div>

      {/* Bank Accounts Overview */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6'>
        <h2 className='text-xl font-semibold text-gray-700 dark:text-white mb-4'>
          Bank Accounts
        </h2>
        {bankBalances.length === 0 ? (
          <div className='text-center py-4'>
            <p className='text-gray-600 dark:text-gray-300 mb-4'>
              No bank accounts found.
            </p>
            <Link
              to='/bank-accounts'
              className='inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
            >
              Add Bank Account
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {bankBalances.map((account) => (
              <div
                key={account.id}
                className='border border-gray-200 dark:border-gray-600 rounded-lg p-4'
              >
                <h3 className='font-semibold text-gray-800 dark:text-white'>
                  {account.accountName}
                </h3>
                <p className='text-sm text-gray-600 dark:text-gray-300'>
                  {account.bankName}
                </p>
                <p className='text-sm text-gray-600 dark:text-gray-300'>
                  {account.currency}
                </p>
                <p className='text-lg font-bold text-green-600 mt-2'>
                  {formatCurrency(
                    account.currentBalance || 0,
                    account.currency,
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Invoices */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-xl font-semibold text-gray-700 dark:text-white'>
            Recent Invoices
          </h2>
          <Link
            to='/invoices'
            className='text-sm text-blue-600 dark:text-blue-400 hover:underline'
          >
            View All
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className='text-center py-8'>
            <p className='text-gray-600 dark:text-gray-300 mb-4'>
              No invoices found.
            </p>
            <Link
              to='/invoices/new'
              className='inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'
            >
              Create First Invoice
            </Link>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm text-left text-gray-500 dark:text-gray-400'>
              <thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400'>
                <tr>
                  <th scope='col' className='px-6 py-3'>
                    Invoice #
                  </th>
                  <th scope='col' className='px-6 py-3'>
                    Customer
                  </th>
                  <th scope='col' className='px-6 py-3'>
                    Amount
                  </th>
                  <th scope='col' className='px-6 py-3'>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 5).map((invoice) => (
                  <tr
                    key={invoice.id}
                    className='bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  >
                    <td className='px-6 py-4 font-medium text-gray-900 dark:text-white'>
                      {invoice.invoiceNumber}
                    </td>
                    <td className='px-6 py-4'>{invoice.customerName}</td>
                    <td className='px-6 py-4'>
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className='px-6 py-4'>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
