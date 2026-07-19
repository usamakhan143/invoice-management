import { useQuery } from "@tanstack/react-query";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";
import {
  registryListFiltersToQueryKey,
  type RegistryListFilters,
} from "./registryListFilters";

export function useRegistryListQuery(filters: RegistryListFilters) {
  const readScope = useAosScope();
  const { registry } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.registry.list(registryListFiltersToQueryKey(filters)),
    queryFn: () =>
      registry.listModules(readScope, {
        search: filters.search || undefined,
        agencyType: filters.agencyType,
        status: filters.status,
      }),
  });
}

export function useRegistryModuleQuery(moduleId: string | undefined) {
  const readScope = useAosScope();
  const { registry } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.registry.detail(moduleId ?? ""),
    queryFn: () => registry.getModule(readScope, moduleId!),
    enabled: Boolean(moduleId),
  });
}
