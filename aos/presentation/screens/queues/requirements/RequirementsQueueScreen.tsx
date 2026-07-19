/** ST-12 — Global Requirements Queue */
import React from "react";
import { useNavigate } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { useRequirementsQueueQuery } from "../../../../hooks/queries/useQueueQueries";
import {
  DataTable,
  LinkButton,
  StatusChip,
} from "../../../ui";
import { QueueScreenTemplate } from "../QueueScreenTemplate";
import { useQueueScreenState } from "../useQueueScreenState";

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const RequirementsQueueScreen: React.FC = () => {
  const navigate = useNavigate();
  const { filters, setSearch } = useQueueScreenState();
  const query = useRequirementsQueueQuery({ search: filters.search });

  const rows = query.data?.items ?? [];

  return (
    <QueueScreenTemplate
      title="Requirements Queue"
      description="Cross-engagement requirement sets awaiting review."
      featureFlag={AOS_FEATURE_FLAG.REQUIREMENTS}
      search={filters.search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
      isEmpty={rows.length === 0}
      emptyTitle="No requirements awaiting review"
      emptyDescription="Approved and in-progress sets appear on engagement tabs only."
    >
      <DataTable
        density="compact"
        columns={[
          { id: "engagement", header: "Engagement", cell: (row) => row.engagementTitle },
          { id: "client", header: "Client", cell: (row) => row.clientLabel },
          { id: "version", header: "Set version", cell: (row) => `v${row.setVersion}` },
          {
            id: "status",
            header: "Status",
            cell: (row) => (
              <StatusChip label={row.status.replace(/_/g, " ")} variant={row.status === "draft" ? "ai" : "warning"} />
            ),
          },
          { id: "items", header: "Items", cell: (row) => String(row.itemCount) },
          { id: "updated", header: "Updated", cell: (row) => formatUpdatedAt(row.updatedAt) },
          {
            id: "action",
            header: "Action",
            cell: (row) => (
              <LinkButton onClick={() => navigate(row.tabHref)}>Review</LinkButton>
            ),
          },
        ]}
        rows={rows}
        getRowKey={(row) => row.engagementId}
        onRowClick={(row) => navigate(row.tabHref)}
      />
    </QueueScreenTemplate>
  );
};

export default RequirementsQueueScreen;
