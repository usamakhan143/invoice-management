import { useQuery } from "@tanstack/react-query";
import { useAosScope } from "../useAosScope";
import { useAosServices } from "../useAosServices";
import { aosQueryKeys } from "./keys";
import {
  playbookListFiltersToQueryKey,
  type PlaybookListFilters,
} from "./playbookListFilters";

export function usePlaybookListQuery(filters: PlaybookListFilters) {
  const readScope = useAosScope();
  const { playbook } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.playbook.list(playbookListFiltersToQueryKey(filters)),
    queryFn: () =>
      playbook.listEntries(readScope, {
        search: filters.search || undefined,
        entryType: filters.entryType,
        lifecyclePhase: filters.lifecyclePhase,
        agencyType: filters.agencyType,
      }),
  });
}

export function usePlaybookEntryQuery(entryId: string | undefined) {
  const readScope = useAosScope();
  const { playbook } = useAosServices();

  return useQuery({
    queryKey: aosQueryKeys.playbook.detail(entryId ?? ""),
    queryFn: () => playbook.getEntry(readScope, entryId!),
    enabled: Boolean(entryId),
  });
}
