import type { CompanyId, EpochMs, UserId } from "../../../types";
import type { DeliveryQualityReportState } from "../qualityReportState";
import type {
  DeliveryEngagementId,
  DeliveryQualityReportId,
} from "../valueObjects";

/**
 * DeliveryQualityReport — aggregated quality snapshot at handoff or close.
 *
 * Lifecycle: generating → draft → approved → archived
 */
export interface DeliveryQualityReport {
  id: DeliveryQualityReportId;
  companyId: CompanyId;
  deliveryEngagementId: DeliveryEngagementId;
  status: DeliveryQualityReportState;
  summaryNotes?: string;
  evaluationPassRate?: number;
  reuseRate?: number;
  promptRevisionCount?: number;
  requirementCoverage?: number;
  createdAt: EpochMs;
  updatedAt: EpochMs;
  approvedAt?: EpochMs;
  createdById: UserId;
  updatedById?: UserId;
  approvedById?: UserId;
}

export interface CreateDeliveryQualityReportInput {
  companyId: CompanyId;
  deliveryEngagementId: DeliveryEngagementId;
  createdById: UserId;
}

export interface UpdateDeliveryQualityReportDraftInput {
  summaryNotes?: string;
  updatedById: UserId;
}

export interface ApproveDeliveryQualityReportInput {
  approvedById: UserId;
}
