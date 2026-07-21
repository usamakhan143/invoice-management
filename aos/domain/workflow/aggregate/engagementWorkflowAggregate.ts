import type { CompanyId, EpochMs, UserId } from "../../../types";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import type { AuditEvent, CreateAuditEventInput } from "../../audit/entities/auditEvent";
import { createAuditEvent } from "../../audit/rules/auditEventRules";
import {
  confirmEvaluation,
  createDraftEvaluation,
} from "../../evaluation/rules/evaluationRules";
import { DEFAULT_DELIVERY_RUBRIC } from "../../evaluation/entities/evaluationRubric";
import {
  finalizeCursorSession,
  startCursorSession as startDomainCursorSession,
  updateCursorSessionCapture,
} from "../../cursor/rules/cursorSessionRules";
import {
  approvePromptPackHead,
  publishPromptArtifactVersion,
} from "../../prompt/rules/promptVersionRules";
import { createPromptPackHead } from "../../prompt/entities/promptPack";
import {
  createRequirementSetHead,
  updateRequirementSetDraft,
  publishRequirementVersion,
} from "../../requirements";
import type { VersionResult } from "../../versioning/versionResult";
import type { EngagementWorkflow } from "../entities/engagementWorkflow";
import {
  buildDeliveryTraceabilityRefs,
  createEmptyEngagementWorkflow,
  ensureVersionRegistry,
  existingPromptVersionNumbers,
  existingRequirementVersionNumbers,
  findPromptVersion,
  findRequirementVersion,
  withRecomputedGates,
} from "../entities/engagementWorkflow";
import { workflowFailOne, workflowOk, type WorkflowResult } from "../workflowResult";

export interface WorkflowCommandOutcome {
  workflow: EngagementWorkflow;
  auditEvent: AuditEvent;
}

export interface WorkflowMutationOutcome {
  workflow: EngagementWorkflow;
  auditEvent?: AuditEvent;
}

function mapVersionFailure<T>(result: VersionResult<T>): WorkflowResult<never> {
  if (result.ok) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Unexpected version success");
  }
  const first = result.errors[0];
  return workflowFailOne("WORKFLOW_GATE_BLOCKED", first?.message ?? "Version rule violation");
}

function auditInput(
  workflow: EngagementWorkflow,
  type: string,
  title: string,
  actorUserId: UserId,
  occurredAt: EpochMs,
): CreateAuditEventInput {
  return {
    companyId: workflow.companyId,
    engagementId: workflow.engagementId,
    type,
    title,
    actorUserId,
    occurredAt,
  };
}

