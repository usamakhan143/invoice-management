import { useQuery } from "@tanstack/react-query";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";

export function useFounderDashboardQuery() {
  const readScope = useAosScope();
  const { dashboard } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.dashboard(),
    queryFn: () => dashboard.getFounderDashboard(readScope),
    staleTime: 30_000,
  });
}
