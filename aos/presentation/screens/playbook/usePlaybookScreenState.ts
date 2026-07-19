import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { AgencyType } from "../../../constants/agencyType";
import type { DeliveryState } from "../../../constants/deliveryState";
import type { PlaybookEntryType } from "../../../application/playbook/dto/PlaybookDto";
import type { PlaybookListFilters } from "../../../hooks/queries/playbookListFilters";

function parseAgencyType(value: string | null): AgencyType | undefined {
  return value && value.length > 0 ? (value as AgencyType) : undefined;
}

function parseLifecycle(value: string | null): DeliveryState | undefined {
  return value && value.length > 0 ? (value as DeliveryState) : undefined;
}

function parseEntryType(value: string | null): PlaybookEntryType | undefined {
  return value && value.length > 0 ? (value as PlaybookEntryType) : undefined;
}

export function usePlaybookScreenState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<PlaybookListFilters>(
    () => ({
      search: searchParams.get("q") ?? "",
      entryType: parseEntryType(searchParams.get("type")),
      lifecyclePhase: parseLifecycle(searchParams.get("phase")),
      agencyType: parseAgencyType(searchParams.get("agencyType")),
    }),
    [searchParams],
  );

  const selectedEntryId = searchParams.get("entry") ?? undefined;

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
        return next;
      });
    },
    [setSearchParams],
  );

  const setSearch = useCallback(
    (search: string) => updateParams({ q: search || null }),
    [updateParams],
  );

  const setEntryType = useCallback(
    (entryType?: PlaybookEntryType) => updateParams({ type: entryType ?? null }),
    [updateParams],
  );

  const setLifecyclePhase = useCallback(
    (phase?: DeliveryState) => updateParams({ phase: phase ?? null }),
    [updateParams],
  );

  const setAgencyType = useCallback(
    (agencyType?: AgencyType) => updateParams({ agencyType: agencyType ?? null }),
    [updateParams],
  );

  const setSelectedEntryId = useCallback(
    (entryId?: string) => updateParams({ entry: entryId ?? null }),
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams();
      const entry = current.get("entry");
      if (entry) next.set("entry", entry);
      return next;
    });
  }, [setSearchParams]);

  return {
    filters,
    selectedEntryId,
    setSearch,
    setEntryType,
    setLifecyclePhase,
    setAgencyType,
    setSelectedEntryId,
    clearFilters,
  };
}
