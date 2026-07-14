import type { BosMilestone, CompleteBosMilestoneInput } from "../domain/entities/milestone";
import { MILESTONE_BUSINESS_IMPACT } from "../constants/milestoneBusinessImpact";
import type { MilestoneCompletionRequirements } from "../constants/milestoneCompletionRequirement";
import { MILESTONE_COMPLETION_REQUIREMENT_KEY } from "../constants/milestoneCompletionRequirement";
import { MILESTONE_COMPLETION_NEXT_ACTION } from "../constants/milestoneCompletionNextAction";
import { MILESTONE_EVIDENCE_TYPE, type MilestoneEvidenceType } from "../constants/milestoneEvidenceType";
import { MILESTONE_RESULT, type MilestoneResult } from "../constants/milestoneResult";
import type { MilestoneDelayReason } from "../constants/milestoneDelayReason";
import type { MilestoneFailureRootCause } from "../constants/milestoneFailureRootCause";
import type { MilestoneCompletionNextAction } from "../constants/milestoneCompletionNextAction";
import {
  validateCompleteMilestone,
  validateMilestoneDependenciesMet,
} from "../domain/rules/milestoneRules";
import { formatBosPlannedDateInput } from "../../utils/bosFormat";

export interface MilestoneLinkOption {
  id: string;
  label: string;
}

export interface MilestoneCompleteFormState {
  completedDate: string;
  outcomeSummary: string;
  lessonsLearned: string;
  milestoneResult: MilestoneResult | "";
  delayReason: MilestoneDelayReason | "";
  failureRootCause: MilestoneFailureRootCause | "";
  failureRootCauseNotes: string;
  completionNextAction: MilestoneCompletionNextAction | "";
  completionNextActionCustom: string;
  completionNextActionTargetId: string;
  evidenceSource: MilestoneEvidenceType;
  selectedDecisionId: string;
  selectedExpenseId: string;
  selectedInvoiceId: string;
  documentEvidence: string;
  urlEvidence: string;
  screenshotEvidence: string;
  supportingEvidence: string;
}

function startOfLocalDayMs(epochMs: number): number {
  const d = new Date(epochMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isMilestoneCompletionLate(
  completedDateMs: number,
  targetDateMs: number | undefined,
): boolean {
  if (targetDateMs === undefined) return false;
  return startOfLocalDayMs(completedDateMs) > startOfLocalDayMs(targetDateMs);
}

export function isLessonsLearnedRequired(milestone: BosMilestone): boolean {
  return (
    milestone.businessImpact === MILESTONE_BUSINESS_IMPACT.HIGH ||
    milestone.businessImpact === MILESTONE_BUSINESS_IMPACT.CRITICAL
  );
}

export function isFailureLearningRequired(milestoneResult: MilestoneResult | ""): boolean {
  return milestoneResult === MILESTONE_RESULT.FAILED || milestoneResult === MILESTONE_RESULT.CANCELLED;
}

/** Earliest allowed `<input type="date">` value: milestone startedAt (local day). */
export function getCompletionDateMinDayKey(milestone: BosMilestone): string | undefined {
  if (milestone.startedAt === undefined) return undefined;
  return formatBosPlannedDateInput(milestone.startedAt);
}

/** Latest allowed `<input type="date">` value: today (local day). */
export function getCompletionDateMaxDayKey(nowMs: number = Date.now()): string {
  return formatBosPlannedDateInput(nowMs);
}

/**
 * `<input type="date">` min bound for the completion picker.
 * Uses startedAt when it is strictly before today; otherwise omits min so past dates stay selectable
 * (domain validation still enforces startedAt <= completedAt on submit).
 */
export function getCompletionDatePickerMinDayKey(
  milestone: BosMilestone,
  nowMs: number = Date.now(),
): string | undefined {
  const minKey = getCompletionDateMinDayKey(milestone);
  if (!minKey) return undefined;
  const maxKey = getCompletionDateMaxDayKey(nowMs);
  return minKey < maxKey ? minKey : undefined;
}

/** Reset complete form only when opening a different milestone or reopening after close. */
export function shouldInitializeCompleteForm(
  previousMilestoneId: string | null,
  nextMilestoneId: string | null,
): boolean {
  if (!nextMilestoneId) return false;
  return previousMilestoneId !== nextMilestoneId;
}

/** Keeps dependent-milestone `<select>` value in sync with available options. */
export function resolveDependentMilestoneTargetId(
  action: MilestoneCompletionNextAction | "",
  currentTargetId: string,
  options: MilestoneLinkOption[],
): string {
  if (action !== MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE) {
    return currentTargetId;
  }
  const trimmed = currentTargetId.trim();
  if (trimmed && options.some((option) => option.id === trimmed)) {
    return trimmed;
  }
  return options[0]?.id ?? "";
}

export function hasStructuredEvidenceRequirements(
  requirements: MilestoneCompletionRequirements | undefined,
): boolean {
  if (!requirements) return false;
  return Boolean(
    requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.DECISION_REQUIRED] ||
      requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.EXPENSE_LINKED] ||
      requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.REVENUE_LINKED] ||
      requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.DOCUMENT_ATTACHED] ||
      requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.URL_ATTACHED] ||
      requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.SCREENSHOT_REQUIRED],
  );
}

