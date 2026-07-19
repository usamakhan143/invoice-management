import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { AgencyType } from "../../../constants/agencyType";
import type { KnowledgeListFilters } from "../../../hooks/queries/knowledgeListFilters";

function parseAgencyType(value: string | null): AgencyType | undefined {
  return value && value.length > 0 ? (value as AgencyType) : undefined;
}

export function useKnowledgeScreenState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<KnowledgeListFilters>(
    () => ({
      search: searchParams.get("q") ?? "",
      agencyType: parseAgencyType(searchParams.get("agencyType")),
    }),
    [searchParams],
  );

  const selectedPatternId = searchParams.get("pattern") ?? undefined;

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

  const setAgencyType = useCallback(
    (agencyType?: AgencyType) => updateParams({ agencyType: agencyType ?? null }),
    [updateParams],
  );

  const setSelectedPatternId = useCallback(
    (patternId?: string) => updateParams({ pattern: patternId ?? null }),
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams();
      const pattern = current.get("pattern");
      if (pattern) {
        next.set("pattern", pattern);
      }
      return next;
    });
  }, [setSearchParams]);

  return {
    filters,
    selectedPatternId,
    setSearch,
    setAgencyType,
    setSelectedPatternId,
    clearFilters,
  };
}
