import React from "react";
import { Card } from "../../../ui";
import {
  VersionDetailView,
  timestampField,
  promptVersionLabel,
} from "../../../components/version-history";
import { usePromptVersionDetailQuery } from "../../../../hooks/queries/useVersionHistoryQueries";
import { LoadingState } from "../../../ui";

export interface PromptVersionDetailContentProps {
  versionId: string;
  onNavigateRequirement?: (requirementVersionId: string) => void;
}

export const PromptVersionDetailContent: React.FC<PromptVersionDetailContentProps> = ({
  versionId,
  onNavigateRequirement,
}) => {
  const detailQuery = usePromptVersionDetailQuery(versionId, true);
  const detail = detailQuery.data;

  if (detailQuery.isLoading) return <LoadingState message="Loading prompt version…" />;
  if (!detail) return <p className="text-[var(--color-text-secondary)]">Prompt version not found.</p>;

  return (
    <VersionDetailView
      title={promptVersionLabel(detail.versionNumber, detail.title)}
      statusLabel={detail.isCurrent ? "Current approved" : "Historical"}
      statusVariant={detail.isCurrent ? "approved" : "neutral"}
      readOnly
      fields={[
        { label: "Prompt version ID", value: detail.id },
        { label: "Artifact ID", value: detail.promptArtifactId },
        { label: "Prompt pack ID", value: detail.promptPackId },
        timestampField("Published", detail.publishedAt),
        { label: "Published by", value: detail.publishedByUserId },
      ]}
      references={[
        {
          label: "Requirement Version",
          technicalId: detail.requirementVersionId,
          onNavigate: onNavigateRequirement
            ? () => onNavigateRequirement(detail.requirementVersionId)
            : undefined,
          navigateLabel: "View requirement version",
        },
      ]}
    >
      <Card>
        <Card.Header title="Prompt content (immutable)" />
        <Card.Body>
          <p className="whitespace-pre-wrap text-[var(--color-text-secondary)]">{detail.body}</p>
        </Card.Body>
      </Card>
    </VersionDetailView>
  );
};
