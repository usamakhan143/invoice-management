import type { DeliveryApplicationService } from "../application/delivery/DeliveryApplicationService";
import type { EngagementWorkflowApplicationService } from "../application/workflow/EngagementWorkflowApplicationService";
import type { QueueProjectionApplicationService } from "../application/queues/QueueProjectionApplicationService";
import type { ModuleRegistryApplicationService } from "../application/registry/ModuleRegistryApplicationService";
import type { KnowledgeApplicationService } from "../application/knowledge/KnowledgeApplicationService";
import type { DashboardApplicationService } from "../application/dashboard/DashboardApplicationService";
import type { PlaybookApplicationService } from "../application/playbook/PlaybookApplicationService";

/**
 * UI-facing application service bundle — constructed at composition root only.
 */
export interface AosPresentationServices {
  delivery: DeliveryApplicationService;
  workflow: EngagementWorkflowApplicationService;
  queues: QueueProjectionApplicationService;
  registry: ModuleRegistryApplicationService;
  knowledge: KnowledgeApplicationService;
  dashboard: DashboardApplicationService;
  playbook: PlaybookApplicationService;
}
