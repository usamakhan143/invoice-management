import type {
  AuditEventRepository,
  EngagementWorkflowRepository,
} from "../../contracts/EngagementWorkflowRepository";
import type { CursorRevisionRepository } from "../../contracts/CursorRevisionRepository";
import type { CursorSessionRepository } from "../../contracts/CursorSessionRepository";
import type { EvaluationRepository } from "../../contracts/EvaluationRepository";
import type { PromptVersionRepository } from "../../contracts/PromptVersionRepository";
import type { RequirementVersionRepository } from "../../contracts/RequirementVersionRepository";
import { isVersionChainsEnabled } from "../../config/versionChainConfig";
import { isCursorSessionFinalized } from "../../domain/cursor/entities/cursorSession";
import { isEvaluationFinalized } from "../../domain/evaluation/entities/evaluation";
import type { DeliveryEngagementId } from "../../domain/delivery/valueObjects";
import * as WorkflowAggregate from "../../domain/workflow/aggregate/engagementWorkflowAggregate";
import type firebase from "firebase/compat/app";
import type { AosActorScope, AosReadScope } from "../types";
import { assertWorkflowOk } from "./errors";
import type { EngagementWorkflowDto } from "./dto/EngagementWorkflowDto";
import type {
  CursorRevisionHistoryDto,
  CursorSessionHistoryDto,
  EvaluationDetailDto,
  EvaluationHistoryDto,
  PromptVersionDetailDto,
  PromptVersionHistoryDto,
  RequirementVersionDetailDto,
  RequirementVersionHistoryDto,
} from "./dto/VersionHistoryDto";
import { toEngagementWorkflowDto } from "./mappers/toEngagementWorkflowDto";
import {
  LegacyPromptMigrationService,
  LegacyVersionMigrationService,
} from "./LegacyVersionMigrationService";
import { WorkflowVersionOrchestrator } from "./WorkflowVersionOrchestrator";

export interface GetEngagementWorkflowQuery {
  engagementId: DeliveryEngagementId;
}

export interface EngagementWorkflowApplicationServiceDeps {
  workflows: EngagementWorkflowRepository;
  auditEvents: AuditEventRepository;
  requirementVersions?: RequirementVersionRepository;
  promptVersions?: PromptVersionRepository;
  cursorSessions?: CursorSessionRepository;
  cursorRevisions?: CursorRevisionRepository;
  evaluations?: EvaluationRepository;
  firestore?: firebase.firestore.Firestore;
  versionChainsEnabled?: boolean;
  advanceEngagementLifecycle?: (
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    event:
      | "approve_requirements"
      | "approve_prompt_pack"
      | "submit_sessions"
      | "pass_evaluations"
      | "complete_qa"
      | "submit_retrospective",
  ) => Promise<void>;
  /** Post-commit hook after retrospective transitions to approved (LF-04). */
  onRetrospectiveApproved?: (
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    retrospectiveId: string,
  ) => void;
}

/**
 * Workflow application orchestration — delegates business rules to domain aggregate.
 */
export class EngagementWorkflowApplicationService {
  private readonly workflows: EngagementWorkflowRepository;
  private readonly auditEvents: AuditEventRepository;
  private readonly requirementVersions?: RequirementVersionRepository;
  private readonly promptVersions?: PromptVersionRepository;
  private readonly cursorSessions?: CursorSessionRepository;
  private readonly cursorRevisions?: CursorRevisionRepository;
  private readonly evaluations?: EvaluationRepository;
  private readonly orchestrator?: WorkflowVersionOrchestrator;
  private readonly requirementMigration?: LegacyVersionMigrationService;
  private readonly promptMigration?: LegacyPromptMigrationService;
  private readonly versionChainsEnabled: boolean;
  private readonly advanceEngagementLifecycle?: EngagementWorkflowApplicationServiceDeps["advanceEngagementLifecycle"];
  private readonly onRetrospectiveApproved?: EngagementWorkflowApplicationServiceDeps["onRetrospectiveApproved"];

