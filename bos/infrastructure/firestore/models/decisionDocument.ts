import type { DecisionStatus, DecisionType } from "../../../constants/decisionStatus";
import { DECISION_STATUS, DECISION_TYPE } from "../../../constants/decisionStatus";
import type { BosDecision, BosDecisionAlternative } from "../../../domain/entities/decision";
import type firebase from "firebase/compat/app";
import {
  epochMsToTimestamp,
  requireTimestampMs,
  timestampToEpochMs,
} from "../timestamp";
import { omitUndefinedFields } from "../documentPayload";

export interface BosDecisionDocument {
  companyId: string;
  ventureId?: string;
  initiativeId?: string;
  title: string;
  context?: string;
  decision: string;
  decisionType: DecisionType;
  status: DecisionStatus;
  alternatives?: BosDecisionAlternative[];
  expectedOutcome?: string;
  actualOutcome?: string;
  decidedAt?: firebase.firestore.Timestamp;
  decidedById?: string;
  evaluatedAt?: firebase.firestore.Timestamp;
  supersedesDecisionId?: string;
  createdById: string;
  updatedById?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

const VALID_STATUSES = new Set<string>(Object.values(DECISION_STATUS));
const VALID_TYPES = new Set<string>(Object.values(DECISION_TYPE));

export function isDecisionStatus(value: unknown): value is DecisionStatus {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

export function isDecisionType(value: unknown): value is DecisionType {
  return typeof value === "string" && VALID_TYPES.has(value);
}

export function decisionFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): BosDecision | null {
  if (!data || !isDecisionStatus(data.status) || !isDecisionType(data.decisionType)) {
    return null;
  }

  return {
    id,
    companyId: String(data.companyId ?? ""),
    ventureId: data.ventureId ? String(data.ventureId) : undefined,
    initiativeId: data.initiativeId ? String(data.initiativeId) : undefined,
    title: String(data.title ?? ""),
    context: data.context ? String(data.context) : undefined,
    decision: String(data.decision ?? ""),
    decisionType: data.decisionType,
    status: data.status,
    alternatives: Array.isArray(data.alternatives)
      ? (data.alternatives as BosDecisionAlternative[])
      : undefined,
    expectedOutcome: data.expectedOutcome ? String(data.expectedOutcome) : undefined,
    actualOutcome: data.actualOutcome ? String(data.actualOutcome) : undefined,
    decidedAt: timestampToEpochMs(data.decidedAt),
    decidedById: data.decidedById ? String(data.decidedById) : undefined,
    evaluatedAt: timestampToEpochMs(data.evaluatedAt),
    supersedesDecisionId: data.supersedesDecisionId
      ? String(data.supersedesDecisionId)
      : undefined,
    createdById: String(data.createdById ?? ""),
    updatedById: data.updatedById ? String(data.updatedById) : undefined,
    createdAt: requireTimestampMs(data.createdAt, "createdAt"),
    updatedAt: requireTimestampMs(data.updatedAt, "updatedAt"),
  };
}

export function decisionToFirestore(decision: Omit<BosDecision, "id">): BosDecisionDocument {
  return omitUndefinedFields({
    companyId: decision.companyId,
    ventureId: decision.ventureId,
    initiativeId: decision.initiativeId,
    title: decision.title.trim(),
    context: decision.context?.trim() || undefined,
    decision: decision.decision.trim(),
    decisionType: decision.decisionType,
    status: decision.status,
    alternatives: decision.alternatives,
    expectedOutcome: decision.expectedOutcome?.trim() || undefined,
    actualOutcome: decision.actualOutcome?.trim() || undefined,
    decidedAt:
      decision.decidedAt !== undefined ? epochMsToTimestamp(decision.decidedAt) : undefined,
    decidedById: decision.decidedById,
    evaluatedAt:
      decision.evaluatedAt !== undefined ? epochMsToTimestamp(decision.evaluatedAt) : undefined,
    supersedesDecisionId: decision.supersedesDecisionId,
    createdById: decision.createdById,
    updatedById: decision.updatedById,
    createdAt: epochMsToTimestamp(decision.createdAt),
    updatedAt: epochMsToTimestamp(decision.updatedAt),
  }) as BosDecisionDocument;
}

export function decisionDocumentToDomain(id: string, doc: BosDecisionDocument): BosDecision {
  return decisionFromFirestore(id, doc as firebase.firestore.DocumentData)!;
}
