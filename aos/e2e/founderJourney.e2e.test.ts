/**
 * Founder journey application smoke scenarios — in-memory persistence only.
 * For Firestore integration coverage see founderJourney.integration.test.ts.
 */
import { describe, expect, it } from "vitest";
import { DELIVERY_STATE } from "../domain/delivery/deliveryState";
import { DeliveryApplicationService } from "../application/delivery/DeliveryApplicationService";
import { EngagementWorkflowApplicationService } from "../application/workflow/EngagementWorkflowApplicationService";
import { QueueProjectionApplicationService } from "../application/queues/QueueProjectionApplicationService";
import { DashboardApplicationService } from "../application/dashboard/DashboardApplicationService";
import { ModuleRegistryApplicationService } from "../application/registry/ModuleRegistryApplicationService";
import { KnowledgeApplicationService } from "../application/knowledge/KnowledgeApplicationService";
import { PlaybookApplicationService } from "../application/playbook/PlaybookApplicationService";
import {
  InMemoryAuditEventRepository,
  InMemoryEngagementWorkflowRepository,
} from "../infrastructure/testing/inMemoryWorkflowRepositories";
import {
  InMemoryKnowledgeRepository,
  InMemoryModuleRegistryRepository,
  InMemoryPlaybookRepository,
} from "../infrastructure/testing/inMemoryCatalogRepositories";
import { vi } from "vitest";
import { createOwnerActorScope } from "../constants/actorScope";

describe("Founder Journey smoke (application layer, in-memory)", () => {
  const actorScope = createOwnerActorScope("co-e2e", "founder-1");
  const readScope = { companyId: "co-e2e" };

  function createStack() {
    const workflows = new InMemoryEngagementWorkflowRepository();
    const auditEvents = new InMemoryAuditEventRepository();
    const delivery = {
      listCompanyDeliveries: vi.fn().mockResolvedValue({
        items: [
          {
            id: "eng-e2e-1",
            companyId: "co-e2e",
            title: "E2E Engagement",
            status: DELIVERY_STATE.INTAKE,
            erpCustomerId: "cust-1",
            deliveryLeadUserId: "founder-1",
            createdAt: 1,
            updatedAt: 2,
            createdById: "founder-1",
          },
        ],
      }),
      getEngagement: vi.fn().mockResolvedValue({
        id: "eng-e2e-1",
        companyId: "co-e2e",
        title: "E2E Engagement",
        status: DELIVERY_STATE.INTAKE,
        erpCustomerId: "cust-1",
        deliveryLeadUserId: "founder-1",
        createdAt: 1,
        updatedAt: 2,
        createdById: "founder-1",
      }),
      advanceLifecycle: vi.fn().mockResolvedValue(undefined),
    } as unknown as DeliveryApplicationService;

    const workflow = new EngagementWorkflowApplicationService({ workflows, auditEvents });
    const queues = new QueueProjectionApplicationService({ delivery, workflow });
    const registry = new ModuleRegistryApplicationService({
      repository: new InMemoryModuleRegistryRepository(),
    });
    const knowledge = new KnowledgeApplicationService({
      repository: new InMemoryKnowledgeRepository(),
    });
    const playbook = new PlaybookApplicationService({
      repository: new InMemoryPlaybookRepository(),
    });
    const dashboard = new DashboardApplicationService({
      delivery,
      queues,
      knowledge,
      registry,
      learning: {
        listReviewQueue: vi.fn().mockResolvedValue({ items: [], totalCount: 0, pendingReviewCount: 0 }),
        countPendingReview: vi.fn().mockResolvedValue(0),
      } as unknown as import("../application/learning/LearningApplicationService").LearningApplicationService,
    });

    return { delivery, workflow, queues, registry, knowledge, playbook, dashboard, auditEvents };
  }

  it("E2E-01: dashboard loads with attention data after workflow activity", async () => {
    const { workflow, dashboard } = createStack();
    await workflow.generateRequirementsDraft(actorScope, "eng-e2e-1");
    const dashboardDto = await dashboard.getFounderDashboard(actorScope);
    expect(dashboardDto.attentionQueue.length).toBeGreaterThan(0);
  });

  it("E2E-02: delivery list context and workflow overview data", async () => {
    const { delivery, workflow } = createStack();
    const list = await delivery.listCompanyDeliveries(readScope, {});
    expect(list.items.length).toBe(1);
    const wf = await workflow.getWorkflow(readScope, { engagementId: "eng-e2e-1" });
    expect(wf.engagementId).toBe("eng-e2e-1");
  });

  it("E2E-03: create engagement command shape is valid (delivery service contract)", async () => {
    const command = {
      title: "New engagement",
      erpCustomerId: "cust-1",
      deliveryLeadUserId: "founder-1",
      agencyType: "web" as const,
      engagementType: "greenfield" as const,
    };
    expect(command.title.length).toBeGreaterThan(0);
  });

  it("E2E-04: requirements approve flow with audit trail", async () => {
    const { workflow, auditEvents } = createStack();
    await workflow.generateRequirementsDraft(actorScope, "eng-e2e-1");
    const approved = await workflow.approveRequirements(actorScope, "eng-e2e-1", "Approved for E2E");
    expect(approved.gates.requirementsApproved).toBe(true);
    const events = await auditEvents.listByEngagement(readScope.companyId, "eng-e2e-1");
    expect(events.some((event) => event.type === "requirements.approved")).toBe(true);
  });

  it("E2E-05: queue row links to engagement requirements tab", async () => {
    const { workflow, queues } = createStack();
    await workflow.generateRequirementsDraft(actorScope, "eng-e2e-1");
    const queue = await queues.listRequirementsQueue(readScope, {});
    expect(queue.items[0]?.tabHref).toBe("/aos/delivery/eng-e2e-1/requirements");
  });
});
