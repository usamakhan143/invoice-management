import type { MilestoneDurationUnit } from "../../../constants/milestoneDurationUnit";
import type { MilestoneBusinessImpact } from "../../../constants/milestoneBusinessImpact";
import type { MilestonePriority } from "../../../constants/milestonePriority";
import { isMilestonePriority } from "../../../constants/milestonePriority";
import type { MilestoneCompletionRequirements } from "../../../constants/milestoneCompletionRequirement";
import { isMilestoneDurationUnit } from "../../../constants/milestoneDurationUnit";
import { isMilestoneBusinessImpact } from "../../../constants/milestoneBusinessImpact";
import { MILESTONE_EVIDENCE_TYPE } from "../../../constants/milestoneEvidenceType";
import type { MilestoneEvidenceType } from "../../../constants/milestoneEvidenceType";
import type { MilestoneStatus } from "../../../constants/milestoneStatus";
import { MILESTONE_STATUS } from "../../../constants/milestoneStatus";
import type { BosMilestone, BosMilestoneEvidence } from "../../../domain/entities/milestone";
import type firebase from "firebase/compat/app";
import {
  epochMsToTimestamp,
  requireTimestampMs,
  timestampToEpochMs,
} from "../timestamp";
import { omitUndefinedFields } from "../documentPayload";

export interface BosMilestoneEvidenceDocument {
  id: string;
  type: MilestoneEvidenceType;
  sourceId?: string;
  notes?: string;
  recordedAt: firebase.firestore.Timestamp;
  recordedById: string;
}

