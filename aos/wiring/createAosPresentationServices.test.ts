import { describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/wiring/createAosDeliveryReadPorts", () => ({
  createAosDeliveryReadPorts: vi.fn(() => ({
    customers: {},
    leads: {},
    users: {},
    initiatives: {},
  })),
}));

vi.mock("../infrastructure/firestore/wiring/createAosDeliveryRepositories", () => ({
  createAosDeliveryRepositories: vi.fn(() => ({
    engagements: {},
    templates: {},
    qualityReports: {},
  })),
}));

import { DeliveryApplicationService } from "../application/delivery/DeliveryApplicationService";
import { ModuleRegistryApplicationService } from "../application/registry/ModuleRegistryApplicationService";
import { KnowledgeApplicationService } from "../application/knowledge/KnowledgeApplicationService";
import { DashboardApplicationService } from "../application/dashboard/DashboardApplicationService";
import { PlaybookApplicationService } from "../application/playbook/PlaybookApplicationService";
import { QueueProjectionApplicationService } from "../application/queues/QueueProjectionApplicationService";
import { EngagementWorkflowApplicationService } from "../application/workflow/EngagementWorkflowApplicationService";
import { createAosPresentationServices } from "./createAosPresentationServices";

describe("createAosPresentationServices", () => {
  it("returns injected services without infrastructure wiring", () => {
    const delivery = {
      getEngagement: vi.fn(),
    } as unknown as DeliveryApplicationService;
    const workflow = {
      getWorkflow: vi.fn(),
    } as unknown as EngagementWorkflowApplicationService;
    const queues = {
      listRequirementsQueue: vi.fn(),
    } as unknown as QueueProjectionApplicationService;
    const registry = {
      listModules: vi.fn(),
    } as unknown as ModuleRegistryApplicationService;
    const knowledge = {
      listKnowledge: vi.fn(),
    } as unknown as KnowledgeApplicationService;
    const dashboard = {
      getFounderDashboard: vi.fn(),
    } as unknown as DashboardApplicationService;
    const playbook = {
      listEntries: vi.fn(),
    } as unknown as PlaybookApplicationService;

    const services = createAosPresentationServices({
      delivery,
      workflow,
      queues,
      registry,
      knowledge,
      dashboard,
      playbook,
    });

    expect(services.delivery).toBe(delivery);
    expect(services.workflow).toBe(workflow);
    expect(services.queues).toBe(queues);
    expect(services.registry).toBe(registry);
    expect(services.knowledge).toBe(knowledge);
    expect(services.dashboard).toBe(dashboard);
    expect(services.playbook).toBe(playbook);
  });

  it("constructs application services when using default wiring", () => {
    const services = createAosPresentationServices();
    expect(services.delivery).toBeInstanceOf(DeliveryApplicationService);
    expect(services.workflow).toBeInstanceOf(EngagementWorkflowApplicationService);
    expect(services.queues).toBeInstanceOf(QueueProjectionApplicationService);
    expect(services.registry).toBeInstanceOf(ModuleRegistryApplicationService);
    expect(services.knowledge).toBeInstanceOf(KnowledgeApplicationService);
    expect(services.dashboard).toBeInstanceOf(DashboardApplicationService);
    expect(services.playbook).toBeInstanceOf(PlaybookApplicationService);
  });
});
