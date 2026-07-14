import { describe, expect, it } from "vitest";
import { MILESTONE_STATUS } from "../constants/milestoneStatus";
import { MILESTONE_RESULT } from "../constants/milestoneResult";
import { MILESTONE_COMPLETION_NEXT_ACTION } from "../constants/milestoneCompletionNextAction";
import { MILESTONE_EVIDENCE_TYPE } from "../constants/milestoneEvidenceType";
import type { BosMilestone } from "../domain/entities/milestone";
import { validateCompleteMilestone } from "../domain/rules/milestoneRules";
import {
  buildCompletionEvidence,
  createInitialCompleteFormState,
  getCompletionDateMaxDayKey,
  getCompletionDateMinDayKey,
  getCompletionDatePickerMinDayKey,
  hasStructuredEvidenceRequirements,
  resolveDependentMilestoneTargetId,
  shouldInitializeCompleteForm,
  validateCompletionForm,
  type MilestoneCompleteFormState,
} from "./milestoneCompletionForm";
import { parseBosPlannedDate } from "../../utils/bosFormat";

const MS_DAY = 86_400_000;

/** Fixed noon local — avoids DST edge cases in day-boundary tests. */
const TODAY = new Date(2026, 6, 14, 12, 0, 0, 0).getTime();
const STARTED_AT = TODAY - 10 * MS_DAY;
const HISTORICAL_COMPLETE = TODAY - 5 * MS_DAY;
const FUTURE_COMPLETE = TODAY + MS_DAY;
const BEFORE_START = STARTED_AT - MS_DAY;

function baseMilestone(overrides: Partial<BosMilestone> = {}): BosMilestone {
  return {
    id: "m1",
    companyId: "c1",
    initiativeId: "i1",
    title: "Partnership Approved",
    sequence: 0,
    status: MILESTONE_STATUS.IN_PROGRESS,
    startedAt: STARTED_AT,
    createdById: "u1",
    createdAt: STARTED_AT,
    updatedAt: TODAY,
    ...overrides,
  };
}

function validCompleteInput(completedDate: number) {
  return {
    completedDate,
    completionNotes: "Done",
    milestoneResult: MILESTONE_RESULT.COMPLETED_SUCCESSFULLY,
    completionNextAction: MILESTONE_COMPLETION_NEXT_ACTION.NOTHING,
    evidence: [{ type: MILESTONE_EVIDENCE_TYPE.MANUAL, notes: "Evidence" }],
    updatedById: "u1",
  };
}

function validForm(completedDateKey: string): MilestoneCompleteFormState {
  return {
    ...createInitialCompleteFormState(TODAY),
    completedDate: completedDateKey,
    supportingEvidence: "Manual evidence note",
  };
}

