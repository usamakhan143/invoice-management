import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Invoice, UserProfile } from "../types";

Font.register({
  family: "Helvetica-Bold",
  src: "https://cdn.jsdelivr.net/npm/helvetical/helvetical-bold.ttf",
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 30,
    paddingLeft: 60,
    paddingRight: 60,
    paddingBottom: 30,
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companyDetails: {
    flexDirection: "column",
    textAlign: "right",
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#1d4ed8",
  },
  invoiceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  billTo: {},
  invoiceData: {
    textAlign: "right",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#1d4ed8",
    backgroundColor: "#dbeafe",
    padding: 5,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    padding: 5,
  },
  colDescription: {
    width: "50%",
  },
  colQty: {
    width: "15%",
    textAlign: "right",
  },
  colPrice: {
    width: "15%",
    textAlign: "right",
  },
  colTotal: {
    width: "20%",
    textAlign: "right",
  },
  summary: {
    marginTop: 30,
    textAlign: "right",
  },
  total: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1d4ed8",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 60,
    right: 60,
    textAlign: "center",
    fontSize: 10,
    color: "#6b7280",
  },
});

const formatCurrency = (amount: number, currency?: string) => {
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
  };

  const symbol = currency ? currencySymbols[currency] || currency : "$";
  return `${symbol}${amount.toFixed(2)}`;
};

interface InvoicePDFProps {
  invoice: Invoice;
  userProfile: UserProfile;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, userProfile }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.invoiceTitle}>INVOICE</Text>
        <View style={styles.companyDetails}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            {userProfile.companyName}
          </Text>
          <Text>{userProfile.email}</Text>
        </View>
      </View>

      <View style={styles.invoiceInfo}>
        <View style={styles.billTo}>
          <Text style={{ color: "#6b7280", marginBottom: 5 }}>BILL TO</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            {invoice.customerName}
          </Text>
        </View>
        <View style={styles.invoiceData}>
          <Text>Invoice #: {invoice.invoiceNumber}</Text>
          <Text>
            Issue Date: {invoice.issueDate.toDate().toLocaleDateString()}
          </Text>
          <Text>Due Date: {invoice.dueDate.toDate().toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colDescription}>Item Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Price</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>
        {invoice.items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colDescription}>
              {item.name}
              {item.isCustom ? " (Custom)" : ""}
            </Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>
              {formatCurrency(item.price, invoice.bankAccountCurrency)}
            </Text>
            <Text style={styles.colTotal}>
              {formatCurrency(
                item.quantity * item.price,
                invoice.bankAccountCurrency,
              )}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <Text style={{ marginBottom: 5 }}>
          Total Amount:{" "}
          {formatCurrency(invoice.total, invoice.bankAccountCurrency)}
        </Text>

        {/* Payment Information */}
        {invoice.paymentType && (
          <View
            style={{
              marginTop: 15,
              padding: 10,
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
            }}
          >
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 5 }}>
              Payment Information
            </Text>
            <Text style={{ marginBottom: 3 }}>
              Payment Type:{" "}
              {invoice.paymentType === "full"
                ? "Full Payment"
                : invoice.paymentType === "milestone"
                  ? "Milestone Based"
                  : "Upfront + Remaining"}
            </Text>

            {invoice.paymentType === "milestone" &&
              invoice.milestoneDescription && (
                <Text style={{ marginBottom: 3, fontSize: 10 }}>
                  Milestones: {invoice.milestoneDescription}
                </Text>
              )}

            {invoice.paymentType === "upfront" && invoice.upfrontAmount && (
              <Text style={{ marginBottom: 3 }}>
                Upfront Amount:{" "}
                {formatCurrency(
                  invoice.upfrontAmount,
                  invoice.bankAccountCurrency,
                )}
                {invoice.upfrontPaid ? " (Paid)" : " (Pending)"}
              </Text>
            )}

            <Text style={{ marginBottom: 3 }}>
              Amount Paid:{" "}
              {formatCurrency(
                invoice.amountPaid || 0,
                invoice.bankAccountCurrency,
              )}
            </Text>
            <Text style={{ marginBottom: 3 }}>
              Remaining Amount:{" "}
              {formatCurrency(
                invoice.remainingAmount || 0,
                invoice.bankAccountCurrency,
              )}
            </Text>

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 5 }}>
                  Payment History:
                </Text>
                {invoice.payments.map((payment, index) => (
                  <Text
                    key={payment.id}
                    style={{ fontSize: 10, marginBottom: 2 }}
                  >
                    • {payment.date.toDate().toLocaleDateString()}:{" "}
                    {formatCurrency(
                      payment.amount,
                      invoice.bankAccountCurrency,
                    )}{" "}
                    - {payment.description}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={[styles.total, { marginTop: 15 }]}>
          {invoice.remainingAmount && invoice.remainingAmount > 0
            ? `Outstanding: ${formatCurrency(invoice.remainingAmount, invoice.bankAccountCurrency)}`
            : "PAID IN FULL"}
        </Text>
      </View>
      <Text style={styles.footer}>Thank you for your business!</Text>
    </Page>
  </Document>
);

export default InvoicePDF;
