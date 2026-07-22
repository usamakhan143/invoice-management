import { DeliveryApplicationService } from "../application/delivery/DeliveryApplicationService";
import { QueueProjectionApplicationService } from "../application/queues/QueueProjectionApplicationService";
import { ModuleRegistryApplicationService } from "../application/registry/ModuleRegistryApplicationService";
import { KnowledgeApplicationService } from "../application/knowledge/KnowledgeApplicationService";
import { DashboardApplicationService } from "../application/dashboard/DashboardApplicationService";
import { PlaybookApplicationService } from "../application/playbook/PlaybookApplicationService";
import { createEngagementWorkflowApplicationService } from "../application/workflow/createEngagementWorkflowApplicationService";
import { db } from "../../services/firebase";
import { createAosDeliveryReadPorts } from "../infrastructure/wiring/createAosDeliveryReadPorts";
import { createAosDeliveryRepositories } from "../infrastructure/firestore/wiring/createAosDeliveryRepositories";
import { createAosWorkflowRepositories } from "../infrastructure/firestore/wiring/createAosWorkflowRepositories";
import { createAosLearningRepositories } from "../infrastructure/firestore/wiring/createAosLearningRepositories";
import { createLearningExtractionApplicationService } from "../application/learning/createLearningExtractionApplicationService";
import { createLearningApplicationService } from "../application/learning/createLearningApplicationService";
import { isLearningEngineEnabled } from "../config/learningEngineConfig";
import type { AosPresentationServices } from "./types";

export interface CreateAosPresentationServicesOptions {
  delivery?: DeliveryApplicationService;
  workflow?: EngagementWorkflowApplicationService;
  queues?: QueueProjectionApplicationService;
  registry?: ModuleRegistryApplicationService;
  knowledge?: KnowledgeApplicationService;
  dashboard?: DashboardApplicationService;
  playbook?: PlaybookApplicationService;
  learning?: LearningApplicationService;
}

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
    options.playbook &&
    options.learning
  ) {
    return {
      delivery: options.delivery,
      workflow: options.workflow,
      queues: options.queues,
      registry: options.registry,
      knowledge: options.knowledge,
      dashboard: options.dashboard,
      playbook: options.playbook,
      learning: options.learning,
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
      options.learning,
  );
  if (!hasCustomDeps && defaultPresentationServices) {
    return defaultPresentationServices;
  }

  const deliveryRepos = createAosDeliveryRepositories({ firestore: db });
  const workflowRepos = createAosWorkflowRepositories({ firestore: db });
  const learningRepos = createAosLearningRepositories({ firestore: db });
  const readPorts = createAosDeliveryReadPorts({ firestore: db });
  const delivery =
    options.delivery ??
    new DeliveryApplicationService({
      engagements: deliveryRepos.engagements,
      readPorts,
    });

  const learningExtraction = createLearningExtractionApplicationService({
    learningRepos,
    workflowRepos,
  });

  const workflow =
    options.workflow ??
    createEngagementWorkflowApplicationService(workflowRepos, {
      advanceEngagementLifecycle: async (scope, engagementId, event) => {
        const snapshot = await workflowRepos.workflows.getOrCreate(scope.companyId, engagementId);
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
      onRetrospectiveApproved: isLearningEngineEnabled()
        ? (scope, engagementId, retrospectiveId) => {
            learningExtraction.scheduleExtraction({
              companyId: scope.companyId,
              engagementId,
              retrospectiveId,
            });
          }
        : undefined,
    });

  const learning =
    options.learning ??
    createLearningApplicationService({
      learningRepos,
      workflowRepos,
      delivery,
    });

  const queues =
    options.queues ??
    new QueueProjectionApplicationService({
      delivery,
      workflow,
      learning,
    });

  const registry =
    options.registry ?? new ModuleRegistryApplicationService({ repository: workflowRepos.registry });
  const knowledge =
    options.knowledge ?? new KnowledgeApplicationService({ repository: workflowRepos.knowledge });
  const playbook =
    options.playbook ?? new PlaybookApplicationService({ repository: workflowRepos.playbook });

  const dashboard =
    options.dashboard ??
    new DashboardApplicationService({
      delivery,
      queues,
      knowledge,
      registry,
      learning,
    });

  const services = { delivery, workflow, queues, registry, knowledge, dashboard, playbook, learning };
  if (!hasCustomDeps) {
    defaultPresentationServices = services;
  }
  return services;
}
