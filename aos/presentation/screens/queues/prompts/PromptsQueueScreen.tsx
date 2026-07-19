/** ST-13 — Global Prompts Queue */
import React from "react";
import { useNavigate } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { usePromptsQueueQuery } from "../../../../hooks/queries/useQueueQueries";
import { DataTable, LinkButton, StatusChip } from "../../../ui";
import { QueueScreenTemplate } from "../QueueScreenTemplate";
import { useQueueScreenState } from "../useQueueScreenState";

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const PromptsQueueScreen: React.FC = () => {
  const navigate = useNavigate();
  const { filters, setSearch } = useQueueScreenState();
  const query = usePromptsQueueQuery({ search: filters.search });
  const rows = query.data?.items ?? [];

  return (
    <QueueScreenTemplate
      title="Prompts Queue"
      description="Prompt packs pending approval across engagements."
      featureFlag={AOS_FEATURE_FLAG.PROMPTS}
      search={filters.search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
      isEmpty={rows.length === 0}
      emptyTitle="No prompt packs awaiting approval"
    >
      <DataTable
        density="compact"
        columns={[
          { id: "engagement", header: "Engagement", cell: (row) => row.engagementTitle },
          { id: "client", header: "Client", cell: (row) => row.clientLabel },
          { id: "version", header: "Pack version", cell: (row) => `v${row.packVersion}` },
          {
            id: "status",
            header: "Status",
            cell: (row) => (
              <StatusChip label={row.status.replace(/_/g, " ")} variant={row.status === "draft" ? "ai" : "warning"} />
            ),
          },
          { id: "artifacts", header: "Artifacts", cell: (row) => String(row.artifactCount) },
          { id: "updated", header: "Updated", cell: (row) => formatUpdatedAt(row.updatedAt) },
          {
            id: "action",
            header: "Action",
            cell: (row) => <LinkButton onClick={() => navigate(row.tabHref)}>Review</LinkButton>,
          },
        ]}
        rows={rows}
        getRowKey={(row) => row.engagementId}
        onRowClick={(row) => navigate(row.tabHref)}
      />
    </QueueScreenTemplate>
  );
};

export default PromptsQueueScreen;