  constructor(deps: EngagementWorkflowApplicationServiceDeps) {
    this.workflows = deps.workflows;
    this.auditEvents = deps.auditEvents;
    this.requirementVersions = deps.requirementVersions;
    this.promptVersions = deps.promptVersions;
    this.cursorSessions = deps.cursorSessions;
    this.cursorRevisions = deps.cursorRevisions;
    this.evaluations = deps.evaluations;
    this.versionChainsEnabled = deps.versionChainsEnabled ?? isVersionChainsEnabled();
    this.advanceEngagementLifecycle = deps.advanceEngagementLifecycle;
    this.onRetrospectiveApproved = deps.onRetrospectiveApproved;

    if (this.versionChainsEnabled && deps.firestore && deps.requirementVersions && deps.promptVersions) {
      this.orchestrator = new WorkflowVersionOrchestrator({ firestore: deps.firestore });
      this.requirementMigration = new LegacyVersionMigrationService({
        workflows: deps.workflows,
        requirementVersions: deps.requirementVersions,
        auditEvents: deps.auditEvents,
      });
      this.promptMigration = new LegacyPromptMigrationService({
        workflows: deps.workflows,
        requirementVersions: deps.requirementVersions,
        promptVersions: deps.promptVersions,
        auditEvents: deps.auditEvents,
      });
    }
  }

  async getWorkflow(
    scope: AosReadScope,
    query: GetEngagementWorkflowQuery,
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.workflows.getOrCreate(scope.companyId, query.engagementId);
    const timeline = await this.auditEvents.listByEngagement(scope.companyId, query.engagementId);
    return toEngagementWorkflowDto(workflow, timeline);
  }

  async listWorkflows(scope: AosReadScope): Promise<EngagementWorkflowDto[]> {
    const workflows = await this.workflows.listByCompany(scope.companyId);
    const results: EngagementWorkflowDto[] = [];
    for (const workflow of workflows) {
      const timeline = await this.auditEvents.listByEngagement(scope.companyId, workflow.engagementId);
      results.push(toEngagementWorkflowDto(workflow, timeline));
    }
    return results;
  }

  private async persistCommand(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    outcome: WorkflowAggregate.WorkflowCommandOutcome,
    lifecycleCommand?: Parameters<typeof WorkflowAggregate.lifecycleEventForCommand>[0],
  ): Promise<EngagementWorkflowDto> {
    await this.auditEvents.append(outcome.auditEvent);
    const saved = await this.workflows.save(scope.companyId, outcome.workflow);

    if (lifecycleCommand && this.advanceEngagementLifecycle) {
      const event = WorkflowAggregate.lifecycleEventForCommand(lifecycleCommand, saved);
      if (event) {
        await this.advanceEngagementLifecycle(scope, engagementId, event);
      }
    }

    const timeline = await this.auditEvents.listByEngagement(scope.companyId, engagementId);
    return toEngagementWorkflowDto(saved, timeline);
  }

  private async loadWorkflow(scope: AosActorScope, engagementId: DeliveryEngagementId) {
    return this.workflows.getOrCreate(scope.companyId, engagementId);
  }

  async generateRequirementsDraft(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.loadWorkflow(scope, engagementId);
    const now = Date.now();
    const outcome = assertWorkflowOk(
      WorkflowAggregate.generateRequirementsDraft(workflow, scope.actorUserId, now),
    );
    return this.persistCommand(scope, engagementId, outcome);
  }

  async updateRequirementDraft(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    body: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.loadWorkflow(scope, engagementId);
    const now = Date.now();
    const outcome = assertWorkflowOk(
      WorkflowAggregate.updateRequirementDraft(workflow, body, scope.actorUserId, now),
    );
    return this.persistCommand(scope, engagementId, outcome);
  }

