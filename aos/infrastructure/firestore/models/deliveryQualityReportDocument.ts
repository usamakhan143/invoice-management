import type { DeliveryQualityReportState } from "../../../domain/delivery/qualityReportState";
import { DELIVERY_QUALITY_REPORT_STATE } from "../../../domain/delivery/qualityReportState";
import type { DeliveryQualityReport } from "../../../domain/delivery/entities/deliveryQualityReport";
import type firebase from "firebase/compat/app";
import { omitUndefinedFields } from "../documentPayload";
import {
  epochMsToTimestamp,
  requireTimestampMs,
  timestampToEpochMs,
} from "../timestamp";

export interface DeliveryQualityReportDocument {
  companyId: string;
  deliveryEngagementId: string;
  status: DeliveryQualityReportState;
  summaryNotes?: string;
  evaluationPassRate?: number;
  reuseRate?: number;
  promptRevisionCount?: number;
  requirementCoverage?: number;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
  approvedAt?: firebase.firestore.Timestamp;
  createdById: string;
  updatedById?: string;
  approvedById?: string;
}

const VALID_STATUSES = new Set<string>(Object.values(DELIVERY_QUALITY_REPORT_STATE));

export function isDeliveryQualityReportState(
  value: unknown,
): value is DeliveryQualityReportState {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

export function deliveryQualityReportFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): DeliveryQualityReport | null {
  if (!data || !isDeliveryQualityReportState(data.status)) return null;

  const companyId = String(data.companyId ?? "");
  const deliveryEngagementId = String(data.deliveryEngagementId ?? "");
  const createdById = String(data.createdById ?? "");

  if (!companyId || !deliveryEngagementId || !createdById) {
    return null;
  }

  return {
    id,
    companyId,
    deliveryEngagementId,
    status: data.status,
    summaryNotes: data.summaryNotes ? String(data.summaryNotes) : undefined,
    evaluationPassRate:
      data.evaluationPassRate !== undefined ? Number(data.evaluationPassRate) : undefined,
    reuseRate: data.reuseRate !== undefined ? Number(data.reuseRate) : undefined,
    promptRevisionCount:
      data.promptRevisionCount !== undefined ? Number(data.promptRevisionCount) : undefined,
    requirementCoverage:
      data.requirementCoverage !== undefined ? Number(data.requirementCoverage) : undefined,
    createdAt: requireTimestampMs(data.createdAt, "createdAt"),
    updatedAt: requireTimestampMs(data.updatedAt, "updatedAt"),
    approvedAt: timestampToEpochMs(data.approvedAt),
    createdById,
    updatedById: data.updatedById ? String(data.updatedById) : undefined,
    approvedById: data.approvedById ? String(data.approvedById) : undefined,
  };
}

export function deliveryQualityReportToFirestore(
  report: Omit<DeliveryQualityReport, "id">,
): DeliveryQualityReportDocument {
  return omitUndefinedFields({
    companyId: report.companyId,
    deliveryEngagementId: report.deliveryEngagementId,
    status: report.status,
    summaryNotes: report.summaryNotes?.trim() || undefined,
    evaluationPassRate: report.evaluationPassRate,
    reuseRate: report.reuseRate,
    promptRevisionCount: report.promptRevisionCount,
    requirementCoverage: report.requirementCoverage,
    createdAt: epochMsToTimestamp(report.createdAt),
    updatedAt: epochMsToTimestamp(report.updatedAt),
    approvedAt:
      report.approvedAt !== undefined ? epochMsToTimestamp(report.approvedAt) : undefined,
    createdById: report.createdById,
    updatedById: report.updatedById,
    approvedById: report.approvedById,
  }) as DeliveryQualityReportDocument;
}
