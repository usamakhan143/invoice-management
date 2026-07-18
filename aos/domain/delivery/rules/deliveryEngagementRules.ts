import { ENGAGEMENT_TYPE } from "../../../constants/engagementType";
import { domainFailOne, domainOk, type DomainResult } from "../../domainResult";
import { DELIVERY_STATE, type DeliveryState, isTerminalDeliveryState } from "../deliveryState";
import { DeliveryDomainError, throwDeliveryDomainError } from "../errors";
import type {
  CancelDeliveryEngagementInput,
  CreateDeliveryEngagementInput,
  DeliveryEngagement,
  UpdateDeliveryEngagementInput,
} from "../entities/deliveryEngagement";
import type { DeliveryEngagementTransitionEvent } from "../lifecycle/deliveryEngagementLifecycle";
import {
  getDeliveryEngagementNextStatus,
  isDeliveryEngagementTransitionAllowed,
  isInvalidDeliveryEngagementTransition,
  isPausableDeliveryState,
  resolveDeliveryEngagementTransition,
} from "../lifecycle/deliveryEngagementLifecycle";
import type {
  CustomerReference,
  DeliveryEngagementArtifactRefs,
  InitiativeReference,
  LeadReference,
} from "../valueObjects";

const POST_DISCOVERY_STATES = new Set<string>([
  DELIVERY_STATE.PLANNING,
  DELIVERY_STATE.BUILDING,
  DELIVERY_STATE.EVALUATING,
  DELIVERY_STATE.DELIVERING,
  DELIVERY_STATE.HANDOFF,
  DELIVERY_STATE.CLOSED,
  DELIVERY_STATE.PAUSED,
]);

const POST_PLANNING_STATES = new Set<string>([
  DELIVERY_STATE.BUILDING,
  DELIVERY_STATE.EVALUATING,
  DELIVERY_STATE.DELIVERING,
  DELIVERY_STATE.HANDOFF,
  DELIVERY_STATE.CLOSED,
  DELIVERY_STATE.PAUSED,
]);

function effectiveDeliveryState(engagement: DeliveryEngagement): string {
  if (engagement.status === DELIVERY_STATE.PAUSED && engagement.pausedFromState) {
    return engagement.pausedFromState;
  }
  return engagement.status;
}

export function validateEngagementTitle(title: string | undefined): DomainResult {
  if (!title?.trim()) {
    return domainFailOne("DELIVERY_TITLE_REQUIRED", "Engagement title is required.");
  }
  return domainOk();
}

export function validateCustomerReference(
  engagementCompanyId: string,
  customer: CustomerReference | undefined,
): DomainResult {
  if (!customer?.customerId?.trim()) {
    return domainFailOne("DELIVERY_CUSTOMER_REQUIRED", "ERP customer reference is required.");
  }
  if (customer.companyId !== engagementCompanyId) {
    return domainFailOne(
      "DELIVERY_COMPANY_MISMATCH",
      "ERP customer must belong to the same company as the engagement.",
    );
  }
  return domainOk();
}

export function validateLeadReference(
  engagementCompanyId: string,
  lead: LeadReference | undefined,
): DomainResult {
  if (!lead) return domainOk();
  if (lead.companyId !== engagementCompanyId) {
    return domainFailOne(
      "DELIVERY_COMPANY_MISMATCH",
      "ERP lead must belong to the same company as the engagement.",
    );
  }
  return domainOk();
}

export function validateInitiativeReference(
  engagementCompanyId: string,
  initiative: InitiativeReference | undefined,
): DomainResult {
  if (!initiative) return domainOk();
  if (initiative.companyId !== engagementCompanyId) {
    return domainFailOne(
      "DELIVERY_COMPANY_MISMATCH",
      "BOS initiative must belong to the same company as the engagement.",
    );
  }
  return domainOk();
}

export function validateActiveRequirementSetCount(count: number): DomainResult {
  if (count > 1) {
    return domainFailOne(
      "DELIVERY_MULTIPLE_ACTIVE_REQUIREMENT_SETS",
      "An engagement cannot have more than one active (non-superseded) Requirement Set.",
    );
  }
  return domainOk();
}

export function validateCreateDeliveryEngagement(
  input: CreateDeliveryEngagementInput,
  refs?: {
    customer?: CustomerReference;
    lead?: LeadReference;
    initiative?: InitiativeReference;
  },
): DomainResult {
  const titleResult = validateEngagementTitle(input.title);
  if (!titleResult.ok) return titleResult;

  if (!input.erpCustomerId?.trim()) {
    return domainFailOne("DELIVERY_CUSTOMER_REQUIRED", "ERP customer reference is required.");
  }

  if (!input.deliveryLeadUserId?.trim()) {
    return domainFailOne("DELIVERY_LEAD_REQUIRED", "Delivery lead is required.");
  }

  const customerResult = validateCustomerReference(input.companyId, refs?.customer ?? {
    customerId: input.erpCustomerId,
    companyId: input.companyId,
  });
  if (!customerResult.ok) return customerResult;

  const leadResult = validateLeadReference(
    input.companyId,
    refs?.lead ??
      (input.erpLeadId ? { leadId: input.erpLeadId, companyId: input.companyId } : undefined),
  );
  if (!leadResult.ok) return leadResult;

  const initiativeResult = validateInitiativeReference(
    input.companyId,
    refs?.initiative ??
      (input.bosInitiativeId
        ? { initiativeId: input.bosInitiativeId, companyId: input.companyId }
        : undefined),
  );
  if (!initiativeResult.ok) return initiativeResult;

  return domainOk();
}

