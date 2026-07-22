import { describe, expect, it, vi } from "vitest";
import { createOwnerActorScope } from "../../constants/actorScope";
import { DELIVERY_STATE } from "../../constants/deliveryState";
import type { DeliveryApplicationService } from "../delivery/DeliveryApplicationService";
import type { KnowledgeApplicationService } from "../knowledge/KnowledgeApplicationService";
import type { LearningApplicationService } from "../learning/LearningApplicationService";
import type { QueueProjectionApplicationService } from "../queues/QueueProjectionApplicationService";
import type { ModuleRegistryApplicationService } from "../registry/ModuleRegistryApplicationService";
import { DashboardApplicationService } from "./DashboardApplicationService";

describe("DashboardApplicationService", () => {
  const scope = createOwnerActorScope("co1", "user-1");

  function baseMocks() {
    const delivery = {
      listCompanyDeliveries: vi.fn().mockResolvedValue({ items: [] }),
    } as unknown as DeliveryApplicationService;
    const queues = {
      listRequirementsQueue: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
      listPromptsQueue: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
      listCursorQueue: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
      listEvaluationQueue: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
      getBadgeCounts: vi
        .fn()
        .mockResolvedValue({ requirements: 0, prompts: 0, cursor: 0, evaluation: 0, learning: 0 }),
    } as unknown as QueueProjectionApplicationService;
    const knowledge = {
      listKnowledge: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    } as unknown as KnowledgeApplicationService;
    const registry = {
      listModules: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    } as unknown as ModuleRegistryApplicationService;
    const learning = {
      listReviewQueue: vi.fn().mockResolvedValue({ items: [], totalCount: 0, pendingReviewCount: 0 }),
      countPendingReview: vi.fn().mockResolvedValue(0),
    } as unknown as LearningApplicationService;

    return { delivery, queues, knowledge, registry, learning };
  }

  it("builds attention queue from queue projections", async () => {
    const { delivery, queues, knowledge, registry, learning } = baseMocks();
    vi.mocked(queues.listRequirementsQueue).mockResolvedValue({
      items: [
        {
          engagementId: "e1",
          engagementTitle: "Portal",
          clientLabel: "Acme",
          tabHref: "/aos/delivery/e1/requirements",
          setVersion: 2,
          status: "draft",
          itemCount: 5,
          updatedAt: 100,
        },
      ],
      totalCount: 1,
    });
    vi.mocked(queues.getBadgeCounts).mockResolvedValue({
      requirements: 1,
      prompts: 0,
      cursor: 0,
      evaluation: 0,
      learning: 0,
    });

    const dashboard = new DashboardApplicationService({ delivery, queues, knowledge, registry, learning });
    const result = await dashboard.getFounderDashboard(scope);

    expect(result.attentionQueue).toHaveLength(1);
    expect(result.attentionQueue[0]?.type).toBe("APPROVE_REQUIREMENTS");
    expect(result.nextBestAction?.tabHref).toBe("/aos/delivery/e1/requirements");
    expect(result.pendingReviews.requirements).toBe(1);
  });

  it("includes lifecycle counts for active deliveries", async () => {
    const { delivery, queues, knowledge, registry, learning } = baseMocks();
    vi.mocked(delivery.listCompanyDeliveries).mockResolvedValue({
      items: [{ id: "e1", status: DELIVERY_STATE.BUILDING, title: "X" }],
    });

    const dashboard = new DashboardApplicationService({ delivery, queues, knowledge, registry, learning });
    const result = await dashboard.getFounderDashboard(scope);

    expect(result.lifecycleCounts.some((c) => c.state === DELIVERY_STATE.BUILDING && c.count === 1)).toBe(
      true,
    );
  });
});
