/** ST-14 — Global Cursor Queue */
import React from "react";
import { useNavigate } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { useCursorQueueQuery } from "../../../../hooks/queries/useQueueQueries";
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

const CursorQueueScreen: React.FC = () => {
  const navigate = useNavigate();
  const { filters, setSearch, setStatusFilter } = useQueueScreenState(true);
  const query = useCursorQueueQuery({
    search: filters.search,
    statusFilter: filters.statusFilter,
  });
  const rows = query.data?.items ?? [];

  return (
    <QueueScreenTemplate
      title="Cursor Queue"
      description="Cursor sessions that need capture or follow-up."
      featureFlag={AOS_FEATURE_FLAG.CURSOR}
      search={filters.search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
      isEmpty={rows.length === 0}
      emptyTitle="No active Cursor sessions"
      toolbarExtra={
        <Select
          className="w-48"
          aria-label="Filter by session status"
          value={filters.statusFilter ?? ""}
          onChange={(event) => setStatusFilter(event.target.value || undefined)}
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "awaiting_capture", label: "Awaiting capture" },
            { value: "not_started", label: "Not started" },
          ]}
        />
      }
    >
      <DataTable
        density="compact"
        columns={[
          { id: "engagement", header: "Engagement", cell: (row) => row.engagementTitle },
          { id: "artifact", header: "Artifact", cell: (row) => row.artifactLabel },
          {
            id: "session",
            header: "Session status",
            cell: (row) => (
              <StatusChip
                label={row.sessionStatus.replace(/_/g, " ")}
                variant={row.sessionStatus === "active" ? "warning" : "neutral"}
              />
            ),
          },
          {
            id: "capture",
            header: "Capture status",
            cell: (row) => (
              <StatusChip
                label={row.captureStatus}
                variant={row.captureStatus === "pending" ? "warning" : "success"}
              />
            ),
          },
          { id: "updated", header: "Updated", cell: (row) => formatUpdatedAt(row.updatedAt) },
          {
            id: "action",
            header: "Action",
            cell: (row) => <LinkButton onClick={() => navigate(row.tabHref)}>Review</LinkButton>,
          },
        ]}
        rows={rows}
        getRowKey={(row) => `${row.engagementId}:${row.sessionId}`}
        onRowClick={(row) => navigate(row.tabHref)}
      />
    </QueueScreenTemplate>
  );
};

export default CursorQueueScreen;