export function validateUpdateDeliveryEngagement(
  engagement: DeliveryEngagement,
  input: UpdateDeliveryEngagementInput,
): DomainResult {
  if (isTerminalDeliveryState(engagement.status)) {
    return domainFailOne(
      "DELIVERY_METADATA_LOCKED",
      "Engagement metadata cannot be edited after close or cancel.",
    );
  }

  if (input.title !== undefined) {
    const titleResult = validateEngagementTitle(input.title);
    if (!titleResult.ok) return titleResult;
  }

  const effective = effectiveDeliveryState(engagement);

  if (
    input.agencyType !== undefined &&
    input.agencyType !== engagement.agencyType &&
    POST_DISCOVERY_STATES.has(effective) &&
    !input.auditNote?.trim()
  ) {
    return domainFailOne(
      "DELIVERY_AGENCY_TYPE_CHANGE_REQUIRES_AUDIT",
      "Agency type change after discovery requires an audit note.",
    );
  }

  if (input.bosInitiativeId !== undefined) {
    const nextInitiativeId =
      input.bosInitiativeId === null ? undefined : input.bosInitiativeId;
    const changed = nextInitiativeId !== engagement.bosInitiativeId;

    if (changed && POST_PLANNING_STATES.has(effective) && !input.auditNote?.trim()) {
      return domainFailOne(
        "DELIVERY_INITIATIVE_LOCKED",
        "BOS initiative link changes after planning require an audit note.",
      );
    }
  }

  return domainOk();
}

export function validateDeliveryEngagementTransition(
  engagement: DeliveryEngagement,
  event: DeliveryEngagementTransitionEvent,
  artifacts: DeliveryEngagementArtifactRefs,
): DomainResult {
  const current = engagement.status;
  const nextStatus = resolveDeliveryEngagementTransition(
    current,
    event,
    engagement.pausedFromState,
  );

  if (event === "cancel") {
    if (current === DELIVERY_STATE.CLOSED) {
      return domainFailOne("DELIVERY_INVALID_TRANSITION", "Closed engagements cannot be cancelled.");
    }
    if (current === DELIVERY_STATE.CANCELLED) {
      return domainFailOne("DELIVERY_INVALID_TRANSITION", "Engagement is already cancelled.");
    }
    return domainOk();
  }

  if (event === "pause") {
    if (isTerminalDeliveryState(current)) {
      return domainFailOne(
        "DELIVERY_PAUSE_FROM_TERMINAL",
        "Closed or cancelled engagements cannot be paused.",
      );
    }
    if (current === DELIVERY_STATE.PAUSED) {
      return domainFailOne("DELIVERY_INVALID_TRANSITION", "Engagement is already paused.");
    }
    if (!isPausableDeliveryState(current)) {
      return domainFailOne("DELIVERY_INVALID_TRANSITION", `Cannot pause from ${current}.`);
    }
    return domainOk();
  }

  if (event === "resume") {
    if (current !== DELIVERY_STATE.PAUSED) {
      return domainFailOne("DELIVERY_RESUME_NOT_PAUSED", "Only paused engagements can be resumed.");
    }
    if (!engagement.pausedFromState) {
      return domainFailOne("DELIVERY_INVALID_TRANSITION", "Paused engagement is missing resume state.");
    }
    return domainOk();
  }

  if (!nextStatus) {
    return domainFailOne(
      "DELIVERY_INVALID_TRANSITION",
      `Transition event ${event} is not allowed from ${current}.`,
    );
  }

  if (isInvalidDeliveryEngagementTransition(current, nextStatus)) {
    return domainFailOne(
      "DELIVERY_INVALID_TRANSITION",
      `Transition from ${current} to ${nextStatus} is forbidden.`,
    );
  }

  if (!isDeliveryEngagementTransitionAllowed(current, nextStatus, engagement.pausedFromState)) {
    return domainFailOne(
      "DELIVERY_INVALID_TRANSITION",
      `Transition from ${current} to ${nextStatus} is not allowed.`,
    );
  }

  const gateResult = validateTransitionArtifactGates(current, event, nextStatus, artifacts);
  if (!gateResult.ok) return gateResult;

  return domainOk();
}

