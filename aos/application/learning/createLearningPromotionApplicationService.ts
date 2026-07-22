import type { AosLearningRepositoryBundle } from "../../infrastructure/firestore/wiring/createAosLearningRepositories";
import type { AosWorkflowRepositoryBundle } from "../../infrastructure/firestore/wiring/createAosWorkflowRepositories";
import { LearningPromotionApplicationService } from "./LearningPromotionApplicationService";

export function createLearningPromotionApplicationService(
  learningRepos: AosLearningRepositoryBundle,
  workflowRepos: Pick<
    AosWorkflowRepositoryBundle,
    "auditEvents" | "knowledge" | "registry" | "playbook"
  >,
): LearningPromotionApplicationService {
  return new LearningPromotionApplicationService({
    firestore: learningRepos.firestore,
    candidates: learningRepos.candidates,
    promotions: learningRepos.promotions,
    auditEvents: workflowRepos.auditEvents,
    knowledge: workflowRepos.knowledge,
    registry: workflowRepos.registry,
    playbook: workflowRepos.playbook,
  });
}
