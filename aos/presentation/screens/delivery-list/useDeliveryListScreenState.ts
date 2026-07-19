import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { DeliveryState } from "../../../constants/deliveryState";
import {
  DEFAULT_DELIVERY_LIST_FILTERS,
  type DeliveryListFilters,
  type DeliveryListSortDirection,
  type DeliveryListSortField,
} from "../../../hooks/queries/deliveryListFilters";

function parseSortField(value: string | null): DeliveryListSortField {
  if (value === "title" || value === "status" || value === "updatedAt") {
    return value;
  }
  return DEFAULT_DELIVERY_LIST_FILTERS.sortField;
}

function parseSortDirection(value: string | null): DeliveryListSortDirection {
  return value === "asc" ? "asc" : "desc";
}

function parseStatus(value: string | null): DeliveryState | undefined {
  return value && value.length > 0 ? (value as DeliveryState) : undefined;
}

export function useDeliveryListScreenState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<DeliveryListFilters>(() => {
    return {
      search: searchParams.get("q") ?? "",
      status: parseStatus(searchParams.get("status")),
      leadUserId: searchParams.get("lead") ?? undefined,
      customerId: searchParams.get("customer") ?? undefined,
      sortField: parseSortField(searchParams.get("sort")),
      sortDirection: parseSortDirection(searchParams.get("dir")),
      cursor: searchParams.get("cursor") ?? undefined,
      limit: DEFAULT_DELIVERY_LIST_FILTERS.limit,
    };
  }, [searchParams]);

  const updateParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === undefined || value === "") {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        });
        if (!("cursor" in updates)) {
          next.delete("cursor");
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setSearch = useCallback(
    (search: string) => updateParams({ q: search || null }),
    [updateParams],
  );

  const setStatus = useCallback(
    (status?: DeliveryState) => updateParams({ status: status ?? null }),
    [updateParams],
  );

  const setLeadUserId = useCallback(
    (leadUserId?: string) => updateParams({ lead: leadUserId ?? null }),
    [updateParams],
  );

  const setCustomerId = useCallback(
    (customerId?: string) => updateParams({ customer: customerId ?? null }),
    [updateParams],
  );

  const toggleSort = useCallback(
    (field: DeliveryListSortField) => {
      const nextDirection =
        filters.sortField === field && filters.sortDirection === "asc" ? "desc" : "asc";
      updateParams({
        sort: field,
        dir: nextDirection,
      });
    },
    [filters.sortDirection, filters.sortField, updateParams],
  );

  const setCursor = useCallback(
    (cursor?: string) => updateParams({ cursor: cursor ?? null }),
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return {
    filters,
    setSearch,
    setStatus,
    setLeadUserId,
    setCustomerId,
    toggleSort,
    setCursor,
    clearFilters,
  };
}
