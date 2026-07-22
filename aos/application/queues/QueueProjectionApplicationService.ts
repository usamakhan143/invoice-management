import type { DeliveryApplicationService } from "../delivery/DeliveryApplicationService";
import type { DeliveryEngagementDto } from "../delivery/dto/DeliveryEngagementDto";
import type { EngagementWorkflowApplicationService } from "../workflow/EngagementWorkflowApplicationService";
import type { EngagementWorkflowDto } from "../workflow/dto/EngagementWorkflowDto";
import type { AosReadScope } from "../types";
import type {
  CursorQueueRowDto,
  EvaluationQueueRowDto,
  ListQueueQuery,
  PromptsQueueRowDto,
  QueueBadgeCountsDto,
  QueueListDto,
  RequirementsQueueRowDto,
} from "./dto/QueueProjectionDto";

import type { LearningApplicationService } from "../learning/LearningApplicationService";
import { isLearningEngineEnabled } from "../../config/learningEngineConfig";

export interface QueueProjectionApplicationServiceDeps {
  delivery: DeliveryApplicationService;
  workflow: EngagementWorkflowApplicationService;
  learning?: LearningApplicationService;
}

function matchesSearch(
  row: { engagementTitle: string; clientLabel: string },
  search?: string,
): boolean {
  if (!search?.trim()) {
    return true;
  }
  const q = search.trim().toLowerCase();
  return (
    row.engagementTitle.toLowerCase().includes(q) ||
    row.clientLabel.toLowerCase().includes(q)
  );
}

function engagementMap(items: DeliveryEngagementDto[]): Map<string, DeliveryEngagementDto> {
  return new Map(items.map((item) => [item.id, item]));
}

function baseRow(
  workflow: { engagementId: string },
  engagement: DeliveryEngagementDto | undefined,
  tabSegment: string,
) {
  return {
    engagementId: workflow.engagementId,
    engagementTitle: engagement?.title ?? workflow.engagementId,
    clientLabel: engagement?.erpCustomerId ?? "—",
    tabHref: `/aos/delivery/${workflow.engagementId}/${tabSegment}`,
  };
}

function isPendingRequirements(workflow: EngagementWorkflowDto): boolean {
  return (
    !workflow.gates.requirementsApproved &&
    workflow.requirementSet !== null &&
    (workflow.requirementSet.status === "draft" || workflow.requirementSet.status === "in_review")
  );
}

function isPendingPrompts(workflow: EngagementWorkflowDto): boolean {
  return (
    workflow.gates.requirementsApproved &&
    !workflow.gates.promptPackApproved &&
    workflow.promptPack !== null &&
    (workflow.promptPack.status === "draft" || workflow.promptPack.status === "in_review")
  );
}

function isPendingEvaluation(workflow: EngagementWorkflowDto): boolean {
  return (
    workflow.gates.cursorSubmitted &&
    !workflow.gates.evaluationPassed &&
    workflow.evaluation !== null &&
    (!workflow.evaluation.passed || workflow.evaluation.status === "failed")
  );
}

/** Cross-engagement queue projections for global queue screens (ST-12–ST-15). */
export class QueueProjectionApplicationService {
  private readonly delivery: DeliveryApplicationService;
  private readonly workflow: EngagementWorkflowApplicationService;
  private readonly learning?: LearningApplicationService;

  constructor(deps: QueueProjectionApplicationServiceDeps) {
    this.delivery = deps.delivery;
    this.workflow = deps.workflow;
    this.learning = deps.learning;
  }

  private async loadContext(scope: AosReadScope) {
    const [deliveries, workflows] = await Promise.all([
      this.delivery.listCompanyDeliveries(scope, { limit: 200 }),
      this.workflow.listWorkflows(scope),
    ]);
    return { deliveries: deliveries.items, workflows, byId: engagementMap(deliveries.items) };
  }

  async listRequirementsQueue(
    scope: AosReadScope,
    query: ListQueueQuery = {},
  ): Promise<QueueListDto<RequirementsQueueRowDto>> {
    const { workflows, byId } = await this.loadContext(scope);
    const items = workflows
      .filter(isPendingRequirements)
      .map((workflow) => {
        const engagement = byId.get(workflow.engagementId);
        const set = workflow.requirementSet!;
        return {
          ...baseRow(workflow, engagement, "requirements"),
          updatedAt: set.updatedAt,
          setVersion: set.version,
          status: set.status,
          itemCount: set.items.length,
        };
      })
      .filter((row) => matchesSearch(row, query.search))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return { items, totalCount: items.length };
  }