  async approveRequirements(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    note: string,
  ): Promise<EngagementWorkflowDto> {
    const now = Date.now();
    let workflow = await this.loadWorkflow(scope, engagementId);

    if (this.orchestrator && this.requirementVersions && this.requirementMigration) {
      workflow = await this.requirementMigration.ensureRequirementVersionMaterialized({
        companyId: scope.companyId,
        engagementId,
        workflow,
        actorUserId: scope.actorUserId,
        occurredAt: now,
      });

      const setId = workflow.requirementSet?.id;
      if (!setId) {
        throw new Error("No requirement set to approve");
      }

      const pointerId =
        workflow.currentApprovedRequirementVersionId ??
        workflow.requirementSet?.currentApprovedVersionId;
      if (workflow.requirementSet?.status === "approved" && pointerId) {
        const existingVersion = await this.requirementVersions.getById(scope.companyId, pointerId);
        if (existingVersion) {
          const timeline = await this.auditEvents.listByEngagement(scope.companyId, engagementId);
          return toEngagementWorkflowDto(workflow, timeline);
        }
      }

      const existing = await this.requirementVersions.listBySet(scope.companyId, setId);
      const supersedesVersionId =
        existing.length > 0 ? existing[existing.length - 1]?.id : undefined;

      const result = await this.orchestrator.publishRequirementVersionTransactional({
        companyId: scope.companyId,
        engagementId,
        workflow,
        note,
        actorUserId: scope.actorUserId,
        occurredAt: now,
        existingVersionNumbers: existing.map((v) => v.versionNumber),
        supersedesVersionId,
      });

      if (this.advanceEngagementLifecycle) {
        await this.advanceEngagementLifecycle(scope, engagementId, "approve_requirements");
      }

      const timeline = await this.auditEvents.listByEngagement(scope.companyId, engagementId);
      return toEngagementWorkflowDto(result.workflow, timeline);
    }

    const outcome = assertWorkflowOk(
      WorkflowAggregate.approveRequirements(workflow, note, scope.actorUserId, now),
    );
    return this.persistCommand(scope, engagementId, outcome, "approveRequirements");
  }

  async runReuseAssessment(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    let workflow = await this.loadWorkflow(scope, engagementId);
    if (this.requirementMigration) {
      workflow = await this.requirementMigration.ensureRequirementVersionMaterialized({
        companyId: scope.companyId,
        engagementId,
        workflow,
        actorUserId: scope.actorUserId,
        occurredAt: Date.now(),
      });
    }
    const outcome = assertWorkflowOk(
      WorkflowAggregate.runReuseAssessment(workflow, scope.actorUserId, Date.now()),
    );
    return this.persistCommand(scope, engagementId, outcome);
  }

  async recordReuseDecisions(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    input: { netNewJustification?: string },
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.loadWorkflow(scope, engagementId);
    const outcome = assertWorkflowOk(
      WorkflowAggregate.recordReuseDecisions(workflow, input, scope.actorUserId, Date.now()),
    );
    return this.persistCommand(scope, engagementId, outcome);
  }

  async setReuseModuleDecision(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    moduleId: string,
    decision: "accepted" | "rejected",
    justification?: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.loadWorkflow(scope, engagementId);
    const now = Date.now();
    const outcome = assertWorkflowOk(
      WorkflowAggregate.setReuseModuleDecision(
        workflow,
        moduleId,
        decision,
        scope.actorUserId,
        now,
        justification,
      ),
    );
    return this.persistCommand(scope, engagementId, outcome);
  }

  async generatePromptPack(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.loadWorkflow(scope, engagementId);
    const outcome = assertWorkflowOk(
      WorkflowAggregate.generatePromptPack(workflow, scope.actorUserId, Date.now()),
    );
    return this.persistCommand(scope, engagementId, outcome);
  }

