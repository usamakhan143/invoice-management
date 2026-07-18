import { domainFailOne, domainOk, type DomainResult } from "../../domainResult";
import { DELIVERY_TEMPLATE_STATE } from "../templateState";
import type {
  CreateDeliveryTemplateInput,
  DeliveryTemplate,
  UpdateDeliveryTemplateInput,
} from "../entities/deliveryTemplate";
import {
  isDeliveryTemplateTransitionAllowed,
} from "../lifecycle/deliveryTemplateLifecycle";
import type { DeliveryTemplateState } from "../templateState";

export function validateCreateDeliveryTemplate(input: CreateDeliveryTemplateInput): DomainResult {
  if (!input.name?.trim()) {
    return domainFailOne("DELIVERY_TEMPLATE_NAME_REQUIRED", "Template name is required.");
  }
  if (!input.agencyType) {
    return domainFailOne(
      "DELIVERY_TEMPLATE_AGENCY_TYPE_REQUIRED",
      "Exactly one agency type is required per template.",
    );
  }
  if (!input.lifecyclePhaseKeys?.length) {
    return domainFailOne(
      "DELIVERY_TEMPLATE_PHASES_REQUIRED",
      "Active templates must define at least one lifecycle phase.",
    );
  }
  return domainOk();
}

export function validateUpdateDeliveryTemplate(
  template: DeliveryTemplate,
  input: UpdateDeliveryTemplateInput,
): DomainResult {
  if (template.status !== DELIVERY_TEMPLATE_STATE.DRAFT) {
    if (input.lifecyclePhaseKeys !== undefined || input.name !== undefined) {
      return domainFailOne(
        "DELIVERY_TEMPLATE_INVALID_TRANSITION",
        "Significant template changes require a new version while active; edit only in draft.",
      );
    }
  }

  if (input.name !== undefined && !input.name.trim()) {
    return domainFailOne("DELIVERY_TEMPLATE_NAME_REQUIRED", "Template name cannot be empty.");
  }

  if (input.lifecyclePhaseKeys !== undefined && input.lifecyclePhaseKeys.length === 0) {
    return domainFailOne(
      "DELIVERY_TEMPLATE_PHASES_REQUIRED",
      "Template must define at least one lifecycle phase.",
    );
  }

  return domainOk();
}

export function validateApplyDeliveryTemplate(template: DeliveryTemplate): DomainResult {
  if (template.status === DELIVERY_TEMPLATE_STATE.DEPRECATED) {
    return domainFailOne(
      "DELIVERY_TEMPLATE_DEPRECATED",
      "Deprecated templates cannot be applied to new engagements.",
    );
  }
  if (template.status !== DELIVERY_TEMPLATE_STATE.ACTIVE) {
    return domainFailOne(
      "DELIVERY_TEMPLATE_INVALID_TRANSITION",
      "Only active templates can be applied to engagements.",
    );
  }
  return domainOk();
}

export function validateDeliveryTemplateStatusTransition(
  template: DeliveryTemplate,
  nextStatus: DeliveryTemplateState,
): DomainResult {
  if (!isDeliveryTemplateTransitionAllowed(template.status, nextStatus)) {
    return domainFailOne(
      "DELIVERY_TEMPLATE_INVALID_TRANSITION",
      `Transition from ${template.status} to ${nextStatus} is not allowed.`,
    );
  }

  if (
    nextStatus === DELIVERY_TEMPLATE_STATE.ACTIVE &&
    template.lifecyclePhaseKeys.length === 0
  ) {
    return domainFailOne(
      "DELIVERY_TEMPLATE_PHASES_REQUIRED",
      "Template must define at least one lifecycle phase before activation.",
    );
  }

  return domainOk();
}
