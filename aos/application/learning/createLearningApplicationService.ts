import type { AosLearningRepositoryBundle } from "../../infrastructure/firestore/wiring/createAosLearningRepositories";
import type { AosWorkflowRepositoryBundle } from "../../infrastructure/firestore/wiring/createAosWorkflowRepositories";
import type { DeliveryApplicationService } from "../delivery/DeliveryApplicationService";
import { LearningApplicationService } from "./LearningApplicationService";
import { LearningReviewApplicationService } from "./LearningReviewApplicationService";
import { createLearningGovernanceApplicationService } from "./createLearningGovernanceApplicationService";
import { createLearningPromotionApplicationService } from "./createLearningPromotionApplicationService";

export function createLearningApplicationService(deps: {
  learningRepos: AosLearningRepositoryBundle;
  workflowRepos: Pick<
    AosWorkflowRepositoryBundle,
    "auditEvents" | "knowledge" | "registry" | "playbook"
  >;
  delivery: DeliveryApplicationService;
}): LearningApplicationService {
  const review = new LearningReviewApplicationService({
    candidates: deps.learningRepos.candidates,
    extractionRuns: deps.learningRepos.extractionRuns,
    delivery: deps.delivery,
    knowledge: deps.workflowRepos.knowledge,
    registry: deps.workflowRepos.registry,
    playbook: deps.workflowRepos.playbook,
  });
  const governance = createLearningGovernanceApplicationService(
    deps.learningRepos,
    deps.workflowRepos,
  );
  const promotion = createLearningPromotionApplicationService(
    deps.learningRepos,
    deps.workflowRepos,
  );
  return new LearningApplicationService(review, governance, promotion);
}
