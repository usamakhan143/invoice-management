import type { CustomerReadPort } from "./CustomerReadPort";
import type { InitiativeReadPort } from "./InitiativeReadPort";
import type { LeadReadPort } from "./LeadReadPort";
import type { UserReadPort } from "./UserReadPort";

/**
 * Cross-layer read ports required by the Delivery bounded context (Sidecar Law).
 * Adapters deferred to infrastructure — interfaces only.
 */
export interface AosDeliveryReadPorts {
  customers: CustomerReadPort;
  leads: LeadReadPort;
  users: UserReadPort;
  initiatives: InitiativeReadPort;
}

export type { CustomerReadPort } from "./CustomerReadPort";
export { CUSTOMER_READ_PORT } from "./CustomerReadPort";

export type { LeadReadPort } from "./LeadReadPort";
export { LEAD_READ_PORT } from "./LeadReadPort";

export type { UserReadPort } from "./UserReadPort";
export { USER_READ_PORT } from "./UserReadPort";

export type { InitiativeReadPort } from "./InitiativeReadPort";
export { INITIATIVE_READ_PORT } from "./InitiativeReadPort";
