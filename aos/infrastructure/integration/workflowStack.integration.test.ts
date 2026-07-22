import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEngagementWorkflowApplicationService } from "../../application/workflow/createEngagementWorkflowApplicationService";
import { createAosWorkflowRepositories } from "../firestore/wiring/createAosWorkflowRepositories";
import {
  clearAosIntegrationCollections,
  createAosEmulatorHarness,
  integrationActorScope,
  isEmulatorConfigured,
  type AosEmulatorHarness,
} from "../testing/emulatorHarness";

const describeIntegration = isEmulatorConfigured() ? describe : describe.skip;

function actorScope(harness: AosEmulatorHarness) { return integrationActorScope(harness); }

function readScope(harness: AosEmulatorHarness) {
  return { companyId: harness.companyId };
}

describeIntegration("AOS workflow stack (Firestore emulator)", () => {
  let harness: AosEmulatorHarness;
  const engagementId = "eng-workflow-integration";

  beforeEach(async () => {
    harness = await createAosEmulatorHarness();
    await clearAosIntegrationCollections(harness.db);
  });

  afterEach(async () => {
    await clearAosIntegrationCollections(harness.db);
    await harness.cleanupApp();
  });

  it("persists the full workflow path and audit trail across repository reload", async () => {
    const repos = createAosWorkflowRepositories({ firestore: harness.db });
    const workflowService = createEngagementWorkflowApplicationService(repos);
    const scope = actorScope(harness);

    await workflowService.generateRequirementsDraft(scope, engagementId);
    await workflowService.updateRequirementDraft(scope, engagementId, "Captured integration requirements");
    await workflowService.approveRequirements(scope, engagementId, "Approved");
    await workflowService.runReuseAssessment(scope, engagementId);
    await workflowService.setReuseModuleDecision(scope, engagementId, "auth-firebase-v2", "accepted");
    await workflowService.recordReuseDecisions(scope, engagementId, {});
    await workflowService.generatePromptPack(scope, engagementId);
    await workflowService.approvePromptPack(scope, engagementId, "Prompt pack approved");
    await workflowService.startCursorSession(scope, engagementId);

    const mid = await workflowService.getWorkflow(readScope(harness), { engagementId });
    await workflowService.submitCursorCapture(
      scope,
      engagementId,
      mid.cursorSessions[0]!.id,
      "Integration capture complete",
    );
    await workflowService.runEvaluation(scope, engagementId);
    await workflowService.updateQaChecklist(scope, engagementId, "qa-1", true);
    await workflowService.updateQaChecklist(scope, engagementId, "qa-2", true);
    await workflowService.updateQaChecklist(scope, engagementId, "qa-3", true);
    await workflowService.approveQaHandoff(scope, engagementId, "QA approved");
    await workflowService.generateRetrospective(scope, engagementId);
    const finalState = await workflowService.approveRetrospective(scope, engagementId, "Retro approved");

    expect(finalState.gates.retrospectiveComplete).toBe(true);
    expect(finalState.timeline.some((event) => event.type === "requirements.draft_updated")).toBe(true);
    expect(finalState.timeline.some((event) => event.type === "reuse.module_decision")).toBe(true);
    expect(finalState.timeline.some((event) => event.type === "qa.checklist_updated")).toBe(true);

    const reloadedRepos = createAosWorkflowRepositories({ firestore: harness.db });
    const reloadedService = createEngagementWorkflowApplicationService(reloadedRepos);
    const reloaded = await reloadedService.getWorkflow(readScope(harness), { engagementId });

    expect(reloaded.gates.retrospectiveComplete).toBe(true);
    expect(reloaded.requirementSet?.status).toBe("approved");
    expect(reloaded.promptPack?.status).toBe("approved");
    expect(reloaded.retrospective?.status).toBe("approved");
    expect(reloaded.timeline.length).toBeGreaterThanOrEqual(finalState.timeline.length);

    const auditSnap = await harness.db
      .collection("aosAuditEvents")
      .where("companyId", "==", harness.companyId)
      .where("engagementId", "==", engagementId)
      .get();
    expect(auditSnap.size).toBeGreaterThan(5);
  });
});

