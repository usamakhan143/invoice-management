import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeliveryApplicationService } from "../../application/delivery/DeliveryApplicationService";
import { EngagementWorkflowApplicationService } from "../../application/workflow/EngagementWorkflowApplicationService";
import { createEngagementWorkflowApplicationService } from "../../application/workflow/createEngagementWorkflowApplicationService";
import { DELIVERY_STATE } from "../../domain/delivery/deliveryState";
import { EMPTY_DELIVERY_ARTIFACT_REFS } from "../../domain/delivery/valueObjects";
import { createAosDeliveryReadPorts } from "../wiring/createAosDeliveryReadPorts";
import { createAosDeliveryRepositories } from "../firestore/wiring/createAosDeliveryRepositories";
import { createAosWorkflowRepositories } from "../firestore/wiring/createAosWorkflowRepositories";
import {
  clearAosIntegrationCollections,
  createAosEmulatorHarness,
  isEmulatorConfigured,
  seedErpBosReadFixtures,
  type AosEmulatorHarness,
} from "../testing/emulatorHarness";

const describeIntegration = isEmulatorConfigured() ? describe : describe.skip;

function actorScope(harness: AosEmulatorHarness) {
  return { companyId: harness.companyId, actorUserId: harness.userId };
}

function readScope(harness: AosEmulatorHarness) {
  return { companyId: harness.companyId };
}

describeIntegration("Founder journey integration (Firestore emulator)", () => {
  let harness: AosEmulatorHarness;
  let delivery: DeliveryApplicationService;
  let workflow: EngagementWorkflowApplicationService;
  let engagementId: string;

  beforeEach(async () => {
    harness = await createAosEmulatorHarness();
    await clearAosIntegrationCollections(harness.db);
    await seedErpBosReadFixtures(harness.db, harness.companyId, {
      customerId: harness.customerId,
      leadId: harness.leadId,
      initiativeId: harness.initiativeId,
      userId: harness.userId,
    });

    const deliveryRepos = createAosDeliveryRepositories({ firestore: harness.db });
    const workflowRepos = createAosWorkflowRepositories({ firestore: harness.db });
    const readPorts = createAosDeliveryReadPorts({ firestore: harness.db });

    delivery = new DeliveryApplicationService({
      engagements: deliveryRepos.engagements,
      readPorts,
    });

    workflow = createEngagementWorkflowApplicationService(workflowRepos, {
      advanceEngagementLifecycle: async (scope, id, event) => {
        const snapshot = await workflowRepos.workflows.getOrCreate(scope.companyId, id);
        await delivery.advanceLifecycle(scope, id, {
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
  });

  afterEach(async () => {
    await clearAosIntegrationCollections(harness.db);
    await harness.cleanupApp();
  });

  it("runs delivery engagement through requirements → retrospective with lifecycle advancement", async () => {
    const created = await delivery.createEngagement(actorScope(harness), {
      title: "Founder Journey Integration",
      erpCustomerId: harness.customerId,
      deliveryLeadUserId: harness.userId,
      bosInitiativeId: harness.initiativeId,
    });
    engagementId = created.id;
    expect(created.status).toBe(DELIVERY_STATE.DRAFT);

    await workflow.generateRequirementsDraft(actorScope(harness), engagementId);

    await delivery.advanceLifecycle(actorScope(harness), engagementId, {
      event: "start_intake",
      artifacts: EMPTY_DELIVERY_ARTIFACT_REFS,
    });
    await delivery.advanceLifecycle(actorScope(harness), engagementId, {
      event: "start_discovery",
      artifacts: EMPTY_DELIVERY_ARTIFACT_REFS,
    });

    await workflow.approveRequirements(actorScope(harness), engagementId, "Requirements approved");

    let engagement = await delivery.getEngagement(readScope(harness), { engagementId });
    expect(engagement.status).not.toBe(DELIVERY_STATE.DRAFT);

    await workflow.runReuseAssessment(actorScope(harness), engagementId);
    await workflow.setReuseModuleDecision(
      actorScope(harness),
      engagementId,
      "auth-firebase-v2",
      "accepted",
    );
    await workflow.recordReuseDecisions(actorScope(harness), engagementId, {});
    await workflow.generatePromptPack(actorScope(harness), engagementId);
    await workflow.approvePromptPack(actorScope(harness), engagementId, "Prompts approved");

    engagement = await delivery.getEngagement(readScope(harness), { engagementId });
    expect([DELIVERY_STATE.PLANNING, DELIVERY_STATE.BUILDING, DELIVERY_STATE.DISCOVERY]).toContain(
      engagement.status,
    );

    await workflow.startCursorSession(actorScope(harness), engagementId);
    const wfMid = await workflow.getWorkflow(readScope(harness), { engagementId });
    await workflow.submitCursorCapture(
      actorScope(harness),
      engagementId,
      wfMid.cursorSessions[0]!.id,
      "Cursor output captured",
    );
    await workflow.runEvaluation(actorScope(harness), engagementId);
    await workflow.updateQaChecklist(actorScope(harness), engagementId, "qa-1", true);
    await workflow.updateQaChecklist(actorScope(harness), engagementId, "qa-2", true);
    await workflow.updateQaChecklist(actorScope(harness), engagementId, "qa-3", true);
    await workflow.approveQaHandoff(actorScope(harness), engagementId, "QA complete");
    await workflow.generateRetrospective(actorScope(harness), engagementId);
    const finalWorkflow = await workflow.approveRetrospective(
      actorScope(harness),
      engagementId,
      "Retrospective approved",
    );

    expect(finalWorkflow.gates.retrospectiveComplete).toBe(true);

    const reloadedWorkflowRepos = createAosWorkflowRepositories({ firestore: harness.db });
    const reloaded = await createEngagementWorkflowApplicationService(reloadedWorkflowRepos).getWorkflow(
      readScope(harness),
      { engagementId },
    );

    expect(reloaded.gates.retrospectiveComplete).toBe(true);
    expect(
      reloaded.timeline.some(
        (event) =>
          event.type === "requirements.approved" ||
          event.type === "aos_requirement_version_published",
      ),
    ).toBe(true);
    expect(reloaded.timeline.some((event) => event.type === "retro.approved")).toBe(true);
  });
});
