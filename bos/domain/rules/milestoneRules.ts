import type {
  BosMilestone,
  CompleteBosMilestoneInput,
  CompleteMilestoneValidationContext,
  CreateBosMilestoneInput,
  UpdateBosMilestoneInput,
} from "../entities/milestone";
import type { MilestoneStatus } from "../../constants/milestoneStatus";
import { MILESTONE_STATUS, TERMINAL_MILESTONE_STATUSES } from "../../constants/milestoneStatus";
import { MILESTONE_BUSINESS_IMPACT } from "../../constants/milestoneBusinessImpact";
import { MILESTONE_EVIDENCE_TYPE } from "../../constants/milestoneEvidenceType";
import { MILESTONE_COMPLETION_REQUIREMENT_KEY } from "../../constants/milestoneCompletionRequirement";
import { MILESTONE_COMPLETION_NEXT_ACTION } from "../../constants/milestoneCompletionNextAction";
import { isMilestoneResult } from "../../constants/milestoneResult";
import { isMilestoneDelayReason } from "../../constants/milestoneDelayReason";
import { isMilestoneCompletionNextAction } from "../../constants/milestoneCompletionNextAction";
import { isMilestoneFailureRootCause } from "../../constants/milestoneFailureRootCause";
import { MILESTONE_RESULT } from "../../constants/milestoneResult";
import { isMilestonePriority } from "../../constants/milestonePriority";
import { isMilestoneDurationUnit } from "../../constants/milestoneDurationUnit";
import { isMilestoneBusinessImpact } from "../../constants/milestoneBusinessImpact";
import { isMilestoneRiskLevel } from "../../constants/milestoneRiskLevel";
import { isMilestoneTransitionAllowed } from "../lifecycle/milestoneLifecycle";
import { domainFailOne, domainOk, type DomainResult } from "../domainResult";

export function validateCreateMilestone(input: CreateBosMilestoneInput): DomainResult {
  if (!input.initiativeId?.trim()) {
    return domainFailOne("MILESTONE_INITIATIVE_REQUIRED", "Milestone must belong to an initiative.");
  }
  if (!input.title?.trim()) {
    return domainFailOne("MILESTONE_TITLE_REQUIRED", "Milestone title is required.");
  }
  if (input.successCriteria !== undefined && !input.successCriteria.trim()) {
    return domainFailOne(
      "MILESTONE_SUCCESS_CRITERIA_REQUIRED",
      "Success criteria cannot be empty when provided.",
    );
  }
  if (!Number.isFinite(input.sequence) || input.sequence < 0) {
    return domainFailOne("MILESTONE_SEQUENCE_INVALID", "Milestone sequence must be a valid number.");
  }
  if (input.priority !== undefined && !isMilestonePriority(input.priority)) {
    return domainFailOne("MILESTONE_PRIORITY_INVALID", "Milestone priority is invalid.");
  }
  if (input.businessImpact !== undefined && !isMilestoneBusinessImpact(input.businessImpact)) {
    return domainFailOne("MILESTONE_BUSINESS_IMPACT_INVALID", "Business impact is invalid.");
  }
  if (input.riskLevel !== undefined && !isMilestoneRiskLevel(input.riskLevel)) {
    return domainFailOne("MILESTONE_RISK_LEVEL_INVALID", "Risk level is invalid.");
  }
  if (
    input.estimatedDuration !== undefined &&
    (!Number.isFinite(input.estimatedDuration) || input.estimatedDuration <= 0)
  ) {
    return domainFailOne(
      "MILESTONE_ESTIMATED_DURATION_INVALID",
      "Estimated duration must be a positive number.",
    );
  }
  if (
    input.estimatedDurationUnit !== undefined &&
    !isMilestoneDurationUnit(input.estimatedDurationUnit)
  ) {
    return domainFailOne(
      "MILESTONE_ESTIMATED_DURATION_UNIT_INVALID",
      "Estimated duration unit is invalid.",
    );
  }
  if (
    input.estimatedCostAmount !== undefined &&
    (!Number.isFinite(input.estimatedCostAmount) || input.estimatedCostAmount < 0)
  ) {
    return domainFailOne(
      "MILESTONE_ESTIMATED_COST_INVALID",
      "Estimated cost must be a non-negative number.",
    );
  }
  if (input.milestoneType !== undefined && !input.milestoneType.trim()) {
    return domainFailOne("MILESTONE_TYPE_INVALID", "Milestone type cannot be empty when provided.");
  }
  if (
    input.plannedStartDate !== undefined &&
    input.plannedEndDate !== undefined &&
    input.plannedEndDate < input.plannedStartDate
  ) {
    return domainFailOne(
      "MILESTONE_DATE_RANGE_INVALID",
      "Planned end date cannot be before planned start date.",
    );
  }
  return domainOk();
}

