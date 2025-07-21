# Customer Visibility Fix - Migration to Centralized Storage

## Issue Fixed

**Problem**: Company admins could only see customers created by their own account, not customers created by other users within the company.

**Root Cause**: Customers were stored in user subcollections (`users/{userId}/customers`) instead of a centralized collection, making company-wide visibility impossible.

## Solution Implemented

Applied the same centralized storage pattern used by invoices to customers:

### 1. Created CustomerService (`services/customerService.ts`)
- Mirrors the pattern used in `InvoiceService`
- Stores customers in centralized `customers` collection
- Adds company and creator tracking fields
- Provides role-based filtering (admin sees all company customers, users see their own)
- Real-time updates with polling mechanism

### 2. Updated Customer Type Definition
Added creator tracking fields to `Customer` interface in `types.ts`:
```typescript
export interface Customer {
  // ... existing fields
  createdBy?: string;
  createdById?: string;
  companyId?: string;
  createdAt?: firebase.firestore.Timestamp;
  updatedBy?: string;
  updatedById?: string;
  updatedAt?: firebase.firestore.Timestamp;
}
```

### 3. Updated All Customer Usage
Updated the following files to use centralized `CustomerService`:
- `pages/app/CustomersPage.tsx` - Main customer management
- `pages/app/InvoiceFormPage.tsx` - Customer selection in invoices
- `pages/app/DashboardPage.tsx` - Customer metrics
- `pages/app/InvoicesListPage.tsx` - Customer data loading

### 4. Created Migration Utilities
- `services/customerMigration.ts` - Migrate existing data
- `CustomerService.migrateAllCustomers()` - Move data from subcollections
- Verification and cleanup tools

### 5. Updated Firebase Indexes
Added required indexes in `FIREBASE_INDEXES.md`:
- `customers` collection indexed by `companyId` and `createdAt`
- `customers` collection indexed by `createdById` and `createdAt`

## Data Migration Required

### For Existing Data
Since customers were previously stored in subcollections, existing data needs to be migrated:

```javascript
// Run in browser console after logging in as admin
await CustomerMigration.migrateAllCustomers();

// Verify migration
await CustomerMigration.verifyMigration();

// After verification, optionally cleanup old subcollections
// await CustomerMigration.cleanupSubcollections();
```

### Migration Process
1. **Backup**: Existing data is preserved during migration
2. **Migrate**: Copies all customers to centralized collection with proper company/creator tracking
3. **Verify**: Confirms all data was migrated successfully
4. **Cleanup**: (Optional) Removes old subcollection data

## New Behavior

### Company Admin View
- ✅ Sees **all customers** created by any user in the company
- ✅ Each customer shows **who created it** and **when**
- ✅ Same behavior as invoices list

### Regular User View
- ✅ Sees only their own customers
- ✅ Can create new customers (visible to company admin)

### Real-time Updates
- ✅ Customer list updates automatically
- ✅ New customers appear immediately for all relevant users
- ✅ Matches invoice behavior

## Files Modified

### New Files
- `services/customerService.ts` - Centralized customer operations
- `services/customerMigration.ts` - Data migration utilities
- `CUSTOMER_MIGRATION.md` - This documentation

### Modified Files
- `types.ts` - Added creator tracking to Customer interface
- `pages/app/CustomersPage.tsx` - Use CustomerService instead of direct queries
- `pages/app/InvoiceFormPage.tsx` - Use CustomerService for customer loading
- `pages/app/DashboardPage.tsx` - Use CustomerService for metrics
- `pages/app/InvoicesListPage.tsx` - Use CustomerService for customer data
- `FIREBASE_INDEXES.md` - Added customer collection indexes

## Database Schema Changes

### Before (Subcollections)
```
users/{userId}/customers/{customerId}
├── name
├── email
├── phone
└── address
```

### After (Centralized)
```
customers/{customerId}
├── name
├── email
├── phone
├── address
├── createdBy (user display name)
├── createdById (user ID)
├── companyId (company/owner ID)
├── createdAt (timestamp)
├── updatedBy (last updater name)
├── updatedById (last updater ID)
└── updatedAt (last update timestamp)
```

## Testing

### Manual Testing Steps
1. **As Company Admin**:
   - Create a customer - should appear immediately
   - Invite a new user to the company
   - Log in as the new user, create customers
   - Log back in as admin - should see all customers with creator info

2. **As Regular User**:
   - Should only see own customers
   - Should not see customers created by other users
   - New customers should appear immediately

3. **Migration Testing**:
   - Run migration utilities in console
   - Verify customer counts match before/after
   - Confirm admin can see all migrated customers

## Firebase Index Requirements

Make sure these indexes are created in Firebase Console:

```
Collection: customers
Fields: companyId (Ascending), createdAt (Descending)

Collection: customers
Fields: createdById (Ascending), createdAt (Descending)
```

## Rollback Plan

If issues occur, the old subcollection data is preserved until cleanup is run. The system can be rolled back by:

1. Reverting the code changes
2. The old subcollection data will still be accessible
3. Migration can be re-run after fixing any issues

## Performance Impact

- **Positive**: More efficient queries (no need to query multiple subcollections)
- **Positive**: Better scalability for companies with many users
- **Neutral**: Uses polling for real-time updates (same as invoices)
- **Consideration**: Requires Firebase indexes for optimal performance
