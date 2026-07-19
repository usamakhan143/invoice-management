/** ST-18 — Knowledge Library */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { KNOWLEDGE_SEARCH_MIN_CHARS } from "../../../application/knowledge/knowledgeSearch";
import { AOS_FEATURE_FLAG } from "../../../config/featureFlags";
import {
  AGENCY_TYPES,
  AGENCY_TYPE_LABELS,
  type AgencyType,
} from "../../../constants/agencyType";
import { useKnowledgeDetailQuery, useKnowledgeListQuery } from "../../../hooks/queries/useKnowledgeQueries";
import { FeatureFlagGate } from "../../gates";
import { PageHeader, PageShell } from "../../layouts";
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterChip,
  InAppAlert,
  KnowledgeCard,
  LinkButton,
  LoadingState,
  RegistryCard,
  SearchInput,
  Select,
  SidePanel,
  StatusChip,
  TableToolbar,
} from "../../ui";
import { useKnowledgeScreenState } from "./useKnowledgeScreenState";

function formatPromotionStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function formatLearningOrigin(origin: string): string {
  return origin.replace(/_/g, " ");
}

function KnowledgeDetailSidePanel({
  patternId,
  onClose,
}: {
  patternId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const detailQuery = useKnowledgeDetailQuery(patternId);
  const item = detailQuery.data;

  if (detailQuery.isLoading) {
    return (
      <SidePanel open title="Knowledge detail" onClose={onClose}>
        <LoadingState message="Loading knowledge pattern…" />
      </SidePanel>
    );
  }

  if (detailQuery.isError || !item) {
    return (
      <SidePanel open title="Knowledge detail" onClose={onClose}>
        <ErrorState
          title="Pattern not found"
          message={detailQuery.error?.message ?? "This knowledge pattern is not in the library."}
          onRetry={() => void detailQuery.refetch()}
        />
      </SidePanel>
    );
  }

  return (
    <SidePanel open title={item.title} onClose={onClose}>
      <div className="flex flex-col gap-[var(--space-stack-lg)]">
        <KnowledgeCard
          title={item.title}
          scope={item.primaryDomain}
          knowledgeType={item.knowledgeType}
          confidence={item.confidence}
          promotionStatus={item.promotionStatus}
          version={item.patternVersion}
        />
        <p className="text-[length:var(--font-size-body)] text-[var(--color-text-primary)]">{item.body}</p>
        <div className="flex flex-wrap gap-[var(--space-inline-sm)]">
          <StatusChip label={`Confidence: ${item.confidence.replace(/_/g, " ")}`} variant="approved" />
          <StatusChip label={formatPromotionStatus(item.promotionStatus)} variant="neutral" />
          <StatusChip label={`Origin: ${formatLearningOrigin(item.learningOrigin)}`} variant="neutral" />
          <StatusChip label={`v${item.patternVersion}`} variant="neutral" />
        </div>
        <section>
          <h3 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
            Source references
          </h3>
          <DataTable
            density="compact"
            columns={[
              { id: "label", header: "Source", cell: (row) => row.label },
              { id: "kind", header: "Kind", cell: (row) => row.kind.replace(/_/g, " ") },
              { id: "id", header: "ID", cell: (row) => row.id },
            ]}
            rows={item.sourceReferences}
            getRowKey={(row) => row.id}
          />
        </section>
        {item.relatedModules.length > 0 ? (
          <section>
            <h3 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
              Related modules
            </h3>
            <div className="grid gap-[var(--space-stack-sm)]">
              {item.relatedModules.map((module) => (
                <RegistryCard
                  key={module.moduleId}
                  moduleId={module.moduleId}
                  moduleName={module.moduleName}
                  status="stable"
                  version="—"
                  reuseCount={0}
                  onSelect={() => navigate(`/aos/registry/${module.moduleId}`)}
                />
              ))}
            </div>
          </section>
        ) : null}
        {item.relatedPrompts.length > 0 ? (
          <section>
            <h3 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
              Related prompts
            </h3>
            <ul className="list-disc space-y-[var(--space-stack-xs)] pl-[var(--space-inline-md)] text-[length:var(--font-size-body)]">
              {item.relatedPrompts.map((prompt) => (
                <li key={prompt.promptId}>
                  <span className="font-mono text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                    {prompt.promptId}
                  </span>
                  {" — "}
                  {prompt.title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {item.relatedPatterns.length > 0 ? (
          <section>
            <h3 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
              Related patterns
            </h3>
            <div className="grid gap-[var(--space-stack-sm)]">
              {item.relatedPatterns.map((pattern) => (
                <KnowledgeCard key={pattern.patternId} title={pattern.title} scope={pattern.patternId} />
              ))}
            </div>
          </section>
        ) : null}
        {item.aiSuggestedPatterns.length > 0 ? (
          <section>
            <h3 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
              AI suggested related patterns
            </h3>
            <InAppAlert
              variant="info"
              title="AI suggested"
              message="Related pattern suggestions are approximate — verify before reuse."
            />
            <div className="mt-[var(--space-stack-sm)] grid gap-[var(--space-stack-sm)]">
              {item.aiSuggestedPatterns.map((pattern) => (
                <KnowledgeCard
                  key={pattern.patternId}
                  title={pattern.title}
                  scope={pattern.patternId}
                />
              ))}
            </div>
          </section>
        ) : null}
        <LinkButton
          onClick={() => {
            void navigator.clipboard.writeText(item.patternId);
          }}
        >
          Copy pattern ID
        </LinkButton>
      </div>
    </SidePanel>
  );
}

const KnowledgeScreen: React.FC = () => {
  const {
    filters,
    selectedPatternId,
    setSearch,
    setAgencyType,
    setSelectedPatternId,
    clearFilters,
  } = useKnowledgeScreenState();

  const listQuery = useKnowledgeListQuery(filters);
  const items = listQuery.data?.items ?? [];

  const searchTooShort =
    filters.search.trim().length > 0 && filters.search.trim().length < KNOWLEDGE_SEARCH_MIN_CHARS;

  const activeFilterChips = useMemo(() => {
    if (!filters.agencyType) {
      return [];
    }
    return [
      {
        key: "agencyType",
        label: "Agency type",
        value: AGENCY_TYPE_LABELS[filters.agencyType],
        onRemove: () => setAgencyType(undefined),
      },
    ];
  }, [filters.agencyType, setAgencyType]);

  const emptyTitle = searchTooShort
    ? "Type at least 2 characters"
    : filters.search.trim()
      ? `No knowledge match “${filters.search.trim()}”`
      : "No knowledge patterns yet";

  const emptyDescription = searchTooShort
    ? "Knowledge search requires at least two characters."
    : filters.search.trim() || filters.agencyType
      ? "Try clearing filters or adjusting your search."
      : "Complete retrospectives to populate the library.";

  return (
    <FeatureFlagGate
      flag={AOS_FEATURE_FLAG.KNOWLEDGE}
      fallback={
        <InAppAlert
          variant="info"
          title="Knowledge disabled"
          message="Knowledge library is not enabled for this workspace."
        />
      }
    >
      <PageShell>
        <PageHeader
          title="Knowledge Library"
          description="Agency delivery wisdom — patterns promoted from retrospectives and evaluations."
        />
        <TableToolbar
          left={
            <SearchInput
              value={filters.search}
              onChange={setSearch}
              placeholder="Search patterns by title, body, or tags"
              aria-label="Search knowledge patterns"
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
        {listQuery.isLoading ? <LoadingState message="Loading knowledge library…" /> : null}
        {listQuery.isError ? (
          <ErrorState
            title="Unable to load knowledge library"
            message={listQuery.error?.message ?? "Something went wrong."}
            onRetry={() => void listQuery.refetch()}
          />
        ) : null}
        {!listQuery.isLoading && !listQuery.isError && items.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={
              filters.search.trim() || filters.agencyType ? (
                <LinkButton onClick={clearFilters}>Clear filters</LinkButton>
              ) : undefined
            }
          />
        ) : null}
        {!listQuery.isLoading && !listQuery.isError && items.length > 0 ? (
          <div className="grid grid-cols-1 gap-[var(--space-stack-md)] lg:grid-cols-2">
            {items.map((item) => (
              <KnowledgeCard
                key={item.patternId}
                title={item.title}
                scope={item.primaryDomain}
                knowledgeType={item.knowledgeType}
                confidence={item.confidence}
                promotionStatus={item.promotionStatus}
                version={item.patternVersion}
                onSelect={() => setSelectedPatternId(item.patternId)}
              />
            ))}
          </div>
        ) : null}
        {selectedPatternId ? (
          <KnowledgeDetailSidePanel
            patternId={selectedPatternId}
            onClose={() => setSelectedPatternId(undefined)}
          />
        ) : null}
      </PageShell>
    </FeatureFlagGate>
  );
};

export default KnowledgeScreen;
