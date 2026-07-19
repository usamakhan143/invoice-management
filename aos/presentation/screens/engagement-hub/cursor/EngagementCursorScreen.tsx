/** ST-08 — Cursor Session (founder workflow step 4) */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_PERMISSION_KEY } from "../../../../constants/permissionKeys";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { usePermissions } from "../../../../../hooks/usePermissions";
import { FeatureFlagGate, PermissionGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  Button,
  ConfirmationDialog,
  CursorSessionCard,
  EmptyState,
  ErrorState,
  FormField,
  HandoffStrip,
  LoadingState,
  TextArea,
  WaitingStatePanel,
} from "../../../ui";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const EngagementCursorScreen: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canExecute = hasPermission(AOS_PERMISSION_KEY.CURSOR_EXECUTE);
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } = useEngagementWorkflowScreen();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [captureSummary, setCaptureSummary] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) return <LoadingState message="Loading Cursor sessions…" />;
  if (isError) return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  if (!workflow?.gates.promptPackApproved) {
    return <WaitingStatePanel title="Prompt gate blocked" message="Approve a prompt pack to begin Cursor work." />;
  }

  const sessions = workflow.cursorSessions;

  return (
    <FeatureFlagGate flag={AOS_FEATURE_FLAG.CURSOR} fallback={<ErrorState title="Cursor module disabled" />}>
      <div id="aos-engagement-panel-cursor" aria-labelledby="aos-engagement-tab-cursor" className="flex flex-col gap-[var(--space-stack-lg)]">
        {workflow.promptPack ? <HandoffStrip promptTitle={workflow.promptPack.title} /> : null}
        {sessions.length === 0 ? (
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
          sessions.map((session) => (
            <CursorSessionCard
              key={session.id}
              sessionId={session.id}
              status={session.status}
              captureSummary={session.captureSummary}
              actions={
                session.status !== "submitted" && canExecute ? (
                  <Button size="sm" onClick={() => setActiveSessionId(session.id)}>Submit capture</Button>
                ) : null
              }
            />
          ))
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
      </div>
    </FeatureFlagGate>
  );
};

export default EngagementCursorScreen;
