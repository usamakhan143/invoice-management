import { describe, expect, it } from "vitest";
import { getNextWorkflowStepHref, getWorkflowTabAccess } from "./workflowGates";

describe("workflowGates", () => {
  it("locks downstream tabs until prior gates complete", () => {
    const access = getWorkflowTabAccess({
      engagementId: "e1",
      requirementSet: null,
      reuseAssessment: null,
      promptPack: null,
      cursorSessions: [],
      evaluation: null,
      qualityReport: null,
      retrospective: null,
      timeline: [],
      gates: {
        requirementsApproved: false,
        reuseRecorded: false,
        promptPackApproved: false,
        cursorSubmitted: false,
        evaluationPassed: false,
        qaComplete: false,
        retrospectiveComplete: false,
      },
    });

    expect(access.find((tab) => tab.id === "reuse")?.enabled).toBe(false);
    expect(access.find((tab) => tab.id === "requirements")?.enabled).toBe(true);
  });

  it("returns next workflow href in order", () => {
    expect(getNextWorkflowStepHref("e1", undefined)).toBe("/aos/delivery/e1/requirements");
    expect(
      getNextWorkflowStepHref("e1", {
        engagementId: "e1",
        requirementSet: null,
        reuseAssessment: null,
        promptPack: null,
        cursorSessions: [],
        evaluation: null,
        qualityReport: null,
        retrospective: null,
        timeline: [],
        gates: {
          requirementsApproved: true,
          reuseRecorded: false,
          promptPackApproved: false,
          cursorSubmitted: false,
          evaluationPassed: false,
          qaComplete: false,
          retrospectiveComplete: false,
        },
      }),
    ).toBe("/aos/delivery/e1/reuse");
  });
});
