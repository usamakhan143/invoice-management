/** ST-02 — Delivery List screen composer. */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "../../../../hooks/usePermissions";
import { AOS_PERMISSION_KEY } from "../../../constants/permissionKeys";
import { AOS_FEATURE_FLAG } from "../../../config/featureFlags";
import {
  DELIVERY_STATE,
  DELIVERY_STATE_LABELS,
  type DeliveryState,
} from "../../../constants/deliveryState";
import type { DeliveryEngagementDto } from "../../../application/delivery/dto/DeliveryEngagementDto";
import { useDeliveryListQuery } from "../../../hooks/queries/useDeliveryListQuery";
import { FeatureFlagGate, PermissionGate } from "../../gates";
import { PageHeader, PageShell } from "../../layouts";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterChip,
  IconChevronRight,
  InAppAlert,
  LinkButton,
  Pagination,
  SearchInput,
  Select,
  TableToolbar,
} from "../../ui";
import { useDeliveryListScreenState } from "./useDeliveryListScreenState";

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusLabel({ status }: { status: DeliveryState }) {
  return (
    <span className="inline-flex items-center rounded-[var(--radius-full)] bg-[var(--color-lifecycle-neutral-bg)] px-[var(--space-inline-md)] py-0.5 text-[length:var(--font-size-caption)] font-[var(--font-weight-medium)] text-[var(--color-lifecycle-neutral-text)]">
      {DELIVERY_STATE_LABELS[status]}
    </span>
  );
}

