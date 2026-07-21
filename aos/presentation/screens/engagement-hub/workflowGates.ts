import type { EngagementWorkflowDto } from "../../../types/presentation";

import { ENGAGEMENT_HUB_TABS } from "./engagementHubTabs";

export interface WorkflowTabAccess {
  id: string;
  label: string;
  enabled: boolean;
  indicator: boolean;
  reason?: string;
}

export function getWorkflowTabAccess(workflow: EngagementWorkflowDto | undefined): WorkflowTabAccess[] {
  const gates = workflow?.gates;
  return ENGAGEMENT_HUB_TABS.map((tab) => {
    const base = { id: tab.id, label: tab.label, indicator: false, enabled: true, reason: undefined as string | undefined };
    switch (tab.id) {
      case "overview":
        return base;
      case "requirements":
        return { ...base, indicator: Boolean(workflow?.requirementSet?.status === "draft") };
      case "reuse":
        return {
          ...base,
          enabled: Boolean(gates?.requirementsApproved),
          indicator: Boolean(gates?.requirementsApproved && !gates?.reuseRecorded),
          reason: "Approve requirements to unlock reuse",
        };
      case "prompts":
        return {
          ...base,
          enabled: Boolean(gates?.reuseRecorded),
          indicator: Boolean(gates?.reuseRecorded && !gates?.promptPackApproved),
          reason: "Record reuse decisions to unlock prompts",
        };
      case "cursor":
        return {
          ...base,
          enabled: Boolean(gates?.promptPackApproved),
          indicator: Boolean(gates?.promptPackApproved && !gates?.cursorSubmitted),
          reason: "Approve a prompt pack to unlock Cursor",
        };
      case "evaluation":
        return {
          ...base,
          enabled: Boolean(gates?.cursorSubmitted),
          indicator: Boolean(gates?.cursorSubmitted && !gates?.evaluationPassed),
          reason: "Submit a Cursor capture to unlock evaluation",
        };
      case "qa":
        return {
          ...base,
          enabled: Boolean(gates?.evaluationPassed),
          indicator: Boolean(gates?.evaluationPassed && !gates?.qaComplete),
          reason: "Pass evaluation to unlock QA",
        };
      case "retrospective":
        return {
          ...base,
          enabled: Boolean(gates?.qaComplete),
          indicator: Boolean(gates?.qaComplete && !gates?.retrospectiveComplete),
          reason: "Complete QA handoff to unlock retrospective",
        };
      default:
        return base;
    }
  });
}

export function getNextWorkflowStepHref(
  engagementId: string,
  workflow: EngagementWorkflowDto | undefined,
): string | null {
  if (!workflow?.gates.requirementsApproved) return `/aos/delivery/${engagementId}/requirements`;
  if (!workflow.gates.reuseRecorded) return `/aos/delivery/${engagementId}/reuse`;
  if (!workflow.gates.promptPackApproved) return `/aos/delivery/${engagementId}/prompts`;
  if (!workflow.gates.cursorSubmitted) return `/aos/delivery/${engagementId}/cursor`;
  if (!workflow.gates.evaluationPassed) return `/aos/delivery/${engagementId}/evaluation`;
  if (!workflow.gates.qaComplete) return `/aos/delivery/${engagementId}/qa`;
  if (!workflow.gates.retrospectiveComplete) return `/aos/delivery/${engagementId}/retrospective`;
  return null;
}
