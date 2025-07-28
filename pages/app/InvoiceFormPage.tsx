import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePermissions } from "../../hooks/usePermissions";
import { db, FieldValue, Timestamp } from "../../services/firebase";
import { InvoiceService } from "../../services/invoiceService";
import { CustomerService } from "../../services/customerService";
import type {
  Invoice,
  InvoiceItem,
  Customer,
  Product,
  BankAccount,
  PaymentType,
  PaymentRecord,
} from "../../types";
import Spinner from "../../components/Spinner";

const InvoiceFormPage: React.FC = () => {
  const { user, userProfile } = useAuth();
  const { canCreateInvoice, canEditInvoice } = usePermissions();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Check permissions for create/edit access
  useEffect(() => {
    if (!user || !userProfile) return;

    // Check if user has permission to access this form
    const isEditMode = !!id;
    if (isEditMode && !canEditInvoice()) {
      console.log("User doesn't have permission to edit invoices, redirecting to dashboard");
      navigate("/");
      return;
    }
    if (!isEditMode && !canCreateInvoice()) {
      console.log("User doesn't have permission to create invoices, redirecting to dashboard");
      navigate("/");
      return;
    }
  }, [user, userProfile, id, canCreateInvoice, canEditInvoice, navigate]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [invoiceData, setInvoiceData] = useState<Partial<Invoice>>({
    customerId: "",
    status: "draft",
    items: [],
    issueDate: Timestamp.now(),
    dueDate: Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ), // Default 30 days due
    bankAccountId: "",
    paymentType: "full",
    totalAmountDue: 0,
    amountPaid: 0,
    remainingAmount: 0,
    payments: [],
  });

  // Currency symbols are now managed through bank accounts

  const [bankAccountCurrency, setBankAccountCurrency] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    description: "",
    date: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
  });
  const [paymentError, setPaymentError] = useState("");

  const calculateTotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const fetchInitialData = useCallback(async () => {
    if (!user || !userProfile) return;
    setLoading(true);
    try {
      // Determine company ID for accessing company-wide data
      const companyId = userProfile.isOwner ? user.uid : userProfile.companyId;

      // Load customers using centralized service
      const customersData = await CustomerService.getCustomers(
        user,
        userProfile,
        userProfile?.isOwner || false,
        userProfile?.role === "admin" || false,
      );
      setCustomers(customersData);

      // Load products: user's own + company products if authorized
      let productsData: Product[] = [];

      // User's own products
      const userProductsSnap = await db
        .collection(`users/${user.uid}/products`)
        .get();
      productsData = userProductsSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Product,
      );

      // Company products (if user has access and it's different from user)
      if (companyId && companyId !== user.uid) {
        const companyProductsSnap = await db
          .collection(`users/${companyId}/products`)
          .get();
        const companyProducts = companyProductsSnap.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              _isCompanyProduct: true,
            }) as Product,
        );
        productsData = [...productsData, ...companyProducts];
      }

      setProducts(productsData);

      // Load bank accounts: company bank accounts for authorized users
      let bankAccountsData: BankAccount[] = [];
      if (companyId) {
        const bankAccountsSnap = await db
          .collection("bankAccounts")
          .where("userId", "==", companyId)
          .get();
        bankAccountsData = bankAccountsSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as BankAccount,
        );
      }
      setBankAccounts(bankAccountsData);

      if (id) {
        // Load from centralized collection
        const invoiceDoc = await db.collection("invoices").doc(id).get();
        if (invoiceDoc.exists) {
          const data = invoiceDoc.data() as Invoice;
          // Ensure backward compatibility for existing invoices
          if (!data.paymentType) {
            data.paymentType = "full";
            data.totalAmountDue = data.total;
            data.amountPaid = data.status === "paid" ? data.total : 0;
            data.remainingAmount = data.status === "paid" ? 0 : data.total;
            data.payments = [];
          }
          setInvoiceData(data);
        } else {
          setError("Invoice not found.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (invoiceData.bankAccountId) {
      const selectedBankAccount = bankAccounts.find(
        (b) => b.id === invoiceData.bankAccountId,
      );
      setBankAccountCurrency(selectedBankAccount?.currencySymbol || "$");
    } else {
      setBankAccountCurrency("");
    }
  }, [invoiceData.bankAccountId, bankAccounts]);

  // Update payment calculations when total, payment type, or upfront payment changes
  useEffect(() => {
    const total = calculateTotal(invoiceData.items || []);
    let amountPaid = invoiceData.amountPaid || 0;

    // Add upfront amount to paid amount if upfront payment is marked as received
    if (invoiceData.paymentType === "upfront" && invoiceData.upfrontPaid && invoiceData.upfrontAmount) {
      // Check if upfront payment is already included in the payments array
      const hasUpfrontPayment = invoiceData.payments?.some(p => p.description?.includes("Upfront payment"));
      if (!hasUpfrontPayment) {
        amountPaid += invoiceData.upfrontAmount;
      }
    }

    const remaining = total - amountPaid;

    setInvoiceData((prev) => ({
      ...prev,
      total,
      totalAmountDue: total,
      amountPaid,
      remainingAmount: Math.max(0, remaining),
    }));
  }, [invoiceData.items, invoiceData.amountPaid, invoiceData.paymentType, invoiceData.upfrontPaid, invoiceData.upfrontAmount, invoiceData.payments]);

  // Handle upfront payment checkbox - automatically add/remove upfront payment record
  useEffect(() => {
    if (invoiceData.paymentType === "upfront" && invoiceData.upfrontAmount) {
      const hasUpfrontPayment = invoiceData.payments?.some(p => p.id === "upfront_payment");

      if (invoiceData.upfrontPaid && !hasUpfrontPayment) {
        // Add upfront payment record
        const upfrontPayment: PaymentRecord = {
          id: "upfront_payment",
          amount: invoiceData.upfrontAmount,
          date: Timestamp.now(),
          description: "Upfront payment received",
        };

        const updatedPayments = [...(invoiceData.payments || []), upfrontPayment];
        const newAmountPaid = (invoiceData.amountPaid || 0) + invoiceData.upfrontAmount;

        setInvoiceData(prev => ({
          ...prev,
          payments: updatedPayments,
          amountPaid: newAmountPaid,
        }));
      } else if (!invoiceData.upfrontPaid && hasUpfrontPayment) {
        // Remove upfront payment record
        const updatedPayments = invoiceData.payments?.filter(p => p.id !== "upfront_payment") || [];
        const newAmountPaid = (invoiceData.amountPaid || 0) - invoiceData.upfrontAmount;

        setInvoiceData(prev => ({
          ...prev,
          payments: updatedPayments,
          amountPaid: Math.max(0, newAmountPaid),
        }));
      }
    }
  }, [invoiceData.upfrontPaid, invoiceData.upfrontAmount, invoiceData.paymentType]);

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: any,
  ) => {
    const newItems = [...(invoiceData.items || [])];
    (newItems[index] as any)[field] = value;

    if (field === "productId" && value && value !== "custom") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].name = product.name;
        newItems[index].price = product.price;
        newItems[index].isCustom = false;
      }
    } else if (value === "custom") {
      newItems[index].productId = "custom";
      newItems[index].name = "";
      newItems[index].price = 0;
      newItems[index].isCustom = true;
    }

    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const addItem = () => {
    const newItems = [
      ...(invoiceData.items || []),
      { productId: "", name: "", quantity: 1, price: 0, isCustom: false },
    ];
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = (invoiceData.items || []).filter((_, i) => i !== index);
    setInvoiceData({ ...invoiceData, items: newItems });
  };

  const addPayment = () => {
    if (newPayment.amount <= 0) {
      setPaymentError("Payment amount must be greater than zero");
      return;
    }

    if (newPayment.amount > (invoiceData.remainingAmount || 0)) {
      setPaymentError(
        `Payment amount cannot exceed remaining amount of ${bankAccountCurrency}${(invoiceData.remainingAmount || 0).toFixed(2)}`,
      );
      return;
    }

    const payment: PaymentRecord = {
      id: `payment_${Date.now()}`,
      amount: newPayment.amount,
      date: Timestamp.fromDate(new Date(newPayment.date)),
      description:
        newPayment.description ||
        `Payment for Invoice ${invoiceData.invoiceNumber}`,
    };

    const updatedPayments = [...(invoiceData.payments || []), payment];
    const newAmountPaid = (invoiceData.amountPaid || 0) + newPayment.amount;
    const newRemainingAmount =
      (invoiceData.totalAmountDue || 0) - newAmountPaid;

    setInvoiceData({
      ...invoiceData,
      payments: updatedPayments,
      amountPaid: newAmountPaid,
      remainingAmount: newRemainingAmount,
      status: newRemainingAmount <= 0 ? "paid" : invoiceData.status,
    });

    setNewPayment({
      amount: 0,
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setPaymentError("");
    setShowPaymentForm(false);
  };

  const removePayment = (paymentId: string) => {
    const paymentToRemove = invoiceData.payments?.find(
      (p) => p.id === paymentId,
    );
    if (!paymentToRemove) return;

    const updatedPayments =
      invoiceData.payments?.filter((p) => p.id !== paymentId) || [];
    const newAmountPaid =
      (invoiceData.amountPaid || 0) - paymentToRemove.amount;
    const newRemainingAmount =
      (invoiceData.totalAmountDue || 0) - newAmountPaid;

    setInvoiceData({
      ...invoiceData,
      payments: updatedPayments,
      amountPaid: newAmountPaid,
      remainingAmount: newRemainingAmount,
      status: newRemainingAmount > 0 ? "sent" : "paid",
    });
  };

  const handlePaymentAmountChange = (amount: number) => {
    setNewPayment({ ...newPayment, amount });

    // Realtime validation
    if (amount <= 0 && amount !== 0) {
      setPaymentError("Payment amount must be greater than zero");
    } else if (amount > (invoiceData.remainingAmount || 0)) {
      setPaymentError(
        `Payment amount cannot exceed remaining amount of ${bankAccountCurrency}${(invoiceData.remainingAmount || 0).toFixed(2)}`,
      );
    } else {
      setPaymentError("");
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!invoiceData.customerId) {
      errors.customerId = "Customer is required.";
    }
    if (!invoiceData.bankAccountId) {
      errors.bankAccountId = "Bank account is required.";
    }
    if (!invoiceData.items || invoiceData.items.length === 0) {
      errors.items = "At least one item is required.";
    } else {
      invoiceData.items.forEach((item, index) => {
        if (!item.productId) {
          errors[`itemProductId_${index}`] = "Product is required.";
        }
        if (!item.name.trim()) {
          errors[`itemName_${index}`] = "Item name is required.";
        }
        if (!item.quantity || item.quantity <= 0) {
          errors[`itemQuantity_${index}`] =
            "Quantity must be greater than zero.";
        }
        if (!item.price || item.price <= 0) {
          errors[`itemPrice_${index}`] = "Price must be greater than zero.";
        }
      });
    }

    // Payment type specific validation
    if (invoiceData.paymentType === "upfront" && invoiceData.upfrontAmount) {
      if (invoiceData.upfrontAmount > (invoiceData.totalAmountDue || 0)) {
        errors.upfrontAmount = "Upfront amount cannot exceed total amount.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) {
      return;
    }
    if (!user || !userProfile) {
      setError("User not authenticated.");
      return;
    }
    setLoading(true);

    const selectedCustomer = customers.find(
      (c) => c.id === invoiceData.customerId,
    );
    if (!selectedCustomer) {
      setError("Invalid customer selected.");
      setLoading(false);
      return;
    }

    const total = calculateTotal(invoiceData.items || []);
    const finalInvoiceData = {
      ...invoiceData,
      customerName: selectedCustomer.name,
      total,
      totalAmountDue: total,
      bankAccountId: invoiceData.bankAccountId || undefined,
      bankAccountCurrency: "",
    };

    if (invoiceData.bankAccountId) {
      const selectedBankAccount = bankAccounts.find(
        (b) => b.id === invoiceData.bankAccountId,
      );
      if (selectedBankAccount) {
        finalInvoiceData.bankAccountCurrency = selectedBankAccount.currency;
      }
    }

    try {
      // Use the centralized invoice service
      await InvoiceService.saveInvoice(finalInvoiceData, user, userProfile, id);
      navigate("/invoices");
    } catch (err: any) {
      console.error(err);
      setError(`Failed to save invoice: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md"
    >
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
        {id ? "Edit Invoice" : "New Invoice"}
      </h1>

      {/* Customer & Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Customer
          </label>
          <select
            value={invoiceData.customerId}
            onChange={(e) =>
              setInvoiceData({ ...invoiceData, customerId: e.target.value })
            }
            className={`mt-1 block w-full p-2 border rounded-md shadow-sm dark:bg-gray-700 dark:text-white ${
              fieldErrors.customerId
                ? "border-red-500 dark:border-red-400"
                : "border-gray-300 dark:border-gray-600"
            }`}
            required
          >
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldErrors.customerId && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.customerId}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Issue Date
          </label>
          <input
            type="date"
            value={
              invoiceData.issueDate instanceof Date
                ? invoiceData.issueDate.toISOString().split("T")[0]
                : invoiceData.issueDate?.toDate?.().toISOString().split("T")[0]
            }
            onChange={(e) =>
              setInvoiceData({
                ...invoiceData,
                issueDate: Timestamp.fromDate(new Date(e.target.value)),
              })
            }
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Due Date
          </label>
          <input
            type="date"
            value={
              invoiceData.dueDate instanceof Date
                ? invoiceData.dueDate.toISOString().split("T")[0]
                : invoiceData.dueDate?.toDate?.().toISOString().split("T")[0]
            }
            onChange={(e) =>
              setInvoiceData({
                ...invoiceData,
                dueDate: Timestamp.fromDate(new Date(e.target.value)),
              })
            }
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Payment Type Selection */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Payment Type
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30">
            <input
              type="radio"
              name="paymentType"
              value="full"
              checked={invoiceData.paymentType === "full"}
              onChange={(e) =>
                setInvoiceData({
                  ...invoiceData,
                  paymentType: e.target.value as PaymentType,
                })
              }
              className="mr-3"
            />
            <div>
              <div className="font-medium text-gray-800 dark:text-white">
                Full Payment
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Complete payment in one go
              </div>
            </div>
          </label>
          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30">
            <input
              type="radio"
              name="paymentType"
              value="milestone"
              checked={invoiceData.paymentType === "milestone"}
              onChange={(e) =>
                setInvoiceData({
                  ...invoiceData,
                  paymentType: e.target.value as PaymentType,
                })
              }
              className="mr-3"
            />
            <div>
              <div className="font-medium text-gray-800 dark:text-white">
                Milestone Based
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Payment in multiple milestones
              </div>
            </div>
          </label>
          <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30">
            <input
              type="radio"
              name="paymentType"
              value="upfront"
              checked={invoiceData.paymentType === "upfront"}
              onChange={(e) =>
                setInvoiceData({
                  ...invoiceData,
                  paymentType: e.target.value as PaymentType,
                })
              }
              className="mr-3"
            />
            <div>
              <div className="font-medium text-gray-800 dark:text-white">
                Upfront + Remaining
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Partial upfront, rest after completion
              </div>
            </div>
          </label>
        </div>

        {/* Additional fields for payment types */}
        {invoiceData.paymentType === "milestone" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Milestone Description
            </label>
            <textarea
              value={invoiceData.milestoneDescription || ""}
              onChange={(e) =>
                setInvoiceData({
                  ...invoiceData,
                  milestoneDescription: e.target.value,
                })
              }
              placeholder="Describe the milestones for payment..."
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
            />
          </div>
        )}

        {invoiceData.paymentType === "upfront" && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Upfront Amount
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500 dark:text-gray-300">
                  {bankAccountCurrency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={invoiceData.upfrontAmount || 0}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      upfrontAmount: parseFloat(e.target.value),
                    })
                  }
                  className={`mt-1 block w-full pl-7 p-2 border rounded-md shadow-sm dark:bg-gray-700 dark:text-white ${
                    fieldErrors.upfrontAmount
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
              </div>
              {fieldErrors.upfrontAmount && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.upfrontAmount}
                </p>
              )}
            </div>
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={invoiceData.upfrontPaid || false}
                  onChange={(e) =>
                    setInvoiceData({
                      ...invoiceData,
                      upfrontPaid: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Upfront payment received
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bank Account */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Bank Account
        </label>
        <select
          value={invoiceData.bankAccountId || ""}
          onChange={(e) => {
            const selectedBankAccountId = e.target.value;
            setInvoiceData({
              ...invoiceData,
              bankAccountId: selectedBankAccountId,
            });
            const selectedBankAccount = bankAccounts.find(
              (b) => b.id === selectedBankAccountId,
            );
            setBankAccountCurrency(
              selectedBankAccount ? selectedBankAccount.currencySymbol : "$",
            );
          }}
          className={`mt-1 block w-full p-2 border rounded-md shadow-sm dark:bg-gray-700 dark:text-white ${
            fieldErrors.bankAccountId
              ? "border-red-500 dark:border-red-400"
              : "border-gray-300 dark:border-gray-600"
          }`}
          required
        >
          <option value="">Select a bank account</option>
          {bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.accountName} - {b.bankName} ({b.currency} - {b.currencySymbol})
            </option>
          ))}
        </select>
        {fieldErrors.bankAccountId && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {fieldErrors.bankAccountId}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Items
        </h2>
        {invoiceData.items?.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-4 items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-md"
          >
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs text-gray-500">Product/Service</label>
              <select
                value={item.productId}
                onChange={(e) =>
                  handleItemChange(index, "productId", e.target.value)
                }
                className={`mt-1 block w-full p-2 border rounded-md shadow-sm dark:bg-gray-600 dark:text-white ${
                  fieldErrors[`itemProductId_${index}`]
                    ? "border-red-500 dark:border-red-400"
                    : "border-gray-300 dark:border-gray-500"
                }`}
              >
                <option value="">Select option</option>
                <option value="custom">➕ Custom Product/Service</option>
                <optgroup label="Existing Products">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              {fieldErrors[`itemProductId_${index}`] && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors[`itemProductId_${index}`]}
                </p>
              )}
            </div>

            {/* Custom name field for custom products */}
            {item.isCustom && (
              <div className="col-span-12 md:col-span-4">
                <label className="text-xs text-gray-500">Custom Name</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) =>
                    handleItemChange(index, "name", e.target.value)
                  }
                  placeholder="Enter product/service name"
                  className={`mt-1 block w-full p-2 border rounded-md shadow-sm dark:bg-gray-600 dark:text-white ${
                    fieldErrors[`itemName_${index}`]
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300 dark:border-gray-500"
                  }`}
                />
                {fieldErrors[`itemName_${index}`] && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors[`itemName_${index}`]}
                  </p>
                )}
              </div>
            )}

            <div className="col-span-6 md:col-span-2">
              <label className="text-xs text-gray-500">Quantity</label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", parseInt(e.target.value))
                }
                className={`mt-1 block w-full p-2 border rounded-md shadow-sm dark:bg-gray-600 dark:text-white ${
                  fieldErrors[`itemQuantity_${index}`]
                    ? "border-red-500 dark:border-red-400"
                    : "border-gray-300 dark:border-gray-500"
                }`}
                min="1"
              />
              {fieldErrors[`itemQuantity_${index}`] && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors[`itemQuantity_${index}`]}
                </p>
              )}
            </div>

            <div className="col-span-6 md:col-span-2">
              <label className="text-xs text-gray-500">Price</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500 dark:text-gray-300">
                  {bankAccountCurrency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={item.price}
                  placeholder="0.00"
                  onChange={(e) =>
                    handleItemChange(index, "price", parseFloat(e.target.value))
                  }
                  className={`mt-1 block w-full pl-7 p-2 border rounded-md shadow-sm dark:bg-gray-600 dark:text-white ${
                    fieldErrors[`itemPrice_${index}`]
                      ? "border-red-500 dark:border-red-400"
                      : "border-gray-300 dark:border-gray-500"
                  }`}
                />
              </div>
              {fieldErrors[`itemPrice_${index}`] && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors[`itemPrice_${index}`]}
                </p>
              )}
            </div>

            <div className="col-span-10 md:col-span-1">
              <label className="text-xs text-gray-500">Total</label>
              <p className="mt-1 p-2 text-gray-800 dark:text-white font-semibold text-sm">
                {bankAccountCurrency}
                {(item.quantity * item.price).toFixed(2)}
              </p>
            </div>

            <div className="col-span-2 md:col-span-1 flex items-end">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700 p-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="px-4 py-2 text-sm border border-dashed border-gray-400 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Add Item
        </button>
      </div>

      {/* Payment Tracking Section */}
      {id && (
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Payment Tracking
            </h2>
            <button
              type="button"
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add Payment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg border-l-4 border-blue-500">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Total Amount
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {bankAccountCurrency}
                {invoiceData.totalAmountDue?.toFixed(2) || "0.00"}
              </div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg border-l-4 border-green-500">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Amount Paid
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {bankAccountCurrency}
                {invoiceData.amountPaid?.toFixed(2) || "0.00"}
              </div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-700 rounded-lg border-l-4 border-orange-500">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Remaining
              </div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {bankAccountCurrency}
                {invoiceData.remainingAmount?.toFixed(2) || "0.00"}
              </div>
            </div>
          </div>

          {/* Upfront Payment Display */}
          {invoiceData.paymentType === "upfront" && invoiceData.upfrontAmount && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-semibold text-blue-700 dark:text-blue-300">
                    Upfront Payment
                  </h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {bankAccountCurrency}{invoiceData.upfrontAmount.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    invoiceData.upfrontPaid
                      ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                  }`}>
                    {invoiceData.upfrontPaid ? "✓ Received" : "⏳ Pending"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {showPaymentForm && (
            <div className="mb-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="text-md font-semibold mb-3 text-green-700 dark:text-green-300">
                Add New Payment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500 dark:text-gray-300">
                      {bankAccountCurrency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={newPayment.amount || ""}
                      onChange={(e) =>
                        handlePaymentAmountChange(
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      max={invoiceData.remainingAmount}
                      className={`mt-1 block w-full pl-7 p-2 border rounded-md shadow-sm dark:bg-gray-600 dark:text-white ${
                        paymentError
                          ? "border-red-500 dark:border-red-400"
                          : "border-gray-300 dark:border-gray-500"
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {paymentError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {paymentError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) =>
                      setNewPayment({ ...newPayment, date: e.target.value })
                    }
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newPayment.description}
                    onChange={(e) =>
                      setNewPayment({
                        ...newPayment,
                        description: e.target.value,
                      })
                    }
                    placeholder="Payment description (optional)"
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={addPayment}
                  disabled={!!paymentError || newPayment.amount <= 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setPaymentError("");
                    setNewPayment({
                      amount: 0,
                      description: "",
                      date: new Date().toISOString().split("T")[0],
                    });
                  }}
                  className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Payment History */}
          {invoiceData.payments && invoiceData.payments.length > 0 && (
            <div>
              <h3 className="text-md font-semibold mb-3 text-blue-700 dark:text-blue-300">
                Payment History
              </h3>
              <div className="space-y-3">
                {invoiceData.payments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border-l-4 border-green-500"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          Payment #{index + 1}
                        </span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {bankAccountCurrency}
                          {payment.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        📅{" "}
                        {payment.date.toDate().toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        • {payment.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePayment(payment.id)}
                      className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total and Actions */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
            Total Amount:
          </span>
          <span className="ml-2 text-2xl font-bold text-gray-800 dark:text-white">
            {bankAccountCurrency}
            {calculateTotal(invoiceData.items || []).toFixed(2)}
          </span>
        </div>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : id ? "Save Changes" : "Create Invoice"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default InvoiceFormPage;
