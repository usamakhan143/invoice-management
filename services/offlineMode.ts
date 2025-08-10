// Emergency offline mode - bypasses Firebase completely

export const OFFLINE_MODE_KEY = 'EMERGENCY_OFFLINE_MODE';

// Check if we should use emergency offline mode
export const isEmergencyOfflineMode = (): boolean => {
  return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
};

// Enable emergency offline mode
export const enableEmergencyOfflineMode = (): void => {
  localStorage.setItem(OFFLINE_MODE_KEY, 'true');
  console.log('🚨 Emergency offline mode enabled');
};

// Disable emergency offline mode
export const disableEmergencyOfflineMode = (): void => {
  localStorage.removeItem(OFFLINE_MODE_KEY);
  console.log('✅ Emergency offline mode disabled');
};

// Mock data for offline mode
export const mockUserProfile = {
  uid: 'offline_user',
  email: 'offline@example.com',
  companyName: 'Offline Company',
  displayName: 'Offline User',
  createdAt: { toDate: () => new Date() },
  invoiceCounter: 1,
  isOwner: true,
  companyId: 'offline_user',
  granularPermissions: ['*'], // All permissions
  isActive: true,
};

export const mockInvoices = [
  {
    id: 'offline_invoice_1',
    invoiceNumber: 'INV-001',
    customerId: 'offline_customer_1',
    customerName: 'Sample Customer',
    items: [
      {
        productId: 'offline_product_1',
        name: 'Sample Service',
        quantity: 1,
        price: 1000,
      }
    ],
    total: 1000,
    status: 'paid' as const,
    issueDate: { toDate: () => new Date() },
    dueDate: { toDate: () => new Date() },
    paymentType: 'full' as const,
    totalAmountDue: 1000,
    amountPaid: 1000,
    remainingAmount: 0,
    payments: [],
    createdBy: 'Offline User',
    createdAt: { toDate: () => new Date() },
  }
];

export const mockCustomers = [
  {
    id: 'offline_customer_1',
    name: 'Sample Customer',
    email: 'customer@example.com',
    phone: '+1 234 567 8900',
    address: '123 Sample Street, Sample City',
    createdBy: 'Offline User',
    createdAt: { toDate: () => new Date() },
  }
];

export const mockBankAccounts = [
  {
    id: 'offline_bank_1',
    userId: 'offline_user',
    accountName: 'Main Account',
    bankName: 'Sample Bank',
    accountNumber: '****1234',
    currency: 'USD',
    currencySymbol: '$',
    createdAt: { toDate: () => new Date() },
    initialBalance: 5000,
    currentBalance: 6000,
  }
];

export const mockExpenses = [
  {
    id: 'offline_expense_1',
    userId: 'offline_user',
    title: 'Office Supplies',
    description: 'Monthly office supplies',
    amount: 150,
    category: 'Office',
    bankAccountId: 'offline_bank_1',
    bankAccountName: 'Main Account',
    currency: 'USD',
    currencySymbol: '$',
    date: { toDate: () => new Date() },
    createdAt: { toDate: () => new Date() },
  }
];

// Mock services for offline mode
export const offlineServices = {
  auth: {
    currentUser: {
      uid: 'offline_user',
      email: 'offline@example.com',
    },
    onAuthStateChanged: (callback: any) => {
      // Immediately call with mock user
      setTimeout(() => callback(offlineServices.auth.currentUser), 100);
      return () => {}; // Unsubscribe function
    },
    signOut: () => Promise.resolve(),
  },
  
  db: {
    collection: (collectionName: string) => ({
      doc: (docId: string) => ({
        get: () => Promise.resolve({
          exists: true,
          data: () => {
            switch (collectionName) {
              case 'users':
                return mockUserProfile;
              default:
                return {};
            }
          }
        }),
        onSnapshot: (callback: any) => {
          setTimeout(() => callback({
            exists: true,
            data: () => {
              switch (collectionName) {
                case 'users':
                  return mockUserProfile;
                default:
                  return {};
              }
            }
          }), 100);
          return () => {}; // Unsubscribe function
        }
      }),
      where: () => ({
        get: () => {
          let docs: any[] = [];
          switch (collectionName) {
            case 'invoices':
              docs = mockInvoices;
              break;
            case 'customers':
              docs = mockCustomers;
              break;
            case 'bankAccounts':
              docs = mockBankAccounts;
              break;
            case 'expenses':
              docs = mockExpenses;
              break;
          }
          return Promise.resolve({
            docs: docs.map(doc => ({
              id: doc.id,
              data: () => doc
            }))
          });
        },
        onSnapshot: (callback: any) => {
          let docs: any[] = [];
          switch (collectionName) {
            case 'invoices':
              docs = mockInvoices;
              break;
            case 'customers':
              docs = mockCustomers;
              break;
            case 'bankAccounts':
              docs = mockBankAccounts;
              break;
            case 'expenses':
              docs = mockExpenses;
              break;
          }
          setTimeout(() => callback({
            docs: docs.map(doc => ({
              id: doc.id,
              data: () => doc
            }))
          }), 100);
          return () => {}; // Unsubscribe function
        }
      }),
      get: () => {
        let docs: any[] = [];
        switch (collectionName) {
          case 'invoices':
            docs = mockInvoices;
            break;
          case 'customers':
            docs = mockCustomers;
            break;
          case 'bankAccounts':
            docs = mockBankAccounts;
            break;
          case 'expenses':
            docs = mockExpenses;
            break;
        }
        return Promise.resolve({
          docs: docs.map(doc => ({
            id: doc.id,
            data: () => doc
          }))
        });
      }
    })
  }
};
