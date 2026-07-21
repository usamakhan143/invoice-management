import React from "react";
import { Card, LoadingState } from "../../../ui";
import {
  VersionDetailView,
  timestampField,
  requirementVersionLabel,
} from "../../../components/version-history";
import { useRequirementVersionDetailQuery } from "../../../../hooks/queries/useVersionHistoryQueries";

export const RequirementVersionDetailContent: React.FC<{ versionId: string }> = ({ versionId }) => {
  const detailQuery = useRequirementVersionDetailQuery(versionId, true);
  const detail = detailQuery.data;

  if (detailQuery.isLoading) return <LoadingState message="Loading version detail…" />;
  if (!detail) return <p className="text-[var(--color-text-secondary)]">Version not found.</p>;

  return (
    <VersionDetailView
      title={requirementVersionLabel(detail.versionNumber)}
      subtitle={detail.title}
      statusLabel={detail.isCurrent ? "Current approved" : "Historical"}
      statusVariant={detail.isCurrent ? "approved" : "neutral"}
      readOnly
      fields={[
        { label: "Version ID", value: detail.id },
        timestampField("Published", detail.publishedAt),
        { label: "Published by", value: detail.publishedByUserId },
        { label: "Requirement items", value: String(detail.itemCount) },
        detail.supersedesVersionId
          ? { label: "Supersedes", value: detail.supersedesVersionId }
          : { label: "Supersedes", value: "— (initial version)" },
      ]}
    >
      <Card>
        <Card.Header title="Requirement snapshot" />
        <Card.Body>
          <ul className="grid gap-[var(--space-stack-sm)]">
            {detail.items.map((item) => (
              <li key={item.id}>
                <h5 className="font-[var(--font-weight-semibold)]">{item.title}</h5>
                <p className="text-[var(--color-text-secondary)]">{item.description}</p>
              </li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </VersionDetailView>
  );
};
