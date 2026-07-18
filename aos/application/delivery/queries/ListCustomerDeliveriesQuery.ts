import type { PaginationQuery } from "../../../types";
import type { DeliveryState } from "../../../domain/delivery/deliveryState";

/** Query — list engagements for one ERP customer (BR-DE-01). */
export interface ListCustomerDeliveriesQuery extends PaginationQuery {
  erpCustomerId: string;
  status?: DeliveryState;
}
