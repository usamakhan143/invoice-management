import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOwnerActorScope } from "../../constants/actorScope";
import { DELIVERY_STATE } from "../../domain/delivery/deliveryState";
import type { DeliveryApplicationService } from "../delivery/DeliveryApplicationService";
import type { DeliveryEngagementDto } from "../delivery/dto/DeliveryEngagementDto";
import { EngagementWorkflowApplicationService } from "../workflow/EngagementWorkflowApplicationService";
import {
  InMemoryAuditEventRepository,
  InMemoryEngagementWorkflowRepository,
} from "../../infrastructure/testing/inMemoryWorkflowRepositories";
import { QueueProjectionApplicationService } from "./QueueProjectionApplicationService";

describe("QueueProjectionApplicationService", () => {
  const scope = { companyId: "co1" };
  const actor = createOwnerActorScope("co1", "user1");

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

  let workflows: InMemoryEngagementWorkflowRepository;
  let auditEvents: InMemoryAuditEventRepository;

  beforeEach(() => {
    workflows = new InMemoryEngagementWorkflowRepository();
    auditEvents = new InMemoryAuditEventRepository();
  });

  function createWorkflowService() {
    return new EngagementWorkflowApplicationService({ workflows, auditEvents });
  }

  it("lists requirements awaiting approval", async () => {
    const workflow = createWorkflowService();
    const delivery = {
      listCompanyDeliveries: vi.fn().mockResolvedValue({ items: [engagement] }),
    } as unknown as DeliveryApplicationService;
    const queues = new QueueProjectionApplicationService({ delivery, workflow });

    await workflow.generateRequirementsDraft(actor, "eng1");
    const result = await queues.listRequirementsQueue(scope, {});

    expect(result.totalCount).toBe(1);
    expect(result.items[0]?.tabHref).toBe("/aos/delivery/eng1/requirements");
  });

  it("returns badge counts across queue types", async () => {
    const workflow = createWorkflowService();
    const delivery = {
      listCompanyDeliveries: vi.fn().mockResolvedValue({ items: [engagement] }),
    } as unknown as DeliveryApplicationService;
    const queues = new QueueProjectionApplicationService({ delivery, workflow });

    await workflow.generateRequirementsDraft(actor, "eng1");
    const counts = await queues.getBadgeCounts(scope);

    expect(counts.requirements).toBe(1);
    expect(counts.prompts).toBe(0);
    expect(counts.learning).toBe(0);
  });
});
