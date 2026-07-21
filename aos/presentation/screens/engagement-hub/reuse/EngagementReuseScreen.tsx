/** ST-06 — Reuse (founder workflow step 2) */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { FeatureFlagGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  Button,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  RegistryCard,
  TextArea,
  WaitingStatePanel,
} from "../../../ui";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const EngagementReuseScreen: React.FC = () => {
  const navigate = useNavigate();
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } = useEngagementWorkflowScreen();
  const [justification, setJustification] = useState("");
  const assessment = workflow?.reuseAssessment;

  if (isLoading) return <LoadingState message="Loading reuse assessment…" />;
  if (isError) return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  if (!workflow?.gates.requirementsApproved) {
    return <WaitingStatePanel title="Requirements gate blocked" message="Approve requirements before running reuse assessment." />;
  }

  return (
    <FeatureFlagGate flag={AOS_FEATURE_FLAG.REGISTRY} fallback={<ErrorState title="Registry module disabled" />}>
      <div id="aos-engagement-panel-reuse" role="tabpanel" aria-labelledby="aos-engagement-tab-reuse" className="flex flex-col gap-[var(--space-stack-lg)]">
        {!assessment ? (
          <EmptyState
            title="Run reuse assessment"
            description="Match approved requirements against the module registry and knowledge base."
            action={
              <Button loading={mutations.runReuseAssessment.isPending} onClick={() => void mutations.runReuseAssessment.mutateAsync()}>
                Run reuse assessment
              </Button>
            }
          />
        ) : (
          <>
            <p className="text-[length:var(--font-size-body)]">Reuse rate: {assessment.reuseRate}%</p>
            <div className="grid gap-[var(--space-stack-md)] md:grid-cols-2">
              {assessment.modules.map((module) => (
                <RegistryCard
                  key={module.moduleId}
                  moduleId={module.moduleId}
                  moduleName={module.moduleName}
                  matchScore={module.matchScore}
                  decision={module.decision}
                  onAccept={() =>
                    void mutations.setReuseModuleDecision.mutateAsync({ moduleId: module.moduleId, decision: "accepted" })
                  }
                  onReject={() =>
                    void mutations.setReuseModuleDecision.mutateAsync({ moduleId: module.moduleId, decision: "rejected" })
                  }
                />
              ))}
            </div>
            <FormField label="Net-new justification" htmlFor="reuse-justification" optional>
              <TextArea id="reuse-justification" value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} />
            </FormField>
          </>
        )}
        <StickyFooterBar>
          {workflow.gates.reuseRecorded ? (
            <Button onClick={() => navigate(`/aos/delivery/${engagementId}/prompts`)}>Continue to Prompts</Button>
          ) : (
            <Button
              disabled={!assessment}
              loading={mutations.recordReuseDecisions.isPending}
              onClick={() =>
                void mutations.recordReuseDecisions.mutateAsync({ netNewJustification: justification || undefined }).then(() =>
                  navigate(`/aos/delivery/${engagementId}/prompts`),
                )
              }
            >
              Record reuse decisions
            </Button>
          )}
        </StickyFooterBar>
      </div>
    </FeatureFlagGate>
  );
};

export default EngagementReuseScreen;
