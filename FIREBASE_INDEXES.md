# Firebase Indexes Required

The following Firestore indexes are required for the invoicing application to work properly:

## Indexes for Invoices Collection

### 1. Company invoices ordered by issue date

```
Collection: invoices
Fields: companyId (Ascending), issueDate (Descending)
```

### 2. User invoices ordered by issue date

```
Collection: invoices
Fields: createdById (Ascending), issueDate (Descending)
```

### 3. Company invoices ordered by creation date

```
Collection: invoices
Fields: companyId (Ascending), createdAt (Descending)
```

## Indexes for Bank Accounts Collection

### 1. Bank accounts by user

```
Collection: bankAccounts
Fields: userId (Ascending)
```

## Indexes for Customers Collection

### 1. Company customers ordered by creation date

```
Collection: customers
Fields: companyId (Ascending), createdAt (Descending)
```

### 2. User customers ordered by creation date

```
Collection: customers
Fields: createdById (Ascending), createdAt (Descending)
```

## Indexes for Users Collection

### 1. Company users

```
Collection: users
Fields: companyId (Ascending)
```

## How to Create Indexes

### Option 1: Automatic Creation

Run the application and perform the following actions - Firebase will prompt you to create the required indexes:

1. Login as an admin/owner
2. Navigate to Dashboard (will trigger invoice queries)
3. Navigate to Invoices List (will trigger invoice listing queries)
4. Create a new invoice (will trigger save operations)

### Option 2: Manual Creation

Go to Firebase Console > Firestore Database > Indexes and create the indexes listed above.

### Option 3: Using Firebase CLI

Create a `firestore.indexes.json` file with the following content:

```json
{
  "indexes": [
    {
      "collectionGroup": "invoices",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "companyId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "issueDate",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "invoices",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "createdById",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "issueDate",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "companyId",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then run: `firebase deploy --only firestore:indexes`

## Error Messages to Watch For

If you see errors like these, you need to create the corresponding indexes:

- "The query requires an index"
- "Failed to load invoices" in browser console
- "Firestore index error" messages

Click the link in the error message to automatically create the required index in Firebase Console.
