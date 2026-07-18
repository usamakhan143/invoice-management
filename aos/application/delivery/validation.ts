import type { DomainResult } from "../../domain/domainResult";
import type { DeliveryEngagement } from "../../domain/delivery/entities/deliveryEngagement";
import type { TransitionDeliveryEngagementResult } from "../../domain/delivery/deliveryEngagementAggregate";
import { AosDeliveryApplicationError } from "./errors";

/** Maps domain validation failures to application errors — no rule duplication. */
export function assertDeliveryDomainOk(result: DomainResult, fallbackMessage: string): void {
  if (result.ok) return;
  const message = result.errors.map((e) => e.message).join("; ") || fallbackMessage;
  throw new AosDeliveryApplicationError(
    message,
    "AOS_DOMAIN_VALIDATION",
    result.errors,
  );
}

/** Unwraps a successful domain transition outcome for persistence. */
export function assertDeliveryTransitionOk(
  result: TransitionDeliveryEngagementResult,
  fallbackMessage: string,
): DeliveryEngagement {
  if (!result.ok) {
    assertDeliveryDomainOk(result, fallbackMessage);
  }
  return result.engagement;
}
