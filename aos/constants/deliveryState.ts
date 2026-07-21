/**
 * Delivery lifecycle states — re-exported from domain (single source of truth).
 * @see aos/domain/delivery/deliveryState.ts
 */

export {
  DELIVERY_STATE,
  type DeliveryState,
} from "../domain/delivery/deliveryState";

import type { DeliveryState } from "../domain/delivery/deliveryState";
import { DELIVERY_STATE } from "../domain/delivery/deliveryState";

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

export const DELIVERY_STATES: readonly DeliveryState[] = Object.values(DELIVERY_STATE);
