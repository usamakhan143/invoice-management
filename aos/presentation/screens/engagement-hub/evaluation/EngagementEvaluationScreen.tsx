/** ST-09 — Evaluation (founder workflow step 5) */
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { useEvaluationHistoryQuery } from "../../../../hooks/queries/useVersionHistoryQueries";
import { FeatureFlagGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  evaluationLabel,
  TraceabilityReference,
  VersionHistoryPanel,
  type VersionHistoryRow,
} from "../../../components/version-history";
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
import { EvaluationDetailContent } from "../components/EvaluationDetailContent";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const EngagementEvaluationScreen: React.FC = () => {
  const navigate = useNavigate();
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } = useEngagementWorkflowScreen();
  const evaluation = workflow?.evaluation;
  const versionChainsEnabled = workflow?.versionChainsEnabled ?? false;
  const historyQuery = useEvaluationHistoryQuery(engagementId, versionChainsEnabled);

  const historyRows: VersionHistoryRow[] = useMemo(
    () =>
      (historyQuery.data ?? []).map((e) => ({
        id: e.id,
        primaryLabel: evaluationLabel(e.id, e.passed),
        secondaryLabel: e.amendsEvaluationId ? `Amends ${e.amendsEvaluationId.slice(0, 8)}…` : undefined,
        statusLabel: e.status,
        statusVariant: e.passed ? "success" : e.status === "overridden" ? "warning" : "error",
        timestamp: e.confirmedAt ?? e.createdAt,
        readOnly: e.readOnly,
      })),
    [historyQuery.data],
  );

  if (isLoading) return <LoadingState message="Loading evaluation…" />;
  if (isError) return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  if (!workflow?.gates.cursorSubmitted) {
    return <WaitingStatePanel title="Cursor gate blocked" message="Submit a Cursor capture before running evaluation." />;
  }

  return (
    <FeatureFlagGate flag={AOS_FEATURE_FLAG.EVALUATION} fallback={<ErrorState title="Evaluation module disabled" />}>
      <div id="aos-engagement-panel-evaluation" role="tabpanel" aria-labelledby="aos-engagement-tab-evaluation" className="flex flex-col gap-[var(--space-stack-lg)]">
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
            {versionChainsEnabled && evaluation.readOnly ? (
              <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]" aria-live="polite">
                Confirmed evaluation is read-only historical record.
              </p>
            ) : null}
            {!evaluation.passed ? (
              <InAppAlert variant="error" title="Evaluation failed">
                Review failed criteria and iterate before QA handoff.
              </InAppAlert>
            ) : null}
            {versionChainsEnabled ? (
              <div className="grid gap-[var(--space-stack-sm)] md:grid-cols-2">
                <TraceabilityReference label="Cursor Session" technicalId={evaluation.cursorSessionId} />
                <TraceabilityReference label="Prompt Version" technicalId={evaluation.promptVersionId} />
                <TraceabilityReference label="Requirement Version" technicalId={evaluation.requirementVersionId} />
                <TraceabilityReference label="Rubric Version" technicalId={evaluation.rubricVersionId} />
              </div>
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
            <VersionHistoryPanel
              title="Evaluation history"
              rows={historyRows}
              loading={historyQuery.isLoading}
              error={historyQuery.error}
              onRetry={() => void historyQuery.refetch()}
              disabledMessage={
                !versionChainsEnabled
                  ? "Evaluation lineage history requires immutable version chains."
                  : undefined
              }
              renderDetail={(row) => <EvaluationDetailContent evaluationId={row.id} />}
            />
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
