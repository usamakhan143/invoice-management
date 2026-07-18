/**
 * Delivery Template lifecycle states — frozen domain model §01.
 */

export const DELIVERY_TEMPLATE_STATE = {
  DRAFT: "draft",
  ACTIVE: "active",
  DEPRECATED: "deprecated",
} as const;

export type DeliveryTemplateState =
  (typeof DELIVERY_TEMPLATE_STATE)[keyof typeof DELIVERY_TEMPLATE_STATE];

export const DELIVERY_TEMPLATE_STATE_LABELS: Record<DeliveryTemplateState, string> = {
  [DELIVERY_TEMPLATE_STATE.DRAFT]: "Draft",
  [DELIVERY_TEMPLATE_STATE.ACTIVE]: "Active",
  [DELIVERY_TEMPLATE_STATE.DEPRECATED]: "Deprecated",
};
