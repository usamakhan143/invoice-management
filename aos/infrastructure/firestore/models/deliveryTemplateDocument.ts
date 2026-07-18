import type { AgencyType } from "../../../constants/agencyType";
import { AGENCY_TYPE } from "../../../constants/agencyType";
import type { DeliveryTemplateState } from "../../../domain/delivery/templateState";
import { DELIVERY_TEMPLATE_STATE } from "../../../domain/delivery/templateState";
import type { DeliveryTemplate } from "../../../domain/delivery/entities/deliveryTemplate";
import type firebase from "firebase/compat/app";
import { omitUndefinedFields } from "../documentPayload";
import {
  epochMsToTimestamp,
  requireTimestampMs,
} from "../timestamp";

export interface DeliveryTemplateDocument {
  companyId: string;
  name: string;
  agencyType: AgencyType;
  status: DeliveryTemplateState;
  versionNumber: number;
  lifecyclePhaseKeys: string[];
  description?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
  createdById: string;
  updatedById?: string;
}

const VALID_STATUSES = new Set<string>(Object.values(DELIVERY_TEMPLATE_STATE));
const VALID_AGENCY_TYPES = new Set<string>(Object.values(AGENCY_TYPE));

export function isDeliveryTemplateState(value: unknown): value is DeliveryTemplateState {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

function isAgencyType(value: unknown): value is AgencyType {
  return typeof value === "string" && VALID_AGENCY_TYPES.has(value);
}

function lifecyclePhaseKeysFromFirestore(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry)).filter(Boolean);
}

export function deliveryTemplateFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): DeliveryTemplate | null {
  if (!data || !isDeliveryTemplateState(data.status) || !isAgencyType(data.agencyType)) {
    return null;
  }

  const companyId = String(data.companyId ?? "");
  const name = String(data.name ?? "");
  const createdById = String(data.createdById ?? "");
  const lifecyclePhaseKeys = lifecyclePhaseKeysFromFirestore(data.lifecyclePhaseKeys);

  if (!companyId || !name || !createdById) {
    return null;
  }

  return {
    id,
    companyId,
    name,
    agencyType: data.agencyType,
    status: data.status,
    versionNumber: Number(data.versionNumber ?? 1),
    lifecyclePhaseKeys,
    description: data.description ? String(data.description) : undefined,
    createdAt: requireTimestampMs(data.createdAt, "createdAt"),
    updatedAt: requireTimestampMs(data.updatedAt, "updatedAt"),
    createdById,
    updatedById: data.updatedById ? String(data.updatedById) : undefined,
  };
}

export function deliveryTemplateToFirestore(
  template: Omit<DeliveryTemplate, "id">,
): DeliveryTemplateDocument {
  return omitUndefinedFields({
    companyId: template.companyId,
    name: template.name.trim(),
    agencyType: template.agencyType,
    status: template.status,
    versionNumber: template.versionNumber,
    lifecyclePhaseKeys: [...template.lifecyclePhaseKeys],
    description: template.description?.trim() || undefined,
    createdAt: epochMsToTimestamp(template.createdAt),
    updatedAt: epochMsToTimestamp(template.updatedAt),
    createdById: template.createdById,
    updatedById: template.updatedById,
  }) as DeliveryTemplateDocument;
}
