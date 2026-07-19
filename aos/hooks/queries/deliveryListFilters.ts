import type { DeliveryState } from "../../constants/deliveryState";

export type DeliveryListSortField = "title" | "status" | "updatedAt";
export type DeliveryListSortDirection = "asc" | "desc";

export interface DeliveryListFilters {
  search: string;
  status?: DeliveryState;
  leadUserId?: string;
  customerId?: string;
  sortField: DeliveryListSortField;
  sortDirection: DeliveryListSortDirection;
  cursor?: string;
  limit: number;
}

export const DEFAULT_DELIVERY_LIST_FILTERS: DeliveryListFilters = {
  search: "",
  sortField: "updatedAt",
  sortDirection: "desc",
  limit: 25,
};

export function deliveryListFiltersToQueryKey(filters: DeliveryListFilters): Record<string, unknown> {
  return {
    search: filters.search,
    status: filters.status ?? null,
    leadUserId: filters.leadUserId ?? null,
    customerId: filters.customerId ?? null,
    sortField: filters.sortField,
    sortDirection: filters.sortDirection,
    cursor: filters.cursor ?? null,
    limit: filters.limit,
  };
}