function auditEventId(type: string, occurredAt: EpochMs): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2, 10)}`;
  return `${type}-${occurredAt}-${suffix}`;
}

function withAudit(
  workflow: EngagementWorkflow,
  type: string,
  title: string,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  const eventResult = createAuditEvent(
    auditInput(workflow, type, title, actorUserId, occurredAt),
    auditEventId(type, occurredAt),
  );
  if (!eventResult.ok) {
    return eventResult;
  }
  return workflowOk({ workflow: withRecomputedGates(workflow), auditEvent: eventResult.value });
}

function withEnsuredVersionRegistry(workflow: EngagementWorkflow): EngagementWorkflow {
  return { ...workflow, versionRegistry: ensureVersionRegistry(workflow) };
}

export function generateRequirementsDraft(
  workflow: EngagementWorkflow,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  const engagementId = workflow.engagementId;
  const next: EngagementWorkflow = withEnsuredVersionRegistry({
    ...workflow,
    requirementSet: createRequirementSetHead({
      id: `req-set-${engagementId}-v1`,
      companyId: workflow.companyId,
      engagementId,
      title: "Initial requirement set",
      aiGenerated: true,
      updatedAt: occurredAt,
      items: [
        {
          id: "req-1",
          title: "Authentication and access control",
          description: "Users can sign in and access engagement-scoped features per role.",
          acceptanceCriteria: "Login, logout, and permission gates verified in QA.",
        },
        {
          id: "req-2",
          title: "Delivery engagement lifecycle",
          description: "Engagement progresses through gated founder workflow steps.",
          acceptanceCriteria: "Each gate blocks the next tab until approved.",
        },
      ],
    }),
  });
  return withAudit(next, "requirements.draft_generated", "AI requirement draft generated", actorUserId, occurredAt);
}

export function updateRequirementDraft(
  workflow: EngagementWorkflow,
  body: string,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.requirementSet) {
    return workflowFailOne("WORKFLOW_NO_REQUIREMENT_SET", "No requirement draft exists");
  }

  const updated = updateRequirementSetDraft(workflow.requirementSet, {
    items: [{ id: "req-manual", title: "Captured requirements", description: body }],
    updatedAt: occurredAt,
  });
  if (!updated.ok) {
    return mapVersionFailure(updated);
  }

  const next = withRecomputedGates({
    ...workflow,
    requirementSet: updated.value,
  });
  return withAudit(next, "requirements.draft_updated", "Requirement draft updated", actorUserId, occurredAt);
}

export function approveRequirements(
  workflow: EngagementWorkflow,
  note: string,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.requirementSet) {
    return workflowFailOne("WORKFLOW_NO_REQUIREMENT_SET", "No requirement set to approve");
  }

  const setId = workflow.requirementSet.id;
  const priorVersions = existingRequirementVersionNumbers(workflow, setId);
  const supersedesVersionId =
    priorVersions.length > 0
      ? ensureVersionRegistry(workflow).requirementVersions.find(
          (v) => v.versionNumber === Math.max(...priorVersions),
        )?.id
      : undefined;

  const published = publishRequirementVersion({
    set: workflow.requirementSet,
    existingVersionNumbers: priorVersions,
    versionId: `req-ver-${setId}-v${priorVersions.length + 1}`,
    publishedAt: occurredAt,
    publishedByUserId: actorUserId,
    approvalNote: note,
    supersedesVersionId,
  });
  if (!published.ok) {
    return mapVersionFailure(published);
  }

  const { version, updatedSet } = published.value;
  const registry = ensureVersionRegistry(workflow);

  const next: EngagementWorkflow = {
    ...workflow,
    requirementSet: updatedSet,
    currentApprovedRequirementVersionId: version.id,
    currentApprovedRequirementVersionNumber: version.versionNumber,
    versionRegistry: {
      ...registry,
      requirementVersions: [...registry.requirementVersions, version],
    },
  };

  return withAudit(
    next,
    "requirements.approved",
    "Requirement set approved",
    actorUserId,
    occurredAt,
  );
}

export function runReuseAssessment(
  workflow: EngagementWorkflow,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.gates.requirementsApproved) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Requirements must be approved before reuse assessment");
  }
  const engagementId = workflow.engagementId;
  const next: EngagementWorkflow = {
    ...workflow,
    reuseAssessment: {
      id: `reuse-${engagementId}`,
      engagementId,
      status: "draft",
      reuseRate: 0,
      lastRunAt: occurredAt,
      modules: [
        {
          moduleId: "auth-firebase-v2",
          moduleName: "Firebase Auth Module",
          matchScore: 92,
          decision: "pending",
          source: "registry",
        },
        {
          moduleId: "form-field-kit",
          moduleName: "Form Field Kit",
          matchScore: 88,
          decision: "pending",
          source: "registry",
        },
        {
          moduleId: "data-table-virtual",
          moduleName: "Virtual Data Table",
          matchScore: 75,
          decision: "pending",
          source: "knowledge",
        },
      ],
    },
  };
  return withAudit(next, "reuse.assessment_run", "Reuse assessment completed", actorUserId, occurredAt);
}

export function setReuseModuleDecision(
  workflow: EngagementWorkflow,
  moduleId: string,
  decision: "accepted" | "rejected",
  actorUserId: UserId,
  occurredAt: EpochMs,
  justification?: string,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.reuseAssessment) {
    return workflowFailOne("WORKFLOW_NO_REUSE_ASSESSMENT", "Run reuse assessment first");
  }
  const next = withRecomputedGates({
    ...workflow,
    reuseAssessment: {
      ...workflow.reuseAssessment,
      modules: workflow.reuseAssessment.modules.map((module) =>
        module.moduleId === moduleId ? { ...module, decision, justification } : module,
      ),
    },
  });
  return withAudit(
    next,
    "reuse.module_decision",
    `Reuse module ${moduleId} ${decision}`,
    actorUserId,
    occurredAt,
  );
}

export function recordReuseDecisions(
  workflow: EngagementWorkflow,
  input: { netNewJustification?: string },
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.reuseAssessment) {
    return workflowFailOne("WORKFLOW_NO_REUSE_ASSESSMENT", "Run reuse assessment first");
  }
  const accepted = workflow.reuseAssessment.modules.filter((m) => m.decision === "accepted").length;
  const next: EngagementWorkflow = {
    ...workflow,
    reuseAssessment: {
      ...workflow.reuseAssessment,
      reuseRate: Math.round((accepted / workflow.reuseAssessment.modules.length) * 100),
      netNewJustification: input.netNewJustification,
      status: "approved",
      recordedAt: occurredAt,
    },
  };
  return withAudit(next, "reuse.recorded", "Reuse decisions recorded", actorUserId, occurredAt);
}

export function generatePromptPack(
  workflow: EngagementWorkflow,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.gates.reuseRecorded) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Reuse decisions must be recorded first");
  }

  const requirementVersionId = workflow.requirementSet?.currentApprovedVersionId;
  if (!requirementVersionId) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Approved requirement version required before prompt pack");
  }

  const engagementId = workflow.engagementId;
  const packId = `prompt-pack-${engagementId}-v1`;
  const next: EngagementWorkflow = {
    ...workflow,
    currentPromptPackId: packId,
    promptPack: createPromptPackHead({
      id: packId,
      companyId: workflow.companyId,
      engagementId,
      requirementVersionId,
      title: "Feature delivery prompt pack",
      aiGenerated: true,
      updatedAt: occurredAt,
      artifacts: [
        {
          id: "artifact-1",
          title: "Implementation prompt",
          body: "Implement approved requirements using accepted reusable modules first.",
        },
        {
          id: "artifact-2",
          title: "Verification prompt",
          body: "Verify gates, tests, and evaluation rubric before QA handoff.",
        },
      ],
    }),
  };
  return withAudit(next, "prompts.generated", "Prompt pack draft generated", actorUserId, occurredAt);
}

export function approvePromptPack(
  workflow: EngagementWorkflow,
  note: string,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.promptPack) {
    return workflowFailOne("WORKFLOW_NO_PROMPT_PACK", "No prompt pack to approve");
  }

  const requirementVersionId = workflow.promptPack.requirementVersionId;
  const requirementVersion = findRequirementVersion(workflow, requirementVersionId);
  if (!requirementVersion) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Published requirement version not found for prompt pack");
  }

  let pack = workflow.promptPack;
  const registry = ensureVersionRegistry(workflow);
  const promptVersions = [...registry.promptVersions];

  for (const artifact of pack.artifacts) {
    const published = publishPromptArtifactVersion({
      pack,
      artifactId: artifact.id,
      requirementVersion,
      existingVersionNumbers: existingPromptVersionNumbers(workflow, artifact.id),
      versionId: `prompt-ver-${artifact.id}-v${existingPromptVersionNumbers(workflow, artifact.id).length + 1}`,
      publishedAt: occurredAt,
      publishedByUserId: actorUserId,
    });
    if (!published.ok) {
      return mapVersionFailure(published);
    }
    pack = published.value.updatedPack;
    promptVersions.push(published.value.version);
  }

  const approved = approvePromptPackHead(pack, { approvalNote: note, approvedAt: occurredAt });
  if (!approved.ok) {
    return mapVersionFailure(approved);
  }

  const next: EngagementWorkflow = {
    ...workflow,
    promptPack: approved.value,
    currentPromptPackId: approved.value.id,
    versionRegistry: {
      ...registry,
      promptVersions,
    },
  };

  return withAudit(next, "prompts.approved", "Prompt pack approved", actorUserId, occurredAt);
}

export function startCursorSession(
  workflow: EngagementWorkflow,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.gates.promptPackApproved || !workflow.promptPack) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Approve a prompt pack before starting Cursor");
  }

  const artifact = workflow.promptPack.artifacts[0];
  const promptVersionId = artifact?.currentApprovedVersionId;
  if (!artifact || !promptVersionId) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Approved prompt version required to start Cursor");
  }

  const promptVersion = findPromptVersion(workflow, promptVersionId);
  if (!promptVersion) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Published prompt version not found");
  }

  const sessionId = `cursor-${occurredAt}`;
  const started = startDomainCursorSession({
    id: sessionId,
    companyId: workflow.companyId,
    engagementId: workflow.engagementId,
    promptPackId: workflow.promptPack.id,
    promptArtifactId: artifact.id,
    promptVersion,
    executorUserId: actorUserId,
    startedAt: occurredAt,
  });
  if (!started.ok) {
    return mapVersionFailure(started);
  }

  const next: EngagementWorkflow = {
    ...workflow,
    currentCursorSessionId: sessionId,
    cursorSessions: [started.value, ...workflow.cursorSessions],
  };
  return withAudit(next, "cursor.started", "Cursor session started", actorUserId, occurredAt);
}

export function submitCursorCapture(
  workflow: EngagementWorkflow,
  sessionId: string,
  captureSummary: string,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  const session = workflow.cursorSessions.find((s) => s.id === sessionId);
  if (!session) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Cursor session not found");
  }

  const captured = updateCursorSessionCapture(session, {
    captureSummary,
    capturedAt: occurredAt,
  });
  if (!captured.ok) {
    return mapVersionFailure(captured);
  }

  const finalized = finalizeCursorSession(captured.value, {
    status: "submitted",
    finalizedAt: occurredAt,
  });
  if (!finalized.ok) {
    return mapVersionFailure(finalized);
  }

  const next: EngagementWorkflow = {
    ...workflow,
    cursorSessions: workflow.cursorSessions.map((s) =>
      s.id === sessionId ? { ...finalized.value } : s,
    ),
  };
  return withAudit(next, "cursor.capture_submitted", "Cursor capture submitted", actorUserId, occurredAt);
}

export function runEvaluation(
  workflow: EngagementWorkflow,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.gates.cursorSubmitted) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Submit a Cursor capture before evaluation");
  }

  const sessionId = workflow.currentCursorSessionId ?? workflow.cursorSessions[0]?.id;
  const session = workflow.cursorSessions.find((s) => s.id === sessionId);
  if (!session?.promptVersionId) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Cursor session with prompt version required");
  }

  const promptVersion = findPromptVersion(workflow, session.promptVersionId);
  const requirementVersion = promptVersion
    ? findRequirementVersion(workflow, promptVersion.requirementVersionId)
    : undefined;
  if (!promptVersion || !requirementVersion) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Version chain incomplete for evaluation");
  }

  const passed = true;
  const criteria = [
    { id: "c1", label: "Requirements coverage", passed: true, score: 90 },
    { id: "c2", label: "Reuse compliance", passed: true, score: 85 },
    { id: "c3", label: "Capture evidence quality", passed: passed, score: passed ? 88 : 55 },
  ];

  const draftResult = createDraftEvaluation({
    id: `eval-${workflow.engagementId}-${occurredAt}`,
    companyId: workflow.companyId,
    engagementId: workflow.engagementId,
    session,
    promptVersion,
    requirementVersion,
    rubric: DEFAULT_DELIVERY_RUBRIC,
    criteria,
    scorePercent: passed ? 88 : 62,
    passed,
    createdAt: occurredAt,
  });
  if (!draftResult.ok) {
    return mapVersionFailure(draftResult);
  }

  const confirmed = confirmEvaluation(draftResult.value, {
    confirmedAt: occurredAt,
    confirmedByUserId: actorUserId,
  });
  if (!confirmed.ok) {
    return mapVersionFailure(confirmed);
  }

  const registry = ensureVersionRegistry(workflow);
  const next: EngagementWorkflow = {
    ...workflow,
    evaluation: confirmed.value,
    currentEvaluationId: confirmed.value.id,
    versionRegistry: {
      ...registry,
      evaluations: [...registry.evaluations, confirmed.value],
    },
  };

  return withAudit(
    next,
    "evaluation.completed",
    passed ? "Evaluation passed" : "Evaluation failed",
    actorUserId,
    occurredAt,
  );
}

export function updateQaChecklist(
  workflow: EngagementWorkflow,
  itemId: string,
  checked: boolean,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.gates.evaluationPassed) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Evaluation must pass before QA");
  }
  const qualityReport = workflow.qualityReport ?? {
    id: `qa-${workflow.engagementId}`,
    engagementId: workflow.engagementId,
    status: "draft" as const,
    checklist: [
      { id: "qa-1", label: "All approved requirements verified", checked: false },
      { id: "qa-2", label: "Prompt pack artifacts copied to Cursor", checked: false },
      { id: "qa-3", label: "Evaluation evidence attached", checked: false },
    ],
  };
  const next = withRecomputedGates({
    ...workflow,
    qualityReport: {
      ...qualityReport,
      checklist: qualityReport.checklist.map((item) =>
        item.id === itemId ? { ...item, checked } : item,
      ),
    },
  });
  return withAudit(
    next,
    "qa.checklist_updated",
    `QA checklist item ${itemId} ${checked ? "checked" : "unchecked"}`,
    actorUserId,
    occurredAt,
  );
}

export function approveQaHandoff(
  workflow: EngagementWorkflow,
  note: string,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.qualityReport) {
    return workflowFailOne("WORKFLOW_NO_QA_REPORT", "QA checklist not initialized");
  }
  const allChecked = workflow.qualityReport.checklist.every((item) => item.checked);
  if (!allChecked) {
    return workflowFailOne("WORKFLOW_QA_INCOMPLETE", "Complete all QA checklist items before handoff");
  }
  const next: EngagementWorkflow = {
    ...workflow,
    qualityReport: {
      ...workflow.qualityReport,
      status: "approved",
      summaryNotes: note,
      approvedAt: occurredAt,
    },
  };
  return withAudit(next, "qa.approved", "QA handoff approved", actorUserId, occurredAt);
}

export function generateRetrospective(
  workflow: EngagementWorkflow,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.gates.qaComplete) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Complete QA before retrospective");
  }
  const next: EngagementWorkflow = {
    ...workflow,
    retrospective: {
      id: `retro-${workflow.engagementId}`,
      engagementId: workflow.engagementId,
      status: "draft",
      aiGenerated: true,
      lessons: [
        { id: "l1", text: "Reuse assessment early reduced net-new scope.", promotionTarget: "knowledge" },
        { id: "l2", text: "Approval gates prevented premature Cursor execution.", promotionTarget: "registry" },
      ],
    },
  };
  return withAudit(next, "retro.generated", "Retrospective draft generated", actorUserId, occurredAt);
}

export function approveRetrospective(
  workflow: EngagementWorkflow,
  note: string,
  actorUserId: UserId,
  occurredAt: EpochMs,
): WorkflowResult<WorkflowCommandOutcome> {
  if (!workflow.retrospective) {
    return workflowFailOne("WORKFLOW_NO_RETROSPECTIVE", "Generate retrospective first");
  }
  const traceabilityRefs = buildDeliveryTraceabilityRefs(workflow);
  const next: EngagementWorkflow = {
    ...workflow,
    retrospective: {
      ...workflow.retrospective,
      status: "approved",
      approvalNote: note,
      approvedAt: occurredAt,
      traceabilityRefs,
    },
  };
  const eventResult = createAuditEvent(
    {
      ...auditInput(next, "retro.approved", "Retrospective approved", actorUserId, occurredAt),
      artifactType: "retrospective",
      versionId: traceabilityRefs.evaluationId ?? next.retrospective.id,
      versionNumber: traceabilityRefs.requirementVersionNumber,
    },
    auditEventId("retro.approved", occurredAt),
  );
  if (!eventResult.ok) {
    return eventResult;
  }
  return workflowOk({ workflow: withRecomputedGates(next), auditEvent: eventResult.value });
}

export function ensureEngagementWorkflow(
  companyId: CompanyId,
  engagementId: DeliveryEngagementId,
  existing: EngagementWorkflow | null,
): EngagementWorkflow {
  const workflow = existing ?? createEmptyEngagementWorkflow(companyId, engagementId);
  return withEnsuredVersionRegistry(workflow);
}

export type LifecycleAdvanceEvent =
  | "approve_requirements"
  | "approve_prompt_pack"
  | "submit_sessions"
  | "pass_evaluations"
  | "complete_qa"
  | "submit_retrospective";

export function lifecycleEventForCommand(
  command: "approveRequirements" | "approvePromptPack" | "submitCursor" | "runEvaluation" | "approveQa" | "approveRetrospective",
  workflow: EngagementWorkflow,
): LifecycleAdvanceEvent | null {
  switch (command) {
    case "approveRequirements":
      return "approve_requirements";
    case "approvePromptPack":
      return "approve_prompt_pack";
    case "submitCursor":
      return workflow.gates.cursorSubmitted ? "submit_sessions" : null;
    case "runEvaluation":
      return workflow.evaluation?.passed ? "pass_evaluations" : null;
    case "approveQa":
      return "complete_qa";
    case "approveRetrospective":
      return "submit_retrospective";
    default:
      return null;
  }
}