  async approvePromptPack(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    note: string,
  ): Promise<EngagementWorkflowDto> {
    const now = Date.now();
    let workflow = await this.loadWorkflow(scope, engagementId);

    if (
      this.orchestrator &&
      this.requirementVersions &&
      this.promptVersions &&
      this.promptMigration
    ) {
      workflow = await this.requirementMigration!.ensureRequirementVersionMaterialized({
        companyId: scope.companyId,
        engagementId,
        workflow,
        actorUserId: scope.actorUserId,
        occurredAt: now,
      });

      const requirementVersionId =
        workflow.currentApprovedRequirementVersionId ??
        workflow.requirementSet?.currentApprovedVersionId;
      if (!requirementVersionId) {
        throw new Error("Approved requirement version required");
      }

      const requirementVersion = await this.requirementVersions.getById(
        scope.companyId,
        requirementVersionId,
      );
      if (!requirementVersion) {
        throw new Error("Requirement version not found");
      }

      workflow = await this.promptMigration.ensurePromptVersionsMaterialized({
        companyId: scope.companyId,
        engagementId,
        workflow,
        requirementVersion,
        actorUserId: scope.actorUserId,
        occurredAt: now,
      });

      if (!workflow.promptPack) {
        throw new Error("No prompt pack to approve");
      }

      const existingByArtifact: Record<string, number[]> = {};
      for (const artifact of workflow.promptPack.artifacts) {
        const versions = await this.promptVersions.listByArtifact(scope.companyId, artifact.id);
        existingByArtifact[artifact.id] = versions.map((v) => v.versionNumber);
      }

      const result = await this.orchestrator.publishPromptPackTransactional({
        companyId: scope.companyId,
        engagementId,
        workflow,
        requirementVersion,
        note,
        actorUserId: scope.actorUserId,
        occurredAt: now,
        existingVersionNumbersByArtifact: existingByArtifact,
      });

      if (this.advanceEngagementLifecycle) {
        await this.advanceEngagementLifecycle(scope, engagementId, "approve_prompt_pack");
      }

      const timeline = await this.auditEvents.listByEngagement(scope.companyId, engagementId);
      return toEngagementWorkflowDto(result.workflow, timeline);
    }

    const outcome = assertWorkflowOk(
      WorkflowAggregate.approvePromptPack(workflow, note, scope.actorUserId, now),
    );
    return this.persistCommand(scope, engagementId, outcome, "approvePromptPack");
  }

  async startCursorSession(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const now = Date.now();
    const workflow = await this.loadWorkflow(scope, engagementId);

    if (this.orchestrator && this.promptVersions) {
      const artifact = workflow.promptPack?.artifacts[0];
      const promptVersionId = artifact?.currentApprovedVersionId;
      if (!artifact || !promptVersionId) {
        throw new Error("Approved prompt version required");
      }
      const promptVersion = await this.promptVersions.getById(scope.companyId, promptVersionId);
      if (!promptVersion) {
        throw new Error("Prompt version not found");
      }

      const result = await this.orchestrator.createCursorSessionTransactional({
        companyId: scope.companyId,
        engagementId,
        workflow,
        promptVersion,
        actorUserId: scope.actorUserId,
        occurredAt: now,
      });

      const timeline = await this.auditEvents.listByEngagement(scope.companyId, engagementId);
      return toEngagementWorkflowDto(result.workflow, timeline);
    }

    const outcome = assertWorkflowOk(
      WorkflowAggregate.startCursorSession(workflow, scope.actorUserId, now),
    );
    return this.persistCommand(scope, engagementId, outcome);
  }

  async submitCursorCapture(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    sessionId: string,
    captureSummary: string,
  ): Promise<EngagementWorkflowDto> {
    const now = Date.now();
    const workflow = await this.loadWorkflow(scope, engagementId);

    if (this.orchestrator) {
      const result = await this.orchestrator.finalizeCursorCaptureTransactional({
        companyId: scope.companyId,
        engagementId,
        workflow,
        sessionId,
        captureSummary,
        actorUserId: scope.actorUserId,
        occurredAt: now,
      });

      if (this.advanceEngagementLifecycle) {
        const event = WorkflowAggregate.lifecycleEventForCommand("submitCursor", result.workflow);
        if (event) {
          await this.advanceEngagementLifecycle(scope, engagementId, event);
        }
      }

      const timeline = await this.auditEvents.listByEngagement(scope.companyId, engagementId);
      return toEngagementWorkflowDto(result.workflow, timeline);
    }

    const outcome = assertWorkflowOk(
      WorkflowAggregate.submitCursorCapture(
        workflow,
        sessionId,
        captureSummary,
        scope.actorUserId,
        now,
      ),
    );
    return this.persistCommand(scope, engagementId, outcome, "submitCursor");
  }

