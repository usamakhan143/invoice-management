import type firebase from "firebase/compat/app";
import { db } from "../../../services/firebase";
import type { AosDeliveryReadPorts } from "../../integration/ports/deliveryReadPorts";
import {
  CustomerReadAdapter,
  InitiativeReadAdapter,
  LeadReadAdapter,
  UserReadAdapter,
} from "../adapters";

/**
 * Read-only ERP/BOS port bundle — construct at composition root only.
 * No global singleton; no service locator.
 */
export interface CreateAosDeliveryReadPortsOptions {
  firestore?: firebase.firestore.Firestore;
}

export function createAosDeliveryReadPorts(
  options: CreateAosDeliveryReadPortsOptions = {},
): AosDeliveryReadPorts {
  const firestore = options.firestore ?? db;

  return {
    customers: new CustomerReadAdapter(firestore),
    leads: new LeadReadAdapter(firestore),
    users: new UserReadAdapter(firestore),
    initiatives: new InitiativeReadAdapter(firestore),
  };
}
