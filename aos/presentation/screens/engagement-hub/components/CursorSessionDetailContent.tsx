import React from "react";
import {
  cursorSessionLabel,
  VersionDetailView,
  timestampField,
  formatVersionTimestamp,
} from "../../../components/version-history";
import { LoadingState } from "../../../ui";
import {
  useCursorRevisionHistoryQuery,
  useCursorSessionHistoryQuery,
} from "../../../../hooks/queries/useVersionHistoryQueries";

export interface CursorSessionDetailContentProps {
  sessionId: string;
  engagementId: string;
  onNavigatePromptVersion?: (promptVersionId: string) => void;
}

export const CursorSessionDetailContent: React.FC<CursorSessionDetailContentProps> = ({
  sessionId,
  engagementId,
  onNavigatePromptVersion,
}) => {
  const sessionsQuery = useCursorSessionHistoryQuery(engagementId, true);
  const revisionsQuery = useCursorRevisionHistoryQuery(sessionId, true);
  const session = sessionsQuery.data?.find((s) => s.id === sessionId);

  if (sessionsQuery.isLoading) return <LoadingState message="Loading session…" />;
  if (!session) return <p className="text-[var(--color-text-secondary)]">Session not found.</p>;

  return (
    <VersionDetailView
      title={cursorSessionLabel(session.id)}
      statusLabel={session.status}
      readOnly={session.readOnly}
      fields={[
        { label: "Session ID", value: session.id },
        timestampField("Started", session.startedAt),
        timestampField("Finalized", session.finalizedAt),
        { label: "Prompt pack", value: session.promptPackId },
        { label: "Prompt artifact", value: session.promptArtifactId },
      ]}
      references={[
        {
          label: "Prompt Version",
          technicalId: session.promptVersionId,
          onNavigate: onNavigatePromptVersion
            ? () => onNavigatePromptVersion(session.promptVersionId)
            : undefined,
          navigateLabel: "View prompt version",
        },
      ]}
    >
      {session.captureSummary ? (
        <p className="text-[var(--color-text-secondary)]">{session.captureSummary}</p>
      ) : null}
      {revisionsQuery.data && revisionsQuery.data.length > 0 ? (
        <section aria-label="Revision lineage">
          <h4 className="mb-[var(--space-stack-sm)] font-[var(--font-weight-semibold)]">Revisions</h4>
          <ul className="grid gap-[var(--space-stack-xs)]">
            {revisionsQuery.data.map((rev) => (
              <li key={rev.id} className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                {rev.status} · {formatVersionTimestamp(rev.createdAt)}
                {rev.revisionPromptVersionId ? ` → ${rev.revisionPromptVersionId.slice(0, 10)}…` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </VersionDetailView>
  );
};
