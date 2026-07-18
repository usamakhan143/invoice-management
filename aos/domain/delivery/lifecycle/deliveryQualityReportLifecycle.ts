import {
  DELIVERY_QUALITY_REPORT_STATE,
  type DeliveryQualityReportState,
} from "../qualityReportState";

export type DeliveryQualityReportTransitionEvent =
  | "finish_generating"
  | "approve"
  | "archive";

const DELIVERY_QUALITY_REPORT_TRANSITIONS: Record<
  DeliveryQualityReportState,
  Partial<Record<DeliveryQualityReportTransitionEvent, DeliveryQualityReportState>>
> = {
  [DELIVERY_QUALITY_REPORT_STATE.GENERATING]: {
    finish_generating: DELIVERY_QUALITY_REPORT_STATE.DRAFT,
  },
  [DELIVERY_QUALITY_REPORT_STATE.DRAFT]: {
    approve: DELIVERY_QUALITY_REPORT_STATE.APPROVED,
  },
  [DELIVERY_QUALITY_REPORT_STATE.APPROVED]: {
    archive: DELIVERY_QUALITY_REPORT_STATE.ARCHIVED,
  },
  [DELIVERY_QUALITY_REPORT_STATE.ARCHIVED]: {},
};

export function getDeliveryQualityReportNextStatus(
  current: DeliveryQualityReportState,
  event: DeliveryQualityReportTransitionEvent,
): DeliveryQualityReportState | undefined {
  return DELIVERY_QUALITY_REPORT_TRANSITIONS[current]?.[event];
}

export function isDeliveryQualityReportTransitionAllowed(
  from: DeliveryQualityReportState,
  to: DeliveryQualityReportState,
): boolean {
  const allowed = DELIVERY_QUALITY_REPORT_TRANSITIONS[from];
  if (!allowed) return false;
  return Object.values(allowed).includes(to);
}
