import type { AgencyType } from "../../constants/agencyType";

export interface KnowledgeListFilters {
  search: string;
  agencyType?: AgencyType;
}

export const DEFAULT_KNOWLEDGE_LIST_FILTERS: KnowledgeListFilters = {
  search: "",
};

export function knowledgeListFiltersToQueryKey(
  filters: KnowledgeListFilters,
): Record<string, unknown> {
  return {
    search: filters.search,
    agencyType: filters.agencyType ?? null,
  };
}
