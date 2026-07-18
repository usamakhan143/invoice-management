import type { PaginationQuery } from "../../../types";
import type { DeliveryState } from "../../../domain/delivery/deliveryState";

/** Query — list engagements for the actor's company. */
export interface ListCompanyDeliveriesQuery extends PaginationQuery {
  status?: DeliveryState;
}
