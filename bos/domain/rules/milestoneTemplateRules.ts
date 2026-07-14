import type {
  CreateBosMilestoneTemplateInput,
  UpdateBosMilestoneTemplateInput,
} from "../entities/milestoneTemplate";
import { MILESTONE_TEMPLATE_VISIBILITY } from "../../constants/milestoneTemplateVisibility";
import { domainFailOne, domainOk, type DomainResult } from "../domainResult";

export function validateCreateMilestoneTemplate(
  input: CreateBosMilestoneTemplateInput,
): DomainResult {
  if (!input.name?.trim()) {
    return domainFailOne("MILESTONE_TEMPLATE_NAME_REQUIRED", "Template name is required.");
  }
  if (!input.steps?.length) {
    return domainFailOne("MILESTONE_TEMPLATE_STEPS_REQUIRED", "Template must include at least one milestone step.");
  }
  for (const step of input.steps) {
    if (!step.title?.trim()) {
      return domainFailOne("MILESTONE_TEMPLATE_STEP_TITLE", "Every template step needs a title.");
    }
  }
  if (input.visibility === MILESTONE_TEMPLATE_VISIBILITY.MARKETPLACE) {
    return domainFailOne(
      "MILESTONE_TEMPLATE_MARKETPLACE_UNAVAILABLE",
      "Marketplace templates are not available yet.",
    );
  }
  return domainOk();
}

export function validateUpdateMilestoneTemplate(
  input: UpdateBosMilestoneTemplateInput,
): DomainResult {
  if (input.name !== undefined && !input.name.trim()) {
    return domainFailOne("MILESTONE_TEMPLATE_NAME_REQUIRED", "Template name cannot be empty.");
  }
  if (input.steps !== undefined && input.steps.length === 0) {
    return domainFailOne("MILESTONE_TEMPLATE_STEPS_REQUIRED", "Template must include at least one milestone step.");
  }
  if (input.visibility === MILESTONE_TEMPLATE_VISIBILITY.MARKETPLACE) {
    return domainFailOne(
      "MILESTONE_TEMPLATE_MARKETPLACE_UNAVAILABLE",
      "Marketplace templates are not available yet.",
    );
  }
  return domainOk();
}