function SortableHeader({
  label,
  field,
  activeField,
  direction,
  onToggle,
}: {
  label: string;
  field: "title" | "status" | "updatedAt";
  activeField: "title" | "status" | "updatedAt";
  direction: "asc" | "desc";
  onToggle: (field: "title" | "status" | "updatedAt") => void;
}) {
  const isActive = activeField === field;
  const sortHint = isActive ? (direction === "asc" ? "ascending" : "descending") : "none";

  return (
    <button
      type="button"
      onClick={() => onToggle(field)}
      aria-sort={sortHint}
      className="inline-flex items-center gap-[var(--space-inline-sm)] text-left font-[var(--font-weight-medium)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
    >
      {label}
      {isActive ? <span aria-hidden="true">{direction === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
}

function applyClientFilters(
  items: DeliveryEngagementDto[],
  search: string,
  leadUserId?: string,
  customerId?: string,
): DeliveryEngagementDto[] {
  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((item) => {
    if (leadUserId && item.deliveryLeadUserId !== leadUserId) {
      return false;
    }
    if (customerId && item.erpCustomerId !== customerId) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }

    return (
      item.title.toLowerCase().includes(normalizedSearch) ||
      item.erpCustomerId.toLowerCase().includes(normalizedSearch)
    );
  });
}

function sortRows(
  items: DeliveryEngagementDto[],
  sortField: "title" | "status" | "updatedAt",
  sortDirection: "asc" | "desc",
): DeliveryEngagementDto[] {
  const sorted = [...items].sort((left, right) => {
    if (sortField === "updatedAt") {
      return left.updatedAt - right.updatedAt;
    }
    if (sortField === "status") {
      return left.status.localeCompare(right.status);
    }
    return left.title.localeCompare(right.title);
  });

  return sortDirection === "asc" ? sorted : sorted.reverse();
}

const DeliveryListScreen: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission(AOS_PERMISSION_KEY.ENGAGEMENTS_MANAGE);
  const {
    filters,
    setSearch,
    setStatus,
    setLeadUserId,
    setCustomerId,
    toggleSort,
    setCursor,
    clearFilters,
  } = useDeliveryListScreenState();
  const [searchDraft, setSearchDraft] = useState(filters.search);

  const query = useDeliveryListQuery(filters);

  const rows = useMemo(() => {
    const filtered = applyClientFilters(
      query.data?.items ?? [],
      filters.search,
      filters.leadUserId,
      filters.customerId,
    );
    return sortRows(filtered, filters.sortField, filters.sortDirection);
  }, [filters, query.data?.items]);

  const leadOptions = useMemo(() => {
    const ids = new Set<string>();
    (query.data?.items ?? []).forEach((item) => ids.add(item.deliveryLeadUserId));
    return Array.from(ids).map((id) => ({ value: id, label: id }));
  }, [query.data?.items]);

  const customerOptions = useMemo(() => {
    const ids = new Set<string>();
    (query.data?.items ?? []).forEach((item) => ids.add(item.erpCustomerId));
    return Array.from(ids).map((id) => ({ value: id, label: id }));
  }, [query.data?.items]);

  const statusOptions = Object.values(DELIVERY_STATE).map((status) => ({
    value: status,
    label: DELIVERY_STATE_LABELS[status],
  }));

  const activeFilterChips = [
    filters.status
      ? {
          key: "status",
          label: "Status",
          value: DELIVERY_STATE_LABELS[filters.status],
          onRemove: () => setStatus(undefined),
        }
      : null,
    filters.leadUserId
      ? {
          key: "lead",
          label: "Lead",
          value: filters.leadUserId,
          onRemove: () => setLeadUserId(undefined),
        }
      : null,
    filters.customerId
      ? {
          key: "customer",
          label: "Customer",
          value: filters.customerId,
          onRemove: () => setCustomerId(undefined),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
    onRemove: () => void;
  }>;

  const columns = useMemo(
    () => [
      {
        id: "title",
        header: (
          <SortableHeader
            label="Engagement"
            field="title"
            activeField={filters.sortField}
            direction={filters.sortDirection}
            onToggle={toggleSort}
          />
        ),
        cell: (row: DeliveryEngagementDto) => (
          <div className="min-w-0">
            <p className="truncate font-[var(--font-weight-medium)]">{row.title}</p>
            <p className="truncate text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
              {row.erpCustomerId}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: (
          <SortableHeader
            label="State"
            field="status"
            activeField={filters.sortField}
            direction={filters.sortDirection}
            onToggle={toggleSort}
          />
        ),
        cell: (row: DeliveryEngagementDto) => <StatusLabel status={row.status} />,
      },
      {
        id: "lead",
        header: "Delivery lead",
        cell: (row: DeliveryEngagementDto) => row.deliveryLeadUserId,
      },
      {
        id: "updatedAt",
        header: (
          <SortableHeader
            label="Updated"
            field="updatedAt"
            activeField={filters.sortField}
            direction={filters.sortDirection}
            onToggle={toggleSort}
          />
        ),
        cell: (row: DeliveryEngagementDto) => formatUpdatedAt(row.updatedAt),
      },
    ],
    [filters.sortDirection, filters.sortField, toggleSort],
  );

  const handleRowOpen = (row: DeliveryEngagementDto) => {
    navigate(`/aos/delivery/${row.id}`);
  };

  const handleSearchSubmit = () => {
    setSearch(searchDraft);
  };

  return (
    <FeatureFlagGate
      flag={AOS_FEATURE_FLAG.DELIVERY}
      fallback={
        <PageShell>
          <InAppAlert variant="warning" title="Delivery module disabled">
            The Delivery feature flag is off for this workspace.
          </InAppAlert>
        </PageShell>
      }
    >
      <PageShell>
        <PageHeader
          title="Delivery engagements"
          subtitle="Browse and open delivery engagements for your company."
          actions={
            <PermissionGate permissions={AOS_PERMISSION_KEY.ENGAGEMENTS_MANAGE}>
              <Button onClick={() => navigate("/aos/delivery/new")}>Create engagement</Button>
            </PermissionGate>
          }
        />

        <TableToolbar
          left={
            <SearchInput
              value={searchDraft}
              onChange={setSearchDraft}
              placeholder="Search engagements…"
              aria-label="Search engagements"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearchSubmit();
                }
              }}
              onClear={() => {
                setSearchDraft("");
                setSearch("");
              }}
            />
          }
          right={
            canCreate ? null : (
              <span className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                Create requires manage permission
              </span>
            )
          }
        />

        <FilterBar onClearAll={activeFilterChips.length > 0 ? clearFilters : undefined}>
          <Select
            aria-label="Filter by lifecycle state"
            value={filters.status ?? ""}
            onChange={(event) =>
              setStatus(event.target.value ? (event.target.value as DeliveryState) : undefined)
            }
            options={statusOptions}
            placeholder="All states"
          />
          <Select
            aria-label="Filter by delivery lead"
            value={filters.leadUserId ?? ""}
            onChange={(event) => setLeadUserId(event.target.value || undefined)}
            options={leadOptions}
            placeholder="All leads"
          />
          <Select
            aria-label="Filter by customer"
            value={filters.customerId ?? ""}
            onChange={(event) => setCustomerId(event.target.value || undefined)}
            options={customerOptions}
            placeholder="All customers"
          />
          <Button variant="secondary" size="sm" onClick={handleSearchSubmit}>
            Apply search
          </Button>
        </FilterBar>

        {activeFilterChips.length > 0 ? (
          <div className="mb-[var(--space-stack-md)] flex flex-wrap gap-[var(--space-inline-sm)]">
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

        {query.isError ? (
          <ErrorState
            title="Could not load engagements"
            message={query.error?.message}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                rows={rows}
                loading={query.isLoading}
                onRowClick={handleRowOpen}
                getRowKey={(row) => row.id}
                aria-label="Delivery engagements"
                emptyState={
                  <EmptyState
                    title="No engagements yet"
                    description="Create your first delivery engagement to start intake."
                    action={
                      canCreate ? (
                        <Button onClick={() => navigate("/aos/delivery/new")}>
                          Create engagement
                        </Button>
                      ) : undefined
                    }
                  />
                }
              />
            </div>

            <div className="flex flex-col gap-[var(--space-stack-sm)] md:hidden">
              {query.isLoading ? (
                <DataTable
                  columns={[{ id: "title", header: "Engagement", cell: () => null }]}
                  rows={[]}
                  loading
                  aria-label="Loading engagements"
                />
              ) : rows.length === 0 ? (
                <EmptyState
                  title="No engagements yet"
                  description="Create your first delivery engagement to start intake."
                  action={
                    canCreate ? (
                      <Button onClick={() => navigate("/aos/delivery/new")}>Create engagement</Button>
                    ) : undefined
                  }
                />
              ) : (
                rows.map((row) => (
                  <Card key={row.id}>
                    <Card.Body>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-[var(--space-inline-md)] text-left"
                        onClick={() => handleRowOpen(row)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-[var(--font-weight-medium)]">{row.title}</p>
                          <p className="truncate text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                            {row.erpCustomerId}
                          </p>
                          <div className="mt-[var(--space-stack-sm)]">
                            <StatusLabel status={row.status} />
                          </div>
                        </div>
                        <IconChevronRight className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] shrink-0 text-[var(--color-text-secondary)]" />
                      </button>
                      <div className="mt-[var(--space-stack-sm)]">
                        <LinkButton
                          icon="external"
                          onClick={() => navigate(`/customers/${row.erpCustomerId}`)}
                        >
                          View customer in ERP
                        </LinkButton>
                      </div>
                    </Card.Body>
                  </Card>
                ))
              )}
            </div>

            <Pagination
              showingCount={rows.length}
              hasMore={Boolean(query.data?.nextCursor)}
              loading={query.isFetching}
              onLoadMore={() => setCursor(query.data?.nextCursor)}
            />
          </>
        )}
      </PageShell>
    </FeatureFlagGate>
  );
};

export default DeliveryListScreen;
