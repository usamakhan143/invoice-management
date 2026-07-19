import { useQuery } from "@tanstack/react-query";
import type { DeliveryEngagementDto } from "../../application/delivery/dto/DeliveryEngagementDto";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";

export function useDeliveryEngagementQuery(engagementId: string | undefined) {
  const { delivery } = useAosServices();
  const { readScope, isReady } = useAosScope();

  return useQuery<DeliveryEngagementDto | null>({
    queryKey: aosQueryKeys.deliveries.detail(engagementId ?? ""),
    queryFn: async () => {
      if (!readScope || !engagementId) {
        throw new Error("Engagement context is not ready");
      }

      return delivery.getEngagement(readScope, { engagementId });
    },
    enabled: isReady && Boolean(engagementId),
    refetchOnWindowFocus: true,
  });
}
