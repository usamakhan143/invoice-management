import firebase from "firebase/compat/app";

export type UserRole = "custom"; // Only support custom roles now

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

// New granular permission structure
export interface GranularPermission {
  permission: string;
  enabled: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  companyName: string;
  displayName?: string;
  createdAt: firebase.firestore.Timestamp;
  invoiceCounter: number;
  // Role-based fields - simplified for custom roles only
  role?: string; // Now refers to custom role name
  isOwner?: boolean;
  companyId?: string;
  // New granular permissions system
  granularPermissions?: string[]; // Array of permission strings
  // Keep old permissions for backward compatibility during migration
  permissions?: Permission[];
  isActive?: boolean;
  invitedBy?: string;
  invitedAt?: firebase.firestore.Timestamp;
  // Impersonation fields
  isImpersonating?: boolean;
  originalAdmin?: string;
  tempPassword?: string;
  /** SHA-256 hash of 4-digit screen/revenue PIN (see utils/screenPin). */
  screenPinHash?: string;
}

export interface CompanyUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: string; // Custom role name
  // New granular permissions
  granularPermissions: string[];
  // Keep old permissions for backward compatibility
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
  // Creator tracking (same pattern as Invoice)
  createdBy?: string;
  createdById?: string;
  companyId?: string;
  createdAt?: firebase.firestore.Timestamp;
  updatedBy?: string;
  updatedById?: string;
  updatedAt?: firebase.firestore.Timestamp;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  // Creator tracking (same pattern as Customer and Invoice)
  createdBy?: string;
  createdById?: string;
  companyId?: string;
  createdAt?: firebase.firestore.Timestamp;
  updatedBy?: string;
  updatedById?: string;
  updatedAt?: firebase.firestore.Timestamp;
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
  /** Customer-facing bank label at time of save (masked name if configured on the bank account). */
  bankDisplayName?: string;
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
  // Creator tracking
  createdBy?: string;
  createdById?: string;
  companyId?: string;
  createdAt?: firebase.firestore.Timestamp;
  updatedBy?: string;
  updatedById?: string;
  updatedAt?: firebase.firestore.Timestamp;
  /** Stored for O(1) Firestore verification lookup (see utils/invoiceAuthCode) */
  authVerificationCode?: string;
}

export interface BankAccount {
  id: string;
  /** Creator uid (who added the row). Company-wide reads use `companyId`. */
  userId: string;
  /** Owner uid for the company — same as invoices/customers `companyId`. Required on new writes. */
  companyId?: string;
  accountName: string;
  bankName: string;
  /** Optional label for invoices: customers and invoice creators see this instead of the real bank name. */
  invoiceDisplayBankName?: string;
  accountNumber: string;
  currency: string;
  currencySymbol: string;
  createdAt: firebase.firestore.Timestamp;
  initialBalance?: number;
  currentBalance?: number;
  /**
   * When false, this account is hidden from the bank dropdown on new/edited invoices.
   * Undefined defaults to true (show) for legacy documents.
   */
  includeInInvoicePicker?: boolean;
}

/** Internal transfer between company bank accounts (`bankTransfers` collection). */
export interface BankTransfer {
  id: string;
  companyId: string;
  userId: string;
  fromBankAccountId: string;
  toBankAccountId: string;
  fromAccountName: string;
  toAccountName: string;
  /** Institution name at time of transfer (for history when account names collide). */
  fromBankName?: string;
  toBankName?: string;
  /** Total debited from source (fee is taken from this amount, not added on top). */
  principalAmount: number;
  /** Amount in source currency that reaches the destination leg after fee (principalAmount - fee). */
  netTransferAmount?: number;
  fromCurrency: string;
  fromCurrencySymbol: string;
  toCurrency: string;
  toCurrencySymbol: string;
  /** Amount credited to destination (destination currency). */
  amountCreditedToDestination: number;
  /** 1 unit of source currency = this many units of destination currency; null if same currency. */
  exchangeRate: number | null;
  feeType: "percent" | "fixed" | "none";
  /** Raw percent (0–100) or fixed fee amount in source currency. */
  feeInput: number;
  /** Fee in source currency, taken out of principalAmount before conversion. */
  feeAmount: number;
  expenseId?: string | null;
  memo?: string;
  createdAt: firebase.firestore.Timestamp;
}

/** Saved payee directory entry (Firestore collection `vendors`). */
export interface Vendor {
  id: string;
  companyId: string;
  name: string;
  notes?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt?: firebase.firestore.Timestamp;
}

/** Company-scoped expense category (Firestore collection `expenseCategories`). */
export interface ExpenseCategory {
  id: string;
  companyId: string;
  name: string;
  notes?: string;
  sortOrder?: number;
  createdAt: firebase.firestore.Timestamp;
  updatedAt?: firebase.firestore.Timestamp;
}

export interface Expense {
  id: string;
  userId: string;
  /** Owner uid for company-wide queries (set on create / backfill). */
  companyId?: string;
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
  /** Saved directory doc id; null/omitted for one-time payee (see vendorName) */
  vendorId?: string | null;
  /** Who was paid — from directory or one-time entry */
  vendorName?: string;
  /** One-time payee only; not linked to vendors collection */
  oneTimeVendor?: boolean;
}