  async runEvaluation(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const now = Date.now();
    const workflow = await this.loadWorkflow(scope, engagementId);

    if (this.orchestrator && this.promptVersions && this.requirementVersions) {
      const sessionId = workflow.currentCursorSessionId ?? workflow.cursorSessions[0]?.id;
      const session = workflow.cursorSessions.find((s) => s.id === sessionId);
      if (!session?.promptVersionId) {
        throw new Error("Cursor session required");
      }

      const promptVersion = await this.promptVersions.getById(
        scope.companyId,
        session.promptVersionId,
      );
      const requirementVersion = promptVersion
        ? await this.requirementVersions.getById(
            scope.companyId,
            promptVersion.requirementVersionId,
          )
        : null;
      if (!promptVersion || !requirementVersion) {
        throw new Error("Version chain incomplete");
      }

      const result = await this.orchestrator.confirmEvaluationTransactional({
        companyId: scope.companyId,
        engagementId,
        workflow,
        session,
        promptVersion,
        requirementVersion,
        actorUserId: scope.actorUserId,
        occurredAt: now,
      });

      if (this.advanceEngagementLifecycle && result.evaluation.passed) {
        await this.advanceEngagementLifecycle(scope, engagementId, "pass_evaluations");
      }

      const timeline = await this.auditEvents.listByEngagement(scope.companyId, engagementId);
      return toEngagementWorkflowDto(result.workflow, timeline);
    }

    const outcome = assertWorkflowOk(
      WorkflowAggregate.runEvaluation(workflow, scope.actorUserId, now),
    );
    return this.persistCommand(scope, engagementId, outcome, "runEvaluation");
  }

  async updateQaChecklist(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    itemId: string,
    checked: boolean,
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.loadWorkflow(scope, engagementId);
    const now = Date.now();
    const outcome = assertWorkflowOk(
      WorkflowAggregate.updateQaChecklist(
        workflow,
        itemId,
        checked,
        scope.actorUserId,
        now,
      ),
    );
    return this.persistCommand(scope, engagementId, outcome);
  }

  async approveQaHandoff(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    note: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.loadWorkflow(scope, engagementId);
    const outcome = assertWorkflowOk(
      WorkflowAggregate.approveQaHandoff(workflow, note, scope.actorUserId, Date.now()),
    );
    return this.persistCommand(scope, engagementId, outcome, "approveQa");
  }

  async generateRetrospective(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.loadWorkflow(scope, engagementId);
    const outcome = assertWorkflowOk(
      WorkflowAggregate.generateRetrospective(workflow, scope.actorUserId, Date.now()),
    );
    return this.persistCommand(scope, engagementId, outcome);
  }

  async approveRetrospective(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    note: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = await this.loadWorkflow(scope, engagementId);
    const wasAlreadyApproved = workflow.retrospective?.status === "approved";
    const outcome = assertWorkflowOk(
      WorkflowAggregate.approveRetrospective(workflow, note, scope.actorUserId, Date.now()),
    );
    const dto = await this.persistCommand(scope, engagementId, outcome, "approveRetrospective");

    if (
      !wasAlreadyApproved &&
      outcome.workflow.retrospective?.status === "approved" &&
      this.onRetrospectiveApproved
    ) {
      this.onRetrospectiveApproved(
        scope,
        engagementId,
        outcome.workflow.retrospective.id,
      );
    }

    return dto;
  }

  isVersionChainsEnabled(): boolean {
    return this.versionChainsEnabled;
  }

  async listRequirementVersions(
    scope: AosReadScope,
    engagementId: DeliveryEngagementId,
    requirementSetId?: string,
  ): Promise<RequirementVersionHistoryDto[]> {
    if (!this.versionChainsEnabled || !this.requirementVersions) return [];
    const workflow = await this.workflows.get(scope.companyId, engagementId);
    const currentId =
      workflow?.currentApprovedRequirementVersionId ??
      workflow?.requirementSet?.currentApprovedVersionId;
    const versions = requirementSetId
      ? await this.requirementVersions.listBySet(scope.companyId, requirementSetId)
      : await this.requirementVersions.listByEngagement(scope.companyId, engagementId);
    return versions.map((v) => ({
      id: v.id,
      engagementId: v.engagementId,
      requirementSetId: v.requirementSetId,
      versionNumber: v.versionNumber,
      publishedAt: v.publishedAt,
      publishedByUserId: v.publishedByUserId,
      title: v.snapshot.title,
      itemCount: v.snapshot.items.length,
      supersedesVersionId: v.supersedesVersionId,
      isCurrent: v.id === currentId,
    }));
  }

