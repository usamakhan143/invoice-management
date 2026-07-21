/** ST-08 — Cursor Session (founder workflow step 4) */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_PERMISSION_KEY } from "../../../../constants/permissionKeys";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { usePermissions } from "../../../../../hooks/usePermissions";
import {
  useCursorSessionHistoryQuery,
} from "../../../../hooks/queries/useVersionHistoryQueries";
import { FeatureFlagGate, PermissionGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  VersionHistoryPanel,
  cursorSessionLabel,
  type VersionHistoryRow,
} from "../../../components/version-history";
import {
  Button,
  ConfirmationDialog,
  CursorSessionCard,
  EmptyState,
  ErrorState,
  FormField,
  HandoffStrip,
  LoadingState,
  SidePanel,
  TextArea,
  WaitingStatePanel,
} from "../../../ui";
import { CursorSessionDetailContent } from "../components/CursorSessionDetailContent";
import { PromptVersionDetailContent } from "../components/PromptVersionDetailContent";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const EngagementCursorScreen: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canExecute = hasPermission(AOS_PERMISSION_KEY.CURSOR_EXECUTE);
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } = useEngagementWorkflowScreen();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [captureSummary, setCaptureSummary] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [promptDetailId, setPromptDetailId] = useState<string | null>(null);

  const versionChainsEnabled = workflow?.versionChainsEnabled ?? false;
  const sessionsQuery = useCursorSessionHistoryQuery(engagementId, versionChainsEnabled);

  const historyRows: VersionHistoryRow[] = useMemo(() => {
    const source = versionChainsEnabled ? (sessionsQuery.data ?? []) : (workflow?.cursorSessions ?? []).map((s) => ({
      id: s.id,
      engagementId: s.engagementId,
      promptPackId: s.promptPackId,
      promptArtifactId: s.promptArtifactId ?? "",
      promptVersionId: s.promptVersionId ?? "",
      status: s.status,
      startedAt: s.startedAt,
      finalizedAt: s.finalizedAt,
      captureSummary: s.captureSummary,
      readOnly: Boolean(s.readOnly),
    }));
    return source.map((s) => ({
      id: s.id,
      primaryLabel: cursorSessionLabel(s.id),
      secondaryLabel: s.promptVersionId ? `Prompt ${s.promptVersionId.slice(0, 10)}…` : undefined,
      statusLabel: s.status,
      statusVariant: s.readOnly ? "approved" : "ai",
      timestamp: s.finalizedAt ?? s.startedAt,
      readOnly: s.readOnly,
    }));
  }, [sessionsQuery.data, versionChainsEnabled, workflow?.cursorSessions]);

  if (isLoading) return <LoadingState message="Loading Cursor sessions…" />;
  if (isError) return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  if (!workflow?.gates.promptPackApproved) {
    return <WaitingStatePanel title="Prompt gate blocked" message="Approve a prompt pack to begin Cursor work." />;
  }

  const liveSessions = workflow.cursorSessions;

  return (
    <FeatureFlagGate flag={AOS_FEATURE_FLAG.CURSOR} fallback={<ErrorState title="Cursor module disabled" />}>
      <div id="aos-engagement-panel-cursor" role="tabpanel" aria-labelledby="aos-engagement-tab-cursor" className="flex flex-col gap-[var(--space-stack-lg)]">
        {workflow.promptPack ? <HandoffStrip promptTitle={workflow.promptPack.title} /> : null}
        {liveSessions.length === 0 ? (
          <EmptyState
            title="No Cursor sessions"
            description="Start a session from the approved prompt pack."
            action={
              <PermissionGate permissions={AOS_PERMISSION_KEY.CURSOR_EXECUTE}>
                <Button loading={mutations.startCursorSession.isPending} onClick={() => void mutations.startCursorSession.mutateAsync()}>
                  Start session
                </Button>
              </PermissionGate>
            }
          />
        ) : (
          liveSessions.map((session) => (
            <CursorSessionCard
              key={session.id}
              sessionId={session.id}
              status={session.status === "failed" || session.status === "passed" ? "submitted" : session.status}
              captureSummary={session.captureSummary}
              actions={
                session.status !== "submitted" && !session.readOnly && canExecute ? (
                  <Button size="sm" onClick={() => setActiveSessionId(session.id)}>Submit capture</Button>
                ) : null
              }
            />
          ))
        )}
        {versionChainsEnabled ? (
          <VersionHistoryPanel
            title="Cursor session history"
            rows={historyRows}
            loading={sessionsQuery.isLoading}
            error={sessionsQuery.error}
            onRetry={() => void sessionsQuery.refetch()}
            renderDetail={(row) => (
              <CursorSessionDetailContent
                sessionId={row.id}
                engagementId={engagementId}
                onNavigatePromptVersion={(id) => setPromptDetailId(id)}
              />
            )}
          />
        ) : (
          liveSessions.length > 0 ? (
            <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
              Immutable session history is shown from the current workflow while version chains are disabled.
            </p>
          ) : null
        )}
        {activeSessionId ? (
          <FormField label="Capture summary" htmlFor="capture-summary">
            <TextArea id="capture-summary" value={captureSummary} onChange={(e) => setCaptureSummary(e.target.value)} rows={4} />
          </FormField>
        ) : null}
        <StickyFooterBar>
          {workflow.gates.cursorSubmitted ? (
            <Button onClick={() => navigate(`/aos/delivery/${engagementId}/evaluation`)}>Continue to Evaluation</Button>
          ) : (
            <Button
              disabled={!activeSessionId || !captureSummary.trim()}
              onClick={() => setConfirmOpen(true)}
            >
              Submit capture
            </Button>
          )}
        </StickyFooterBar>
        <ConfirmationDialog
          open={confirmOpen}
          title="Submit capture?"
          description="This marks the session ready for evaluation."
          confirmLabel="Submit capture"
          onClose={() => setConfirmOpen(false)}
          onConfirm={() =>
            void mutations.submitCursorCapture
              .mutateAsync({ sessionId: activeSessionId!, captureSummary: captureSummary.trim() })
              .then(() => {
                setConfirmOpen(false);
                navigate(`/aos/delivery/${engagementId}/evaluation`);
              })
          }
        />
        <SidePanel open={promptDetailId != null} onClose={() => setPromptDetailId(null)} title="Prompt version">
          {promptDetailId ? <PromptVersionDetailContent versionId={promptDetailId} /> : null}
        </SidePanel>
      </div>
    </FeatureFlagGate>
  );
};

export default EngagementCursorScreen;
