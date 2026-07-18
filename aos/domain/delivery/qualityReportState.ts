/**
 * Delivery Quality Report lifecycle states — frozen domain model §01.
 */

export const DELIVERY_QUALITY_REPORT_STATE = {
  GENERATING: "generating",
  DRAFT: "draft",
  APPROVED: "approved",
  ARCHIVED: "archived",
} as const;

export type DeliveryQualityReportState =
  (typeof DELIVERY_QUALITY_REPORT_STATE)[keyof typeof DELIVERY_QUALITY_REPORT_STATE];

export const DELIVERY_QUALITY_REPORT_STATE_LABELS: Record<
  DeliveryQualityReportState,
  string
> = {
  [DELIVERY_QUALITY_REPORT_STATE.GENERATING]: "Generating",
  [DELIVERY_QUALITY_REPORT_STATE.DRAFT]: "Draft",
  [DELIVERY_QUALITY_REPORT_STATE.APPROVED]: "Approved",
  [DELIVERY_QUALITY_REPORT_STATE.ARCHIVED]: "Archived",
};