function validateTransitionArtifactGates(
  current: DeliveryState,
  event: DeliveryEngagementTransitionEvent,
  nextStatus: DeliveryState,
  artifacts: DeliveryEngagementArtifactRefs,
): DomainResult {
  const activeSetResult = validateActiveRequirementSetCount(
    artifacts.activeNonSupersededRequirementSetCount,
  );
  if (!activeSetResult.ok) return activeSetResult;

  if (event === "approve_requirements" && !artifacts.hasApprovedRequirementSet) {
    return domainFailOne(
      "DELIVERY_MISSING_REQUIREMENT_SET",
      "Cannot enter planning without an approved Requirement Set.",
    );
  }

  if (nextStatus === DELIVERY_STATE.BUILDING && !artifacts.hasApprovedRequirementSet) {
    return domainFailOne(
      "DELIVERY_MISSING_REQUIREMENT_SET",
      "Cannot enter building without an approved Requirement Set.",
    );
  }

  if (event === "approve_prompt_pack" && !artifacts.hasApprovedPromptPack) {
    return domainFailOne(
      "DELIVERY_MISSING_PROMPT_PACK",
      "Cannot enter building without an approved Prompt Pack.",
    );
  }

  if (event === "submit_sessions" && !artifacts.allCursorSessionsSubmitted) {
    return domainFailOne(
      "DELIVERY_INVALID_TRANSITION",
      "Cannot enter evaluating until all Cursor sessions are submitted.",
    );
  }

  if (event === "pass_evaluations" && !artifacts.evaluationsPassing) {
    return domainFailOne(
      "DELIVERY_INVALID_TRANSITION",
      "Cannot enter delivering until evaluations are passing.",
    );
  }

  if (event === "complete_qa" && !artifacts.qaComplete) {
    return domainFailOne(
      "DELIVERY_INVALID_TRANSITION",
      "Cannot enter handoff until QA is complete.",
    );
  }

  if (nextStatus === DELIVERY_STATE.CLOSED && !artifacts.hasCompletedRetrospective) {
    return domainFailOne(
      "DELIVERY_MISSING_RETROSPECTIVE",
      "Cannot close engagement without a completed Retrospective.",
    );
  }

  if (current === DELIVERY_STATE.DISCOVERY && nextStatus === DELIVERY_STATE.PLANNING) {
    if (!artifacts.hasApprovedRequirementSet) {
      return domainFailOne(
        "DELIVERY_MISSING_REQUIREMENT_SET",
        "Cannot exit discovery without an approved Requirement Set.",
      );
    }
  }

  return domainOk();
}

export function validateCancelDeliveryEngagement(
  engagement: DeliveryEngagement,
  input: CancelDeliveryEngagementInput,
): DomainResult {
  if (engagement.status === DELIVERY_STATE.CLOSED) {
    return domainFailOne("DELIVERY_INVALID_TRANSITION", "Closed engagements cannot be cancelled.");
  }
  if (engagement.status === DELIVERY_STATE.CANCELLED) {
    return domainFailOne("DELIVERY_INVALID_TRANSITION", "Engagement is already cancelled.");
  }
  if (!input.cancelReason?.trim()) {
    return domainFailOne("DELIVERY_CANCEL_REASON_REQUIRED", "Cancel reason is required.");
  }
  return domainOk();
}

export function validateCustomerIdImmutableAfterIntake(
  engagement: DeliveryEngagement,
  nextCustomerId: string,
): DomainResult {
  if (isBeforeIntake(engagement)) {
    return domainOk();
  }

  if (nextCustomerId !== engagement.erpCustomerId) {
    return domainFailOne(
      "DELIVERY_CUSTOMER_IMMUTABLE",
      "ERP customer reference is immutable after intake.",
    );
  }

  return domainOk();
}

function isBeforeIntake(engagement: DeliveryEngagement): boolean {
  if (engagement.status === DELIVERY_STATE.DRAFT) {
    return true;
  }
  if (engagement.status === DELIVERY_STATE.PAUSED) {
    return engagement.pausedFromState === DELIVERY_STATE.DRAFT;
  }
  return false;
}

/** BR-DE-06 — retainer engagements use maintenance engagement type. */
export function isRetainerEngagement(engagement: DeliveryEngagement): boolean {
  return engagement.engagementType === ENGAGEMENT_TYPE.MAINTENANCE;
}

export function assertDeliveryEngagementTransition(
  engagement: DeliveryEngagement,
  event: DeliveryEngagementTransitionEvent,
  artifacts: DeliveryEngagementArtifactRefs,
): DeliveryState {
  const result = validateDeliveryEngagementTransition(engagement, event, artifacts);
  if (!result.ok) {
    const first = result.errors[0];
    throwDeliveryDomainError(first.code, first.message);
  }

  const next = getDeliveryEngagementNextStatus(
    engagement.status,
    event,
    engagement.pausedFromState,
  );

  if (event === "cancel") {
    return DELIVERY_STATE.CANCELLED;
  }

  if (!next) {
    throwDeliveryDomainError(
      "DELIVERY_INVALID_TRANSITION",
      `Transition event ${event} produced no target state.`,
    );
  }

  return next;
}

export function assertDeliveryDomainResult(result: DomainResult): void {
  if (!result.ok) {
    const first = result.errors[0];
    throw new DeliveryDomainError(first.code, first.message);
  }
}
