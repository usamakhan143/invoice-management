import { describe, expect, it } from "vitest";
import { createEmptyEngagementWorkflow } from "../entities/engagementWorkflow";
import * as WorkflowAggregate from "./engagementWorkflowAggregate";

describe("engagementWorkflowAggregate E1 pointers", () => {
  const companyId = "co1";
  const engagementId = "eng1";
  const actorUserId = "user1";

  it("approve requirements sets version pointer and gate", () => {
    let workflow = createEmptyEngagementWorkflow(companyId, engagementId);
    const draft = WorkflowAggregate.generateRequirementsDraft(workflow, actorUserId, 1);
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    workflow = draft.value.workflow;

    const approved = WorkflowAggregate.approveRequirements(workflow, "ok", actorUserId, 2);
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.value.workflow.gates.requirementsApproved).toBe(true);
    expect(approved.value.workflow.currentApprovedRequirementVersionId).toBeTruthy();
    expect(approved.value.workflow.requirementSet?.currentApprovedVersionNumber).toBe(1);
  });

  it("blocks draft update after approval", () => {
    let workflow = createEmptyEngagementWorkflow(companyId, engagementId);
    workflow = WorkflowAggregate.generateRequirementsDraft(workflow, actorUserId, 1).value!.workflow;
    workflow = WorkflowAggregate.approveRequirements(workflow, "ok", actorUserId, 2).value!.workflow;

    const update = WorkflowAggregate.updateRequirementDraft(workflow, "late edit", actorUserId, 3);
    expect(update.ok).toBe(false);
  });
});
