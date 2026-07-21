import type { CompanyId, EpochMs } from "../../../types";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import type { CursorSession, CursorSessionStatus } from "../../cursor/entities/cursorSession";
import type { Evaluation, EvaluationCriterion, EvaluationDraft } from "../../evaluation/entities/evaluation";
import type { PromptArtifactHead, PromptPack, PromptPackStatus } from "../../prompt/entities/promptPack";
import type { PromptVersion } from "../../prompt/entities/promptVersion";
import type { RequirementItem } from "../../requirements/entities/requirementItem";
import type { RequirementSet, RequirementSetStatus } from "../../requirements/entities/requirementSet";
import type { RequirementVersion } from "../../requirements/entities/requirementVersion";

export type { RequirementItem } from "../../requirements/entities/requirementItem";
export type { RequirementSet, RequirementSetStatus } from "../../requirements/entities/requirementSet";
export type { RequirementVersion } from "../../requirements/entities/requirementVersion";
export type {
  PromptPack,
  PromptPackStatus,
  PromptArtifactHead,
} from "../../prompt/entities/promptPack";
export type { PromptVersion } from "../../prompt/entities/promptVersion";
export type { PromptArtifactHead as PromptArtifact } from "../../prompt/entities/promptPack";
export type { CursorSession, CursorSessionStatus } from "../../cursor/entities/cursorSession";
export type {
  Evaluation,
  EvaluationCriterion,
  EvaluationDraft,
} from "../../evaluation/entities/evaluation";

/** Legacy workflow artifact status for reuse, QA, and retrospective heads. */
export type WorkflowArtifactStatus =
  | "empty"
  | "draft"
  | "in_review"
  | "approved"
  | "running"
  | "passed"
  | "failed";

export interface ReuseModuleDecision {
  moduleId: string;
  moduleName: string;
  matchScore: number;
  decision: "pending" | "accepted" | "rejected";
  justification?: string;
  source: "registry" | "knowledge";
}

/** Reuse assessment — part of requirements/reuse bounded context. */
export interface ReuseAssessment {
  id: string;
  engagementId: DeliveryEngagementId;
  status: WorkflowArtifactStatus;
  reuseRate: number;
  lastRunAt?: EpochMs;
  modules: ReuseModuleDecision[];
  netNewJustification?: string;
  recordedAt?: EpochMs;
}

export interface QaChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

/** QA bounded context entity. */
export interface WorkflowQualityReport {
  id: string;
  engagementId: DeliveryEngagementId;
  status: WorkflowArtifactStatus;
  checklist: QaChecklistItem[];
  summaryNotes?: string;
  approvedAt?: EpochMs;
}

export interface RetrospectiveLesson {
  id: string;
  text: string;
  promotionTarget?: "knowledge" | "registry";
}

/** Immutable delivery lineage captured at retrospective close (Learning Engine prep). */
export interface DeliveryTraceabilityRefs {
  requirementVersionId?: string;
  requirementVersionNumber?: number;
  promptVersionId?: string;
  promptVersionNumber?: number;
  cursorSessionId?: string;
  evaluationId?: string;
  rubricVersionId?: string;
}

/** Retrospective bounded context entity. */
export interface Retrospective {
  id: string;
  engagementId: DeliveryEngagementId;
  status: WorkflowArtifactStatus;
  lessons: RetrospectiveLesson[];
  aiGenerated: boolean;
  approvalNote?: string;
  approvedAt?: EpochMs;
  traceabilityRefs?: DeliveryTraceabilityRefs;
}

export function buildDeliveryTraceabilityRefs(
  workflow: EngagementWorkflow,
): DeliveryTraceabilityRefs {
  const artifact = workflow.promptPack?.artifacts[0];
  return {
    requirementVersionId:
      workflow.currentApprovedRequirementVersionId ??
      workflow.requirementSet?.currentApprovedVersionId,
    requirementVersionNumber:
      workflow.currentApprovedRequirementVersionNumber ??
      workflow.requirementSet?.currentApprovedVersionNumber,
    promptVersionId: artifact?.currentApprovedVersionId,
    promptVersionNumber: artifact?.currentApprovedVersionNumber,
    cursorSessionId:
      workflow.currentCursorSessionId ?? workflow.cursorSessions[0]?.id,
    evaluationId: workflow.currentEvaluationId ?? workflow.evaluation?.id,
    rubricVersionId:
      workflow.evaluation && workflow.evaluation.status !== "draft"
        ? workflow.evaluation.rubricVersionId
        : workflow.evaluation?.rubricVersionId,
  };
}

