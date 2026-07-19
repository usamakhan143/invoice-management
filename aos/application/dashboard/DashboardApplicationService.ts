import type { AosReadScope } from "../types";
import type { DeliveryApplicationService } from "../delivery/DeliveryApplicationService";
import type { QueueProjectionApplicationService } from "../queues/QueueProjectionApplicationService";
import type { KnowledgeApplicationService } from "../knowledge/KnowledgeApplicationService";
import type { ModuleRegistryApplicationService } from "../registry/ModuleRegistryApplicationService";
import {
  DELIVERY_STATE,
  DELIVERY_STATE_LABELS,
  type DeliveryState,
} from "../../constants/deliveryState";
import type {
  AttentionItemDto,
  AttentionSeverity,
  AttentionType,
  FounderDashboardDto,
  NextBestActionDto,
} from "./dto/FounderDashboardDto";

const ATTENTION_PRIORITY: Record<AttentionType, number> = {
  REVIEW_EVALUATION: 1,
  APPROVE_REQUIREMENTS: 2,
  APPROVE_PROMPT_PACK: 3,
  COMPLETE_CAPTURE: 4,
  QA_BLOCKED: 5,
  RETROSPECTIVE_DUE: 6,
  RUN_REUSE_SCAN: 7,
  RISK_STALE: 8,
};

export interface DashboardApplicationServiceDeps {
  delivery: DeliveryApplicationService;
  queues: QueueProjectionApplicationService;
  knowledge: KnowledgeApplicationService;
  registry: ModuleRegistryApplicationService;
}

function sortAttention(items: AttentionItemDto[]): AttentionItemDto[] {
  return [...items].sort((a, b) => {
    const priorityDiff = ATTENTION_PRIORITY[a.type] - ATTENTION_PRIORITY[b.type];
    if (priorityDiff !== 0) return priorityDiff;
    return b.triggeredAt - a.triggeredAt;
  });
}

function mapRequirementsAttention(
  rows: Awaited<ReturnType<QueueProjectionApplicationService["listRequirementsQueue"]>>["items"],
): AttentionItemDto[] {
  return rows.map((row) => ({
    id: `req-${row.engagementId}`,
    type: "APPROVE_REQUIREMENTS" as const,
    severity: "warning" as const,
    actionLabel: `Approve requirement set v${row.setVersion}`,
    engagementTitle: row.engagementTitle,
    clientLabel: row.clientLabel,
    whyNow: `${row.itemCount} items awaiting review before prompt generation`,
    tabHref: row.tabHref,
    aiDraft: row.status === "draft",
    triggeredAt: row.updatedAt,
  }));
}

function mapPromptsAttention(
  rows: Awaited<ReturnType<QueueProjectionApplicationService["listPromptsQueue"]>>["items"],
): AttentionItemDto[] {
  return rows.map((row) => ({
    id: `prompt-${row.engagementId}`,
    type: "APPROVE_PROMPT_PACK" as const,
    severity: "warning" as const,
    actionLabel: `Approve prompt pack v${row.packVersion}`,
    engagementTitle: row.engagementTitle,
    clientLabel: row.clientLabel,
    whyNow: `${row.artifactCount} artifacts ready for founder review`,
    tabHref: row.tabHref,
    aiDraft: row.status === "draft",
    triggeredAt: row.updatedAt,
  }));
}

function mapEvaluationAttention(
  rows: Awaited<ReturnType<QueueProjectionApplicationService["listEvaluationQueue"]>>["items"],
): AttentionItemDto[] {
  return rows.map((row) => ({
    id: `eval-${row.engagementId}`,
    type: "REVIEW_EVALUATION" as const,
    severity: row.result === "failed" ? ("error" as const) : ("warning" as const),
    actionLabel: row.result === "failed" ? "Resolve evaluation failure" : "Review evaluation",
    engagementTitle: row.engagementTitle,
    clientLabel: row.clientLabel,
    whyNow:
      row.result === "failed"
        ? `Evaluation scored ${row.scorePercent}% — iteration required`
        : "Evaluation awaiting founder decision",
    tabHref: row.tabHref,
    aiDraft: false,
    triggeredAt: row.updatedAt,
  }));
}

function mapCursorAttention(
  rows: Awaited<ReturnType<QueueProjectionApplicationService["listCursorQueue"]>>["items"],
): AttentionItemDto[] {
  return rows.map((row) => ({
    id: `cursor-${row.engagementId}-${row.sessionId}`,
    type: "COMPLETE_CAPTURE" as const,
    severity: row.captureStatus === "pending" ? ("warning" as const) : ("neutral" as const),
    actionLabel:
      row.sessionStatus === "not_started" ? "Start Cursor session" : "Complete session capture",
    engagementTitle: row.engagementTitle,
    clientLabel: row.clientLabel,
    whyNow:
      row.captureStatus === "pending"
        ? `Capture missing for ${row.artifactLabel}`
        : `Session ${row.sessionStatus.replace(/_/g, " ")} for ${row.artifactLabel}`,
    tabHref: row.tabHref,
    aiDraft: false,
    triggeredAt: row.updatedAt,
  }));
}

