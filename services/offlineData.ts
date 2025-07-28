// Sample data for offline development mode
import { Timestamp } from './firebase';

export const sampleInvoices = [
  {
    id: 'sample-invoice-1',
    invoiceNumber: 'INV-001',
    customerId: 'sample-customer-1',
    customerName: 'Acme Corporation',
    items: [
      {
        productId: 'sample-product-1',
        name: 'Web Development Service',
        quantity: 1,
        price: 2500,
        isCustom: false
      }
    ],
    total: 2500,
    status: 'sent' as const,
    issueDate: Timestamp.now(),
    dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    bankAccountId: 'sample-bank-1',
    bankAccountCurrency: 'USD',
    paymentType: 'full' as const,
    totalAmountDue: 2500,
    amountPaid: 0,
    remainingAmount: 2500,
    payments: [],
    createdBy: 'Demo User',
    createdAt: Timestamp.now(),
    companyId: 'demo-company'
  },
  {
    id: 'sample-invoice-2',
    invoiceNumber: 'INV-002',
    customerId: 'sample-customer-2',
    customerName: 'Tech Solutions Ltd',
    items: [
      {
        productId: 'sample-product-2',
        name: 'Mobile App Development',
        quantity: 1,
        price: 5000,
        isCustom: false
      }
    ],
    total: 5000,
    status: 'paid' as const,
    issueDate: Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
    dueDate: Timestamp.fromDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
    bankAccountId: 'sample-bank-1',
    bankAccountCurrency: 'USD',
    paymentType: 'full' as const,
    totalAmountDue: 5000,
    amountPaid: 5000,
    remainingAmount: 0,
    payments: [
      {
        id: 'payment-1',
        amount: 5000,
        date: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
        description: 'Full payment received'
      }
    ],
    createdBy: 'Demo User',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
    companyId: 'demo-company'
  }
];

export const sampleCustomers = [
  {
    id: 'sample-customer-1',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business Ave, Suite 100, New York, NY 10001',
    createdBy: 'Demo User',
    createdAt: Timestamp.now(),
    companyId: 'demo-company'
  },
  {
    id: 'sample-customer-2',
    name: 'Tech Solutions Ltd',
    email: 'info@techsolutions.com',
    phone: '+1 (555) 987-6543',
    address: '456 Innovation Drive, San Francisco, CA 94105',
    createdBy: 'Demo User',
    createdAt: Timestamp.now(),
    companyId: 'demo-company'
  },
  {
    id: 'sample-customer-3',
    name: 'Digital Marketing Pro',
    email: 'hello@digitalmarketing.com',
    phone: '+1 (555) 456-7890',
    address: '789 Creative Street, Austin, TX 78701',
    createdBy: 'Demo User',
    createdAt: Timestamp.now(),
    companyId: 'demo-company'
  }
];

export const sampleProducts = [
  {
    id: 'sample-product-1',
    name: 'Web Development Service',
    description: 'Custom website development and deployment',
    price: 2500
  },
  {
    id: 'sample-product-2',
    name: 'Mobile App Development',
    description: 'iOS and Android app development',
    price: 5000
  },
  {
    id: 'sample-product-3',
    name: 'SEO Optimization',
    description: 'Search engine optimization services',
    price: 800
  },
  {
    id: 'sample-product-4',
    name: 'Social Media Management',
    description: 'Monthly social media content and management',
    price: 1200
  }
];

export const sampleBankAccounts = [
  {
    id: 'sample-bank-1',
    userId: 'demo-user',
    accountName: 'Business Checking',
    bankName: 'First National Bank',
    accountNumber: '**** **** **** 1234',
    currency: 'USD',
    currencySymbol: '$',
    createdAt: Timestamp.now(),
    initialBalance: 10000,
    currentBalance: 15000
  },
  {
    id: 'sample-bank-2',
    userId: 'demo-user',
    accountName: 'Savings Account',
    bankName: 'Credit Union',
    accountNumber: '**** **** **** 5678',
    currency: 'USD',
    currencySymbol: '$',
    createdAt: Timestamp.now(),
    initialBalance: 25000,
    currentBalance: 25000
  }
];

export const shouldUseOfflineData = (): boolean => {
  return (
    import.meta.env.VITE_FIREBASE_OFFLINE_MODE === 'true' ||
    !navigator.onLine ||
    import.meta.env.DEV // Use offline data in development if needed
  );
};
