import type { DeliveryEngagementId } from "../../domain/delivery/valueObjects";
import type { AosActorScope, AosReadScope } from "../types";
import type { EngagementWorkflowDto } from "./dto/EngagementWorkflowDto";
import type { EngagementWorkflowStore } from "./EngagementWorkflowStore";

export type { EngagementWorkflowStore } from "./EngagementWorkflowStore";

export interface GetEngagementWorkflowQuery {
  engagementId: DeliveryEngagementId;
}

export interface EngagementWorkflowApplicationServiceDeps {
  store: EngagementWorkflowStore;
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
}

export class EngagementWorkflowApplicationService {
  private readonly store: EngagementWorkflowStore;
  private readonly advanceEngagementLifecycle?: EngagementWorkflowApplicationServiceDeps["advanceEngagementLifecycle"];

  constructor(deps: EngagementWorkflowApplicationServiceDeps) {
    this.store = deps.store;
    this.advanceEngagementLifecycle = deps.advanceEngagementLifecycle;
  }

  async getWorkflow(
    scope: AosReadScope,
    query: GetEngagementWorkflowQuery,
  ): Promise<EngagementWorkflowDto> {
    return this.store.getOrCreate(scope.companyId, query.engagementId);
  }

  async generateRequirementsDraft(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    const now = Date.now();
    workflow.requirementSet = {
      id: `req-set-${engagementId}-v1`,
      engagementId,
      version: 1,
      status: "draft",
      title: "Initial requirement set",
      aiGenerated: true,
      updatedAt: now,
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
    };
    workflow.timeline.unshift(this.event(engagementId, "requirements.draft_generated", "AI requirement draft generated", scope.actorUserId, now));
    return this.store.save(scope.companyId, workflow);
  }

