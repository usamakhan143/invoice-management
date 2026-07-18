/**
 * Delivery Engagement lifecycle states — frozen domain model §01.
 * @see docs/aos-domain-model/01_DELIVERY_DOMAIN.md
 */

export const DELIVERY_STATE = {
  DRAFT: "draft",
  INTAKE: "intake",
  DISCOVERY: "discovery",
  PLANNING: "planning",
  BUILDING: "building",
  EVALUATING: "evaluating",
  DELIVERING: "delivering",
  HANDOFF: "handoff",
  CLOSED: "closed",
  PAUSED: "paused",
  CANCELLED: "cancelled",
} as const;

export type DeliveryState = (typeof DELIVERY_STATE)[keyof typeof DELIVERY_STATE];

export const DELIVERY_STATE_LABELS: Record<DeliveryState, string> = {
  [DELIVERY_STATE.DRAFT]: "Draft",
  [DELIVERY_STATE.INTAKE]: "Intake",
  [DELIVERY_STATE.DISCOVERY]: "Discovery",
  [DELIVERY_STATE.PLANNING]: "Planning",
  [DELIVERY_STATE.BUILDING]: "Building",
  [DELIVERY_STATE.EVALUATING]: "Evaluating",
  [DELIVERY_STATE.DELIVERING]: "Delivering",
  [DELIVERY_STATE.HANDOFF]: "Handoff",
  [DELIVERY_STATE.CLOSED]: "Closed",
  [DELIVERY_STATE.PAUSED]: "Paused",
  [DELIVERY_STATE.CANCELLED]: "Cancelled",
};

/** Ordered forward workflow states (excludes paused/cancelled/closed). */
export const FORWARD_DELIVERY_STATES: readonly DeliveryState[] = [
  DELIVERY_STATE.DRAFT,
  DELIVERY_STATE.INTAKE,
  DELIVERY_STATE.DISCOVERY,
  DELIVERY_STATE.PLANNING,
  DELIVERY_STATE.BUILDING,
  DELIVERY_STATE.EVALUATING,
  DELIVERY_STATE.DELIVERING,
  DELIVERY_STATE.HANDOFF,
];

export const TERMINAL_DELIVERY_STATES: readonly DeliveryState[] = [
  DELIVERY_STATE.CLOSED,
  DELIVERY_STATE.CANCELLED,
];

export function isTerminalDeliveryState(state: DeliveryState): boolean {
  return TERMINAL_DELIVERY_STATES.includes(state);
}

export function isForwardDeliveryState(state: DeliveryState): boolean {
  return FORWARD_DELIVERY_STATES.includes(state);
}
