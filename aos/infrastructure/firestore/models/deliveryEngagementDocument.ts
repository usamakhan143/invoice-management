import type { AgencyType } from "../../../constants/agencyType";
import { AGENCY_TYPE } from "../../../constants/agencyType";
import type { EngagementType } from "../../../constants/engagementType";
import { ENGAGEMENT_TYPE } from "../../../constants/engagementType";
import type { DeliveryState } from "../../../domain/delivery/deliveryState";
import { DELIVERY_STATE } from "../../../domain/delivery/deliveryState";
import type { DeliveryEngagement } from "../../../domain/delivery/entities/deliveryEngagement";
import type firebase from "firebase/compat/app";
import { omitUndefinedFields } from "../documentPayload";
import {
  epochMsToTimestamp,
  requireTimestampMs,
  timestampToEpochMs,
} from "../timestamp";

export interface DeliveryEngagementDocument {
  companyId: string;
  title: string;
  scopeSummary?: string;
  status: DeliveryState;
  pausedFromState?: DeliveryState;
  agencyType?: AgencyType;
  engagementType?: EngagementType;
  erpCustomerId: string;
  erpLeadId?: string;
  bosInitiativeId?: string | null;
  bosVentureId?: string | null;
  deliveryTemplateId?: string;
  appliedTemplateVersion?: number;
  deliveryLeadUserId: string;
  teamMemberUserIds?: string[];
  currentApprovedRequirementSetId?: string;
  currentApprovedPromptPackId?: string;
  completedRetrospectiveId?: string;
  cancelReason?: string;
  pausedAt?: firebase.firestore.Timestamp;
  closedAt?: firebase.firestore.Timestamp;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
  createdById: string;
  updatedById?: string;
}

const VALID_STATUSES = new Set<string>(Object.values(DELIVERY_STATE));
const VALID_AGENCY_TYPES = new Set<string>(Object.values(AGENCY_TYPE));
const VALID_ENGAGEMENT_TYPES = new Set<string>(Object.values(ENGAGEMENT_TYPE));

export function isDeliveryState(value: unknown): value is DeliveryState {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

function isAgencyType(value: unknown): value is AgencyType {
  return typeof value === "string" && VALID_AGENCY_TYPES.has(value);
}

function isEngagementType(value: unknown): value is EngagementType {
  return typeof value === "string" && VALID_ENGAGEMENT_TYPES.has(value);
}

function stringArrayFromFirestore(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((entry) => String(entry)).filter(Boolean);
  return items.length ? items : undefined;
}

export function deliveryEngagementFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): DeliveryEngagement | null {
  if (!data || !isDeliveryState(data.status)) return null;
  if (data.pausedFromState !== undefined && !isDeliveryState(data.pausedFromState)) return null;
  if (data.agencyType !== undefined && !isAgencyType(data.agencyType)) return null;
  if (data.engagementType !== undefined && !isEngagementType(data.engagementType)) return null;

  const companyId = String(data.companyId ?? "");
  const title = String(data.title ?? "");
  const erpCustomerId = String(data.erpCustomerId ?? "");
  const deliveryLeadUserId = String(data.deliveryLeadUserId ?? "");
  const createdById = String(data.createdById ?? "");

  if (!companyId || !title || !erpCustomerId || !deliveryLeadUserId || !createdById) {
    return null;
  }

  return {
    id,
    companyId,
    title,
    scopeSummary: data.scopeSummary ? String(data.scopeSummary) : undefined,
    status: data.status,
    pausedFromState: data.pausedFromState ? data.pausedFromState : undefined,
    agencyType: data.agencyType ? data.agencyType : undefined,
    engagementType: data.engagementType ? data.engagementType : undefined,
    erpCustomerId,
    erpLeadId: data.erpLeadId ? String(data.erpLeadId) : undefined,
    bosInitiativeId:
      data.bosInitiativeId === null || data.bosInitiativeId === undefined
        ? undefined
        : String(data.bosInitiativeId),
    bosVentureId:
      data.bosVentureId === null || data.bosVentureId === undefined
        ? undefined
        : String(data.bosVentureId),
    deliveryTemplateId: data.deliveryTemplateId ? String(data.deliveryTemplateId) : undefined,
    appliedTemplateVersion:
      data.appliedTemplateVersion !== undefined ? Number(data.appliedTemplateVersion) : undefined,
    deliveryLeadUserId,
    teamMemberUserIds: stringArrayFromFirestore(data.teamMemberUserIds),
    currentApprovedRequirementSetId: data.currentApprovedRequirementSetId
      ? String(data.currentApprovedRequirementSetId)
      : undefined,
    currentApprovedPromptPackId: data.currentApprovedPromptPackId
      ? String(data.currentApprovedPromptPackId)
      : undefined,
    completedRetrospectiveId: data.completedRetrospectiveId
      ? String(data.completedRetrospectiveId)
      : undefined,
    cancelReason: data.cancelReason ? String(data.cancelReason) : undefined,
    pausedAt: timestampToEpochMs(data.pausedAt),
    closedAt: timestampToEpochMs(data.closedAt),
    createdAt: requireTimestampMs(data.createdAt, "createdAt"),
    updatedAt: requireTimestampMs(data.updatedAt, "updatedAt"),
    createdById,
    updatedById: data.updatedById ? String(data.updatedById) : undefined,
  };
}

export function deliveryEngagementToFirestore(
  engagement: Omit<DeliveryEngagement, "id">,
): DeliveryEngagementDocument {
  return omitUndefinedFields({
    companyId: engagement.companyId,
    title: engagement.title.trim(),
    scopeSummary: engagement.scopeSummary?.trim() || undefined,
    status: engagement.status,
    pausedFromState: engagement.pausedFromState,
    agencyType: engagement.agencyType,
    engagementType: engagement.engagementType,
    erpCustomerId: engagement.erpCustomerId,
    erpLeadId: engagement.erpLeadId,
    bosInitiativeId: engagement.bosInitiativeId ?? null,
    bosVentureId: engagement.bosVentureId ?? null,
    deliveryTemplateId: engagement.deliveryTemplateId,
    appliedTemplateVersion: engagement.appliedTemplateVersion,
    deliveryLeadUserId: engagement.deliveryLeadUserId,
    teamMemberUserIds: engagement.teamMemberUserIds?.length
      ? engagement.teamMemberUserIds
      : undefined,
    currentApprovedRequirementSetId: engagement.currentApprovedRequirementSetId,
    currentApprovedPromptPackId: engagement.currentApprovedPromptPackId,
    completedRetrospectiveId: engagement.completedRetrospectiveId,
    cancelReason: engagement.cancelReason?.trim() || undefined,
    pausedAt:
      engagement.pausedAt !== undefined ? epochMsToTimestamp(engagement.pausedAt) : undefined,
    closedAt:
      engagement.closedAt !== undefined ? epochMsToTimestamp(engagement.closedAt) : undefined,
    createdAt: epochMsToTimestamp(engagement.createdAt),
    updatedAt: epochMsToTimestamp(engagement.updatedAt),
    createdById: engagement.createdById,
    updatedById: engagement.updatedById,
  }) as DeliveryEngagementDocument;
}