  async getRequirementVersionDetail(
    scope: AosReadScope,
    versionId: string,
  ): Promise<RequirementVersionDetailDto | null> {
    if (!this.versionChainsEnabled || !this.requirementVersions) return null;
    const version = await this.requirementVersions.getById(scope.companyId, versionId);
    if (!version) return null;
    const workflow = await this.workflows.get(scope.companyId, version.engagementId);
    const currentId =
      workflow?.currentApprovedRequirementVersionId ??
      workflow?.requirementSet?.currentApprovedVersionId;
    return {
      id: version.id,
      engagementId: version.engagementId,
      requirementSetId: version.requirementSetId,
      versionNumber: version.versionNumber,
      publishedAt: version.publishedAt,
      publishedByUserId: version.publishedByUserId,
      title: version.snapshot.title,
      itemCount: version.snapshot.items.length,
      supersedesVersionId: version.supersedesVersionId,
      isCurrent: version.id === currentId,
      items: version.snapshot.items.map((item) => ({ ...item })),
      attachmentRefs: version.snapshot.attachmentRefs,
    };
  }

  async listPromptVersions(
    scope: AosReadScope,
    promptArtifactId: string,
    engagementId?: DeliveryEngagementId,
  ): Promise<PromptVersionHistoryDto[]> {
    if (!this.versionChainsEnabled || !this.promptVersions) return [];
    const versions = await this.promptVersions.listByArtifact(scope.companyId, promptArtifactId);
    let currentId: string | undefined;
    if (engagementId) {
      const workflow = await this.workflows.get(scope.companyId, engagementId);
      currentId = workflow?.promptPack?.artifacts.find((a) => a.id === promptArtifactId)
        ?.currentApprovedVersionId;
    }
    return versions.map((v) => ({
      id: v.id,
      engagementId: v.engagementId,
      promptPackId: v.promptPackId,
      promptArtifactId: v.promptArtifactId,
      requirementVersionId: v.requirementVersionId,
      versionNumber: v.versionNumber,
      publishedAt: v.publishedAt,
      publishedByUserId: v.publishedByUserId,
      title: v.snapshot.title,
      isCurrent: v.id === currentId,
    }));
  }

  async getPromptVersionDetail(
    scope: AosReadScope,
    versionId: string,
  ): Promise<PromptVersionDetailDto | null> {
    if (!this.versionChainsEnabled || !this.promptVersions) return null;
    const version = await this.promptVersions.getById(scope.companyId, versionId);
    if (!version) return null;
    const workflow = await this.workflows.get(scope.companyId, version.engagementId);
    const currentId = workflow?.promptPack?.artifacts.find(
      (a) => a.id === version.promptArtifactId,
    )?.currentApprovedVersionId;
    return {
      id: version.id,
      engagementId: version.engagementId,
      promptPackId: version.promptPackId,
      promptArtifactId: version.promptArtifactId,
      requirementVersionId: version.requirementVersionId,
      versionNumber: version.versionNumber,
      publishedAt: version.publishedAt,
      publishedByUserId: version.publishedByUserId,
      title: version.snapshot.title,
      isCurrent: version.id === currentId,
      body: version.snapshot.body,
    };
  }

