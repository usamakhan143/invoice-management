import { domainFailOne, domainOk, type DomainResult } from "../../domainResult";
import { DELIVERY_QUALITY_REPORT_STATE } from "../qualityReportState";
import type {
  CreateDeliveryQualityReportInput,
  DeliveryQualityReport,
  UpdateDeliveryQualityReportDraftInput,
} from "../entities/deliveryQualityReport";
import {
  isDeliveryQualityReportTransitionAllowed,
} from "../lifecycle/deliveryQualityReportLifecycle";
import type { DeliveryQualityReportState } from "../qualityReportState";

export function validateCreateDeliveryQualityReport(
  input: CreateDeliveryQualityReportInput,
): DomainResult {
  if (!input.deliveryEngagementId?.trim()) {
    return domainFailOne(
      "DELIVERY_QUALITY_REPORT_ENGAGEMENT_REQUIRED",
      "Quality report must reference a Delivery Engagement.",
    );
  }
  return domainOk();
}

export function validateDeliveryQualityReportGeneration(
  options: { evaluationCount: number },
): DomainResult {
  if (options.evaluationCount < 1) {
    return domainFailOne(
      "DELIVERY_QUALITY_REPORT_EVALUATIONS_REQUIRED",
      "At least one Evaluation record is required to generate a quality report.",
    );
  }
  return domainOk();
}

export function validateUpdateDeliveryQualityReportDraft(
  report: DeliveryQualityReport,
  _input: UpdateDeliveryQualityReportDraftInput,
): DomainResult {
  if (report.status !== DELIVERY_QUALITY_REPORT_STATE.DRAFT) {
    return domainFailOne(
      "DELIVERY_QUALITY_REPORT_IMMUTABLE",
      "Only draft quality reports can be edited.",
    );
  }
  return domainOk();
}

export function validateDeliveryQualityReportStatusTransition(
  report: DeliveryQualityReport,
  nextStatus: DeliveryQualityReportState,
): DomainResult {
  if (
    report.status === DELIVERY_QUALITY_REPORT_STATE.APPROVED ||
    report.status === DELIVERY_QUALITY_REPORT_STATE.ARCHIVED
  ) {
    if (nextStatus === DELIVERY_QUALITY_REPORT_STATE.DRAFT) {
      return domainFailOne(
        "DELIVERY_QUALITY_REPORT_IMMUTABLE",
        "Approved or archived quality reports are immutable.",
      );
    }
  }

  if (!isDeliveryQualityReportTransitionAllowed(report.status, nextStatus)) {
    return domainFailOne(
      "DELIVERY_QUALITY_REPORT_INVALID_TRANSITION",
      `Transition from ${report.status} to ${nextStatus} is not allowed.`,
    );
  }

  return domainOk();
}
