import firebase from "firebase/compat/app";

export type UserRole = "owner" | "admin" | "manager" | "editor" | "viewer";

export interface Permission {
  page: string;
  actions: {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    export?: boolean;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  companyName: string;
  displayName?: string; // Add display name for individual users
  createdAt: firebase.firestore.Timestamp;
  invoiceCounter: number;
  // Role-based fields
  role?: UserRole;
  isOwner?: boolean;
  companyId?: string; // Links to the company owner
  permissions?: Permission[];
  isActive?: boolean;
  invitedBy?: string;
  invitedAt?: firebase.firestore.Timestamp;
}

export interface CompanyUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  createdAt: firebase.firestore.Timestamp;
  invitedBy: string;
  companyId: string;
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

export type ActivityType =
  | "invoice_created"
  | "invoice_updated"
  | "invoice_deleted"
  | "customer_created"
  | "customer_updated"
  | "customer_deleted"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "bank_account_created"
  | "bank_account_updated"
  | "bank_account_deleted"
  | "expense_created"
  | "expense_updated"
  | "expense_deleted"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "login"
  | "logout";

export interface Activity {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  type: ActivityType;
  description: string;
  metadata?: {
    entityId?: string;
    entityType?: string;
    oldValue?: any;
    newValue?: any;
  };
  timestamp: firebase.firestore.Timestamp;
}
