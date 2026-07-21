import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { AgencyType } from "../../../constants/agencyType";
import type { ModuleRegistryCatalogStatus } from "../../../types/presentation";
import type { RegistryListFilters } from "../../../hooks/queries/registryListFilters";

function parseAgencyType(value: string | null): AgencyType | undefined {
  return value && value.length > 0 ? (value as AgencyType) : undefined;
}

function parseStatus(value: string | null): ModuleRegistryCatalogStatus | undefined {
  if (value === "stable" || value === "experimental" || value === "deprecated") {
    return value;
  }
  return undefined;
}

export function useRegistryScreenState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<RegistryListFilters>(
    () => ({
      search: searchParams.get("q") ?? "",
      agencyType: parseAgencyType(searchParams.get("agencyType")),
      status: parseStatus(searchParams.get("status")),
    }),
    [searchParams],
  );

  const selectedModuleId = searchParams.get("module") ?? undefined;

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

  const setStatus = useCallback(
    (status?: ModuleRegistryCatalogStatus) => updateParams({ status: status ?? null }),
    [updateParams],
  );

  const setSelectedModuleId = useCallback(
    (moduleId?: string) => updateParams({ module: moduleId ?? null }),
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams();
      const module = current.get("module");
      if (module) {
        next.set("module", module);
      }
      return next;
    });
  }, [setSearchParams]);

  return {
    filters,
    selectedModuleId,
    setSearch,
    setAgencyType,
    setStatus,
    setSelectedModuleId,
    clearFilters,
  };
}
