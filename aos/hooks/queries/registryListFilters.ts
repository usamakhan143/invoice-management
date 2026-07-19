import type { AgencyType } from "../../constants/agencyType";
import type { ModuleRegistryCatalogStatus } from "../../application/registry/dto/ModuleRegistryDto";

export interface RegistryListFilters {
  search: string;
  agencyType?: AgencyType;
  status?: ModuleRegistryCatalogStatus;
}

export const DEFAULT_REGISTRY_LIST_FILTERS: RegistryListFilters = {
  search: "",
};

export function registryListFiltersToQueryKey(
  filters: RegistryListFilters,
): Record<string, unknown> {
  return {
    search: filters.search,
    agencyType: filters.agencyType ?? null,
    status: filters.status ?? null,
  };
}
