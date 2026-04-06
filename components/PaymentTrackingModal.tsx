import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";
import { db, Timestamp } from "../services/firebase";
import { ActivityLogger } from "../services/activityLogger";
import { InvoiceService } from "../services/invoiceService";
import type { Invoice, PaymentRecord } from "../types";

interface PaymentTrackingModalProps {
  invoice: Invoice;
  onClose: () => void;
  onPaymentUpdate: () => void;
}

const PaymentTrackingModal: React.FC<PaymentTrackingModalProps> = ({
  invoice,
  onClose,
  onPaymentUpdate,
}) => {
  const { user, userProfile } = useAuth();
  const { canMarkInvoicePaid } = usePermissions();
  const [currentInvoice, setCurrentInvoice] = useState<Invoice>(invoice);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Set up real-time listener for this specific invoice
  useEffect(() => {
    if (!invoice.id) return;

    const unsubscribe = db.collection("invoices").doc(invoice.id).onSnapshot(
      (doc) => {
        if (doc.exists) {
          const updatedInvoice = { id: doc.id, ...doc.data() } as Invoice;
          setCurrentInvoice(updatedInvoice);
        }
      },
      (error) => {
        console.error("Error listening to invoice updates:", error);
        // Fallback to prop invoice if listener fails
        setCurrentInvoice(invoice);
      }
    );

    return () => unsubscribe();
  }, [invoice.id]);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [paymentError, setPaymentError] = useState("");
  const [saving, setSaving] = useState(false);

  const currencySymbol = invoice.bankAccountCurrency 
    ? { USD: "$", EUR: "€", GBP: "£", PKR: "₨" }[invoice.bankAccountCurrency] || invoice.bankAccountCurrency
    : "$";

  const addPayment = async () => {
    if (!user || !userProfile) return;

    if (currentInvoice.status === "paid" && !canMarkInvoicePaid()) {
      setPaymentError(
        "You cannot change payments on a Paid invoice without permission to change Paid status.",
      );
      return;
    }

    if (newPayment.amount <= 0) {
      setPaymentError("Payment amount must be greater than zero");
      return;
    }

    if (newPayment.amount > (currentInvoice.remainingAmount || 0)) {
      setPaymentError(
        `Payment amount cannot exceed remaining amount of ${currencySymbol}${(currentInvoice.remainingAmount || 0).toFixed(2)}`,
      );
      return;
    }

    setSaving(true);
    try {
      const payment: PaymentRecord = {
        id: `payment_${Date.now()}`,
        amount: newPayment.amount,
        date: Timestamp.fromDate(new Date(newPayment.date)),
        description:
          newPayment.description ||
          `Payment for Invoice ${currentInvoice.invoiceNumber}`,
      };

      const updatedPayments = [...(currentInvoice.payments || []), payment];
      const newAmountPaid = (currentInvoice.amountPaid || 0) + newPayment.amount;
      const newRemainingAmount = (currentInvoice.totalAmountDue || 0) - newAmountPaid;

      const updatedInvoice = {
        ...currentInvoice,
        payments: updatedPayments,
        amountPaid: newAmountPaid,
        remainingAmount: Math.max(0, newRemainingAmount),
        status:
          newRemainingAmount <= 0
            ? canMarkInvoicePaid()
              ? ("paid" as const)
              : ("sent" as const)
            : currentInvoice.status,
      };

      // Update invoice in database
      await InvoiceService.updateInvoicePayment(currentInvoice.id, updatedInvoice);

      // Log activity
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "invoice_updated",
        `Added payment of ${currencySymbol}${newPayment.amount.toFixed(2)} to invoice ${currentInvoice.invoiceNumber}`,
        {
          entityId: currentInvoice.id,
          entityType: "invoice",
          newValue: { paymentAdded: payment },
        },
      );

      setCurrentInvoice(updatedInvoice);
      setNewPayment({
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
      setPaymentError("");
      setShowPaymentForm(false);
      onPaymentUpdate();
    } catch (error) {
      console.error("Error adding payment:", error);
      setPaymentError("Failed to add payment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removePayment = async (paymentId: string) => {
    if (!user || !userProfile) return;

    if (currentInvoice.status === "paid" && !canMarkInvoicePaid()) {
      alert(
        "You do not have permission to remove payments or change Paid status. Ask an administrator.",
      );
      return;
    }

    const paymentToRemove = currentInvoice.payments?.find(p => p.id === paymentId);
    if (!paymentToRemove) return;

    if (!window.confirm(`Are you sure you want to remove this payment of ${currencySymbol}${paymentToRemove.amount.toFixed(2)}?`)) {
      return;
    }

    setSaving(true);
    try {
      const updatedPayments = currentInvoice.payments?.filter(p => p.id !== paymentId) || [];
      const newAmountPaid = (currentInvoice.amountPaid || 0) - paymentToRemove.amount;
      const newRemainingAmount = (currentInvoice.totalAmountDue || 0) - newAmountPaid;

      const updatedInvoice = {
        ...currentInvoice,
        payments: updatedPayments,
        amountPaid: Math.max(0, newAmountPaid),
        remainingAmount: Math.max(0, newRemainingAmount),
        status:
          newRemainingAmount > 0 && currentInvoice.status === "paid"
            ? ("sent" as const)
            : currentInvoice.status,
      };

      // Update invoice in database
      await InvoiceService.updateInvoicePayment(currentInvoice.id, updatedInvoice);

      // Log activity
      await ActivityLogger.logActivity(
        user,
        userProfile,
        "invoice_updated",
        `Removed payment of ${currencySymbol}${paymentToRemove.amount.toFixed(2)} from invoice ${currentInvoice.invoiceNumber}`,
        {
          entityId: currentInvoice.id,
          entityType: "invoice",
          oldValue: { paymentRemoved: paymentToRemove },
        },
      );

      setCurrentInvoice(updatedInvoice);
      onPaymentUpdate();
    } catch (error) {
      console.error("Error removing payment:", error);
      alert("Failed to remove payment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentAmountChange = (amount: number) => {
    setNewPayment({ ...newPayment, amount });

    if (amount <= 0 && amount !== 0) {
      setPaymentError("Payment amount must be greater than zero");
    } else if (amount > (currentInvoice.remainingAmount || 0)) {
      setPaymentError(
        `Payment amount cannot exceed remaining amount of ${currencySymbol}${(currentInvoice.remainingAmount || 0).toFixed(2)}`,
      );
    } else {
      setPaymentError("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Payment Tracking - {currentInvoice.invoiceNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={saving}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invoice Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Customer:</span>
              <div className="font-medium text-gray-900 dark:text-white">{currentInvoice.customerName}</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Issue Date:</span>
              <div className="font-medium text-gray-900 dark:text-white">{currentInvoice.issueDate?.toDate?.()?.toLocaleDateString() || "N/A"}</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Payment Type:</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {currentInvoice.paymentType === "milestone" ? "Milestone Based" : "Upfront + Remaining"}
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                currentInvoice.status === "paid"
                  ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                  : currentInvoice.status === "sent"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
              }`}>
                {currentInvoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
            <div className="text-sm text-gray-600 dark:text-gray-300">Total Amount</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {currencySymbol}{currentInvoice.totalAmountDue?.toFixed(2) || "0.00"}
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
            <div className="text-sm text-gray-600 dark:text-gray-300">Amount Paid</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {currencySymbol}{currentInvoice.amountPaid?.toFixed(2) || "0.00"}
            </div>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
            <div className="text-sm text-gray-600 dark:text-gray-300">Remaining</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {currencySymbol}{currentInvoice.remainingAmount?.toFixed(2) || "0.00"}
            </div>
          </div>
        </div>

        {/* Upfront Payment Display */}
        {currentInvoice.paymentType === "upfront" && currentInvoice.upfrontAmount && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-semibold text-blue-700 dark:text-blue-300">
                  Upfront Payment
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {currencySymbol}{currentInvoice.upfrontAmount.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentInvoice.upfrontPaid 
                    ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                }`}>
                  {currentInvoice.upfrontPaid ? "✓ Received" : "⏳ Pending"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Button */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Payment History</h3>
          <button
            onClick={() => setShowPaymentForm(!showPaymentForm)}
            disabled={saving || (currentInvoice.remainingAmount || 0) <= 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Add Payment
          </button>
        </div>

        {/* Add Payment Form */}
        {showPaymentForm && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="text-md font-semibold mb-3 text-green-700 dark:text-green-300">
              Add New Payment
            </h4>
            {paymentError && (
              <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {paymentError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPayment.amount || ""}
                    onChange={(e) => handlePaymentAmountChange(parseFloat(e.target.value) || 0)}
                    className={`mt-1 block w-full pl-7 p-2 border rounded-md shadow-sm dark:bg-gray-600 dark:text-white ${
                      paymentError ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-500"
                    }`}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newPayment.description}
                  onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                  placeholder="Payment description"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPaymentForm(false);
                  setPaymentError("");
                  setNewPayment({
                    amount: 0,
                    date: new Date().toISOString().split("T")[0],
                    description: "",
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={addPayment}
                disabled={!!paymentError || newPayment.amount <= 0 || saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? "Adding..." : "Add Payment"}
              </button>
            </div>
          </div>
        )}

        {/* Payment History */}
        {currentInvoice.payments && currentInvoice.payments.length > 0 ? (
          <div className="space-y-3">
            {currentInvoice.payments.map((payment, index) => (
              <div
                key={payment.id}
                className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                      Payment #{index + 1}
                    </span>
                    <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                      {currencySymbol}{payment.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    📅 {payment.date.toDate().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })} • {payment.description}
                  </div>
                </div>
                {payment.id !== "upfront_payment" && (
                  <button
                    onClick={() => removePayment(payment.id)}
                    disabled={saving}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💰</div>
            <p className="text-gray-600 dark:text-gray-300">
              No payments recorded yet. Add the first payment to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentTrackingModal;
