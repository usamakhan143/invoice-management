/**
 * Top-level Firestore collection names for AOS Delivery bounded context.
 */
export const AOS_COLLECTIONS = {
  DELIVERY_ENGAGEMENTS: "aosDeliveryEngagements",
  DELIVERY_TEMPLATES: "aosDeliveryTemplates",
  DELIVERY_QUALITY_REPORTS: "aosDeliveryQualityReports",
} as const;

export type AosCollectionName = (typeof AOS_COLLECTIONS)[keyof typeof AOS_COLLECTIONS];

export const DEFAULT_PAGE_SIZE = 25;

export const MAX_PAGE_SIZE = 100;
