/**
 * ERP/BOS Firestore collection names used by read-only adapters (Sidecar Law).
 * AOS never writes to these collections.
 */
export const ERP_READ_COLLECTIONS = {
  CUSTOMERS: "customers",
  LEADS: "leads",
  USERS: "users",
  COMPANY_USERS: "companyUsers",
} as const;

export const BOS_READ_COLLECTIONS = {
  INITIATIVES: "bosInitiatives",
} as const;

export type ErpReadCollectionName =
  (typeof ERP_READ_COLLECTIONS)[keyof typeof ERP_READ_COLLECTIONS];

export type BosReadCollectionName =
  (typeof BOS_READ_COLLECTIONS)[keyof typeof BOS_READ_COLLECTIONS];
