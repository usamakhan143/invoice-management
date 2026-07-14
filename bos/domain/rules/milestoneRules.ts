import type {
  BosMilestone,
  CompleteBosMilestoneInput,
  CreateBosMilestoneInput,
  UpdateBosMilestoneInput,
} from "../entities/milestone";
import type { MilestoneStatus } from "../../constants/milestoneStatus";
import { MILESTONE_STATUS, TERMINAL_MILESTONE_STATUSES } from "../../constants/milestoneStatus";
import { isMilestonePriority } from "../../constants/milestonePriority";
import { isMilestoneDurationUnit } from "../../constants/milestoneDurationUnit";
import { isMilestoneBusinessImpact } from "../../constants/milestoneBusinessImpact";
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

export function validateCompleteMilestone(
  milestone: BosMilestone,
  input: CompleteBosMilestoneInput,
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
