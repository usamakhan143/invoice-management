import { useQuery } from "@tanstack/react-query";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";

export function useFounderDashboardQuery() {
  const { actorScope, isReady } = useAosScope();
  const { dashboard } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.dashboard(),
    queryFn: () => {
      if (!actorScope) throw new Error("Scope not ready");
      return dashboard.getFounderDashboard(actorScope);
    },
    enabled: isReady && Boolean(actorScope),
    staleTime: 30_000,
  });
}
