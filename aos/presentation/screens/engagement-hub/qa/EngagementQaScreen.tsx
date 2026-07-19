/** ST-10 — QA / Handoff (founder workflow step 6) */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { FeatureFlagGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  ApprovalDialog,
  Button,
  Checkbox,
  ErrorState,
  LinkButton,
  LoadingState,
  WaitingStatePanel,
} from "../../../ui";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const DEFAULT_QA_CHECKLIST = [
  { id: "qa-1", label: "All approved requirements verified", checked: false },
  { id: "qa-2", label: "Prompt pack artifacts copied to Cursor", checked: false },
  { id: "qa-3", label: "Evaluation evidence attached", checked: false },
];

const EngagementQaScreen: React.FC = () => {
  const navigate = useNavigate();
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } = useEngagementWorkflowScreen();
  const [approveOpen, setApproveOpen] = useState(false);

  if (isLoading) return <LoadingState message="Loading QA checklist…" />;
  if (isError) return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  if (!workflow?.gates.evaluationPassed) {
    return (
      <WaitingStatePanel
        title="Evaluation gate blocked"
        message="Evaluation must pass before QA and handoff."
      />
    );
  }

  const report = workflow.qualityReport;
  const checklist = report?.checklist ?? DEFAULT_QA_CHECKLIST;

  return (
    <div id="aos-engagement-panel-qa" aria-labelledby="aos-engagement-tab-qa" className="flex flex-col gap-[var(--space-stack-lg)]">
      <FeatureFlagGate flag={AOS_FEATURE_FLAG.DELIVERY}>
        <LinkButton icon="external" onClick={() => navigate("/invoices")}>
          View ERP invoices (Sidecar)
        </LinkButton>
      </FeatureFlagGate>
      <ul className="flex flex-col gap-[var(--space-stack-sm)]">
        {checklist.map((item) => (
          <li key={item.id}>
            <Checkbox
              label={item.label}
              checked={item.checked}
              onChange={(event) =>
                void mutations.updateQaChecklist.mutateAsync({
                  itemId: item.id,
                  checked: event.target.checked,
                })
              }
            />
          </li>
        ))}
      </ul>
      <StickyFooterBar>
        {workflow.gates.qaComplete ? (
          <Button onClick={() => navigate(`/aos/delivery/${engagementId}/retrospective`)}>Continue to Retrospective</Button>
        ) : (
          <Button onClick={() => setApproveOpen(true)}>Approve handoff</Button>
        )}
      </StickyFooterBar>
      <ApprovalDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve QA handoff?"
        confirmLabel="Approve handoff"
        noteRequired
        isPending={mutations.approveQaHandoff.isPending}
        onConfirm={(note) =>
          void mutations.approveQaHandoff.mutateAsync(note).then(() => {
            setApproveOpen(false);
            navigate(`/aos/delivery/${engagementId}/retrospective`);
          })
        }
      />
    </div>
  );
};

export default EngagementQaScreen;