export function validateUpdateMilestone(
  milestone: BosMilestone,
  input: UpdateBosMilestoneInput,
): DomainResult {
  if (TERMINAL_MILESTONE_STATUSES.includes(milestone.status)) {
    return domainFailOne(
      "MILESTONE_TERMINAL",
      `Cannot update a ${milestone.status} milestone.`,
    );
  }
  if (input.title !== undefined && !input.title.trim()) {
    return domainFailOne("MILESTONE_TITLE_REQUIRED", "Milestone title cannot be empty.");
  }
  if (input.successCriteria !== undefined && !input.successCriteria.trim()) {
    return domainFailOne(
      "MILESTONE_SUCCESS_CRITERIA_REQUIRED",
      "Success criteria cannot be empty.",
    );
  }
  if (input.priority !== undefined && input.priority !== null && !isMilestonePriority(input.priority)) {
    return domainFailOne("MILESTONE_PRIORITY_INVALID", "Milestone priority is invalid.");
  }
  if (
    input.businessImpact !== undefined &&
    input.businessImpact !== null &&
    !isMilestoneBusinessImpact(input.businessImpact)
  ) {
    return domainFailOne("MILESTONE_BUSINESS_IMPACT_INVALID", "Business impact is invalid.");
  }
  if (
    input.riskLevel !== undefined &&
    input.riskLevel !== null &&
    !isMilestoneRiskLevel(input.riskLevel)
  ) {
    return domainFailOne("MILESTONE_RISK_LEVEL_INVALID", "Risk level is invalid.");
  }
  if (
    input.estimatedDuration !== undefined &&
    input.estimatedDuration !== null &&
    (!Number.isFinite(input.estimatedDuration) || input.estimatedDuration <= 0)
  ) {
    return domainFailOne(
      "MILESTONE_ESTIMATED_DURATION_INVALID",
      "Estimated duration must be a positive number.",
    );
  }
  if (
    input.estimatedDurationUnit !== undefined &&
    input.estimatedDurationUnit !== null &&
    !isMilestoneDurationUnit(input.estimatedDurationUnit)
  ) {
    return domainFailOne(
      "MILESTONE_ESTIMATED_DURATION_UNIT_INVALID",
      "Estimated duration unit is invalid.",
    );
  }
  if (
    input.estimatedCostAmount !== undefined &&
    input.estimatedCostAmount !== null &&
    (!Number.isFinite(input.estimatedCostAmount) || input.estimatedCostAmount < 0)
  ) {
    return domainFailOne(
      "MILESTONE_ESTIMATED_COST_INVALID",
      "Estimated cost must be a non-negative number.",
    );
  }
  if (input.milestoneType !== undefined && !input.milestoneType.trim()) {
    return domainFailOne("MILESTONE_TYPE_INVALID", "Milestone type cannot be empty when provided.");
  }
  if (input.sequence !== undefined && (!Number.isFinite(input.sequence) || input.sequence < 0)) {
    return domainFailOne("MILESTONE_SEQUENCE_INVALID", "Milestone sequence must be a valid number.");
  }
  return domainOk();
}

export function validateMilestoneStatusTransition(
  milestone: BosMilestone,
  nextStatus: MilestoneStatus,
): DomainResult {
  if (!isMilestoneTransitionAllowed(milestone.status, nextStatus)) {
    return domainFailOne(
      "MILESTONE_INVALID_TRANSITION",
      `Cannot transition milestone from ${milestone.status} to ${nextStatus}.`,
    );
  }
  return domainOk();
}

