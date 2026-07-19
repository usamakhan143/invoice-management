import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export interface QueueScreenFilters {
  search: string;
  statusFilter?: string;
}

export function useQueueScreenState(statusFilterEnabled = false) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<QueueScreenFilters>(
    () => ({
      search: searchParams.get("q") ?? "",
      statusFilter: statusFilterEnabled ? searchParams.get("status") ?? undefined : undefined,
    }),
    [searchParams, statusFilterEnabled],
  );

  const setSearch = useCallback(
    (search: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (search.trim()) {
          next.set("q", search);
        } else {
          next.delete("q");
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setStatusFilter = useCallback(
    (status?: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (status) {
          next.set("status", status);
        } else {
          next.delete("status");
        }
        return next;
      });
    },
    [setSearchParams],
  );

  return { filters, setSearch, setStatusFilter };
}
