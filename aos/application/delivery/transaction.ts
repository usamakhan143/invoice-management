/**
 * Conceptual transaction boundaries for Delivery writes.
 * Infrastructure provides transactional implementations — no database coupling here.
 */

export type DeliveryTransactionLabel =
  | "create_engagement"
  | "update_engagement"
  | "lifecycle_transition"
  | "pause_engagement"
  | "resume_engagement"
  | "cancel_engagement"
  | "link_initiative";

export interface DeliveryUnitOfWork {
  run<T>(label: DeliveryTransactionLabel, work: () => Promise<T>): Promise<T>;
}

/** Passthrough boundary until infrastructure supplies a real unit-of-work. */
export const passthroughDeliveryUnitOfWork: DeliveryUnitOfWork = {
  run: async (_label, work) => work(),
};
