import React, { useState, useEffect, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../../hooks/useAuth"
import { db, FieldValue, Timestamp } from "../../services/firebase"
import type { Invoice, InvoiceItem, Customer, Product } from "../../types"
import Spinner from "../../components/Spinner"

const InvoiceFormPage: React.FC = () => {
  const { user, userProfile } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [invoiceData, setInvoiceData] = useState<Partial<Invoice>>({
    customerId: "",
    status: "draft",
    items: [],
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days due
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const calculateTotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const fetchInitialData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const customersSnap = await db
        .collection(`users/${user.uid}/customers`)
        .get()
      setCustomers(
        customersSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Customer),
        ),
      )

      const productsSnap = await db
        .collection(`users/${user.uid}/products`)
        .get()
      setProducts(
        productsSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Product),
        ),
      )

      if (id) {
        const invoiceDoc = await db
          .collection(`users/${user.uid}/invoices`)
          .doc(id)
          .get()
        if (invoiceDoc.exists) {
          setInvoiceData(invoiceDoc.data() as Invoice)
        } else {
          setError("Invoice not found.")
        }
      }
    } catch (err) {
      console.error(err)
      setError("Failed to load data.")
    } finally {
      setLoading(false)
    }
  }, [user, id])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: any,
  ) => {
    const newItems = [...(invoiceData.items || [])]
    ;(newItems[index] as any)[field] = value

    if (field === "productId") {
      const product = products.find((p) => p.id === value)
      if (product) {
        newItems[index].name = product.name
        newItems[index].price = product.price
      }
    }

    const total = calculateTotal(newItems)
    setInvoiceData({ ...invoiceData, items: newItems, total })
  }

  const addItem = () => {
    const newItems = [
      ...(invoiceData.items || []),
      { productId: "", name: "", quantity: 1, price: 0 },
    ]
    setInvoiceData({ ...invoiceData, items: newItems })
  }

  const removeItem = (index: number) => {
    const newItems = (invoiceData.items || []).filter((_, i) => i !== index)
    const total = calculateTotal(newItems)
    setInvoiceData({ ...invoiceData, items: newItems, total })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !user ||
      !userProfile ||
      !invoiceData.customerId ||
      !invoiceData.items ||
      invoiceData.items.length === 0
    ) {
      setError("Please fill all required fields and add at least one item.")
      return
    }
    setLoading(true)
    setError("")

    const selectedCustomer = customers.find(
      (c) => c.id === invoiceData.customerId,
    )
    if (!selectedCustomer) {
      setError("Invalid customer selected.")
      setLoading(false)
      return
    }

    const finalInvoiceData = {
      ...invoiceData,
      customerName: selectedCustomer.name,
      total: calculateTotal(invoiceData.items),
    }

    try {
      if (id) {
        // Update existing invoice
        await db
          .collection(`users/${user.uid}/invoices`)
          .doc(id)
          .update(finalInvoiceData)
      } else {
        // Create new invoice
        const userDocRef = db.collection("users").doc(user.uid)

        await db.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userDocRef)
          if (!userDoc.exists) {
            throw "User document does not exist!"
          }
          const newInvoiceCounter = (userDoc.data()?.invoiceCounter || 0) + 1
          const invoiceNumber = `INV-${String(newInvoiceCounter).padStart(
            4,
            "0",
          )}`

          const newInvoiceRef = db
            .collection(`users/${user.uid}/invoices`)
            .doc()
          transaction.set(newInvoiceRef, { ...finalInvoiceData, invoiceNumber })
          transaction.update(userDocRef, { invoiceCounter: newInvoiceCounter })
        })
      }
      navigate("/invoices")
    } catch (err: any) {
      console.error(err)
      setError(`Failed to save invoice: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading)
    return (
      <div className='flex justify-center items-center h-full'>
        <Spinner />
      </div>
    )
  if (error) return <p className='text-red-500'>{error}</p>

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md'
    >
      <h1 className='text-3xl font-bold text-gray-800 dark:text-white'>
        {id ? "Edit Invoice" : "New Invoice"}
      </h1>

      {/* Customer & Dates */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            Customer
          </label>
          <select
            value={invoiceData.customerId}
            onChange={(e) =>
              setInvoiceData({ ...invoiceData, customerId: e.target.value })
            }
            className='mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white'
            required
          >
            <option value=''>Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            Status
          </label>
          <select
            value={invoiceData.status}
            onChange={(e) =>
              setInvoiceData({
                ...invoiceData,
                status: e.target.value as Invoice["status"],
              })
            }
            className='mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white'
          >
            <option value='draft'>Draft</option>
            <option value='sent'>Sent</option>
            <option value='paid'>Paid</option>
            <option value='overdue'>Overdue</option>
          </select>
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            Issue Date
          </label>
          <input
            type='date'
            value={
              invoiceData.issueDate instanceof Date
                ? invoiceData.issueDate.toISOString().split("T")[0]
                : invoiceData.issueDate?.toDate?.().toISOString().split("T")[0]
            }
            onChange={(e) =>
              setInvoiceData({
                ...invoiceData,
                issueDate: new Date(e.target.value),
              })
            }
            className='mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white'
          />
        </div>
        <div>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
            Due Date
          </label>
          <input
            type='date'
            value={
              invoiceData.dueDate instanceof Date
                ? invoiceData.dueDate.toISOString().split("T")[0]
                : invoiceData.dueDate?.toDate?.().toISOString().split("T")[0]
            }
            onChange={(e) =>
              setInvoiceData({
                ...invoiceData,
                dueDate: new Date(e.target.value),
              })
            }
            className='mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white'
          />
        </div>
      </div>

      {/* Items */}
      <div className='space-y-4'>
        <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
          Items
        </h2>
        {invoiceData.items?.map((item, index) => (
          <div
            key={index}
            className='grid grid-cols-12 gap-4 items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md'
          >
            <div className='col-span-12 md:col-span-5'>
              <label className='text-xs text-gray-500'>Product</label>
              <select
                value={item.productId}
                onChange={(e) =>
                  handleItemChange(index, "productId", e.target.value)
                }
                className='mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white'
              >
                <option value=''>Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='col-span-6 md:col-span-2'>
              <label className='text-xs text-gray-500'>Quantity</label>
              <input
                type='number'
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", parseInt(e.target.value))
                }
                className='mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white'
                min='1'
              />
            </div>
            <div className='col-span-6 md:col-span-2'>
              <label className='text-xs text-gray-500'>Price</label>
              <input
                type='number'
                step='0.01'
                value={item.price}
                onChange={(e) =>
                  handleItemChange(index, "price", parseFloat(e.target.value))
                }
                className='mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white'
              />
            </div>
            <div className='col-span-10 md:col-span-2'>
              <label className='text-xs text-gray-500'>Total</label>
              <p className='mt-1 p-2 text-gray-800 dark:text-white font-semibold'>
                ${(item.quantity * item.price).toFixed(2)}
              </p>
            </div>
            <div className='col-span-2 md:col-span-1 flex items-end'>
              <button
                type='button'
                onClick={() => removeItem(index)}
                className='text-red-500 hover:text-red-700 p-2'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-5 w-5'
                  viewBox='0 0 20 20'
                  fill='currentColor'
                >
                  <path
                    fillRule='evenodd'
                    d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z'
                    clipRule='evenodd'
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
        <button
          type='button'
          onClick={addItem}
          className='px-4 py-2 text-sm border border-dashed border-gray-400 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700'
        >
          Add Item
        </button>
      </div>

      {/* Total and Actions */}
      <div className='flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700'>
        <div>
          <span className='text-lg font-medium text-gray-600 dark:text-gray-300'>
            Total:
          </span>
          <span className='ml-2 text-2xl font-bold text-gray-800 dark:text-white'>
            ${calculateTotal(invoiceData.items || []).toFixed(2)}
          </span>
        </div>
        <div className='flex space-x-4'>
          <button
            type='button'
            onClick={() => navigate("/invoices")}
            className='px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={loading}
            className='px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50'
          >
            {loading ? "Saving..." : id ? "Save Changes" : "Create Invoice"}
          </button>
        </div>
      </div>
    </form>
  )
}

export default InvoiceFormPage
