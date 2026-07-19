import { beforeEach, describe, expect, it } from "vitest";
import { EngagementWorkflowApplicationService } from "./EngagementWorkflowApplicationService";
import { EngagementWorkflowMemoryStore, resetEngagementWorkflowMemoryStore } from "../../infrastructure/memory/EngagementWorkflowMemoryStore";

describe("EngagementWorkflowApplicationService", () => {
  const scope = { companyId: "co1", actorUserId: "user1" };
  const readScope = { companyId: "co1" };

  beforeEach(() => {
    resetEngagementWorkflowMemoryStore();
  });

  it("runs continuous founder workflow gates in order", async () => {
    const store = new EngagementWorkflowMemoryStore();
    const service = new EngagementWorkflowApplicationService({ store });

    await service.generateRequirementsDraft(scope, "eng1");
    await service.approveRequirements(scope, "eng1", "approved");
    await service.runReuseAssessment(scope, "eng1");
    await service.setReuseModuleDecision(scope, "eng1", "auth-firebase-v2", "accepted");
    await service.recordReuseDecisions(scope, "eng1", {});
    await service.generatePromptPack(scope, "eng1");
    await service.approvePromptPack(scope, "eng1", "approved");
    await service.startCursorSession(scope, "eng1");
    const withSession = await service.getWorkflow(readScope, { engagementId: "eng1" });
    await service.submitCursorCapture(scope, "eng1", withSession.cursorSessions[0]!.id, "done");
    await service.runEvaluation(scope, "eng1");
    await service.updateQaChecklist(scope, "eng1", "qa-1", true);
    await service.updateQaChecklist(scope, "eng1", "qa-2", true);
    await service.updateQaChecklist(scope, "eng1", "qa-3", true);
    await service.approveQaHandoff(scope, "eng1", "handoff");
    await service.generateRetrospective(scope, "eng1");
    const finalState = await service.approveRetrospective(scope, "eng1", "closed");

    expect(finalState.gates.retrospectiveComplete).toBe(true);
    expect(finalState.timeline.length).toBeGreaterThan(5);
  });
});
