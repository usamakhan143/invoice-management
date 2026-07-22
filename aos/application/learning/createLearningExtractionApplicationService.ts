import type { AosLearningRepositoryBundle } from "../../infrastructure/firestore/wiring/createAosLearningRepositories";
import type { AosWorkflowRepositoryBundle } from "../../infrastructure/firestore/wiring/createAosWorkflowRepositories";
import type { LearningExtractionAiPort } from "../../contracts/learning/LearningExtractionAiPort";
import type { AosFeatureFlag } from "../../config/featureFlags";
import { nullLearningExtractionAiPort } from "../../contracts/learning/NullLearningExtractionAiPort";
import { isVersionChainsEnabled } from "../../config/versionChainConfig";
import { LearningExtractionApplicationService } from "./LearningExtractionApplicationService";

export interface CreateLearningExtractionApplicationServiceOptions {
  learningRepos: AosLearningRepositoryBundle;
  workflowRepos: Pick<AosWorkflowRepositoryBundle, "workflows" | "auditEvents">;
  aiPort?: LearningExtractionAiPort;
  featureFlags?: Partial<Record<AosFeatureFlag, boolean>>;
  versionChainsEnabled?: boolean;
}

export function createLearningExtractionApplicationService(
  options: CreateLearningExtractionApplicationServiceOptions,
): LearningExtractionApplicationService {
  return new LearningExtractionApplicationService({
    extractionRuns: options.learningRepos.extractionRuns,
    candidates: options.learningRepos.candidates,
    workflows: options.workflowRepos.workflows,
    auditEvents: options.workflowRepos.auditEvents,
    aiPort: options.aiPort ?? nullLearningExtractionAiPort,
    featureFlags: options.featureFlags,
    versionChainsEnabled:
      options.versionChainsEnabled ?? isVersionChainsEnabled(options.featureFlags),
  });
}
