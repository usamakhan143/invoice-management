/** ST-15 — Global Evaluation Queue */
import React from "react";
import { useNavigate } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { useEvaluationQueueQuery } from "../../../../hooks/queries/useQueueQueries";
import { DataTable, LinkButton, Select, StatusChip } from "../../../ui";
import { QueueScreenTemplate } from "../QueueScreenTemplate";
import { useQueueScreenState } from "../useQueueScreenState";

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const EvaluationQueueScreen: React.FC = () => {
  const navigate = useNavigate();
  const { filters, setSearch, setStatusFilter } = useQueueScreenState(true);
  const query = useEvaluationQueueQuery({
    search: filters.search,
    statusFilter: filters.statusFilter,
  });
  const rows = query.data?.items ?? [];

  return (
    <QueueScreenTemplate
      title="Evaluation Queue"
      description="Evaluations that need review or resolution."
      featureFlag={AOS_FEATURE_FLAG.EVALUATION}
      search={filters.search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
      isEmpty={rows.length === 0}
      emptyTitle="No evaluations need review"
      toolbarExtra={
        <Select
          className="w-40"
          aria-label="Filter by result"
          value={filters.statusFilter ?? ""}
          onChange={(event) => setStatusFilter(event.target.value || undefined)}
          options={[
            { value: "", label: "All results" },
            { value: "failed", label: "Failed" },
          ]}
        />
      }
    >
      <DataTable
        density="compact"
        columns={[
          { id: "engagement", header: "Engagement", cell: (row) => row.engagementTitle },
          { id: "session", header: "Session", cell: (row) => row.sessionLabel },
          {
            id: "result",
            header: "Result",
            cell: (row) => (
              <StatusChip label={row.result} variant={row.result === "failed" ? "error" : "success"} />
            ),
          },
          { id: "score", header: "Score", cell: (row) => `${row.scorePercent}%` },
          { id: "updated", header: "Updated", cell: (row) => formatUpdatedAt(row.updatedAt) },
          {
            id: "action",
            header: "Action",
            cell: (row) => <LinkButton onClick={() => navigate(row.tabHref)}>Review</LinkButton>,
          },
        ]}
        rows={rows}
        getRowKey={(row) => row.evaluationId}
        onRowClick={(row) => navigate(row.tabHref)}
      />
    </QueueScreenTemplate>
  );
};

export default EvaluationQueueScreen;
