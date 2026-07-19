/** ST-11 — Retrospective (founder workflow step 7) */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { FeatureFlagGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  AiDraftPanel,
  ApprovalDialog,
  Button,
  EmptyState,
  ErrorState,
  KnowledgeCard,
  LoadingState,
  RegistryCard,
  Timeline,
  WaitingStatePanel,
} from "../../../ui";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const EngagementRetrospectiveScreen: React.FC = () => {
  const navigate = useNavigate();
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } = useEngagementWorkflowScreen();
  const [approveOpen, setApproveOpen] = useState(false);
  const retro = workflow?.retrospective;

  if (isLoading) return <LoadingState message="Loading retrospective…" />;
  if (isError) return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  if (!workflow?.gates.qaComplete) {
    return <WaitingStatePanel title="QA gate blocked" message="Complete QA handoff before retrospective." />;
  }

  return (
    <FeatureFlagGate flag={AOS_FEATURE_FLAG.KNOWLEDGE} fallback={<ErrorState title="Knowledge module disabled" />}>
      <div id="aos-engagement-panel-retrospective" aria-labelledby="aos-engagement-tab-retrospective" className="flex flex-col gap-[var(--space-stack-lg)]">
        {!retro ? (
          <EmptyState
            title="Generate retrospective"
            description="Close the learning loop with lessons and promotion candidates."
            action={
              <Button loading={mutations.generateRetrospective.isPending} onClick={() => void mutations.generateRetrospective.mutateAsync()}>
                Generate retrospective
              </Button>
            }
          />
        ) : (
          <>
            <AiDraftPanel title="Retrospective draft" loading={mutations.generateRetrospective.isPending}>
              {retro.lessons.map((lesson) => (
                <article key={lesson.id}>
                  <p>{lesson.text}</p>
                  {lesson.promotionTarget === "knowledge" ? (
                    <KnowledgeCard title="Knowledge promotion candidate" scope="engagement" />
                  ) : (
                    <RegistryCard moduleId={lesson.id} moduleName="Registry promotion candidate" matchScore={100} decision="pending" />
                  )}
                </article>
              ))}
            </AiDraftPanel>
            <section>
              <h3 className="mb-[var(--space-stack-md)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">Timeline</h3>
              <Timeline events={workflow.timeline} />
            </section>
          </>
        )}
        <StickyFooterBar>
          {workflow.gates.retrospectiveComplete ? (
            <Button variant="secondary" onClick={() => navigate("/aos/delivery")}>Back to delivery list</Button>
          ) : (
            <Button disabled={!retro} onClick={() => setApproveOpen(true)}>Approve retrospective</Button>
          )}
        </StickyFooterBar>
        <ApprovalDialog
          open={approveOpen}
          onClose={() => setApproveOpen(false)}
          title="Approve retrospective and close?"
          confirmLabel="Approve retrospective"
          aiAddendum={retro?.aiGenerated}
          isPending={mutations.approveRetrospective.isPending}
          onConfirm={(note) =>
            void mutations.approveRetrospective.mutateAsync(note).then(() => setApproveOpen(false))
          }
        />
      </div>
    </FeatureFlagGate>
  );
};

export default EngagementRetrospectiveScreen;
