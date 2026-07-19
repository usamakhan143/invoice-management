import { DeliveryApplicationService } from "../application/delivery/DeliveryApplicationService";
import { QueueProjectionApplicationService } from "../application/queues/QueueProjectionApplicationService";
import { ModuleRegistryApplicationService } from "../application/registry/ModuleRegistryApplicationService";
import { KnowledgeApplicationService } from "../application/knowledge/KnowledgeApplicationService";
import { DashboardApplicationService } from "../application/dashboard/DashboardApplicationService";
import { PlaybookApplicationService } from "../application/playbook/PlaybookApplicationService";
import { EngagementWorkflowApplicationService } from "../application/workflow/EngagementWorkflowApplicationService";
import { EngagementWorkflowMemoryStore } from "../infrastructure/memory/EngagementWorkflowMemoryStore";
import { createAosDeliveryReadPorts } from "../infrastructure/wiring/createAosDeliveryReadPorts";
import { createAosDeliveryRepositories } from "../infrastructure/firestore/wiring/createAosDeliveryRepositories";
import type { AosPresentationServices } from "./types";

export interface CreateAosPresentationServicesOptions {
  delivery?: DeliveryApplicationService;
  workflow?: EngagementWorkflowApplicationService;
  queues?: QueueProjectionApplicationService;
  registry?: ModuleRegistryApplicationService;
  knowledge?: KnowledgeApplicationService;
  dashboard?: DashboardApplicationService;
  playbook?: PlaybookApplicationService;
  workflowStore?: EngagementWorkflowMemoryStore;
}

import type { AosPresentationServices } from "./types";

let defaultPresentationServices: AosPresentationServices | null = null;

/**
 * Composition root for AOS presentation layer.
 * Binds existing application services — no UI logic.
 */
export function createAosPresentationServices(
  options: CreateAosPresentationServicesOptions = {},
): AosPresentationServices {
  if (
    options.delivery &&
    options.workflow &&
    options.queues &&
    options.registry &&
    options.knowledge &&
    options.dashboard &&
    options.playbook
  ) {
    return {
      delivery: options.delivery,
      workflow: options.workflow,
      queues: options.queues,
      registry: options.registry,
      knowledge: options.knowledge,
      dashboard: options.dashboard,
      playbook: options.playbook,
    };
  }

  const hasCustomDeps = Boolean(
    options.delivery ||
      options.workflow ||
      options.queues ||
      options.registry ||
      options.knowledge ||
      options.dashboard ||
      options.playbook ||
      options.workflowStore,
  );
  if (!hasCustomDeps && defaultPresentationServices) {
    return defaultPresentationServices;
  }

  const repositories = createAosDeliveryRepositories();
  const readPorts = createAosDeliveryReadPorts();
  const delivery =
    options.delivery ??
    new DeliveryApplicationService({
      engagements: repositories.engagements,
      readPorts,
    });

  const workflowStore = options.workflowStore ?? new EngagementWorkflowMemoryStore();
  const workflow =
    options.workflow ??
    new EngagementWorkflowApplicationService({
      store: workflowStore,
      advanceEngagementLifecycle: async (scope, engagementId, event) => {
        const snapshot = workflowStore.getOrCreate(scope.companyId, engagementId);
        await delivery.advanceLifecycle(scope, engagementId, {
          event,
          artifacts: {
            hasApprovedRequirementSet: snapshot.gates.requirementsApproved,
            activeNonSupersededRequirementSetCount: snapshot.requirementSet ? 1 : 0,
            hasApprovedPromptPack: snapshot.gates.promptPackApproved,
            allCursorSessionsSubmitted: snapshot.gates.cursorSubmitted,
            evaluationsPassing: snapshot.gates.evaluationPassed,
            qaComplete: snapshot.gates.qaComplete,
            hasCompletedRetrospective: snapshot.gates.retrospectiveComplete,
          },
        });
      },
    });

  const queues =
    options.queues ??
    new QueueProjectionApplicationService({
      delivery,
      workflowStore,
    });

  const registry = options.registry ?? new ModuleRegistryApplicationService();
  const knowledge = options.knowledge ?? new KnowledgeApplicationService();
  const dashboard =
    options.dashboard ??
    new DashboardApplicationService({ delivery, queues, knowledge, registry });
  const playbook = options.playbook ?? new PlaybookApplicationService();

  const services = { delivery, workflow, queues, registry, knowledge, dashboard, playbook };
  if (!hasCustomDeps) {
    defaultPresentationServices = services;
  }
  return services;
}