export interface BosMilestoneDocument {
  companyId: string;
  initiativeId: string;
  templateId?: string;
  templateStepId?: string;
  milestoneNumber?: string;
  milestoneNumberIndex?: number;
  title: string;
  description?: string;
  milestoneType?: string;
  phase?: string;
  priority?: MilestonePriority;
  businessImpact?: MilestoneBusinessImpact;
  estimatedDuration?: number;
  estimatedDurationUnit?: MilestoneDurationUnit;
  estimatedCostAmount?: number;
  estimatedCostCurrency?: string;
  successCriteria?: string;
  completionRequirements?: MilestoneCompletionRequirements;
  tags?: string[];
  sequence: number;
  plannedStartDate?: firebase.firestore.Timestamp;
  plannedEndDate?: firebase.firestore.Timestamp;
  completedDate?: firebase.firestore.Timestamp;
  status: MilestoneStatus;
  ownerUserId?: string;
  notes?: string;
  dependencyIds?: string[];
  evidence?: BosMilestoneEvidenceDocument[];
  blockedReason?: string;
  skippedReason?: string;
  startedAt?: firebase.firestore.Timestamp;
  blockedAt?: firebase.firestore.Timestamp;
  skippedAt?: firebase.firestore.Timestamp;
  createdById: string;
  updatedById?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

const VALID_STATUSES = new Set<string>(Object.values(MILESTONE_STATUS));
const VALID_EVIDENCE_TYPES = new Set<string>(Object.values(MILESTONE_EVIDENCE_TYPE));

function stringArrayFromFirestore(data: unknown): string[] | undefined {
  if (!Array.isArray(data)) return undefined;
  const out = data.map((v) => String(v).trim()).filter(Boolean);
  return out.length ? out : undefined;
}

function completionRequirementsFromFirestore(
  data: unknown,
): MilestoneCompletionRequirements | undefined {
  if (!data || typeof data !== "object") return undefined;
  const src = data as Record<string, unknown>;
  const out: MilestoneCompletionRequirements = {};
  if (src.decisionRequired === true) out.decisionRequired = true;
  if (src.expenseLinked === true) out.expenseLinked = true;
  if (src.revenueLinked === true) out.revenueLinked = true;
  if (src.documentAttached === true) out.documentAttached = true;
  if (src.urlAttached === true) out.urlAttached = true;
  if (src.notesRequired === true) out.notesRequired = true;
  if (src.screenshotRequired === true) out.screenshotRequired = true;
  if (src.nothingRequired === true) out.nothingRequired = true;
  return Object.keys(out).length ? out : undefined;
}

function completionRequirementsToFirestore(
  requirements: MilestoneCompletionRequirements | undefined,
): MilestoneCompletionRequirements | undefined {
  if (!requirements) return undefined;
  const out = omitUndefinedFields({ ...requirements });
  return Object.keys(out).length ? (out as MilestoneCompletionRequirements) : undefined;
}

function evidenceFromFirestore(data: unknown): BosMilestoneEvidence[] | undefined {
  if (!Array.isArray(data)) return undefined;
  const out: BosMilestoneEvidence[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const type = (row as BosMilestoneEvidenceDocument).type;
    if (typeof type !== "string" || !VALID_EVIDENCE_TYPES.has(type)) continue;
    out.push({
      id: String((row as BosMilestoneEvidenceDocument).id ?? ""),
      type: type as MilestoneEvidenceType,
      sourceId: (row as BosMilestoneEvidenceDocument).sourceId
        ? String((row as BosMilestoneEvidenceDocument).sourceId)
        : undefined,
      notes: (row as BosMilestoneEvidenceDocument).notes
        ? String((row as BosMilestoneEvidenceDocument).notes)
        : undefined,
      recordedAt: requireTimestampMs((row as BosMilestoneEvidenceDocument).recordedAt, "recordedAt"),
      recordedById: String((row as BosMilestoneEvidenceDocument).recordedById ?? ""),
    });
  }
  return out.length ? out : undefined;
}

function evidenceToFirestore(
  evidence: BosMilestoneEvidence[] | undefined,
): BosMilestoneEvidenceDocument[] | undefined {
  if (!evidence?.length) return undefined;
  return evidence.map((e) =>
    omitUndefinedFields({
      id: e.id,
      type: e.type,
      sourceId: e.sourceId,
      notes: e.notes?.trim() || undefined,
      recordedAt: epochMsToTimestamp(e.recordedAt),
      recordedById: e.recordedById,
    }),
  ) as BosMilestoneEvidenceDocument[];
}

export function isMilestoneStatus(value: unknown): value is MilestoneStatus {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

export function milestoneFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): BosMilestone | null {
  if (!data || !isMilestoneStatus(data.status)) return null;

  return {
    id,
    companyId: String(data.companyId ?? ""),
    initiativeId: String(data.initiativeId ?? ""),
    templateId: data.templateId ? String(data.templateId) : undefined,
    templateStepId: data.templateStepId ? String(data.templateStepId) : undefined,
    milestoneNumber: data.milestoneNumber ? String(data.milestoneNumber) : undefined,
    milestoneNumberIndex:
      data.milestoneNumberIndex !== undefined ? Number(data.milestoneNumberIndex) : undefined,
    title: String(data.title ?? ""),
    description: data.description ? String(data.description) : undefined,
    milestoneType: data.milestoneType ? String(data.milestoneType) : undefined,
    phase: data.phase ? String(data.phase) : undefined,
    priority: isMilestonePriority(data.priority) ? data.priority : undefined,
    businessImpact: isMilestoneBusinessImpact(data.businessImpact)
      ? data.businessImpact
      : undefined,
    estimatedDuration:
      data.estimatedDuration !== undefined ? Number(data.estimatedDuration) : undefined,
    estimatedDurationUnit: isMilestoneDurationUnit(data.estimatedDurationUnit)
      ? data.estimatedDurationUnit
      : undefined,
    estimatedCostAmount:
      data.estimatedCostAmount !== undefined ? Number(data.estimatedCostAmount) : undefined,
    estimatedCostCurrency: data.estimatedCostCurrency
      ? String(data.estimatedCostCurrency)
      : undefined,
    successCriteria: data.successCriteria ? String(data.successCriteria) : undefined,
    completionRequirements: completionRequirementsFromFirestore(data.completionRequirements),
    tags: stringArrayFromFirestore(data.tags),
    sequence: Number(data.sequence ?? 0),
    plannedStartDate: timestampToEpochMs(data.plannedStartDate),
    plannedEndDate: timestampToEpochMs(data.plannedEndDate),
    completedDate: timestampToEpochMs(data.completedDate),
    status: data.status,
    ownerUserId: data.ownerUserId ? String(data.ownerUserId) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    dependencyIds: Array.isArray(data.dependencyIds)
      ? data.dependencyIds.map((d) => String(d))
      : undefined,
    evidence: evidenceFromFirestore(data.evidence),
    blockedReason: data.blockedReason ? String(data.blockedReason) : undefined,
    skippedReason: data.skippedReason ? String(data.skippedReason) : undefined,
    startedAt: timestampToEpochMs(data.startedAt),
    blockedAt: timestampToEpochMs(data.blockedAt),
    skippedAt: timestampToEpochMs(data.skippedAt),
    createdById: String(data.createdById ?? ""),
    updatedById: data.updatedById ? String(data.updatedById) : undefined,
    createdAt: requireTimestampMs(data.createdAt, "createdAt"),
    updatedAt: requireTimestampMs(data.updatedAt, "updatedAt"),
  };
}

export function milestoneToFirestore(milestone: Omit<BosMilestone, "id">): BosMilestoneDocument {
  return omitUndefinedFields({
    companyId: milestone.companyId,
    initiativeId: milestone.initiativeId,
    templateId: milestone.templateId,
    templateStepId: milestone.templateStepId,
    milestoneNumber: milestone.milestoneNumber,
    milestoneNumberIndex: milestone.milestoneNumberIndex,
    title: milestone.title.trim(),
    description: milestone.description?.trim() || undefined,
    milestoneType: milestone.milestoneType?.trim() || undefined,
    phase: milestone.phase?.trim() || undefined,
    priority: milestone.priority,
    businessImpact: milestone.businessImpact,
    estimatedDuration: milestone.estimatedDuration,
    estimatedDurationUnit: milestone.estimatedDurationUnit,
    estimatedCostAmount: milestone.estimatedCostAmount,
    estimatedCostCurrency: milestone.estimatedCostCurrency,
    successCriteria: milestone.successCriteria?.trim() || undefined,
    completionRequirements: completionRequirementsToFirestore(milestone.completionRequirements),
    tags: milestone.tags?.length ? milestone.tags : undefined,
    sequence: milestone.sequence,
    plannedStartDate:
      milestone.plannedStartDate !== undefined
        ? epochMsToTimestamp(milestone.plannedStartDate)
        : undefined,
    plannedEndDate:
      milestone.plannedEndDate !== undefined ? epochMsToTimestamp(milestone.plannedEndDate) : undefined,
    completedDate:
      milestone.completedDate !== undefined ? epochMsToTimestamp(milestone.completedDate) : undefined,
    status: milestone.status,
    ownerUserId: milestone.ownerUserId,
    notes: milestone.notes?.trim() || undefined,
    dependencyIds: milestone.dependencyIds?.length ? milestone.dependencyIds : undefined,
    evidence: evidenceToFirestore(milestone.evidence),
    blockedReason: milestone.blockedReason?.trim() || undefined,
    skippedReason: milestone.skippedReason?.trim() || undefined,
    startedAt: milestone.startedAt !== undefined ? epochMsToTimestamp(milestone.startedAt) : undefined,
    blockedAt: milestone.blockedAt !== undefined ? epochMsToTimestamp(milestone.blockedAt) : undefined,
    skippedAt: milestone.skippedAt !== undefined ? epochMsToTimestamp(milestone.skippedAt) : undefined,
    createdById: milestone.createdById,
    updatedById: milestone.updatedById,
    createdAt: epochMsToTimestamp(milestone.createdAt),
    updatedAt: epochMsToTimestamp(milestone.updatedAt),
  }) as BosMilestoneDocument;
}
