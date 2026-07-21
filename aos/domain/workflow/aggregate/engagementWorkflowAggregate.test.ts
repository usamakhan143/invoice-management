import { describe, expect, it } from "vitest";
import { createEmptyEngagementWorkflow } from "../entities/engagementWorkflow";
import * as WorkflowAggregate from "./engagementWorkflowAggregate";

describe("engagementWorkflowAggregate", () => {
  const companyId = "co1";
  const engagementId = "eng1";
  const actorUserId = "user1";

  it("blocks reuse assessment until requirements are approved", () => {
    const workflow = createEmptyEngagementWorkflow(companyId, engagementId);
    const result = WorkflowAggregate.runReuseAssessment(workflow, actorUserId, Date.now());
    expect(result.ok).toBe(false);
  });

  it("approves requirements and sets gate with audit event", () => {
    const workflow = createEmptyEngagementWorkflow(companyId, engagementId);
    const draft = WorkflowAggregate.generateRequirementsDraft(workflow, actorUserId, 1);
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    const approved = WorkflowAggregate.approveRequirements(
      draft.value.workflow,
      "ok",
      actorUserId,
      2,
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.value.workflow.gates.requirementsApproved).toBe(true);
    expect(approved.value.auditEvent.type).toBe("requirements.approved");
  });

  it("rejects QA handoff when checklist incomplete", () => {
    const workflow = {
      ...createEmptyEngagementWorkflow(companyId, engagementId),
      gates: {
        ...createEmptyEngagementWorkflow(companyId, engagementId).gates,
        evaluationPassed: true,
      },
      qualityReport: {
        id: "qa-1",
        engagementId,
        status: "draft" as const,
        checklist: [{ id: "qa-1", label: "Item", checked: false }],
      },
    };

    const result = WorkflowAggregate.approveQaHandoff(workflow, "note", actorUserId, 3);
    expect(result.ok).toBe(false);
  });
});
