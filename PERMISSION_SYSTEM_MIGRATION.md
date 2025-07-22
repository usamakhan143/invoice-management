# Permission System Migration Guide

## Overview
This document outlines the complete migration from the old role-based permission system to the new granular permission system.

## What Changed

### 1. Removed Old Default Roles
- Completely removed the old role-based system (`owner`, `admin`, `manager`, `editor`, `viewer`)
- Removed `ROLE_PERMISSIONS` and `ROLE_DESCRIPTIONS` from `config/permissions.ts`
- Users now only use custom roles created through the Role Management interface

### 2. New Granular Permission System
- Each UI element and action now has its own specific permission
- 33 total granular permissions across all sections
- Permissions are organized by categories for better management

### 3. Updated Data Structure
- User profiles now use `granularPermissions: string[]` instead of the old `permissions: Permission[]`
- Custom roles store `granularPermissions` array instead of complex permission objects
- Backward compatibility maintained during migration

## New Granular Permissions

### Dashboard Permissions (7 permissions)
- `dashboard_view_total_revenue` - View Total Revenue (Paid) card
- `dashboard_view_outstanding_revenue` - View Outstanding Revenue card  
- `dashboard_view_monthly_expenses` - View This Month Expenses card
- `dashboard_view_total_customers` - View Total Customers card
- `dashboard_view_bank_accounts` - View Bank Accounts section
- `dashboard_view_recent_invoices` - View Recent Invoices section
- `dashboard_access_invoice_verification` - Access Invoice Authentication Verification

### Invoice Permissions (5 permissions)
- `invoices_create` - Show 'Create Invoice' button
- `invoices_view_pdf` - View PDF of invoices
- `invoices_payment_tracking` - Open Payment Tracking popup
- `invoices_edit` - Edit invoices
- `invoices_delete` - Delete invoices

### Customer Permissions (3 permissions)
- `customers_create` - Show 'Add Customer' button
- `customers_edit` - Edit customers
- `customers_delete` - Delete customers

### Product Permissions (3 permissions)
- `products_create` - Show 'Add Product' button
- `products_edit` - Edit products
- `products_delete` - Delete products

### Bank Account Permissions (3 permissions)
- `bank_accounts_create` - Access form to add bank accounts
- `bank_accounts_edit` - Edit bank accounts
- `bank_accounts_delete` - Delete bank accounts

### Expense Permissions (3 permissions)
- `expenses_create` - Show 'Add Expense' button
- `expenses_edit` - Edit expenses
- `expenses_delete` - Delete expenses

### Company Activity Permission (1 permission)
- `company_activity_view` - View Company Activity section (Admin equivalent)

### User Management Permissions (5 permissions)
- `user_management_create` - Show 'Create User' button
- `user_management_login_as` - Show 'Login As' button
- `user_management_edit` - Edit users
- `user_management_activate_deactivate` - Activate/Deactivate users
- `user_management_remove` - Remove users

### Custom Roles Permissions (3 permissions)
- `custom_roles_create` - Show 'Create Custom Role' button
- `custom_roles_edit` - Edit custom roles
- `custom_roles_delete` - Delete custom roles

### Sidebar Permission (1 permission)
- `sidebar_edit_profile` - Show/Edit profile icon in sidebar

## Updated Files

### Core System Files
- `config/permissions.ts` - Complete rewrite with granular permissions
- `types.ts` - Updated to support granular permissions
- `hooks/usePermissions.tsx` - Complete rewrite with granular permission functions

### Component Updates
- `components/RoleManagement.tsx` - Updated to use granular permission system
- `pages/app/UserManagementPage.tsx` - Removed custom permission override, simplified to only use custom roles
- `pages/app/DashboardPage.tsx` - Updated to use granular dashboard permissions
- `pages/app/CompanyActivityPage.tsx` - Updated to use company activity permission

### Database Changes
Custom roles now store:
```javascript
{
  name: "Role Name",
  description: "Role Description", 
  granularPermissions: ["permission1", "permission2", ...],
  companyId: "company_id",
  isDefault: false,
  createdAt: timestamp,
  createdBy: "creator_name"
}
```

User profiles now store:
```javascript
{
  // ... other fields
  role: "custom_role_name",
  granularPermissions: ["permission1", "permission2", ...],
  isOwner: boolean // Owners still have all permissions
}
```

## Migration Steps Completed

1. ✅ **Removed Old System**
   - Deleted all default role permissions
   - Removed role-based permission logic
   - Cleaned up old role references

2. ✅ **Implemented New Granular System**
   - Created 33 specific permissions
   - Updated permission checking logic
   - Organized permissions by categories

3. ✅ **Updated Role Management**
   - Role creation now uses granular permissions
   - Intuitive UI with permission descriptions
   - Organized by categories for better UX

4. ✅ **Simplified User Management**
   - Removed "Custom Permissions" override checkbox
   - Users can only be assigned to custom roles
   - Cleaner, more predictable permission model

5. ✅ **Updated Permission Checks**
   - Dashboard components use granular permissions
   - Company Activity restricted to specific permission
   - All permission checks now granular

## New Permission Functions

The `usePermissions` hook now provides specific functions for each permission:

```javascript
// Dashboard permissions
canViewTotalRevenue()
canViewOutstandingRevenue()
canViewMonthlyExpenses()
canViewTotalCustomers()
canViewDashboardBankAccounts()
canViewRecentInvoices()
canAccessInvoiceVerification()

// Invoice permissions  
canCreateInvoice()
canViewInvoicePDF()
canAccessPaymentTracking()
canEditInvoice()
canDeleteInvoice()

// And so on for all other permissions...
```

## Benefits of New System

1. **Granular Control** - Precise control over every UI element and action
2. **Better UX** - Clear permission descriptions in role management
3. **Simplified Logic** - No more complex role hierarchies
4. **Flexible** - Easy to add new permissions for new features
5. **Predictable** - One permission = one feature/action
6. **Auditable** - Clear tracking of what each role can do

## Next Steps

1. **Test thoroughly** - Verify all permissions work correctly
2. **Create default role templates** - Create common role configurations
3. **Update remaining pages** - Apply granular permissions to all remaining pages
4. **User migration** - Migrate existing users to new permission system
5. **Documentation** - Update user documentation with new permission model

## Legacy Compatibility

The system maintains backward compatibility through:
- Legacy permission checking functions still work
- Gradual migration of pages to new system
- Old permission data preserved during transition
