import { DeliveryApplicationService } from "../application/delivery/DeliveryApplicationService";
import { createAosDeliveryReadPorts } from "../infrastructure/wiring/createAosDeliveryReadPorts";
import { createAosDeliveryRepositories } from "../infrastructure/firestore/wiring/createAosDeliveryRepositories";
import type { AosPresentationServices } from "./types";

export interface CreateAosPresentationServicesOptions {
  /**
   * Inject a pre-built delivery service (tests, Storybook).
   * When set, infrastructure wiring is skipped.
   */
  delivery?: DeliveryApplicationService;
}

/**
 * Composition root for AOS presentation layer.
 * Binds existing application services — no UI logic.
 */
export function createAosPresentationServices(
  options: CreateAosPresentationServicesOptions = {},
): AosPresentationServices {
  if (options.delivery) {
    return { delivery: options.delivery };
  }

  const repositories = createAosDeliveryRepositories();
  const readPorts = createAosDeliveryReadPorts();

  return {
    delivery: new DeliveryApplicationService({
      engagements: repositories.engagements,
      readPorts,
    }),
  };
}