export interface WorkflowGateStatus {
  requirementsApproved: boolean;
  reuseRecorded: boolean;
  promptPackApproved: boolean;
  cursorSubmitted: boolean;
  evaluationPassed: boolean;
  qaComplete: boolean;
  retrospectiveComplete: boolean;
}

/**
 * E1 in-memory published snapshots — E2 moves these to version repositories.
 * Domain aggregate uses these for cross-command lookups until persistence is wired.
 */
export interface WorkflowVersionRegistry {
  requirementVersions: RequirementVersion[];
  promptVersions: PromptVersion[];
  evaluations: Array<Evaluation | EvaluationDraft>;
}

/** Engagement-scoped workflow aggregate root state — ADR-003 child artifacts. */
export interface EngagementWorkflow {
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  requirementSet: RequirementSet | null;
  reuseAssessment: ReuseAssessment | null;
  promptPack: PromptPack | null;
  cursorSessions: CursorSession[];
  /** Current evaluation head projection (confirmed or latest draft). */
  evaluation: Evaluation | EvaluationDraft | null;
  qualityReport: WorkflowQualityReport | null;
  retrospective: Retrospective | null;
  gates: WorkflowGateStatus;
  currentApprovedRequirementVersionId?: string;
  currentApprovedRequirementVersionNumber?: number;
  currentPromptPackId?: string;
  currentCursorSessionId?: string;
  currentEvaluationId?: string;
  versionRegistry?: WorkflowVersionRegistry;
}

export function createEmptyEngagementWorkflow(
  companyId: CompanyId,
  engagementId: DeliveryEngagementId,
): EngagementWorkflow {
  return {
    companyId,
    engagementId,
    requirementSet: null,
    reuseAssessment: null,
    promptPack: null,
    cursorSessions: [],
    evaluation: null,
    qualityReport: null,
    retrospective: null,
    gates: {
      requirementsApproved: false,
      reuseRecorded: false,
      promptPackApproved: false,
      cursorSubmitted: false,
      evaluationPassed: false,
      qaComplete: false,
      retrospectiveComplete: false,
    },
    versionRegistry: {
      requirementVersions: [],
      promptVersions: [],
      evaluations: [],
    },
  };
}

function requirementSetApproved(set: RequirementSet | null): boolean {
  return set?.status === "approved" && Boolean(set.currentApprovedVersionId);
}

function promptPackApproved(pack: PromptPack | null): boolean {
  return pack?.status === "approved" && pack.artifacts.every((a) => Boolean(a.currentApprovedVersionId));
}

export function recomputeWorkflowGates(workflow: EngagementWorkflow): WorkflowGateStatus {
  const cursorSubmitted = workflow.cursorSessions.some(
    (session) =>
      session.status === "submitted" ||
      session.status === "passed" ||
      session.status === "failed",
  );
  const evaluationPassed =
    workflow.evaluation != null &&
    workflow.evaluation.status !== "draft" &&
    workflow.evaluation.passed === true;

  return {
    requirementsApproved: requirementSetApproved(workflow.requirementSet),
    reuseRecorded: workflow.reuseAssessment?.status === "approved",
    promptPackApproved: promptPackApproved(workflow.promptPack),
    cursorSubmitted,
    evaluationPassed,
    qaComplete: workflow.qualityReport?.status === "approved",
    retrospectiveComplete: workflow.retrospective?.status === "approved",
  };
}

export function withRecomputedGates(workflow: EngagementWorkflow): EngagementWorkflow {
  return { ...workflow, gates: recomputeWorkflowGates(workflow) };
}

export function ensureVersionRegistry(workflow: EngagementWorkflow): WorkflowVersionRegistry {
  return (
    workflow.versionRegistry ?? {
      requirementVersions: [],
      promptVersions: [],
      evaluations: [],
    }
  );
}

export function findRequirementVersion(
  workflow: EngagementWorkflow,
  versionId: string,
): RequirementVersion | undefined {
  return ensureVersionRegistry(workflow).requirementVersions.find((v) => v.id === versionId);
}

export function findPromptVersion(
  workflow: EngagementWorkflow,
  versionId: string,
): PromptVersion | undefined {
  return ensureVersionRegistry(workflow).promptVersions.find((v) => v.id === versionId);
}

export function existingRequirementVersionNumbers(
  workflow: EngagementWorkflow,
  requirementSetId: string,
): number[] {
  return ensureVersionRegistry(workflow)
    .requirementVersions.filter((v) => v.requirementSetId === requirementSetId)
    .map((v) => v.versionNumber);
}

export function existingPromptVersionNumbers(
  workflow: EngagementWorkflow,
  promptArtifactId: string,
): number[] {
  return ensureVersionRegistry(workflow)
    .promptVersions.filter((v) => v.promptArtifactId === promptArtifactId)
    .map((v) => v.versionNumber);
}