  async listPromptsQueue(
    scope: AosReadScope,
    query: ListQueueQuery = {},
  ): Promise<QueueListDto<PromptsQueueRowDto>> {
    const { workflows, byId } = await this.loadContext(scope);
    const items = workflows
      .filter(isPendingPrompts)
      .map((workflow) => {
        const engagement = byId.get(workflow.engagementId);
        const pack = workflow.promptPack!;
        return {
          ...baseRow(workflow, engagement, "prompts"),
          updatedAt: pack.updatedAt,
          packVersion: pack.version,
          status: pack.status,
          artifactCount: pack.artifacts.length,
        };
      })
      .filter((row) => matchesSearch(row, query.search))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return { items, totalCount: items.length };
  }

  async listCursorQueue(
    scope: AosReadScope,
    query: ListQueueQuery = {},
  ): Promise<QueueListDto<CursorQueueRowDto>> {
    const { workflows, byId } = await this.loadContext(scope);
    const rows: CursorQueueRowDto[] = [];

    for (const workflow of workflows) {
      if (!workflow.gates.promptPackApproved || workflow.gates.cursorSubmitted) {
        continue;
      }

      const engagement = byId.get(workflow.engagementId);
      const artifactLabel = workflow.promptPack?.title ?? "Prompt pack";

      const pendingSessions = workflow.cursorSessions.filter(
        (session) => session.status === "active" || session.status === "awaiting_capture",
      );

      if (pendingSessions.length === 0 && workflow.promptPack?.status === "approved") {
        rows.push({
          ...baseRow(workflow, engagement, "cursor"),
          sessionId: "—",
          artifactLabel,
          sessionStatus: "not_started",
          captureStatus: "pending",
          updatedAt: workflow.promptPack.updatedAt,
        });
        continue;
      }

      for (const session of pendingSessions) {
        if (query.statusFilter && query.statusFilter !== session.status) {
          continue;
        }
        rows.push({
          ...baseRow(workflow, engagement, "cursor"),
          sessionId: session.id,
          artifactLabel,
          sessionStatus: session.status,
          captureStatus: session.captureSummary ? "captured" : "pending",
          updatedAt: session.submittedAt ?? session.startedAt,
        });
      }
    }

    const items = rows
      .filter((row) => matchesSearch(row, query.search))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return { items, totalCount: items.length };
  }

  async listEvaluationQueue(
    scope: AosReadScope,
    query: ListQueueQuery = {},
  ): Promise<QueueListDto<EvaluationQueueRowDto>> {
    const { workflows, byId } = await this.loadContext(scope);
    const items = workflows
      .filter(isPendingEvaluation)
      .map((workflow) => {
        const engagement = byId.get(workflow.engagementId);
        const evaluation = workflow.evaluation!;
        const latestSession = workflow.cursorSessions[0];
        return {
          ...baseRow(workflow, engagement, "evaluation"),
          updatedAt: evaluation.ranAt ?? Date.now(),
          evaluationId: evaluation.id,
          sessionLabel: latestSession?.id ?? "—",
          result: evaluation.passed ? "passed" : "failed",
          scorePercent: evaluation.scorePercent,
        };
      })
      .filter((row) => {
        if (query.statusFilter && row.result !== query.statusFilter) {
          return false;
        }
        return matchesSearch(row, query.search);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);

    return { items, totalCount: items.length };
  }

  async getBadgeCounts(scope: AosReadScope): Promise<QueueBadgeCountsDto> {
    const [requirements, prompts, cursor, evaluation, learningCount] = await Promise.all([
      this.listRequirementsQueue(scope, {}),
      this.listPromptsQueue(scope, {}),
      this.listCursorQueue(scope, {}),
      this.listEvaluationQueue(scope, {}),
      isLearningEngineEnabled() && this.learning
        ? this.learning.countPendingReview(scope)
        : Promise.resolve(0),
    ]);

    return {
      requirements: requirements.totalCount,
      prompts: prompts.totalCount,
      cursor: cursor.totalCount,
      evaluation: evaluation.totalCount,
      learning: learningCount ?? 0,
    };
  }
}