export function createInitialCompleteFormState(nowMs: number = Date.now()): MilestoneCompleteFormState {
  return {
    completedDate: formatBosPlannedDateInput(nowMs),
    outcomeSummary: "",
    lessonsLearned: "",
    milestoneResult: MILESTONE_RESULT.COMPLETED_SUCCESSFULLY,
    delayReason: "",
    failureRootCause: "",
    failureRootCauseNotes: "",
    completionNextAction: MILESTONE_COMPLETION_NEXT_ACTION.NOTHING,
    completionNextActionCustom: "",
    completionNextActionTargetId: "",
    evidenceSource: MILESTONE_EVIDENCE_TYPE.MANUAL,
    selectedDecisionId: "",
    selectedExpenseId: "",
    selectedInvoiceId: "",
    documentEvidence: "",
    urlEvidence: "",
    screenshotEvidence: "",
    supportingEvidence: "",
  };
}

export function buildCompletionEvidence(
  milestone: BosMilestone,
  form: MilestoneCompleteFormState,
): CompleteBosMilestoneInput["evidence"] {
  const req = milestone.completionRequirements;
  const evidence: CompleteBosMilestoneInput["evidence"] = [];
  const supporting = form.supportingEvidence.trim() || undefined;

  const pushUnique = (entry: CompleteBosMilestoneInput["evidence"][number]) => {
    const key = `${entry.type}:${entry.sourceId ?? ""}:${entry.notes ?? ""}`;
    if (evidence.some((e) => `${e.type}:${e.sourceId ?? ""}:${e.notes ?? ""}` === key)) return;
    evidence.push(entry);
  };

  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.DECISION_REQUIRED] && form.selectedDecisionId) {
    pushUnique({
      type: MILESTONE_EVIDENCE_TYPE.DECISION,
      sourceId: form.selectedDecisionId,
      notes: supporting,
    });
  }
  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.EXPENSE_LINKED] && form.selectedExpenseId) {
    pushUnique({
      type: MILESTONE_EVIDENCE_TYPE.EXPENSE,
      sourceId: form.selectedExpenseId,
      notes: supporting,
    });
  }
  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.REVENUE_LINKED] && form.selectedInvoiceId) {
    pushUnique({
      type: MILESTONE_EVIDENCE_TYPE.INVOICE,
      sourceId: form.selectedInvoiceId,
      notes: supporting,
    });
  }
  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.DOCUMENT_ATTACHED] && form.documentEvidence.trim()) {
    pushUnique({
      type: MILESTONE_EVIDENCE_TYPE.DOCUMENT,
      notes: form.documentEvidence.trim(),
    });
  }
  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.URL_ATTACHED] && form.urlEvidence.trim()) {
    pushUnique({
      type: MILESTONE_EVIDENCE_TYPE.URL,
      sourceId: form.urlEvidence.trim(),
      notes: supporting,
    });
  }
  if (
    req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.SCREENSHOT_REQUIRED] &&
    form.screenshotEvidence.trim()
  ) {
    pushUnique({
      type: MILESTONE_EVIDENCE_TYPE.SCREENSHOT,
      notes: form.screenshotEvidence.trim(),
    });
  }

  if (!hasStructuredEvidenceRequirements(req)) {
    switch (form.evidenceSource) {
      case MILESTONE_EVIDENCE_TYPE.DECISION:
        if (form.selectedDecisionId) {
          pushUnique({
            type: MILESTONE_EVIDENCE_TYPE.DECISION,
            sourceId: form.selectedDecisionId,
            notes: supporting,
          });
        }
        break;
      case MILESTONE_EVIDENCE_TYPE.EXPENSE:
        if (form.selectedExpenseId) {
          pushUnique({
            type: MILESTONE_EVIDENCE_TYPE.EXPENSE,
            sourceId: form.selectedExpenseId,
            notes: supporting,
          });
        }
        break;
      case MILESTONE_EVIDENCE_TYPE.INVOICE:
        if (form.selectedInvoiceId) {
          pushUnique({
            type: MILESTONE_EVIDENCE_TYPE.INVOICE,
            sourceId: form.selectedInvoiceId,
            notes: supporting,
          });
        }
        break;
      case MILESTONE_EVIDENCE_TYPE.DOCUMENT:
        if (form.documentEvidence.trim()) {
          pushUnique({ type: MILESTONE_EVIDENCE_TYPE.DOCUMENT, notes: form.documentEvidence.trim() });
        }
        break;
      case MILESTONE_EVIDENCE_TYPE.URL:
        if (form.urlEvidence.trim()) {
          pushUnique({
            type: MILESTONE_EVIDENCE_TYPE.URL,
            sourceId: form.urlEvidence.trim(),
            notes: supporting,
          });
        }
        break;
      case MILESTONE_EVIDENCE_TYPE.SCREENSHOT:
        if (form.screenshotEvidence.trim()) {
          pushUnique({
            type: MILESTONE_EVIDENCE_TYPE.SCREENSHOT,
            notes: form.screenshotEvidence.trim(),
          });
        }
        break;
      case MILESTONE_EVIDENCE_TYPE.MANUAL:
        pushUnique({
          type: MILESTONE_EVIDENCE_TYPE.MANUAL,
          notes: supporting ?? (form.outcomeSummary.trim() || "Manual completion note"),
        });
        break;
      default:
        break;
    }
  }

  if (!evidence.length && form.outcomeSummary.trim()) {
    pushUnique({
      type: MILESTONE_EVIDENCE_TYPE.MANUAL,
      notes: form.outcomeSummary.trim(),
    });
  }

  return evidence;
}

