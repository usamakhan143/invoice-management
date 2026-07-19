/** ST-16 — Module Registry */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { REGISTRY_SEARCH_MIN_CHARS } from "../../../application/registry/registrySearch";
import { AOS_FEATURE_FLAG } from "../../../config/featureFlags";
import {
  AGENCY_TYPES,
  AGENCY_TYPE_LABELS,
  type AgencyType,
} from "../../../constants/agencyType";
import type { ModuleRegistryCatalogStatus } from "../../../application/registry/dto/ModuleRegistryDto";
import { useRegistryListQuery, useRegistryModuleQuery } from "../../../hooks/queries/useRegistryQueries";
import { FeatureFlagGate } from "../../gates";
import { PageHeader, PageShell } from "../../layouts";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  FilterChip,
  InAppAlert,
  LinkButton,
  LoadingState,
  RegistryCard,
  SearchInput,
  Select,
  SidePanel,
  StatusChip,
  TableToolbar,
} from "../../ui";
import { useRegistryScreenState } from "./useRegistryScreenState";

const STATUS_OPTIONS: readonly ModuleRegistryCatalogStatus[] = [
  "stable",
  "experimental",
  "deprecated",
];

function RegistryModuleSidePanel({
  moduleId,
  onClose,
}: {
  moduleId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const detailQuery = useRegistryModuleQuery(moduleId);
  const module = detailQuery.data;

  if (detailQuery.isLoading) {
    return (
      <SidePanel open title="Module detail" onClose={onClose}>
        <LoadingState message="Loading module…" />
      </SidePanel>
    );
  }

  if (detailQuery.isError || !module) {
    return (
      <SidePanel open title="Module detail" onClose={onClose}>
        <ErrorState
          title="Module not found"
          message={detailQuery.error?.message ?? "This module is not in the registry catalog."}
          onRetry={() => void detailQuery.refetch()}
        />
      </SidePanel>
    );
  }

  return (
    <SidePanel open title={module.moduleName} onClose={onClose}>
      <div className="flex flex-col gap-[var(--space-stack-md)]">
        <RegistryCard
          moduleId={module.moduleId}
          moduleName={module.moduleName}
          status={module.status}
          version={module.version}
          reuseCount={module.reuseCount}
        />
        <p className="text-[length:var(--font-size-body)] text-[var(--color-text-primary)]">{module.description}</p>
        <div className="flex flex-wrap gap-[var(--space-inline-sm)]">
          {module.tags.map((tag) => (
            <StatusChip key={tag} label={tag} variant="neutral" />
          ))}
        </div>
        <p className="font-mono text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
          {module.locationReference}
        </p>
        <div className="flex flex-wrap gap-[var(--space-inline-md)]">
          <LinkButton
            onClick={() => {
              void navigator.clipboard.writeText(module.moduleId);
            }}
          >
            Copy module ID
          </LinkButton>
          <LinkButton onClick={() => navigate(`/aos/registry/${module.moduleId}`)}>
            View full detail
          </LinkButton>
        </div>
      </div>
    </SidePanel>
  );
}

const RegistryScreen: React.FC = () => {
  const {
    filters,
    selectedModuleId,
    setSearch,
    setAgencyType,
    setStatus,
    setSelectedModuleId,
    clearFilters,
  } = useRegistryScreenState();

  const listQuery = useRegistryListQuery(filters);
  const modules = listQuery.data?.items ?? [];

  const searchTooShort =
    filters.search.trim().length > 0 && filters.search.trim().length < REGISTRY_SEARCH_MIN_CHARS;

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];
    if (filters.agencyType) {
      chips.push({
        key: "agencyType",
        label: "Agency type",
        value: AGENCY_TYPE_LABELS[filters.agencyType],
        onRemove: () => setAgencyType(undefined),
      });
    }
    if (filters.status) {
      chips.push({
        key: "status",
        label: "Status",
        value: filters.status,
        onRemove: () => setStatus(undefined),
      });
    }
    return chips;
  }, [filters.agencyType, filters.status, setAgencyType, setStatus]);

  const emptyTitle = searchTooShort
    ? "Type at least 2 characters"
    : filters.search.trim()
      ? `No modules match “${filters.search.trim()}”`
      : "No modules registered";

  const emptyDescription = searchTooShort
    ? "Registry search requires at least two characters."
    : filters.search.trim() || filters.agencyType || filters.status
      ? "Try clearing filters or adjusting your search."
      : "Modules appear here after retrospective promotion or bootstrap import.";

  return (
    <FeatureFlagGate
      flag={AOS_FEATURE_FLAG.REGISTRY}
      fallback={
        <InAppAlert
          variant="info"
          title="Registry disabled"
          message="Module registry is not enabled for this workspace."
        />
      }
    >
      <PageShell>
        <PageHeader
          title="Module Registry"
          description="Agency-wide reusable module catalog for reuse-first delivery."
        />
        <TableToolbar
          left={
            <SearchInput
              value={filters.search}
              onChange={setSearch}
              placeholder="Search modules by name, ID, or tags"
              aria-label="Search modules"
            />
          }
        />
        <FilterBar onClearAll={activeFilterChips.length > 0 ? clearFilters : undefined}>
          <Select
            className="w-44"
            aria-label="Filter by agency type"
            value={filters.agencyType ?? ""}
            onChange={(event) =>
              setAgencyType(event.target.value ? (event.target.value as AgencyType) : undefined)
            }
            options={[
              { value: "", label: "All agency types" },
              ...AGENCY_TYPES.map((type) => ({
                value: type,
                label: AGENCY_TYPE_LABELS[type],
              })),
            ]}
          />
          <Select
            className="w-40"
            aria-label="Filter by status"
            value={filters.status ?? ""}
            onChange={(event) =>
              setStatus(
                event.target.value
                  ? (event.target.value as ModuleRegistryCatalogStatus)
                  : undefined,
              )
            }
            options={[
              { value: "", label: "All statuses" },
              ...STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
            ]}
          />
        </FilterBar>
        {activeFilterChips.length > 0 ? (
          <div className="flex flex-wrap gap-[var(--space-inline-sm)]">
            {activeFilterChips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                value={chip.value}
                onRemove={chip.onRemove}
              />
            ))}
          </div>
        ) : null}
        {listQuery.isLoading ? <LoadingState message="Loading module registry…" /> : null}
        {listQuery.isError ? (
          <ErrorState
            title="Unable to load registry"
            message={listQuery.error?.message ?? "Something went wrong."}
            onRetry={() => void listQuery.refetch()}
          />
        ) : null}
        {!listQuery.isLoading && !listQuery.isError && modules.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              filters.search.trim() || filters.agencyType || filters.status ? (
                <LinkButton onClick={clearFilters}>Clear filters</LinkButton>
              ) : undefined
            }
          />
        ) : null}
        {!listQuery.isLoading && !listQuery.isError && modules.length > 0 ? (
          <div className="grid grid-cols-1 gap-[var(--space-stack-md)] lg:grid-cols-2">
            {modules.map((module) => (
              <RegistryCard
                key={module.moduleId}
                moduleId={module.moduleId}
                moduleName={module.moduleName}
                status={module.status}
                version={module.version}
                reuseCount={module.reuseCount}
                onSelect={() => setSelectedModuleId(module.moduleId)}
              />
            ))}
          </div>
        ) : null}
        {selectedModuleId ? (
          <RegistryModuleSidePanel
            moduleId={selectedModuleId}
            onClose={() => setSelectedModuleId(undefined)}
          />
        ) : null}
      </PageShell>
    </FeatureFlagGate>
  );
};

export default RegistryScreen;
