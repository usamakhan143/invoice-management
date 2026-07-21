/** ST-19 — Delivery Playbook */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PLAYBOOK_SEARCH_MIN_CHARS } from "../../../constants/searchLimits";
import { PLAYBOOK_ENTRY_TYPE_LABELS, type PlaybookEntryType } from "../../../types/presentation";
import { AOS_FEATURE_FLAG } from "../../../config/featureFlags";
import {
  AGENCY_TYPES,
  AGENCY_TYPE_LABELS,
  type AgencyType,
} from "../../../constants/agencyType";
import { DELIVERY_STATE, DELIVERY_STATE_LABELS } from "../../../constants/deliveryState";
import { usePlaybookEntryQuery, usePlaybookListQuery } from "../../../hooks/queries/usePlaybookQueries";
import { FeatureFlagGate } from "../../gates";
import { PageHeader, PageShell } from "../../layouts";
import {
  Card,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterChip,
  InAppAlert,
  KnowledgeCard,
  LinkButton,
  LoadingState,
  SearchInput,
  Select,
  SidePanel,
  StatusChip,
  TableToolbar,
} from "../../ui";
import { usePlaybookScreenState } from "./usePlaybookScreenState";

const ENTRY_TYPES = Object.keys(PLAYBOOK_ENTRY_TYPE_LABELS) as PlaybookEntryType[];