function startOfLocalDayMs(epochMs: number): number {
  const d = new Date(epochMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function evidenceHasTypeWithSource(
  evidence: CompleteBosMilestoneInput["evidence"],
  type: (typeof MILESTONE_EVIDENCE_TYPE)[keyof typeof MILESTONE_EVIDENCE_TYPE],
): boolean {
  return evidence.some((e) => e.type === type && Boolean(e.sourceId?.trim()));
}

function evidenceHasTypeWithContent(
  evidence: CompleteBosMilestoneInput["evidence"],
  type: (typeof MILESTONE_EVIDENCE_TYPE)[keyof typeof MILESTONE_EVIDENCE_TYPE],
): boolean {
  return evidence.some(
    (e) => e.type === type && Boolean(e.sourceId?.trim() || e.notes?.trim()),
  );
}

function validateCompletionRequirements(
  milestone: BosMilestone,
  input: CompleteBosMilestoneInput,
): DomainResult {
  const req = milestone.completionRequirements;
  if (!req) return domainOk();

  if (req[MILESTONE_COMPLETION_REQUIREMENT_KEY.DECISION_REQUIRED]) {
    if (!evidenceHasTypeWithSource(input.evidence, MILESTONE_EVIDENCE_TYPE.DECISION)) {
      return domainFailOne(
        "MILESTONE_DECISION_EVIDENCE_REQUIRED",
        "A linked decision is required before completing this milestone.",
      );
    }
  }
  if (req[MILESTONE_COMPLETION_REQUIREMENT_KEY.EXPENSE_LINKED]) {
    if (!evidenceHasTypeWithSource(input.evidence, MILESTONE_EVIDENCE_TYPE.EXPENSE)) {
      return domainFailOne(
        "MILESTONE_EXPENSE_EVIDENCE_REQUIRED",
        "A linked expense is required before completing this milestone.",
      );
    }
  }
  if (req[MILESTONE_COMPLETION_REQUIREMENT_KEY.REVENUE_LINKED]) {
    if (!evidenceHasTypeWithSource(input.evidence, MILESTONE_EVIDENCE_TYPE.INVOICE)) {
      return domainFailOne(
        "MILESTONE_INVOICE_EVIDENCE_REQUIRED",
        "A linked invoice is required before completing this milestone.",
      );
    }
  }
  if (req[MILESTONE_COMPLETION_REQUIREMENT_KEY.DOCUMENT_ATTACHED]) {
    if (!evidenceHasTypeWithContent(input.evidence, MILESTONE_EVIDENCE_TYPE.DOCUMENT)) {
      return domainFailOne(
        "MILESTONE_DOCUMENT_EVIDENCE_REQUIRED",
        "Document evidence is required before completing this milestone.",
      );
    }
  }
  if (req[MILESTONE_COMPLETION_REQUIREMENT_KEY.SCREENSHOT_REQUIRED]) {
    if (!evidenceHasTypeWithContent(input.evidence, MILESTONE_EVIDENCE_TYPE.SCREENSHOT)) {
      return domainFailOne(
        "MILESTONE_SCREENSHOT_EVIDENCE_REQUIRED",
        "Screenshot evidence is required before completing this milestone.",
      );
    }
  }
  if (req[MILESTONE_COMPLETION_REQUIREMENT_KEY.URL_ATTACHED]) {
    if (!evidenceHasTypeWithContent(input.evidence, MILESTONE_EVIDENCE_TYPE.URL)) {
      return domainFailOne(
        "MILESTONE_URL_EVIDENCE_REQUIRED",
        "A URL is required before completing this milestone.",
      );
    }
  }
  if (req[MILESTONE_COMPLETION_REQUIREMENT_KEY.NOTES_REQUIRED]) {
    if (!input.completionNotes?.trim()) {
      return domainFailOne(
        "MILESTONE_OUTCOME_SUMMARY_REQUIRED",
        "Outcome summary is required before completing this milestone.",
      );
    }
  }

  return domainOk();
}

export function validateCompleteMilestone(
  milestone: BosMilestone,
  input: CompleteBosMilestoneInput,
  context?: CompleteMilestoneValidationContext,
): DomainResult {
  const transition = validateMilestoneStatusTransition(milestone, MILESTONE_STATUS.COMPLETED);
  if (!transition.ok) return transition;

  if (!input.evidence?.length) {
    return domainFailOne(
      "MILESTONE_EVIDENCE_REQUIRED",
      "At least one evidence record is required to complete a milestone.",
    );
  }
  if (!Number.isFinite(input.completedDate)) {
    return domainFailOne("MILESTONE_COMPLETED_DATE_INVALID", "Completed date is invalid.");
  }

  if (!isMilestoneResult(input.milestoneResult)) {
    return domainFailOne("MILESTONE_RESULT_REQUIRED", "Milestone result is required.");
  }
  if (!isMilestoneCompletionNextAction(input.completionNextAction)) {
    return domainFailOne("MILESTONE_NEXT_ACTION_REQUIRED", "What happens next must be selected.");
  }
  if (
    input.milestoneResult === MILESTONE_RESULT.FAILED ||
    input.milestoneResult === MILESTONE_RESULT.CANCELLED
  ) {
    if (!input.failureRootCause || !isMilestoneFailureRootCause(input.failureRootCause)) {
      return domainFailOne(
        "MILESTONE_FAILURE_ROOT_CAUSE_REQUIRED",
        "Root cause is required when a milestone fails or is cancelled.",
      );
    }
    if (!input.failureRootCauseNotes?.trim()) {
      return domainFailOne(
        "MILESTONE_FAILURE_EXPLANATION_REQUIRED",
        "A short root cause explanation is required when a milestone fails or is cancelled.",
      );
    }
  }

  if (
    input.completionNextAction === MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE &&
    !input.completionNextActionTargetId?.trim()
  ) {
    return domainFailOne(
      "MILESTONE_DEPENDENT_TARGET_REQUIRED",
      "Select which dependent milestone to start next.",
    );
  }

  if (
    input.completionNextAction === MILESTONE_COMPLETION_NEXT_ACTION.CUSTOM &&
    !input.completionNextActionCustom?.trim()
  ) {
    return domainFailOne(
      "MILESTONE_NEXT_ACTION_CUSTOM_REQUIRED",
      "Describe what happens next.",
    );
  }

  const completedDay = startOfLocalDayMs(input.completedDate);
  if (milestone.startedAt !== undefined) {
    const minDay = startOfLocalDayMs(milestone.startedAt);
    if (completedDay < minDay) {
      return domainFailOne(
        "MILESTONE_COMPLETED_DATE_TOO_EARLY",
        "Completion date cannot be before the milestone was started.",
      );
    }
  }

  if (context?.completedDateMaxMs !== undefined) {
    const maxDay = startOfLocalDayMs(context.completedDateMaxMs);
    if (completedDay > maxDay) {
      return domainFailOne(
        "MILESTONE_COMPLETED_DATE_FUTURE",
        "Completion date cannot be in the future.",
      );
    }
  }

  if (
    milestone.businessImpact === MILESTONE_BUSINESS_IMPACT.HIGH ||
    milestone.businessImpact === MILESTONE_BUSINESS_IMPACT.CRITICAL
  ) {
    if (!input.lessonsLearned?.trim()) {
      return domainFailOne(
        "MILESTONE_LESSONS_LEARNED_REQUIRED",
        "Lessons learned are required for high or critical impact milestones.",
      );
    }
  }

  if (milestone.plannedEndDate !== undefined) {
    const targetDay = startOfLocalDayMs(milestone.plannedEndDate);
    if (completedDay > targetDay) {
      if (!input.delayReason || !isMilestoneDelayReason(input.delayReason)) {
        return domainFailOne(
          "MILESTONE_DELAY_REASON_REQUIRED",
          "Delay reason is required when completing after the target date.",
        );
      }
    }
  }

  const requirements = validateCompletionRequirements(milestone, input);
  if (!requirements.ok) return requirements;

  return domainOk();
}

export function validateMilestoneDependenciesMet(
  milestone: BosMilestone,
  allMilestones: BosMilestone[],
): DomainResult {
  if (!milestone.dependencyIds?.length) return domainOk();
  const byId = new Map(allMilestones.map((m) => [m.id, m]));
  for (const depId of milestone.dependencyIds) {
    const dep = byId.get(depId);
    if (!dep) {
      return domainFailOne("MILESTONE_DEPENDENCY_NOT_FOUND", "A dependency milestone was not found.");
    }
    if (dep.status !== MILESTONE_STATUS.COMPLETED && dep.status !== MILESTONE_STATUS.SKIPPED) {
      return domainFailOne(
        "MILESTONE_DEPENDENCY_UNMET",
        `Dependency "${dep.milestoneNumber ? `${dep.milestoneNumber} · ${dep.title}` : dep.title}" must be completed or skipped first.`,
      );
    }
  }
  return domainOk();
}
