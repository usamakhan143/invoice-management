import type { DeliveryEngagementId } from "../../../domain/delivery/valueObjects";

/** Query — load one engagement by id within company scope. */
export interface GetDeliveryEngagementQuery {
  engagementId: DeliveryEngagementId;
}
