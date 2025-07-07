import firebase from "firebase/compat/app";

export interface UserProfile {
  uid: string;
  email: string;
  companyName: string;
  createdAt: firebase.firestore.Timestamp;
  invoiceCounter: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  isCustom?: boolean; // for custom products/services
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type PaymentType = "full" | "milestone" | "upfront";

export interface PaymentRecord {
  id: string;
  amount: number;
  date: firebase.firestore.Timestamp;
  description: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string; // denormalized
  items: InvoiceItem[];
  total: number;
  status: InvoiceStatus;
  issueDate: firebase.firestore.Timestamp;
  dueDate: firebase.firestore.Timestamp;
  bankAccountId?: string;
  bankAccountCurrency?: string;
  // Payment tracking fields
  paymentType: PaymentType;
  totalAmountDue: number;
  amountPaid: number;
  remainingAmount: number;
  payments: PaymentRecord[];
  // For milestone and upfront payments
  milestoneDescription?: string;
  upfrontAmount?: number;
  upfrontPaid?: boolean;
}

export interface BankAccount {
  id: string;
  userId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  currencySymbol: string;
  createdAt: firebase.firestore.Timestamp;
  initialBalance?: number;
  currentBalance?: number;
}

export interface Expense {
  id: string;
  userId: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  bankAccountId: string;
  bankAccountName: string; // denormalized
  currency: string;
  currencySymbol: string;
  date: firebase.firestore.Timestamp;
  createdAt: firebase.firestore.Timestamp;
}
