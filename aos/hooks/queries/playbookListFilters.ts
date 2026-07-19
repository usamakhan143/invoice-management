import type { AgencyType } from "../../constants/agencyType";
import type { DeliveryState } from "../../constants/deliveryState";
import type { PlaybookEntryType } from "../../application/playbook/dto/PlaybookDto";

export interface PlaybookListFilters {
  search: string;
  entryType?: PlaybookEntryType;
  lifecyclePhase?: DeliveryState;
  agencyType?: AgencyType;
}

export const DEFAULT_PLAYBOOK_LIST_FILTERS: PlaybookListFilters = {
  search: "",
};

export function playbookListFiltersToQueryKey(
  filters: PlaybookListFilters,
): Record<string, unknown> {
  return {
    search: filters.search,
    entryType: filters.entryType ?? null,
    lifecyclePhase: filters.lifecyclePhase ?? null,
    agencyType: filters.agencyType ?? null,
  };
}