  async updateRequirementDraft(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    body: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.requirementSet) {
      throw new Error("No requirement draft exists");
    }
    workflow.requirementSet.status = "draft";
    workflow.requirementSet.items = [
      {
        id: "req-manual",
        title: "Captured requirements",
        description: body,
      },
    ];
    workflow.requirementSet.aiGenerated = false;
    workflow.requirementSet.updatedAt = Date.now();
    return this.store.save(scope.companyId, workflow);
  }

  async approveRequirements(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    note: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.requirementSet) {
      throw new Error("No requirement set to approve");
    }
    const now = Date.now();
    workflow.requirementSet.status = "approved";
    workflow.requirementSet.approvalNote = note;
    workflow.requirementSet.approvedAt = now;
    workflow.gates.requirementsApproved = true;
    workflow.timeline.unshift(this.event(engagementId, "requirements.approved", "Requirement set approved", scope.actorUserId, now));
    await this.advance(scope, engagementId, "approve_requirements");
    return this.store.save(scope.companyId, workflow);
  }

  async runReuseAssessment(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.gates.requirementsApproved) {
      throw new Error("Requirements must be approved before reuse assessment");
    }
    const now = Date.now();
    workflow.reuseAssessment = {
      id: `reuse-${engagementId}`,
      engagementId,
      status: "draft",
      reuseRate: 0,
      lastRunAt: now,
      modules: [
        { moduleId: "auth-firebase-v2", moduleName: "Firebase Auth Module", matchScore: 92, decision: "pending", source: "registry" },
        { moduleId: "form-field-kit", moduleName: "Form Field Kit", matchScore: 88, decision: "pending", source: "registry" },
        { moduleId: "data-table-virtual", moduleName: "Virtual Data Table", matchScore: 75, decision: "pending", source: "knowledge" },
      ],
    };
    workflow.timeline.unshift(this.event(engagementId, "reuse.assessment_run", "Reuse assessment completed", scope.actorUserId, now));
    return this.store.save(scope.companyId, workflow);
  }

  async recordReuseDecisions(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    input: { netNewJustification?: string },
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.reuseAssessment) {
      throw new Error("Run reuse assessment first");
    }
    const accepted = workflow.reuseAssessment.modules.filter((m) => m.decision === "accepted").length;
    workflow.reuseAssessment.reuseRate = Math.round((accepted / workflow.reuseAssessment.modules.length) * 100);
    workflow.reuseAssessment.netNewJustification = input.netNewJustification;
    workflow.reuseAssessment.status = "approved";
    workflow.reuseAssessment.recordedAt = Date.now();
    workflow.gates.reuseRecorded = true;
    workflow.timeline.unshift(this.event(engagementId, "reuse.recorded", "Reuse decisions recorded", scope.actorUserId, Date.now()));
    return this.store.save(scope.companyId, workflow);
  }

  async setReuseModuleDecision(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    moduleId: string,
    decision: "accepted" | "rejected",
    justification?: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.reuseAssessment) {
      throw new Error("Run reuse assessment first");
    }
    workflow.reuseAssessment.modules = workflow.reuseAssessment.modules.map((module) =>
      module.moduleId === moduleId ? { ...module, decision, justification } : module,
    );
    return this.store.save(scope.companyId, workflow);
  }

  async generatePromptPack(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.gates.reuseRecorded) {
      throw new Error("Reuse decisions must be recorded first");
    }
    const now = Date.now();
    workflow.promptPack = {
      id: `prompt-pack-${engagementId}-v1`,
      engagementId,
      version: 1,
      status: "draft",
      title: "Feature delivery prompt pack",
      aiGenerated: true,
      updatedAt: now,
      artifacts: [
        { id: "artifact-1", title: "Implementation prompt", body: "Implement approved requirements using accepted reusable modules first." },
        { id: "artifact-2", title: "Verification prompt", body: "Verify gates, tests, and evaluation rubric before QA handoff." },
      ],
    };
    workflow.timeline.unshift(this.event(engagementId, "prompts.generated", "Prompt pack draft generated", scope.actorUserId, now));
    return this.store.save(scope.companyId, workflow);
  }

  async approvePromptPack(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    note: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.promptPack) {
      throw new Error("No prompt pack to approve");
    }
    const now = Date.now();
    workflow.promptPack.status = "approved";
    workflow.promptPack.approvalNote = note;
    workflow.promptPack.approvedAt = now;
    workflow.gates.promptPackApproved = true;
    workflow.timeline.unshift(this.event(engagementId, "prompts.approved", "Prompt pack approved", scope.actorUserId, now));
    await this.advance(scope, engagementId, "approve_prompt_pack");
    return this.store.save(scope.companyId, workflow);
  }

  async startCursorSession(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.gates.promptPackApproved || !workflow.promptPack) {
      throw new Error("Approve a prompt pack before starting Cursor");
    }
    const now = Date.now();
    workflow.cursorSessions.unshift({
      id: `cursor-${now}`,
      engagementId,
      promptPackId: workflow.promptPack.id,
      status: "active",
      startedAt: now,
    });
    workflow.timeline.unshift(this.event(engagementId, "cursor.started", "Cursor session started", scope.actorUserId, now));
    return this.store.save(scope.companyId, workflow);
  }

  async submitCursorCapture(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    sessionId: string,
    captureSummary: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    const now = Date.now();
    workflow.cursorSessions = workflow.cursorSessions.map((session) =>
      session.id === sessionId
        ? { ...session, status: "submitted", captureSummary, submittedAt: now }
        : session,
    );
    workflow.gates.cursorSubmitted = workflow.cursorSessions.some((s) => s.status === "submitted");
    workflow.timeline.unshift(this.event(engagementId, "cursor.capture_submitted", "Cursor capture submitted", scope.actorUserId, now));
    if (workflow.gates.cursorSubmitted) {
      await this.advance(scope, engagementId, "submit_sessions");
    }
    return this.store.save(scope.companyId, workflow);
  }

  async runEvaluation(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.gates.cursorSubmitted) {
      throw new Error("Submit a Cursor capture before evaluation");
    }
    const now = Date.now();
    const passed = true;
    workflow.evaluation = {
      id: `eval-${engagementId}`,
      engagementId,
      status: passed ? "passed" : "failed",
      rubricName: "Delivery Quality Rubric",
      scorePercent: passed ? 88 : 62,
      passed,
      ranAt: now,
      criteria: [
        { id: "c1", label: "Requirements coverage", passed: true, score: 90 },
        { id: "c2", label: "Reuse compliance", passed: true, score: 85 },
        { id: "c3", label: "Capture evidence quality", passed: passed, score: passed ? 88 : 55 },
      ],
    };
    workflow.gates.evaluationPassed = passed;
    workflow.timeline.unshift(this.event(engagementId, "evaluation.completed", passed ? "Evaluation passed" : "Evaluation failed", scope.actorUserId, now));
    if (passed) {
      await this.advance(scope, engagementId, "pass_evaluations");
    }
    return this.store.save(scope.companyId, workflow);
  }

  async updateQaChecklist(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    itemId: string,
    checked: boolean,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.gates.evaluationPassed) {
      throw new Error("Evaluation must pass before QA");
    }
    if (!workflow.qualityReport) {
      workflow.qualityReport = {
        id: `qa-${engagementId}`,
        engagementId,
        status: "draft",
        checklist: [
          { id: "qa-1", label: "All approved requirements verified", checked: false },
          { id: "qa-2", label: "Prompt pack artifacts copied to Cursor", checked: false },
          { id: "qa-3", label: "Evaluation evidence attached", checked: false },
        ],
      };
    }
    workflow.qualityReport.checklist = workflow.qualityReport.checklist.map((item) =>
      item.id === itemId ? { ...item, checked } : item,
    );
    return this.store.save(scope.companyId, workflow);
  }

  async approveQaHandoff(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    note: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.qualityReport) {
      throw new Error("QA checklist not initialized");
    }
    const allChecked = workflow.qualityReport.checklist.every((item) => item.checked);
    if (!allChecked) {
      throw new Error("Complete all QA checklist items before handoff");
    }
    const now = Date.now();
    workflow.qualityReport.status = "approved";
    workflow.qualityReport.summaryNotes = note;
    workflow.qualityReport.approvedAt = now;
    workflow.gates.qaComplete = true;
    workflow.timeline.unshift(this.event(engagementId, "qa.approved", "QA handoff approved", scope.actorUserId, now));
    await this.advance(scope, engagementId, "complete_qa");
    return this.store.save(scope.companyId, workflow);
  }

  async generateRetrospective(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.gates.qaComplete) {
      throw new Error("Complete QA before retrospective");
    }
    workflow.retrospective = {
      id: `retro-${engagementId}`,
      engagementId,
      status: "draft",
      aiGenerated: true,
      lessons: [
        { id: "l1", text: "Reuse assessment early reduced net-new scope.", promotionTarget: "knowledge" },
        { id: "l2", text: "Approval gates prevented premature Cursor execution.", promotionTarget: "registry" },
      ],
    };
    workflow.timeline.unshift(this.event(engagementId, "retro.generated", "Retrospective draft generated", scope.actorUserId, Date.now()));
    return this.store.save(scope.companyId, workflow);
  }

  async approveRetrospective(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    note: string,
  ): Promise<EngagementWorkflowDto> {
    const workflow = this.store.getOrCreate(scope.companyId, engagementId);
    if (!workflow.retrospective) {
      throw new Error("Generate retrospective first");
    }
    const now = Date.now();
    workflow.retrospective.status = "approved";
    workflow.retrospective.approvalNote = note;
    workflow.retrospective.approvedAt = now;
    workflow.gates.retrospectiveComplete = true;
    workflow.timeline.unshift(this.event(engagementId, "retro.approved", "Retrospective approved", scope.actorUserId, now));
    await this.advance(scope, engagementId, "submit_retrospective");
    return this.store.save(scope.companyId, workflow);
  }

  private async advance(
    scope: AosActorScope,
    engagementId: DeliveryEngagementId,
    event: Parameters<NonNullable<EngagementWorkflowApplicationServiceDeps["advanceEngagementLifecycle"]>>[2],
  ): Promise<void> {
    if (this.advanceEngagementLifecycle) {
      await this.advanceEngagementLifecycle(scope, engagementId, event);
    }
  }

  private event(
    engagementId: string,
    type: string,
    title: string,
    actorUserId: string,
    timestamp: number,
  ) {
    return {
      id: `${type}-${timestamp}`,
      engagementId,
      type,
      title,
      actorLabel: actorUserId,
      timestamp,
    };
  }
}
