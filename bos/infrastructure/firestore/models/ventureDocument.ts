import type { VentureStatus } from "../../../constants/ventureStatus";
import { VENTURE_STATUS } from "../../../constants/ventureStatus";
import type { BosVenture } from "../../../domain/entities/venture";
import type firebase from "firebase/compat/app";
import {
  requireTimestampMs,
  timestampToEpochMs,
  epochMsToTimestamp,
} from "../timestamp";
import { omitUndefinedFields } from "../documentPayload";

export interface BosVentureDocument {
  companyId: string;
  name: string;
  description?: string;
  status: VentureStatus;
  businessModelId?: string;
  ownerUserId: string;
  createdById: string;
  updatedById?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

const VALID_STATUSES = new Set<string>(Object.values(VENTURE_STATUS));

export function isVentureStatus(value: unknown): value is VentureStatus {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

export function ventureFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): BosVenture | null {
  if (!data) return null;
  if (!isVentureStatus(data.status)) return null;

  return {
    id,
    companyId: String(data.companyId ?? ""),
    name: String(data.name ?? ""),
    description: data.description ? String(data.description) : undefined,
    status: data.status,
    businessModelId: data.businessModelId ? String(data.businessModelId) : undefined,
    ownerUserId: String(data.ownerUserId ?? ""),
    createdById: String(data.createdById ?? ""),
    updatedById: data.updatedById ? String(data.updatedById) : undefined,
    createdAt: requireTimestampMs(data.createdAt, "createdAt"),
    updatedAt: requireTimestampMs(data.updatedAt, "updatedAt"),
  };
}

export function ventureToFirestore(
  venture: Omit<BosVenture, "id">,
): BosVentureDocument {
  return omitUndefinedFields({
    companyId: venture.companyId,
    name: venture.name.trim(),
    description: venture.description?.trim() || undefined,
    status: venture.status,
    businessModelId: venture.businessModelId,
    ownerUserId: venture.ownerUserId,
    createdById: venture.createdById,
    updatedById: venture.updatedById,
    createdAt: epochMsToTimestamp(venture.createdAt),
    updatedAt: epochMsToTimestamp(venture.updatedAt),
  }) as BosVentureDocument;
}

/** Test / validation helper — round-trip without Firestore Timestamp class in tests. */
export function ventureRoundTripFields(venture: BosVenture): BosVenture {
  const doc = ventureToFirestore(venture);
  return ventureFromFirestore("test-id", {
    ...doc,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  })!;
}

export function ventureDocumentToDomain(id: string, doc: BosVentureDocument): BosVenture {
  return {
    id,
    companyId: doc.companyId,
    name: doc.name,
    description: doc.description,
    status: doc.status,
    businessModelId: doc.businessModelId,
    ownerUserId: doc.ownerUserId,
    createdById: doc.createdById,
    updatedById: doc.updatedById,
    createdAt: timestampToEpochMs(doc.createdAt)!,
    updatedAt: timestampToEpochMs(doc.updatedAt)!,
  };
}
