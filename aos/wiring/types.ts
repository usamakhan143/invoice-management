import type { DeliveryApplicationService } from "../application/delivery/DeliveryApplicationService";

/**
 * UI-facing application service bundle — constructed at composition root only.
 */
export interface AosPresentationServices {
  delivery: DeliveryApplicationService;
}
