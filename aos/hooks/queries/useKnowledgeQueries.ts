import { useQuery } from "@tanstack/react-query";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";
import {
  knowledgeListFiltersToQueryKey,
  type KnowledgeListFilters,
} from "./knowledgeListFilters";

export function useKnowledgeListQuery(filters: KnowledgeListFilters) {
  const readScope = useAosScope();
  const { knowledge } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.knowledge.list(knowledgeListFiltersToQueryKey(filters)),
    queryFn: () =>
      knowledge.listKnowledge(readScope, {
        search: filters.search || undefined,
        agencyType: filters.agencyType,
      }),
  });
}

export function useKnowledgeDetailQuery(patternId: string | undefined) {
  const readScope = useAosScope();
  const { knowledge } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.knowledge.detail(patternId ?? ""),
    queryFn: () => knowledge.getKnowledge(readScope, patternId!),
    enabled: Boolean(patternId),
  });
}
