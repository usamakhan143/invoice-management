import { beforeEach, describe, expect, it } from "vitest";
import { createOwnerActorScope } from "../../constants/actorScope";
import { EngagementWorkflowApplicationService } from "./EngagementWorkflowApplicationService";
import {
  InMemoryAuditEventRepository,
  InMemoryEngagementWorkflowRepository,
} from "../../infrastructure/testing/inMemoryWorkflowRepositories";

describe("EngagementWorkflowApplicationService", () => {
  const scope = createOwnerActorScope("co1", "user1");
  const readScope = { companyId: "co1" };
  let workflows: InMemoryEngagementWorkflowRepository;
  let auditEvents: InMemoryAuditEventRepository;

  beforeEach(() => {
    workflows = new InMemoryEngagementWorkflowRepository();
    auditEvents = new InMemoryAuditEventRepository();
  });

  function createService() {
    return new EngagementWorkflowApplicationService({ workflows, auditEvents });
  }

  it("runs continuous founder workflow gates in order", async () => {
    const service = createService();

    await service.generateRequirementsDraft(scope, "eng1");
    await service.updateRequirementDraft(scope, "eng1", "refined requirements");
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
    expect(finalState.timeline.some((event) => event.type === "requirements.draft_updated")).toBe(true);
    expect(finalState.timeline.some((event) => event.type === "reuse.module_decision")).toBe(true);
    expect(finalState.timeline.some((event) => event.type === "qa.checklist_updated")).toBe(true);
  });

  it("appends audit events for draft, reuse, and QA checklist mutations", async () => {
    const service = createService();
    await service.generateRequirementsDraft(scope, "eng1");
    await service.updateRequirementDraft(scope, "eng1", "manual body");
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

    const events = await auditEvents.listByEngagement(readScope.companyId, "eng1");
    expect(events.some((event) => event.type === "requirements.draft_updated")).toBe(true);
    expect(events.some((event) => event.type === "reuse.module_decision")).toBe(true);
    expect(events.some((event) => event.type === "qa.checklist_updated")).toBe(true);
  });
});