export function validateCompletionForm(
  milestone: BosMilestone,
  form: MilestoneCompleteFormState,
  completedDateMs: number,
  completedDateMaxMs: number = Date.now(),
  allMilestones: BosMilestone[] = [],
): string | null {
  const dependencyResult = validateMilestoneDependenciesMet(milestone, allMilestones);
  if (!dependencyResult.ok) {
    return dependencyResult.errors[0]?.message ?? "Complete dependency milestones first.";
  }

  if (!form.milestoneResult) return "Select a milestone result.";
  if (!form.completionNextAction) return "Select what happens next.";
  if (
    form.completionNextAction === MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE &&
    !form.completionNextActionTargetId.trim()
  ) {
    return "Select which dependent milestone to start next.";
  }
  if (
    form.completionNextAction === MILESTONE_COMPLETION_NEXT_ACTION.CUSTOM &&
    !form.completionNextActionCustom.trim()
  ) {
    return "Describe what happens next.";
  }
  if (isFailureLearningRequired(form.milestoneResult)) {
    if (!form.failureRootCause) return "Select a root cause.";
    if (!form.failureRootCauseNotes.trim()) return "Provide a short root cause explanation.";
  }

  const req = milestone.completionRequirements;
  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.NOTES_REQUIRED] && !form.outcomeSummary.trim()) {
    return "Outcome summary is required for this milestone.";
  }
  if (isLessonsLearnedRequired(milestone) && !form.lessonsLearned.trim()) {
    return "Lessons learned are required for high or critical impact milestones.";
  }
  if (isMilestoneCompletionLate(completedDateMs, milestone.plannedEndDate) && !form.delayReason) {
    return "Delay reason is required when completing after the target date.";
  }

  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.DECISION_REQUIRED] && !form.selectedDecisionId) {
    return "Select the decision that satisfies this milestone's requirements.";
  }
  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.EXPENSE_LINKED] && !form.selectedExpenseId) {
    return "Select the expense that satisfies this milestone's requirements.";
  }
  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.REVENUE_LINKED] && !form.selectedInvoiceId) {
    return "Select the invoice that satisfies this milestone's requirements.";
  }
  if (
    req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.DOCUMENT_ATTACHED] &&
    !form.documentEvidence.trim()
  ) {
    return "Document evidence is required for this milestone.";
  }
  if (req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.URL_ATTACHED] && !form.urlEvidence.trim()) {
    return "A URL is required for this milestone.";
  }
  if (
    req?.[MILESTONE_COMPLETION_REQUIREMENT_KEY.SCREENSHOT_REQUIRED] &&
    !form.screenshotEvidence.trim()
  ) {
    return "Screenshot evidence is required for this milestone.";
  }

  const evidence = buildCompletionEvidence(milestone, form);
  const isLate = isMilestoneCompletionLate(completedDateMs, milestone.plannedEndDate);
  const input: CompleteBosMilestoneInput = {
    completedDate: completedDateMs,
    completionNotes: form.outcomeSummary.trim() || undefined,
    lessonsLearned: form.lessonsLearned.trim() || undefined,
    milestoneResult: form.milestoneResult as MilestoneResult,
    delayReason: isLate && form.delayReason ? form.delayReason : undefined,
    failureRootCause: isFailureLearningRequired(form.milestoneResult)
      ? form.failureRootCause || undefined
      : undefined,
    failureRootCauseNotes: isFailureLearningRequired(form.milestoneResult)
      ? form.failureRootCauseNotes.trim() || undefined
      : undefined,
    completionNextAction: form.completionNextAction as MilestoneCompletionNextAction,
    completionNextActionCustom: form.completionNextActionCustom.trim() || undefined,
    completionNextActionTargetId:
      form.completionNextAction === MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE
        ? form.completionNextActionTargetId || undefined
        : undefined,
    evidence,
    updatedById: "validation",
  };

  const result = validateCompleteMilestone(milestone, input, {
    completedDateMaxMs,
  });
  if (!result.ok) {
    return result.errors[0]?.message ?? "Cannot complete milestone yet.";
  }

  return null;
}

