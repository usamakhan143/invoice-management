/** ST-16 — Learning Review Queue */
import React from "react";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { LEARNING_CANDIDATE_TYPES } from "../../../../constants/learningReview";
import { useLearningReviewQueueQuery } from "../../../../hooks/queries/useLearningReviewQueries";
import {
  DataTable,
  FilterBar,
  FilterChip,
  Select,
  StatusChip,
} from "../../../ui";
import { QueueScreenTemplate } from "../QueueScreenTemplate";
import { LearningCandidateDetailSidePanel } from "./LearningCandidateDetailSidePanel";
import {
  formatCandidateStatus,
  formatCandidateType,
  formatTargetKind,
  statusChipVariant,
} from "./learningReviewLabels";
import { useLearningReviewScreenState } from "./useLearningReviewScreenState";

const STATUS_OPTIONS = [
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "gate_deferred", label: "Deferred" },
  { value: "promotion_failed", label: "Promotion failed" },
  { value: "promoted", label: "Promoted" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All statuses" },
] as const;

const LearningReviewQueueScreen: React.FC = () => {
  const { filters, setSearch, setStatus, setCandidateType, setSelectedCandidate } =
    useLearningReviewScreenState();
  const query = useLearningReviewQueueQuery(filters);
  const rows = query.data?.items ?? [];

  return (
    <>
      <QueueScreenTemplate
        title="Learning Review"
        description="Human governance for organizational learning extracted from closed engagements."
        featureFlag={AOS_FEATURE_FLAG.LEARNING_ENGINE}
        search={filters.search}
        onSearchChange={setSearch}
        searchPlaceholder="Search candidates, engagements, or lessons"
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        isEmpty={rows.length === 0}
        emptyTitle="No learning candidates match your filters"
        emptyDescription="Candidates appear after retrospective approval and learning extraction."
        toolbarExtra={
          <FilterBar
            onClearAll={
              filters.status !== "pending_review" || filters.candidateType !== "all"
                ? () => {
                    setStatus("pending_review");
                    setCandidateType("all");
                  }
                : undefined
            }
          >
            <Select
              className="w-44"
              aria-label="Filter by status"
              value={filters.status}
              onChange={(event) => setStatus(event.target.value as typeof filters.status)}
              options={STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
            <Select
              className="w-44"
              aria-label="Filter by candidate type"
              value={filters.candidateType}
              onChange={(event) => setCandidateType(event.target.value as typeof filters.candidateType)}
              options={[
                { value: "all", label: "All types" },
                ...LEARNING_CANDIDATE_TYPES.map((type) => ({
                  value: type,
                  label: formatCandidateType(type),
                })),
              ]}
            />
            {filters.status !== "pending_review" ? (
              <FilterChip label={`Status: ${formatCandidateStatus(filters.status)}`} />
            ) : null}
            {filters.candidateType !== "all" ? (
              <FilterChip label={`Type: ${formatCandidateType(filters.candidateType)}`} />
            ) : null}
          </FilterBar>
        }
      >
        <DataTable
          density="compact"
          columns={[
            { id: "title", header: "Proposed learning", cell: (row) => row.title },
            { id: "engagement", header: "Engagement", cell: (row) => row.engagementTitle },
            { id: "client", header: "Client", cell: (row) => row.clientLabel },
            {
              id: "type",
              header: "Type",
              cell: (row) => formatCandidateType(row.candidateType),
            },
            {
              id: "target",
              header: "Target",
              cell: (row) => formatTargetKind(row.promotionTarget.targetKind),
            },
            {
              id: "status",
              header: "Status",
              cell: (row) => (
                <StatusChip
                  label={formatCandidateStatus(row.status)}
                  variant={statusChipVariant(row.status)}
                />
              ),
            },
            {
              id: "confidence",
              header: "Eligible",
              cell: (row) => (row.confidence.promotionEligible ? "Yes" : "No"),
            },
          ]}
          rows={rows}
          getRowKey={(row) => row.candidateId}
          onRowClick={(row) => setSelectedCandidate(row.candidateId)}
        />
      </QueueScreenTemplate>

      {filters.candidateId ? (
        <LearningCandidateDetailSidePanel
          candidateId={filters.candidateId}
          onClose={() => setSelectedCandidate(undefined)}
        />
      ) : null}
    </>
  );
};

export default LearningReviewQueueScreen;