describe("milestone completion date boundaries", () => {
  it("allows historical completion dates after startedAt", () => {
    const milestone = baseMilestone();
    const result = validateCompleteMilestone(milestone, validCompleteInput(HISTORICAL_COMPLETE), {
      completedDateMaxMs: TODAY,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects future completion dates", () => {
    const milestone = baseMilestone();
    const result = validateCompleteMilestone(milestone, validCompleteInput(FUTURE_COMPLETE), {
      completedDateMaxMs: TODAY,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors[0]?.code).toBe("MILESTONE_COMPLETED_DATE_FUTURE");
  });

  it("rejects completion dates before startedAt", () => {
    const milestone = baseMilestone();
    const result = validateCompleteMilestone(milestone, validCompleteInput(BEFORE_START), {
      completedDateMaxMs: TODAY,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors[0]?.code).toBe("MILESTONE_COMPLETED_DATE_TOO_EARLY");
  });

  it("allows historical dates even when initiative start is later than startedAt", () => {
    const milestone = baseMilestone({ startedAt: STARTED_AT });
    const initiativeStartLater = TODAY - 2 * MS_DAY;
    const historicalBeforeInitiativeStart = TODAY - 7 * MS_DAY;
    const result = validateCompleteMilestone(
      milestone,
      validCompleteInput(historicalBeforeInitiativeStart),
      {
        initiativeStartDate: initiativeStartLater,
        completedDateMaxMs: TODAY,
      },
    );
    expect(result.ok).toBe(true);
  });

  it("exposes min date picker bound from startedAt only", () => {
    const milestone = baseMilestone({ startedAt: STARTED_AT });
    expect(getCompletionDateMinDayKey(milestone)).toBe("2026-07-04");
    expect(getCompletionDatePickerMinDayKey(milestone, TODAY)).toBe("2026-07-04");
    expect(getCompletionDateMaxDayKey(TODAY)).toBe("2026-07-14");
  });

  it("omits picker min when startedAt is today so past days stay selectable", () => {
    const milestone = baseMilestone({ startedAt: TODAY });
    expect(getCompletionDateMinDayKey(milestone)).toBe("2026-07-14");
    expect(getCompletionDatePickerMinDayKey(milestone, TODAY)).toBeUndefined();
  });
});

describe("dependent milestone next action", () => {
  it("defaults target id to the first dependent option", () => {
    expect(
      resolveDependentMilestoneTargetId(
        MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE,
        "",
        [{ id: "m2", label: "M2" }],
      ),
    ).toBe("m2");
  });

  it("keeps a valid existing target id", () => {
    expect(
      resolveDependentMilestoneTargetId(
        MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE,
        "m3",
        [
          { id: "m2", label: "M2" },
          { id: "m3", label: "M3" },
        ],
      ),
    ).toBe("m3");
  });

  it("passes validation when dependent target is resolved", () => {
    const form: MilestoneCompleteFormState = {
      ...validForm("2026-07-09"),
      completionNextAction: MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE,
      completionNextActionTargetId: resolveDependentMilestoneTargetId(
        MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE,
        "",
        [{ id: "m2", label: "M2" }],
      ),
    };
    const error = validateCompletionForm(
      baseMilestone(),
      form,
      parseBosPlannedDate(form.completedDate)!,
      TODAY,
    );
    expect(error).toBeNull();
  });

  it("surfaces unmet dependency milestones before submit", () => {
    const blocker = baseMilestone({
      id: "blocker",
      title: "Prior step",
      status: MILESTONE_STATUS.IN_PROGRESS,
    });
    const milestone = baseMilestone({
      dependencyIds: ["blocker"],
    });
    const error = validateCompletionForm(
      milestone,
      validForm("2026-07-09"),
      HISTORICAL_COMPLETE,
      TODAY,
      [blocker, milestone],
    );
    expect(error).toContain("Prior step");
  });
});

describe("structured evidence requirements", () => {
  it("detects when milestone requires linked evidence fields", () => {
    expect(
      hasStructuredEvidenceRequirements({ decisionRequired: true, expenseLinked: true }),
    ).toBe(true);
    expect(hasStructuredEvidenceRequirements({ notesRequired: true })).toBe(false);
    expect(hasStructuredEvidenceRequirements(undefined)).toBe(false);
  });

  it("builds evidence entries for each required field at once", () => {
    const milestone = baseMilestone({
      completionRequirements: { decisionRequired: true, expenseLinked: true },
    });
    const form: MilestoneCompleteFormState = {
      ...validForm("2026-07-09"),
      selectedDecisionId: "d1",
      selectedExpenseId: "e1",
    };
    const evidence = buildCompletionEvidence(milestone, form);
    expect(evidence.some((entry) => entry.type === MILESTONE_EVIDENCE_TYPE.DECISION)).toBe(true);
    expect(evidence.some((entry) => entry.type === MILESTONE_EVIDENCE_TYPE.EXPENSE)).toBe(true);
  });

  it("passes validation when all required evidence fields are filled", () => {
    const milestone = baseMilestone({
      completionRequirements: { decisionRequired: true, urlAttached: true },
    });
    const form: MilestoneCompleteFormState = {
      ...validForm("2026-07-09"),
      selectedDecisionId: "d1",
      urlEvidence: "https://example.com/proof",
    };
    const error = validateCompletionForm(
      milestone,
      form,
      parseBosPlannedDate(form.completedDate)!,
      TODAY,
    );
    expect(error).toBeNull();
  });
});

describe("complete form persistence", () => {
  it("does not mutate form state when validation fails", () => {
    const milestone = baseMilestone({
      completionRequirements: { decisionRequired: true },
    });
    const form = validForm("2026-07-09");
    const snapshot = JSON.stringify(form);
    const error = validateCompletionForm(
      milestone,
      form,
      parseBosPlannedDate(form.completedDate)!,
      TODAY,
    );
    expect(error).toBeTruthy();
    expect(JSON.stringify(form)).toBe(snapshot);
    expect(form.completedDate).toBe("2026-07-09");
  });

  it("initializes form only when milestone changes or modal reopens", () => {
    expect(shouldInitializeCompleteForm(null, "m1")).toBe(true);
    expect(shouldInitializeCompleteForm("m1", "m1")).toBe(false);
    expect(shouldInitializeCompleteForm("m1", "m2")).toBe(true);
    expect(shouldInitializeCompleteForm("m1", null)).toBe(false);
    expect(shouldInitializeCompleteForm(null, "m1")).toBe(true);
  });

  it("defaults completed date to today only on fresh form initialization", () => {
    const fresh = createInitialCompleteFormState(TODAY);
    expect(fresh.completedDate).toBe("2026-07-14");
    fresh.completedDate = "2026-07-09";
    expect(fresh.completedDate).toBe("2026-07-09");
  });
});