export function formStateToCompleteInput(
  milestone: BosMilestone,
  form: MilestoneCompleteFormState,
  completedDateMs: number,
  updatedById: string,
): CompleteBosMilestoneInput {
  const isLate = isMilestoneCompletionLate(completedDateMs, milestone.plannedEndDate);
  return {
    completedDate: completedDateMs,
    completionNotes: form.outcomeSummary.trim() || undefined,
    lessonsLearned: form.lessonsLearned.trim() || undefined,
    milestoneResult: form.milestoneResult as MilestoneResult,
    delayReason: isLate && form.delayReason ? form.delayReason : undefined,
    failureRootCause: isFailureLearningRequired(form.milestoneResult)
      ? form.failureRootCause || undefined
      : undefined,
    failureRootCauseNotes: isFailureLearningRequired(form.milestoneResult)
      ? form.failureRootCauseNotes.trim() || undefined
      : undefined,
    completionNextAction: form.completionNextAction as MilestoneCompletionNextAction,
    completionNextActionCustom: form.completionNextActionCustom.trim() || undefined,
    completionNextActionTargetId:
      form.completionNextAction === MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE
        ? form.completionNextActionTargetId || undefined
        : undefined,
    evidence: buildCompletionEvidence(milestone, form),
    updatedById,
  };
}
