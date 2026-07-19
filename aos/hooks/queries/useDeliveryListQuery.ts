import { useQuery } from "@tanstack/react-query";
import type { DeliveryEngagementListDto } from "../../application/delivery/dto/DeliveryEngagementDto";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";
import {
  deliveryListFiltersToQueryKey,
  type DeliveryListFilters,
} from "./deliveryListFilters";

export function useDeliveryListQuery(filters: DeliveryListFilters) {
  const { delivery } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<DeliveryEngagementListDto>({
    queryKey: aosQueryKeys.deliveries.list(deliveryListFiltersToQueryKey(filters)),
    queryFn: async () => {
      if (!readScope) {
        throw new Error("Company context is not ready");
      }

      return delivery.listCompanyDeliveries(readScope, {
        limit: filters.limit,
        cursor: filters.cursor,
        status: filters.status,
      });
    },
    enabled: isReady,
  });
}
