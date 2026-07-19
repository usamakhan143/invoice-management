/** ST-09 — Evaluation (founder workflow step 5) */
import React from "react";
import { useNavigate } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { FeatureFlagGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  EvaluationCard,
  EvidencePanel,
  InAppAlert,
  LoadingState,
  WaitingStatePanel,
} from "../../../ui";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const EngagementEvaluationScreen: React.FC = () => {
  const navigate = useNavigate();
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } = useEngagementWorkflowScreen();
  const evaluation = workflow?.evaluation;

  if (isLoading) return <LoadingState message="Loading evaluation…" />;
  if (isError) return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  if (!workflow?.gates.cursorSubmitted) {
    return <WaitingStatePanel title="Cursor gate blocked" message="Submit a Cursor capture before running evaluation." />;
  }

  return (
    <FeatureFlagGate flag={AOS_FEATURE_FLAG.EVALUATION} fallback={<ErrorState title="Evaluation module disabled" />}>
      <div id="aos-engagement-panel-evaluation" aria-labelledby="aos-engagement-tab-evaluation" className="flex flex-col gap-[var(--space-stack-lg)]">
        {!evaluation ? (
          <EmptyState
            title="Run evaluation"
            description="Score the submitted capture against the delivery quality rubric."
            action={
              <Button loading={mutations.runEvaluation.isPending} onClick={() => void mutations.runEvaluation.mutateAsync()}>
                Run evaluation
              </Button>
            }
          />
        ) : (
          <>
            <EvaluationCard
              rubricName={evaluation.rubricName}
              scorePercent={evaluation.scorePercent}
              passed={evaluation.passed}
              status={evaluation.status}
            />
            {!evaluation.passed ? (
              <InAppAlert variant="error" title="Evaluation failed">
                Review failed criteria and iterate before QA handoff.
              </InAppAlert>
            ) : null}
            <EvidencePanel title="Rubric breakdown">
              <DataTable
                columns={[
                  { id: "label", header: "Criterion", cell: (row) => row.label },
                  { id: "score", header: "Score", cell: (row) => `${row.score}%` },
                  { id: "passed", header: "Result", cell: (row) => (row.passed ? "Pass" : "Fail") },
                ]}
                rows={evaluation.criteria}
                getRowKey={(row) => row.id}
                aria-label="Evaluation rubric"
              />
            </EvidencePanel>
          </>
        )}
        <StickyFooterBar>
          {workflow.gates.evaluationPassed ? (
            <Button onClick={() => navigate(`/aos/delivery/${engagementId}/qa`)}>Continue to QA</Button>
          ) : (
            <Button loading={mutations.runEvaluation.isPending} onClick={() => void mutations.runEvaluation.mutateAsync()}>
              Re-run evaluation
            </Button>
          )}
        </StickyFooterBar>
      </div>
    </FeatureFlagGate>
  );
};

export default EngagementEvaluationScreen;
