import type { AosLearningRepositoryBundle } from "../../infrastructure/firestore/wiring/createAosLearningRepositories";
import type { AosWorkflowRepositoryBundle } from "../../infrastructure/firestore/wiring/createAosWorkflowRepositories";
import { LearningGovernanceApplicationService } from "./LearningGovernanceApplicationService";

export function createLearningGovernanceApplicationService(
  learningRepos: Pick<AosLearningRepositoryBundle, "candidates">,
  workflowRepos: Pick<AosWorkflowRepositoryBundle, "auditEvents">,
): LearningGovernanceApplicationService {
  return new LearningGovernanceApplicationService({
    candidates: learningRepos.candidates,
    auditEvents: workflowRepos.auditEvents,
  });
}
