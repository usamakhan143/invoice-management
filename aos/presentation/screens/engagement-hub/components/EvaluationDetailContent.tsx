import React from "react";
import {
  VersionDetailView,
  timestampField,
  evaluationLabel,
} from "../../../components/version-history";
import { DataTable, EvidencePanel, LoadingState } from "../../../ui";
import { useEvaluationDetailQuery } from "../../../../hooks/queries/useVersionHistoryQueries";

export const EvaluationDetailContent: React.FC<{ evaluationId: string }> = ({ evaluationId }) => {
  const detailQuery = useEvaluationDetailQuery(evaluationId, true);
  const detail = detailQuery.data;

  if (detailQuery.isLoading) return <LoadingState message="Loading evaluation…" />;
  if (!detail) return <p className="text-[var(--color-text-secondary)]">Evaluation not found.</p>;

  const statusVariant = detail.passed ? "success" : detail.status === "overridden" ? "warning" : "error";

  return (
    <VersionDetailView
      title={evaluationLabel(detail.id, detail.passed)}
      statusLabel={detail.status}
      statusVariant={statusVariant}
      readOnly={detail.readOnly}
      fields={[
        { label: "Evaluation ID", value: detail.id },
        { label: "Score", value: `${detail.scorePercent}%` },
        { label: "Outcome", value: detail.passed ? "Pass" : "Fail" },
        timestampField("Confirmed", detail.confirmedAt ?? detail.createdAt),
        detail.amendsEvaluationId
          ? { label: "Amends evaluation", value: detail.amendsEvaluationId }
          : { label: "Amends evaluation", value: "—" },
      ]}
      references={[
        { label: "Cursor Session", technicalId: detail.cursorSessionId },
        { label: "Prompt Version", technicalId: detail.promptVersionId },
        { label: "Requirement Version", technicalId: detail.requirementVersionId },
        { label: "Rubric Version", technicalId: detail.rubricVersionId },
      ]}
    >
      <EvidencePanel title={`Rubric: ${detail.rubricName}`}>
        <DataTable
          aria-label="Evaluation criteria"
          rows={detail.criteria}
          getRowKey={(row) => row.id}
          columns={[
            { id: "label", header: "Criterion", cell: (row) => row.label },
            { id: "score", header: "Score", cell: (row) => `${row.score}%` },
            { id: "passed", header: "Result", cell: (row) => (row.passed ? "Pass" : "Fail") },
          ]}
        />
      </EvidencePanel>
    </VersionDetailView>
  );
};
