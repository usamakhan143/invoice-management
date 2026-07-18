import {
  DELIVERY_TEMPLATE_STATE,
  type DeliveryTemplateState,
} from "../templateState";

export type DeliveryTemplateTransitionEvent = "activate" | "deprecate";

const DELIVERY_TEMPLATE_TRANSITIONS: Record<
  DeliveryTemplateState,
  Partial<Record<DeliveryTemplateTransitionEvent, DeliveryTemplateState>>
> = {
  [DELIVERY_TEMPLATE_STATE.DRAFT]: {
    activate: DELIVERY_TEMPLATE_STATE.ACTIVE,
  },
  [DELIVERY_TEMPLATE_STATE.ACTIVE]: {
    deprecate: DELIVERY_TEMPLATE_STATE.DEPRECATED,
  },
  [DELIVERY_TEMPLATE_STATE.DEPRECATED]: {},
};

export function getDeliveryTemplateNextStatus(
  current: DeliveryTemplateState,
  event: DeliveryTemplateTransitionEvent,
): DeliveryTemplateState | undefined {
  return DELIVERY_TEMPLATE_TRANSITIONS[current]?.[event];
}

export function isDeliveryTemplateTransitionAllowed(
  from: DeliveryTemplateState,
  to: DeliveryTemplateState,
): boolean {
  const allowed = DELIVERY_TEMPLATE_TRANSITIONS[from];
  if (!allowed) return false;
  return Object.values(allowed).includes(to);
}
