import type { AosWorkflowRepositoryBundle } from "../../infrastructure/firestore/wiring/createAosWorkflowRepositories";
import { EngagementWorkflowApplicationService } from "./EngagementWorkflowApplicationService";
import type { EngagementWorkflowApplicationServiceDeps } from "./EngagementWorkflowApplicationService";

export function createEngagementWorkflowApplicationService(
  repos: AosWorkflowRepositoryBundle,
  extras?: Pick<
    EngagementWorkflowApplicationServiceDeps,
    "advanceEngagementLifecycle" | "versionChainsEnabled" | "onRetrospectiveApproved"
  >,
): EngagementWorkflowApplicationService {
  return new EngagementWorkflowApplicationService({
    workflows: repos.workflows,
    auditEvents: repos.auditEvents,
    requirementVersions: repos.requirementVersions,
    promptVersions: repos.promptVersions,
    cursorSessions: repos.cursorSessions,
    cursorRevisions: repos.cursorRevisions,
    evaluations: repos.evaluations,
    firestore: repos.firestore,
    versionChainsEnabled: extras?.versionChainsEnabled,
    advanceEngagementLifecycle: extras?.advanceEngagementLifecycle,
    onRetrospectiveApproved: extras?.onRetrospectiveApproved,
  });
}