function buildNextBestAction(top: AttentionItemDto | undefined): NextBestActionDto | null {
  if (!top) return null;
  const match = top.tabHref.match(/^\/aos\/delivery\/([^/]+)\/(.+)$/);
  const engagementId = match?.[1] ?? "";
  return {
    engagementId,
    engagementTitle: top.engagementTitle,
    clientLabel: top.clientLabel,
    lifecycleState: DELIVERY_STATE.BUILDING,
    rationale: top.whyNow,
    ctaLabel: top.actionLabel,
    tabHref: top.tabHref,
    blockers: [],
  };
}

function countByLifecycle(
  items: Awaited<ReturnType<DeliveryApplicationService["listCompanyDeliveries"]>>["items"],
): FounderDashboardDto["lifecycleCounts"] {
  const counts = new Map<DeliveryState, number>();
  for (const item of items) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }
  return Object.values(DELIVERY_STATE)
    .filter((state) => state !== DELIVERY_STATE.CANCELLED)
    .map((state) => ({
      state,
      label: DELIVERY_STATE_LABELS[state],
      count: counts.get(state) ?? 0,
    }))
    .filter((entry) => entry.count > 0);
}

/** Cross-engagement founder dashboard projection (ST-01). */
export class DashboardApplicationService {
  private readonly delivery: DeliveryApplicationService;
  private readonly queues: QueueProjectionApplicationService;
  private readonly knowledge: KnowledgeApplicationService;
  private readonly registry: ModuleRegistryApplicationService;

  constructor(deps: DashboardApplicationServiceDeps) {
    this.delivery = deps.delivery;
    this.queues = deps.queues;
    this.knowledge = deps.knowledge;
    this.registry = deps.registry;
  }

  async getFounderDashboard(scope: AosReadScope): Promise<FounderDashboardDto> {
    const [
      deliveries,
      requirements,
      prompts,
      cursor,
      evaluation,
      badgeCounts,
      knowledgeList,
      registryList,
    ] = await Promise.all([
      this.delivery.listCompanyDeliveries(scope, { limit: 200 }),
      this.queues.listRequirementsQueue(scope, {}),
      this.queues.listPromptsQueue(scope, {}),
      this.queues.listCursorQueue(scope, {}),
      this.queues.listEvaluationQueue(scope, {}),
      this.queues.getBadgeCounts(scope),
      this.knowledge.listKnowledge(scope, {}),
      this.registry.listModules(scope, {}),
    ]);

    const attentionQueue = sortAttention([
      ...mapEvaluationAttention(evaluation.items),
      ...mapRequirementsAttention(requirements.items),
      ...mapPromptsAttention(prompts.items),
      ...mapCursorAttention(cursor.items),
    ]).slice(0, 7);

    const evaluationAlerts = attentionQueue.filter((item) => item.type === "REVIEW_EVALUATION");

    const risks: FounderDashboardDto["risks"] = evaluationAlerts.slice(0, 3).map((item) => ({
      id: `risk-${item.id}`,
      message: item.whyNow,
      severity: item.severity as AttentionSeverity,
      evidenceHref: item.tabHref,
      evidenceLabel: "View evaluation",
    }));

    const pausedCount = deliveries.items.filter((d) => d.status === DELIVERY_STATE.PAUSED).length;
    if (pausedCount > 0 && risks.length < 3) {
      risks.push({
        id: "risk-paused",
        message: `${pausedCount} engagement${pausedCount === 1 ? "" : "s"} paused — review before delivery resumes`,
        severity: "warning",
        evidenceHref: "/aos/delivery",
        evidenceLabel: "View deliveries",
      });
    }

    const nextBestAction = buildNextBestAction(attentionQueue[0]);

    const aiInsights: FounderDashboardDto["aiInsights"] = [
      {
        id: "insight-focus",
        message:
          attentionQueue.length > 0
            ? `Complete ${Math.min(2, attentionQueue.length)} approval${attentionQueue.length === 1 ? "" : "s"} to unblock active building work`
            : "All gates are clear — review reuse opportunities for upcoming planning engagements",
        aiGenerated: true,
      },
    ];

    if (evaluationAlerts.length > 0) {
      aiInsights.push({
        id: "insight-eval",
        message: `${evaluationAlerts.length} evaluation${evaluationAlerts.length === 1 ? "" : "s"} need founder review before delivery can advance`,
        aiGenerated: true,
      });
    }

    const reuseOpportunities = registryList.items
      .filter((m) => m.status === "stable" || m.status === "experimental")
      .slice(0, 4);

    return {
      attentionQueue,
      nextBestAction,
      lifecycleCounts: countByLifecycle(deliveries.items),
      risks,
      evaluationAlerts,
      pendingReviews: badgeCounts,
      aiInsights,
      todaysFocus:
        attentionQueue[0]?.whyNow ??
        "Nothing blocking founder action — monitor active engagements in Delivery list",
      upcomingCritical: attentionQueue.slice(0, 3),
      recentKnowledge: knowledgeList.items.slice(0, 3),
      registryActivity: registryList.items.slice(0, 3),
      reuseOpportunities,
      quickActions: [
        { id: "create", label: "Create engagement", href: "/aos/delivery/new" },
        { id: "delivery", label: "View deliveries", href: "/aos/delivery" },
        { id: "requirements", label: "Requirements queue", href: "/aos/requirements" },
        { id: "playbook", label: "Open playbook", href: "/aos/playbook" },
      ],
      founderDecisionCards: attentionQueue.slice(0, 3),
    };
  }
}
