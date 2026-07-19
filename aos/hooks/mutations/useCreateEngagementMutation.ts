import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateDeliveryEngagementCommand } from "../../application/delivery/commands/CreateDeliveryEngagementCommand";
import type { DeliveryEngagementDto } from "../../application/delivery/dto/DeliveryEngagementDto";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "../queries/keys";

export function useCreateEngagementMutation() {
  const { delivery } = useAosServices();
  const { actorScope } = useAosScope();
  const queryClient = useQueryClient();

  return useMutation<DeliveryEngagementDto, Error, CreateDeliveryEngagementCommand>({
    mutationFn: async (command) => {
      if (!actorScope) {
        throw new Error("Company context is not ready");
      }

      return delivery.createEngagement(actorScope, command);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: aosQueryKeys.deliveries.all() });
    },
  });
}