function PlaybookEntrySidePanel({
  entryId,
  onClose,
}: {
  entryId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const detailQuery = usePlaybookEntryQuery(entryId);
  const entry = detailQuery.data;

  if (detailQuery.isLoading) {
    return (
      <SidePanel open title="Playbook entry" onClose={onClose}>
        <LoadingState message="Loading playbook entry…" />
      </SidePanel>
    );
  }

  if (detailQuery.isError || !entry) {
    return (
      <SidePanel open title="Playbook entry" onClose={onClose}>
        <ErrorState
          title="Entry not found"
          message={detailQuery.error?.message ?? "This playbook entry is not available."}
          onRetry={() => void detailQuery.refetch()}
        />
      </SidePanel>
    );
  }

  return (
    <SidePanel open title={entry.title} onClose={onClose}>
      <div className="flex flex-col gap-[var(--space-stack-lg)]">
        <div className="flex flex-wrap gap-[var(--space-inline-sm)]">
          <StatusChip label={PLAYBOOK_ENTRY_TYPE_LABELS[entry.entryType]} />
          <StatusChip label={`v${entry.version}`} variant="neutral" />
          {entry.lifecyclePhase ? (
            <StatusChip label={DELIVERY_STATE_LABELS[entry.lifecyclePhase]} variant="neutral" />
          ) : null}
        </div>
        <p className="text-[length:var(--font-size-body)] text-[var(--color-text-primary)]">{entry.body}</p>
        {entry.checklist.length > 0 ? (
          <section>
            <h3 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)]">
              Checklist (read-only)
            </h3>
            <ul className="list-disc space-y-[var(--space-stack-xs)] pl-[var(--space-inline-md)] text-[length:var(--font-size-body)]">
              {entry.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {entry.knowledgeReferences.length > 0 ? (
          <section>
            <h3 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)]">
              Knowledge References
            </h3>
            <div className="grid gap-[var(--space-stack-sm)]">
              {entry.knowledgeReferences.map((ref) => (
                <KnowledgeCard
                  key={ref.patternId}
                  title={ref.title}
                  scope={ref.patternId}
                  onSelect={() => navigate(`/aos/knowledge?pattern=${ref.patternId}`)}
                />
              ))}
            </div>
          </section>
        ) : null}
        {entry.relatedTemplates.length > 0 ? (
          <section>
            <h3 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)]">
              Related Templates
            </h3>
            <ul className="flex flex-col gap-[var(--space-stack-xs)]">
              {entry.relatedTemplates.map((related) => (
                <li key={related.entryId}>
                  <LinkButton onClick={() => navigate(`/aos/playbook?entry=${related.entryId}`)}>
                    {related.title}
                  </LinkButton>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SidePanel>
  );
}

const PlaybookScreen: React.FC = () => {
  const {
    filters,
    selectedEntryId,
    setSearch,
    setEntryType,
    setLifecyclePhase,
    setAgencyType,
    setSelectedEntryId,
    clearFilters,
  } = usePlaybookScreenState();

  const listQuery = usePlaybookListQuery(filters);
  const entries = listQuery.data?.items ?? [];

  const searchTooShort =
    filters.search.trim().length > 0 && filters.search.trim().length < PLAYBOOK_SEARCH_MIN_CHARS;

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string; onRemove: () => void }> = [];
    if (filters.entryType) {
      chips.push({
        key: "type",
        label: "Type",
        value: PLAYBOOK_ENTRY_TYPE_LABELS[filters.entryType],
        onRemove: () => setEntryType(undefined),
      });
    }
    if (filters.lifecyclePhase) {
      chips.push({
        key: "phase",
        label: "Phase",
        value: DELIVERY_STATE_LABELS[filters.lifecyclePhase],
        onRemove: () => setLifecyclePhase(undefined),
      });
    }
    if (filters.agencyType) {
      chips.push({
        key: "agencyType",
        label: "Agency type",
        value: AGENCY_TYPE_LABELS[filters.agencyType],
        onRemove: () => setAgencyType(undefined),
      });
    }
    return chips;
  }, [filters, setAgencyType, setEntryType, setLifecyclePhase]);

  return (
    <FeatureFlagGate
      flag={AOS_FEATURE_FLAG.PLAYBOOK}
      fallback={
        <InAppAlert variant="info" title="Playbook disabled" message="Delivery playbook is not enabled." />
      }
    >
      <PageShell>
        <PageHeader
          title="Delivery Playbook"
          subtitle="Human-readable methodology aligned to lifecycle — reference only, not executable workflow."
        />
        <TableToolbar
          left={
            <SearchInput
              value={filters.search}
              onChange={setSearch}
              placeholder="Search playbooks, templates, rubrics, and standards"
              aria-label="Search playbook"
            />
          }
        />
        <FilterBar onClearAll={activeFilterChips.length > 0 ? clearFilters : undefined}>
          <Select
            className="w-48"
            aria-label="Filter by entry type"
            value={filters.entryType ?? ""}
            onChange={(event) =>
              setEntryType(event.target.value ? (event.target.value as PlaybookEntryType) : undefined)
            }
            options={[
              { value: "", label: "All types" },
              ...ENTRY_TYPES.map((type) => ({
                value: type,
                label: PLAYBOOK_ENTRY_TYPE_LABELS[type],
              })),
            ]}
          />
          <Select
            className="w-40"
            aria-label="Filter by lifecycle phase"
            value={filters.lifecyclePhase ?? ""}
            onChange={(event) =>
              setLifecyclePhase(
                event.target.value ? (event.target.value as typeof DELIVERY_STATE.INTAKE) : undefined,
              )
            }
            options={[
              { value: "", label: "All phases" },
              ...Object.values(DELIVERY_STATE).map((phase) => ({
                value: phase,
                label: DELIVERY_STATE_LABELS[phase],
              })),
            ]}
          />
          <Select
            className="w-44"
            aria-label="Filter by agency type"
            value={filters.agencyType ?? ""}
            onChange={(event) =>
              setAgencyType(event.target.value ? (event.target.value as AgencyType) : undefined)
            }
            options={[
              { value: "", label: "All agency types" },
              ...AGENCY_TYPES.map((type) => ({ value: type, label: AGENCY_TYPE_LABELS[type] })),
            ]}
          />
        </FilterBar>
        {activeFilterChips.length > 0 ? (
          <div className="mb-[var(--space-stack-md)] flex flex-wrap gap-[var(--space-inline-sm)]">
            {activeFilterChips.map((chip) => (
              <FilterChip key={chip.key} label={chip.label} value={chip.value} onRemove={chip.onRemove} />
            ))}
          </div>
        ) : null}
        {listQuery.isLoading ? <LoadingState message="Loading playbook…" /> : null}
        {listQuery.isError ? (
          <ErrorState
            title="Unable to load playbook"
            message={listQuery.error?.message}
            onRetry={() => void listQuery.refetch()}
          />
        ) : null}
        {!listQuery.isLoading && !listQuery.isError && entries.length === 0 ? (
          <EmptyState
            title={searchTooShort ? "Type at least 2 characters" : "No playbook entries match"}
            description={
              searchTooShort
                ? "Playbook search requires at least two characters."
                : "Try clearing filters or adjusting your search."
            }
            action={
              filters.search || filters.entryType || filters.lifecyclePhase || filters.agencyType ? (
                <LinkButton onClick={clearFilters}>Clear filters</LinkButton>
              ) : undefined
            }
          />
        ) : null}
        {!listQuery.isLoading && !listQuery.isError && entries.length > 0 ? (
          <div className="grid grid-cols-1 gap-[var(--space-stack-md)] lg:grid-cols-2">
            {entries.map((entry) => (
              <Card key={entry.entryId} interactive onClick={() => setSelectedEntryId(entry.entryId)}>
                <Card.Header
                  title={entry.title}
                  meta={<StatusChip label={PLAYBOOK_ENTRY_TYPE_LABELS[entry.entryType]} />}
                />
                <Card.Body>
                  <p className="text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
                    {entry.summary}
                  </p>
                  <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                    v{entry.version}
                    {entry.lifecyclePhase
                      ? ` · ${DELIVERY_STATE_LABELS[entry.lifecyclePhase]}`
                      : ""}
                  </p>
                </Card.Body>
              </Card>
            ))}
          </div>
        ) : null}
        {selectedEntryId ? (
          <PlaybookEntrySidePanel
            entryId={selectedEntryId}
            onClose={() => setSelectedEntryId(undefined)}
          />
        ) : null}
      </PageShell>
    </FeatureFlagGate>
  );
};

export default PlaybookScreen;
