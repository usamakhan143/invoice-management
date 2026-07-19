import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELIVERY_STATE } from "../../domain/delivery/deliveryState";
import type { DeliveryApplicationService } from "../delivery/DeliveryApplicationService";
import type { DeliveryEngagementDto } from "../delivery/dto/DeliveryEngagementDto";
import { EngagementWorkflowApplicationService } from "../workflow/EngagementWorkflowApplicationService";
import { EngagementWorkflowMemoryStore, resetEngagementWorkflowMemoryStore } from "../../infrastructure/memory/EngagementWorkflowMemoryStore";
import { QueueProjectionApplicationService } from "./QueueProjectionApplicationService";

describe("QueueProjectionApplicationService", () => {
  const scope = { companyId: "co1" };
  const actor = { companyId: "co1", actorUserId: "user1" };

  const engagement: DeliveryEngagementDto = {
    id: "eng1",
    companyId: "co1",
    title: "Portal rebuild",
    status: DELIVERY_STATE.INTAKE,
    erpCustomerId: "cust-1",
    deliveryLeadUserId: "user1",
    createdAt: 1,
    updatedAt: 2,
    createdById: "user1",
  };

  beforeEach(() => {
    resetEngagementWorkflowMemoryStore();
  });

  it("lists requirements awaiting approval", async () => {
    const store = new EngagementWorkflowMemoryStore();
    const workflow = new EngagementWorkflowApplicationService({ store });
    const delivery = {
      listCompanyDeliveries: vi.fn().mockResolvedValue({ items: [engagement] }),
    } as unknown as DeliveryApplicationService;
    const queues = new QueueProjectionApplicationService({ delivery, workflowStore: store });

    await workflow.generateRequirementsDraft(actor, "eng1");
    const result = await queues.listRequirementsQueue(scope, {});

    expect(result.totalCount).toBe(1);
    expect(result.items[0]?.tabHref).toBe("/aos/delivery/eng1/requirements");
  });

  it("returns badge counts across queue types", async () => {
    const store = new EngagementWorkflowMemoryStore();
    const workflow = new EngagementWorkflowApplicationService({ store });
    const delivery = {
      listCompanyDeliveries: vi.fn().mockResolvedValue({ items: [engagement] }),
    } as unknown as DeliveryApplicationService;
    const queues = new QueueProjectionApplicationService({ delivery, workflowStore: store });

    await workflow.generateRequirementsDraft(actor, "eng1");
    const counts = await queues.getBadgeCounts(scope);

    expect(counts.requirements).toBe(1);
    expect(counts.prompts).toBe(0);
  });
});
