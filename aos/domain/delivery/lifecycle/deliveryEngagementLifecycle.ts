import { DELIVERY_STATE, type DeliveryState } from "../deliveryState";

export type DeliveryEngagementTransitionEvent =
  | "start_intake"
  | "start_discovery"
  | "approve_requirements"
  | "approve_prompt_pack"
  | "submit_sessions"
  | "pass_evaluations"
  | "complete_qa"
  | "submit_retrospective"
  | "pause"
  | "resume"
  | "cancel";

const FORWARD_TRANSITIONS: Partial<
  Record<DeliveryState, Partial<Record<DeliveryEngagementTransitionEvent, DeliveryState>>>
> = {
  [DELIVERY_STATE.DRAFT]: {
    start_intake: DELIVERY_STATE.INTAKE,
    cancel: DELIVERY_STATE.CANCELLED,
  },
  [DELIVERY_STATE.INTAKE]: {
    start_discovery: DELIVERY_STATE.DISCOVERY,
    cancel: DELIVERY_STATE.CANCELLED,
  },
  [DELIVERY_STATE.DISCOVERY]: {
    approve_requirements: DELIVERY_STATE.PLANNING,
    cancel: DELIVERY_STATE.CANCELLED,
  },
  [DELIVERY_STATE.PLANNING]: {
    approve_prompt_pack: DELIVERY_STATE.BUILDING,
    cancel: DELIVERY_STATE.CANCELLED,
  },
  [DELIVERY_STATE.BUILDING]: {
    submit_sessions: DELIVERY_STATE.EVALUATING,
    cancel: DELIVERY_STATE.CANCELLED,
  },
  [DELIVERY_STATE.EVALUATING]: {
    pass_evaluations: DELIVERY_STATE.DELIVERING,
    cancel: DELIVERY_STATE.CANCELLED,
  },
  [DELIVERY_STATE.DELIVERING]: {
    complete_qa: DELIVERY_STATE.HANDOFF,
    cancel: DELIVERY_STATE.CANCELLED,
  },
  [DELIVERY_STATE.HANDOFF]: {
    submit_retrospective: DELIVERY_STATE.CLOSED,
    cancel: DELIVERY_STATE.CANCELLED,
  },
  [DELIVERY_STATE.PAUSED]: {
    resume: DELIVERY_STATE.DRAFT, // placeholder — resolved via pausedFromState
    cancel: DELIVERY_STATE.CANCELLED,
  },
  [DELIVERY_STATE.CLOSED]: {},
  [DELIVERY_STATE.CANCELLED]: {},
};

/** States that may transition to paused. */
export const PAUSABLE_DELIVERY_STATES: readonly DeliveryState[] = [
  DELIVERY_STATE.DRAFT,
  DELIVERY_STATE.INTAKE,
  DELIVERY_STATE.DISCOVERY,
  DELIVERY_STATE.PLANNING,
  DELIVERY_STATE.BUILDING,
  DELIVERY_STATE.EVALUATING,
  DELIVERY_STATE.DELIVERING,
  DELIVERY_STATE.HANDOFF,
];

export function isPausableDeliveryState(state: DeliveryState): boolean {
  return PAUSABLE_DELIVERY_STATES.includes(state);
}

export function getDeliveryEngagementNextStatus(
  current: DeliveryState,
  event: DeliveryEngagementTransitionEvent,
  pausedFromState?: DeliveryState,
): DeliveryState | undefined {
  if (event === "pause" && isPausableDeliveryState(current)) {
    return DELIVERY_STATE.PAUSED;
  }

  if (event === "resume" && current === DELIVERY_STATE.PAUSED && pausedFromState) {
    return pausedFromState;
  }

  return FORWARD_TRANSITIONS[current]?.[event];
}

export function isDeliveryEngagementTransitionAllowed(
  from: DeliveryState,
  to: DeliveryState,
  pausedFromState?: DeliveryState,
): boolean {
  if (from === DELIVERY_STATE.PAUSED && pausedFromState && to === pausedFromState) {
    return true;
  }

  if (isPausableDeliveryState(from) && to === DELIVERY_STATE.PAUSED) {
    return true;
  }

  const allowed = FORWARD_TRANSITIONS[from];
  if (!allowed) return false;
  return Object.values(allowed).includes(to);
}

export const INVALID_DELIVERY_TRANSITIONS: ReadonlyArray<[DeliveryState, DeliveryState]> = [
  [DELIVERY_STATE.CLOSED, DELIVERY_STATE.DRAFT],
  [DELIVERY_STATE.CLOSED, DELIVERY_STATE.INTAKE],
  [DELIVERY_STATE.CLOSED, DELIVERY_STATE.BUILDING],
  [DELIVERY_STATE.CANCELLED, DELIVERY_STATE.DRAFT],
  [DELIVERY_STATE.CANCELLED, DELIVERY_STATE.PLANNING],
  [DELIVERY_STATE.HANDOFF, DELIVERY_STATE.BUILDING],
  [DELIVERY_STATE.BUILDING, DELIVERY_STATE.PLANNING],
];

export function isInvalidDeliveryEngagementTransition(
  from: DeliveryState,
  to: DeliveryState,
): boolean {
  return INVALID_DELIVERY_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

export function resolveDeliveryEngagementTransition(
  current: DeliveryState,
  event: DeliveryEngagementTransitionEvent,
  pausedFromState?: DeliveryState,
): DeliveryState | undefined {
  return getDeliveryEngagementNextStatus(current, event, pausedFromState);
}