  async listCursorSessions(
    scope: AosReadScope,
    engagementId: DeliveryEngagementId,
  ): Promise<CursorSessionHistoryDto[]> {
    if (!this.versionChainsEnabled) {
      const workflow = await this.workflows.get(scope.companyId, engagementId);
      return (workflow?.cursorSessions ?? []).map((s) => ({
        id: s.id,
        engagementId: s.engagementId,
        promptPackId: s.promptPackId,
        promptArtifactId: s.promptArtifactId,
        promptVersionId: s.promptVersionId,
        status: s.status,
        startedAt: s.startedAt,
        finalizedAt: s.finalizedAt,
        captureSummary: s.captureSummary,
        readOnly: isCursorSessionFinalized(s),
      }));
    }
    if (!this.cursorSessions) return [];
    const sessions = await this.cursorSessions.listByEngagement(scope.companyId, engagementId);
    return sessions.map((s) => ({
      id: s.id,
      engagementId: s.engagementId,
      promptPackId: s.promptPackId,
      promptArtifactId: s.promptArtifactId,
      promptVersionId: s.promptVersionId,
      status: s.status,
      startedAt: s.startedAt,
      finalizedAt: s.finalizedAt,
      captureSummary: s.captureSummary,
      readOnly: isCursorSessionFinalized(s),
    }));
  }

  async listCursorRevisions(
    scope: AosReadScope,
    cursorSessionId: string,
  ): Promise<CursorRevisionHistoryDto[]> {
    if (!this.versionChainsEnabled || !this.cursorRevisions) return [];
    const revisions = await this.cursorRevisions.listBySession(
      scope.companyId,
      cursorSessionId,
    );
    return revisions.map((r) => ({
      id: r.id,
      cursorSessionId: r.cursorSessionId,
      originalPromptVersionId: r.originalPromptVersionId,
      revisionPromptVersionId: r.revisionPromptVersionId,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
    }));
  }

  async listEvaluations(
    scope: AosReadScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EvaluationHistoryDto[]> {
    if (!this.versionChainsEnabled || !this.evaluations) return [];
    const evaluations = await this.evaluations.listByEngagement(scope.companyId, engagementId);
    return evaluations.map((e) => ({
      id: e.id,
      engagementId: e.engagementId,
      cursorSessionId: e.cursorSessionId,
      promptVersionId: e.promptVersionId,
      requirementVersionId: e.requirementVersionId,
      rubricVersionId: e.rubricVersionId,
      rubricName: e.rubricSnapshot.name,
      status: e.status,
      scorePercent: e.scorePercent,
      passed: e.passed,
      createdAt: e.createdAt,
      confirmedAt: e.status !== "draft" ? e.confirmedAt : undefined,
      confirmedByUserId: e.status !== "draft" ? e.confirmedByUserId : undefined,
      overrideReason: e.status === "overridden" ? e.overrideReason : undefined,
      amendsEvaluationId: e.amendsEvaluationId,
      readOnly: isEvaluationFinalized(e),
    }));
  }

  async getEvaluationDetail(
    scope: AosReadScope,
    evaluationId: string,
  ): Promise<EvaluationDetailDto | null> {
    if (!this.versionChainsEnabled || !this.evaluations) return null;
    const evaluation = await this.evaluations.getById(scope.companyId, evaluationId);
    if (!evaluation) return null;
    return {
      id: evaluation.id,
      engagementId: evaluation.engagementId,
      cursorSessionId: evaluation.cursorSessionId,
      promptVersionId: evaluation.promptVersionId,
      requirementVersionId: evaluation.requirementVersionId,
      rubricVersionId: evaluation.rubricVersionId,
      rubricName: evaluation.rubricSnapshot.name,
      status: evaluation.status,
      scorePercent: evaluation.scorePercent,
      passed: evaluation.passed,
      createdAt: evaluation.createdAt,
      confirmedAt: evaluation.status !== "draft" ? evaluation.confirmedAt : undefined,
      confirmedByUserId: evaluation.status !== "draft" ? evaluation.confirmedByUserId : undefined,
      overrideReason: evaluation.status === "overridden" ? evaluation.overrideReason : undefined,
      amendsEvaluationId: evaluation.amendsEvaluationId,
      readOnly: isEvaluationFinalized(evaluation),
      criteria: evaluation.criteria.map((c) => ({ ...c })),
      rubricCriteriaLabels: [...evaluation.rubricSnapshot.criteriaLabels],
    };
  }
}
