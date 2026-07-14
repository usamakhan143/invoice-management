import type { AttributionSourceType } from "../../../constants/attributionSourceType";
import { ATTRIBUTION_SOURCE_TYPE } from "../../../constants/attributionSourceType";
import type { AttributionStatus } from "../../../constants/attributionStatus";
import { ATTRIBUTION_STATUS } from "../../../constants/attributionStatus";
import type { BosAttribution } from "../../../domain/entities/attribution";
import type firebase from "firebase/compat/app";
import {
  epochMsToTimestamp,
  requireTimestampMs,
  timestampToEpochMs,
} from "../timestamp";
import { omitUndefinedFields } from "../documentPayload";

export interface BosAttributionDocument {
  companyId: string;
  initiativeId: string;
  ventureId: string;
  sourceType: AttributionSourceType;
  sourceId: string;
  status: AttributionStatus;
  allocationPercent: number;
  amountSnapshot?: number;
  currencySnapshot?: string;
  notes?: string;
  attributedById: string;
  supersededById?: string;
  voidReason?: string;
  createdById: string;
  updatedById?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

const VALID_STATUSES = new Set<string>(Object.values(ATTRIBUTION_STATUS));
const VALID_SOURCE_TYPES = new Set<string>(Object.values(ATTRIBUTION_SOURCE_TYPE));

export function isAttributionStatus(value: unknown): value is AttributionStatus {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

export function isAttributionSourceType(value: unknown): value is AttributionSourceType {
  return typeof value === "string" && VALID_SOURCE_TYPES.has(value);
}

export function attributionFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): BosAttribution | null {
  if (!data || !isAttributionStatus(data.status) || !isAttributionSourceType(data.sourceType)) {
    return null;
  }

  return {
    id,
    companyId: String(data.companyId ?? ""),
    initiativeId: String(data.initiativeId ?? ""),
    ventureId: String(data.ventureId ?? ""),
    sourceType: data.sourceType,
    sourceId: String(data.sourceId ?? ""),
    status: data.status,
    allocationPercent: Number(data.allocationPercent ?? 0),
    amountSnapshot:
      data.amountSnapshot !== undefined && data.amountSnapshot !== null
        ? Number(data.amountSnapshot)
        : undefined,
    currencySnapshot: data.currencySnapshot ? String(data.currencySnapshot) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    attributedById: String(data.attributedById ?? ""),
    supersededById: data.supersededById ? String(data.supersededById) : undefined,
    voidReason: data.voidReason ? String(data.voidReason) : undefined,
    createdById: String(data.createdById ?? ""),
    updatedById: data.updatedById ? String(data.updatedById) : undefined,
    createdAt: requireTimestampMs(data.createdAt, "createdAt"),
    updatedAt: requireTimestampMs(data.updatedAt, "updatedAt"),
  };
}

export function attributionToFirestore(
  attribution: Omit<BosAttribution, "id">,
): BosAttributionDocument {
  return omitUndefinedFields({
    companyId: attribution.companyId,
    initiativeId: attribution.initiativeId,
    ventureId: attribution.ventureId,
    sourceType: attribution.sourceType,
    sourceId: attribution.sourceId.trim(),
    status: attribution.status,
    allocationPercent: attribution.allocationPercent,
    amountSnapshot: attribution.amountSnapshot,
    currencySnapshot: attribution.currencySnapshot,
    notes: attribution.notes?.trim() || undefined,
    attributedById: attribution.attributedById,
    supersededById: attribution.supersededById,
    voidReason: attribution.voidReason?.trim() || undefined,
    createdById: attribution.createdById,
    updatedById: attribution.updatedById,
    createdAt: epochMsToTimestamp(attribution.createdAt),
    updatedAt: epochMsToTimestamp(attribution.updatedAt),
  }) as BosAttributionDocument;
}
