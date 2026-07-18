import type { DeliveryEngagementTransitionEvent } from "../../../domain/delivery/lifecycle/deliveryEngagementLifecycle";
import type { DeliveryEngagementArtifactRefs } from "../../../domain/delivery/valueObjects";

/** Command — advance forward lifecycle (excludes pause, resume, cancel). */
export interface AdvanceDeliveryLifecycleCommand {
  event: Exclude<
    DeliveryEngagementTransitionEvent,
    "pause" | "resume" | "cancel"
  >;
  artifacts: DeliveryEngagementArtifactRefs;
}