export type ActivityType =
  | "invoice_created"
  | "invoice_updated"
  | "invoice_deleted"
  | "customer_created"
  | "customer_updated"
  | "customer_deleted"
  | "business_created"
  | "business_updated"
  | "business_deleted"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "bank_account_created"
  | "bank_account_updated"
  | "bank_account_deleted"
  | "bank_transfer_created"
  | "expense_created"
  | "expense_updated"
  | "expense_deleted"
  | "vendor_created"
  | "vendor_updated"
  | "vendor_deleted"
  | "expense_category_created"
  | "expense_category_updated"
  | "expense_category_deleted"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "login"
  | "logout"
  | "lead_created"
  | "lead_updated"
  | "lead_deleted"
  | "lead_call_logged"
  | "lead_outreach_logged"
  | "lead_assigned"
  | "lead_converted"
  | "lead_linked_customer"
  | "campaign_created"
  | "campaign_updated"
  | "campaign_deleted";

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

/** CRM pipeline stage — independent from per-call outcome */
export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal Sent"
  | "Won"
  | "Lost";

/** Per-call result — does not auto-change LeadStatus */
export type LeadCallOutcome =
  | "No Answer"
  | "Busy"
  | "Connected"
  | "Wrong Number";

/** Optional fields toggled in UI; no strict validation */
export interface LeadExtras {
  socialMedia?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  tiktokUrl?: string;
  website?: string;
  address?: string;
  extraNotes?: string;
  /** Lead uses WhatsApp for contact */
  hasWhatsapp?: boolean;
  /** When true, WhatsApp number is the same as the main phone field */
  whatsappSameAsPhone?: boolean;
  /** WhatsApp number when different from main phone */
  whatsappPhone?: string;
}

export interface Lead {
  id: string;
  name?: string;
  company?: string;
  /** Lead / business location (country) */
  country?: string;
  /** Business type / industry category */
  category?: string;
  phone?: string;
  email?: string;
  source: string;
  /** Preferred gender for the assigned sales agent (filtering / routing). */
  targetSalesGender?: string;
  status: LeadStatus;
  assignedUserId: string;
  notes?: string;
  nextFollowUpDate?: firebase.firestore.Timestamp | null;
  companyId: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt?: firebase.firestore.Timestamp;
  createdById: string;
  linkedCustomerId?: string | null;
  linkedBusinessId?: string | null;
  convertedCustomerId?: string | null;
  convertedBusinessId?: string | null;
  extras?: LeadExtras;
  phoneNormalized?: string;
  emailNormalized?: string;
  /** Campaign this lead belongs to (optional — existing leads unaffected) */
  campaignId?: string | null;
  /** Tag IDs within the campaign for segmentation */
  campaignTagIds?: string[];
}

export interface LeadCallLog {
  id: string;
  outcome: LeadCallOutcome;
  notes: string;
  nextFollowUpDate?: firebase.firestore.Timestamp | null;
  createdAt: firebase.firestore.Timestamp;
  createdBy: string;
  metadata?: Record<string, unknown>;
  /** CRM / dialer recording ID or any reference — set by admins only in the app */
  recordingRef?: string | null;
  /** When an admin marked this log as a verified real call */
  callVerifiedAt?: firebase.firestore.Timestamp | null;
  callVerifiedByUserId?: string | null;
}

export interface LeadAssignmentEvent {
  id: string;
  fromUserId: string | null;
  toUserId: string;
  assignedByUserId: string;
  reason?: string;
  createdAt: firebase.firestore.Timestamp;
}

// ─── Outreach Events (unified timeline, replaces callLogs subcollection) ───

export type OutreachChannel = "call" | "email" | "whatsapp" | "sms" | "in_person" | "other";

export interface OutreachEvent {
  id: string;
  companyId: string;
  leadId: string;
  channel: OutreachChannel;
  notes: string;
  /** For "call": No Answer / Busy / Connected / Wrong Number. Free text for other channels. */
  outcome?: string | null;
  nextFollowUpDate?: firebase.firestore.Timestamp | null;
  createdAt: firebase.firestore.Timestamp;
  createdByUserId: string;
  createdByDisplayName: string;
  /** Campaign context at time of outreach */
  campaignId?: string | null;
  campaignTagIds?: string[];
  /** Admin QA: dialer ID / CRM link / ticket # */
  recordingRef?: string | null;
  /** Admin QA: when a verified call was marked */
  callVerifiedAt?: firebase.firestore.Timestamp | null;
  callVerifiedByUserId?: string | null;
  /** Webhook / external integration idempotency */
  externalSource?: string | null;
  externalId?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Campaigns ───

export type CampaignStatus = "draft" | "active" | "archived";

export interface Campaign {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  /** Informational hint for team about channels used in this campaign */
  channelsHint?: string;
  status: CampaignStatus;
  createdAt: firebase.firestore.Timestamp;
  updatedAt?: firebase.firestore.Timestamp;
  createdById: string;
}

export interface CampaignTag {
  id: string;
  companyId: string;
  campaignId: string;
  /** Lowercase no-space identifier (auto-derived from label) */
  slug: string;
  label: string;
  /** Tailwind color key, e.g. "emerald", "rose", "amber" */
  color?: string;
  description?: string;
  sortOrder: number;
  createdAt: firebase.firestore.Timestamp;
}

/** Commercial entity under a customer; not created at lead capture */
export interface Business {
  id: string;
  companyId: string;
  customerId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt?: firebase.firestore.Timestamp;
  createdById?: string;
}
