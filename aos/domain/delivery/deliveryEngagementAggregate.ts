import type { EpochMs, UserId } from "../../types";
import { DELIVERY_STATE, type DeliveryState } from "./deliveryState";
import type {
  CancelDeliveryEngagementInput,
  DeliveryEngagement,
} from "./entities/deliveryEngagement";
import type { DeliveryEngagementTransitionEvent } from "./lifecycle/deliveryEngagementLifecycle";
import { getDeliveryEngagementNextStatus } from "./lifecycle/deliveryEngagementLifecycle";
import { domainFailOne, type DomainResult } from "../domainResult";
import {
  validateCancelDeliveryEngagement,
  validateDeliveryEngagementTransition,
} from "./rules/deliveryEngagementRules";
import type { DeliveryEngagementArtifactRefs } from "./valueObjects";
import { EMPTY_DELIVERY_ARTIFACT_REFS } from "./valueObjects";

export interface DeliveryEngagementTransitionOutcome {
  ok: true;
  engagement: DeliveryEngagement;
}

export type TransitionDeliveryEngagementResult =
  | DeliveryEngagementTransitionOutcome
  | Extract<DomainResult, { ok: false }>;

/**
 * Aggregate behavior — validate and materialize a lifecycle transition.
 * All status and lifecycle field mutations occur here, not in the application layer.
 */
export function transitionDeliveryEngagement(
  engagement: DeliveryEngagement,
  event: DeliveryEngagementTransitionEvent,
  artifacts: DeliveryEngagementArtifactRefs,
  actorUserId: UserId,
  occurredAt: EpochMs,
): TransitionDeliveryEngagementResult {
  const validation = validateDeliveryEngagementTransition(engagement, event, artifacts);
  if (!validation.ok) {
    return validation;
  }

  const nextStatus = resolveNextDeliveryEngagementStatus(engagement, event);
  if (!nextStatus) {
    return domainFailOne(
      "DELIVERY_INVALID_TRANSITION",
      `Transition event ${event} produced no target state.`,
    );
  }

  return {
    ok: true,
    engagement: materializeDeliveryEngagementTransition(
      engagement,
      event,
      nextStatus,
      actorUserId,
      occurredAt,
    ),
  };
}

/** Aggregate behavior — cancel with recorded reason (append-only). */
export function cancelDeliveryEngagement(
  engagement: DeliveryEngagement,
  input: CancelDeliveryEngagementInput,
  occurredAt: EpochMs,
): TransitionDeliveryEngagementResult {
  const cancelValidation = validateCancelDeliveryEngagement(engagement, input);
  if (!cancelValidation.ok) {
    return cancelValidation;
  }

  const transition = transitionDeliveryEngagement(
    engagement,
    "cancel",
    EMPTY_DELIVERY_ARTIFACT_REFS,
    input.cancelledById,
    occurredAt,
  );

  if (!transition.ok) {
    return transition;
  }

  return {
    ok: true,
    engagement: {
      ...transition.engagement,
      cancelReason: input.cancelReason.trim(),
    },
  };
}

function resolveNextDeliveryEngagementStatus(
  engagement: DeliveryEngagement,
  event: DeliveryEngagementTransitionEvent,
): DeliveryState | undefined {
  if (event === "cancel") {
    return DELIVERY_STATE.CANCELLED;
  }

  return getDeliveryEngagementNextStatus(
    engagement.status,
    event,
    engagement.pausedFromState,
  );
}

function materializeDeliveryEngagementTransition(
  engagement: DeliveryEngagement,
  event: DeliveryEngagementTransitionEvent,
  nextStatus: DeliveryState,
  actorUserId: UserId,
  occurredAt: EpochMs,
): DeliveryEngagement {
  if (event === "pause") {
    return {
      ...engagement,
      status: DELIVERY_STATE.PAUSED,
      pausedFromState:
        engagement.status === DELIVERY_STATE.PAUSED
          ? engagement.pausedFromState
          : engagement.status,
      pausedAt: occurredAt,
      updatedAt: occurredAt,
      updatedById: actorUserId,
    };
  }

  if (event === "resume") {
    return {
      ...engagement,
      status: nextStatus,
      pausedFromState: undefined,
      pausedAt: undefined,
      updatedAt: occurredAt,
      updatedById: actorUserId,
    };
  }

  return {
    ...engagement,
    status: nextStatus,
    updatedAt: occurredAt,
    updatedById: actorUserId,
    closedAt: nextStatus === DELIVERY_STATE.CLOSED ? occurredAt : engagement.closedAt,
  };
}
