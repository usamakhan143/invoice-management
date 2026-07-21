import type { AuditEvent } from "../../../domain/audit/entities/auditEvent";
import type {
  CursorSession,
  EngagementWorkflow,
  Evaluation,
  EvaluationDraft,
} from "../../../domain/workflow/entities/engagementWorkflow";
import { isCursorSessionFinalized } from "../../../domain/cursor/entities/cursorSession";
import { isEvaluationFinalized } from "../../../domain/evaluation/entities/evaluation";
import { isVersionChainsEnabled } from "../../../config/versionChainConfig";
import type {
  CursorSessionDto,
  DeliveryTraceabilityRefsDto,
  EngagementWorkflowDto,
  EvaluationDto,
  PromptPackDto,
  QualityReportDto,
  RequirementSetDto,
  RetrospectiveDto,
  ReuseAssessmentDto,
  TimelineEventDto,
  WorkflowVersionPointersDto,
} from "../dto/EngagementWorkflowDto";

export function toEngagementWorkflowDto(
  workflow: EngagementWorkflow,
  auditEvents: readonly AuditEvent[],
): EngagementWorkflowDto {
  return {
    engagementId: workflow.engagementId,
    requirementSet: workflow.requirementSet
      ? toRequirementSetDto(workflow.requirementSet, workflow)
      : null,
    reuseAssessment: workflow.reuseAssessment as ReuseAssessmentDto | null,
    promptPack: workflow.promptPack ? toPromptPackDto(workflow.promptPack) : null,
    cursorSessions: workflow.cursorSessions.map(toCursorSessionDto),
    evaluation: workflow.evaluation ? toEvaluationDto(workflow.evaluation) : null,
    qualityReport: workflow.qualityReport as QualityReportDto | null,
    retrospective: workflow.retrospective
      ? toRetrospectiveDto(workflow.retrospective)
      : null,
    gates: workflow.gates,
    timeline: auditEvents.map(toTimelineEventDto),
    versionPointers: toVersionPointersDto(workflow),
    versionChainsEnabled: isVersionChainsEnabled(),
  };
}

function toRequirementSetDto(
  set: NonNullable<EngagementWorkflow["requirementSet"]>,
  workflow: EngagementWorkflow,
): RequirementSetDto {
  return {
    ...set,
    items: set.items.map((item) => ({ ...item })),
    currentApprovedVersionId:
      set.currentApprovedVersionId ?? workflow.currentApprovedRequirementVersionId,
    currentApprovedVersionNumber:
      set.currentApprovedVersionNumber ?? workflow.currentApprovedRequirementVersionNumber,
  };
}

function toPromptPackDto(pack: NonNullable<EngagementWorkflow["promptPack"]>): PromptPackDto {
  return {
    ...pack,
    requirementVersionId: pack.requirementVersionId,
    artifacts: pack.artifacts.map((artifact) => ({
      id: artifact.id,
      title: artifact.title,
      body: artifact.body,
      currentApprovedVersionId: artifact.currentApprovedVersionId,
      currentApprovedVersionNumber: artifact.currentApprovedVersionNumber,
    })),
  };
}

function toVersionPointersDto(workflow: EngagementWorkflow): WorkflowVersionPointersDto {
  return {
    currentApprovedRequirementVersionId: workflow.currentApprovedRequirementVersionId,
    currentApprovedRequirementVersionNumber: workflow.currentApprovedRequirementVersionNumber,
    currentPromptPackId: workflow.currentPromptPackId,
    currentCursorSessionId: workflow.currentCursorSessionId,
    currentEvaluationId: workflow.currentEvaluationId,
  };
}

function toCursorSessionDto(session: CursorSession): CursorSessionDto {
  const legacyStatus =
    session.status === "captured"
      ? "awaiting_capture"
      : session.status === "passed" || session.status === "failed"
        ? session.status
        : session.status;

  return {
    id: session.id,
    engagementId: session.engagementId,
    promptPackId: session.promptPackId,
    promptArtifactId: session.promptArtifactId,
    promptVersionId: session.promptVersionId,
    status: legacyStatus as CursorSessionDto["status"],
    captureSummary: session.captureSummary,
    startedAt: session.startedAt,
    submittedAt: session.finalizedAt,
    finalizedAt: session.finalizedAt,
    readOnly: isCursorSessionFinalized(session),
  };
}

function toEvaluationDto(evaluation: Evaluation | EvaluationDraft): EvaluationDto {
  const status =
    evaluation.status === "draft"
      ? "draft"
      : evaluation.passed
        ? "passed"
        : "failed";

  return {
    id: evaluation.id,
    engagementId: evaluation.engagementId,
    status,
    rubricName: evaluation.rubricSnapshot.name,
    rubricVersionId: evaluation.rubricVersionId,
    scorePercent: evaluation.scorePercent,
    passed: evaluation.passed,
    criteria: evaluation.criteria.map((c) => ({ ...c })),
    ranAt:
      evaluation.status === "draft"
        ? evaluation.createdAt
        : (evaluation as Evaluation).confirmedAt,
    cursorSessionId: evaluation.cursorSessionId,
    promptVersionId: evaluation.promptVersionId,
    requirementVersionId: evaluation.requirementVersionId,
    amendsEvaluationId: evaluation.amendsEvaluationId,
    readOnly: isEvaluationFinalized(evaluation),
  };
}

function toRetrospectiveDto(
  retrospective: NonNullable<EngagementWorkflow["retrospective"]>,
): RetrospectiveDto {
  return {
    ...retrospective,
    lessons: retrospective.lessons.map((lesson) => ({ ...lesson })),
    traceabilityRefs: retrospective.traceabilityRefs as DeliveryTraceabilityRefsDto | undefined,
  };
}

function toTimelineEventDto(event: AuditEvent): TimelineEventDto {
  return {
    id: event.id,
    engagementId: event.engagementId,
    type: event.type,
    title: event.title,
    actorLabel: event.actorUserId,
    timestamp: event.occurredAt,
  };
}
