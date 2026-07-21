import type { AuditEvent } from "../../../domain/audit/entities/auditEvent";
import type { EngagementWorkflow } from "../../../domain/workflow/entities/engagementWorkflow";
import { ensureVersionRegistry } from "../../../domain/workflow/entities/engagementWorkflow";
import type firebase from "firebase/compat/app";
import { deepOmitUndefinedFields } from "../documentPayload";
import { epochMsToTimestamp, requireTimestampMs, timestampToEpochMs } from "../timestamp";

export interface EngagementWorkflowDocument {
  companyId: string;
  engagementId: string;
  requirementSet: EngagementWorkflow["requirementSet"];
  reuseAssessment: EngagementWorkflow["reuseAssessment"];
  promptPack: EngagementWorkflow["promptPack"];
  cursorSessions: EngagementWorkflow["cursorSessions"];
  evaluation: EngagementWorkflow["evaluation"];
  qualityReport: EngagementWorkflow["qualityReport"];
  retrospective: EngagementWorkflow["retrospective"];
  gates: EngagementWorkflow["gates"];
  currentApprovedRequirementVersionId?: string;
  currentApprovedRequirementVersionNumber?: number;
  currentPromptPackId?: string;
  currentCursorSessionId?: string;
  currentEvaluationId?: string;
  versionRegistry?: EngagementWorkflow["versionRegistry"];
  updatedAt: firebase.firestore.Timestamp;
}

export interface AuditEventDocument {
  companyId: string;
  engagementId: string;
  type: string;
  title: string;
  actorUserId: string;
  occurredAt: firebase.firestore.Timestamp;
  artifactType?: string;
  versionId?: string;
  versionNumber?: number;
  source?: string;
}

export function engagementWorkflowToFirestore(
  workflow: EngagementWorkflow,
  updatedAtMs: number,
  options?: { persistVersionRegistry?: boolean },
): EngagementWorkflowDocument {
  const persistVersionRegistry = options?.persistVersionRegistry ?? false;
  return deepOmitUndefinedFields({
    companyId: workflow.companyId,
    engagementId: workflow.engagementId,
    requirementSet: workflow.requirementSet,
    reuseAssessment: workflow.reuseAssessment,
    promptPack: workflow.promptPack,
    cursorSessions: workflow.cursorSessions,
    evaluation: workflow.evaluation,
    qualityReport: workflow.qualityReport,
    retrospective: workflow.retrospective,
    gates: workflow.gates,
    currentApprovedRequirementVersionId: workflow.currentApprovedRequirementVersionId,
    currentApprovedRequirementVersionNumber: workflow.currentApprovedRequirementVersionNumber,
    currentPromptPackId: workflow.currentPromptPackId,
    currentCursorSessionId: workflow.currentCursorSessionId,
    currentEvaluationId: workflow.currentEvaluationId,
    versionRegistry: persistVersionRegistry ? workflow.versionRegistry : undefined,
    updatedAt: epochMsToTimestamp(updatedAtMs),
  }) as EngagementWorkflowDocument;
}

export function engagementWorkflowFromFirestore(
  engagementId: string,
  data: firebase.firestore.DocumentData | undefined,
): EngagementWorkflow | null {
  if (!data || typeof data.companyId !== "string") {
    return null;
  }
  const workflow: EngagementWorkflow = {
    companyId: data.companyId,
    engagementId: (data.engagementId as string) ?? engagementId,
    requirementSet: (data.requirementSet as EngagementWorkflow["requirementSet"]) ?? null,
    reuseAssessment: (data.reuseAssessment as EngagementWorkflow["reuseAssessment"]) ?? null,
    promptPack: (data.promptPack as EngagementWorkflow["promptPack"]) ?? null,
    cursorSessions: Array.isArray(data.cursorSessions) ? data.cursorSessions : [],
    evaluation: (data.evaluation as EngagementWorkflow["evaluation"]) ?? null,
    qualityReport: (data.qualityReport as EngagementWorkflow["qualityReport"]) ?? null,
    retrospective: (data.retrospective as EngagementWorkflow["retrospective"]) ?? null,
    gates: (data.gates as EngagementWorkflow["gates"]) ?? {
      requirementsApproved: false,
      reuseRecorded: false,
      promptPackApproved: false,
      cursorSubmitted: false,
      evaluationPassed: false,
      qaComplete: false,
      retrospectiveComplete: false,
    },
    currentApprovedRequirementVersionId: data.currentApprovedRequirementVersionId as string | undefined,
    currentApprovedRequirementVersionNumber: data.currentApprovedRequirementVersionNumber as
      | number
      | undefined,
    currentPromptPackId: data.currentPromptPackId as string | undefined,
    currentCursorSessionId: data.currentCursorSessionId as string | undefined,
    currentEvaluationId: data.currentEvaluationId as string | undefined,
    versionRegistry: data.versionRegistry as EngagementWorkflow["versionRegistry"],
  };
  return { ...workflow, versionRegistry: ensureVersionRegistry(workflow) };
}

export function auditEventToFirestore(event: AuditEvent): AuditEventDocument {
  return deepOmitUndefinedFields({
    companyId: event.companyId,
    engagementId: event.engagementId,
    type: event.type,
    title: event.title,
    actorUserId: event.actorUserId,
    occurredAt: epochMsToTimestamp(event.occurredAt),
    artifactType: event.artifactType,
    versionId: event.versionId,
    versionNumber: event.versionNumber,
    source: event.source,
  }) as AuditEventDocument;
}

export function auditEventFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): AuditEvent | null {
  if (!data || typeof data.companyId !== "string" || typeof data.engagementId !== "string") {
    return null;
  }
  const occurredAt = requireTimestampMs(data.occurredAt, "occurredAt");
  if (occurredAt === null) {
    return null;
  }
  return {
    id,
    companyId: data.companyId,
    engagementId: data.engagementId,
    type: String(data.type ?? ""),
    title: String(data.title ?? ""),
    actorUserId: String(data.actorUserId ?? ""),
    occurredAt,
    artifactType: typeof data.artifactType === "string" ? data.artifactType : undefined,
    versionId: typeof data.versionId === "string" ? data.versionId : undefined,
    versionNumber: typeof data.versionNumber === "number" ? data.versionNumber : undefined,
    source: typeof data.source === "string" ? data.source : undefined,
  };
}

export function auditEventOccurredAtFromFirestore(
  data: firebase.firestore.DocumentData | undefined,
): number {
  return timestampToEpochMs(data?.occurredAt) ?? 0;
}
