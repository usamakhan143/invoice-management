import type { InitiativeClosureOutcome, InitiativeStatus } from "../../../constants/initiativeStatus";
import {
  INITIATIVE_CLOSURE_OUTCOME,
  INITIATIVE_STATUS,
} from "../../../constants/initiativeStatus";
import type { BosInitiative } from "../../../domain/entities/initiative";
import type firebase from "firebase/compat/app";
import {
  epochMsToTimestamp,
  requireTimestampMs,
  timestampToEpochMs,
} from "../timestamp";
import { omitUndefinedFields } from "../documentPayload";

export interface BosInitiativeDocument {
  companyId: string;
  ventureId: string;
  name: string;
  hypothesis?: string;
  successCriteria?: string;
  status: InitiativeStatus;
  closureOutcome?: InitiativeClosureOutcome;
  closureReason?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  startDate?: firebase.firestore.Timestamp;
  endDate?: firebase.firestore.Timestamp;
  closedAt?: firebase.firestore.Timestamp;
  successorInitiativeId?: string;
  predecessorInitiativeId?: string;
  createdById: string;
  updatedById?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

const VALID_STATUSES = new Set<string>(Object.values(INITIATIVE_STATUS));
const VALID_OUTCOMES = new Set<string>(Object.values(INITIATIVE_CLOSURE_OUTCOME));

export function isInitiativeStatus(value: unknown): value is InitiativeStatus {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

export function initiativeFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): BosInitiative | null {
  if (!data || !isInitiativeStatus(data.status)) return null;

  const budgetAmount =
    data.budgetAmount !== undefined && data.budgetAmount !== null
      ? Number(data.budgetAmount)
      : undefined;

  return {
    id,
    companyId: String(data.companyId ?? ""),
    ventureId: String(data.ventureId ?? ""),
    name: String(data.name ?? ""),
    hypothesis: data.hypothesis ? String(data.hypothesis) : undefined,
    successCriteria: data.successCriteria ? String(data.successCriteria) : undefined,
    status: data.status,
    closureOutcome:
      data.closureOutcome && VALID_OUTCOMES.has(data.closureOutcome)
        ? (data.closureOutcome as InitiativeClosureOutcome)
        : undefined,
    closureReason: data.closureReason ? String(data.closureReason) : undefined,
    budget:
      budgetAmount !== undefined && data.budgetCurrency
        ? { amount: budgetAmount, currency: String(data.budgetCurrency) }
        : undefined,
    startDate: timestampToEpochMs(data.startDate),
    endDate: timestampToEpochMs(data.endDate),
    closedAt: timestampToEpochMs(data.closedAt),
    successorInitiativeId: data.successorInitiativeId
      ? String(data.successorInitiativeId)
      : undefined,
    predecessorInitiativeId: data.predecessorInitiativeId
      ? String(data.predecessorInitiativeId)
      : undefined,
    createdById: String(data.createdById ?? ""),
    updatedById: data.updatedById ? String(data.updatedById) : undefined,
    createdAt: requireTimestampMs(data.createdAt, "createdAt"),
    updatedAt: requireTimestampMs(data.updatedAt, "updatedAt"),
  };
}

export function initiativeToFirestore(
  initiative: Omit<BosInitiative, "id">,
): BosInitiativeDocument {
  return omitUndefinedFields({
    companyId: initiative.companyId,
    ventureId: initiative.ventureId,
    name: initiative.name.trim(),
    hypothesis: initiative.hypothesis?.trim() || undefined,
    successCriteria: initiative.successCriteria?.trim() || undefined,
    status: initiative.status,
    closureOutcome: initiative.closureOutcome,
    closureReason: initiative.closureReason?.trim() || undefined,
    budgetAmount: initiative.budget?.amount,
    budgetCurrency: initiative.budget?.currency,
    startDate:
      initiative.startDate !== undefined ? epochMsToTimestamp(initiative.startDate) : undefined,
    endDate: initiative.endDate !== undefined ? epochMsToTimestamp(initiative.endDate) : undefined,
    closedAt:
      initiative.closedAt !== undefined ? epochMsToTimestamp(initiative.closedAt) : undefined,
    successorInitiativeId: initiative.successorInitiativeId,
    predecessorInitiativeId: initiative.predecessorInitiativeId,
    createdById: initiative.createdById,
    updatedById: initiative.updatedById,
    createdAt: epochMsToTimestamp(initiative.createdAt),
    updatedAt: epochMsToTimestamp(initiative.updatedAt),
  }) as BosInitiativeDocument;
}

export function initiativeDocumentToDomain(
  id: string,
  doc: BosInitiativeDocument,
): BosInitiative {
  return initiativeFromFirestore(id, doc as firebase.firestore.DocumentData)!;
}
