/** ST-07 — Prompt Pack (founder workflow step 3) */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_PERMISSION_KEY } from "../../../../constants/permissionKeys";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { usePermissions } from "../../../../../hooks/usePermissions";
import { FeatureFlagGate, PermissionGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  AiDraftPanel,
  ApprovalDialog,
  ApprovalPanel,
  Button,
  EmptyState,
  ErrorState,
  HandoffStrip,
  LoadingState,
  PromptCard,
  useToast,
  WaitingStatePanel,
} from "../../../ui";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const EngagementPromptsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } = useEngagementWorkflowScreen();
  const [approveOpen, setApproveOpen] = useState(false);
  const pack = workflow?.promptPack;

  if (isLoading) return <LoadingState message="Loading prompt pack…" />;
  if (isError) return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  if (!workflow?.gates.reuseRecorded) {
    return <WaitingStatePanel title="Reuse gate blocked" message="Record reuse decisions before generating prompts." />;
  }

  return (
    <FeatureFlagGate flag={AOS_FEATURE_FLAG.PROMPTS} fallback={<ErrorState title="Prompts module disabled" />}>
      <div id="aos-engagement-panel-prompts" aria-labelledby="aos-engagement-tab-prompts" className="flex flex-col gap-[var(--space-stack-lg)]">
        {!pack ? (
          <EmptyState
            title="Generate prompt pack"
            description="Create a prompt pack from approved requirements and reuse decisions."
            action={
              <Button loading={mutations.generatePromptPack.isPending} onClick={() => void mutations.generatePromptPack.mutateAsync()}>
                Generate prompt pack
              </Button>
            }
          />
        ) : (
          <>
            <PromptCard title={pack.title} version={pack.version} status={pack.status} artifactCount={pack.artifacts.length} />
            <AiDraftPanel title={pack.title} versionLabel={`Version ${pack.version}`}>
              {pack.artifacts.map((artifact) => (
                <article key={artifact.id}>
                  <h4 className="font-[var(--font-weight-semibold)]">{artifact.title}</h4>
                  <p className="whitespace-pre-wrap text-[var(--color-text-secondary)]">{artifact.body}</p>
                </article>
              ))}
            </AiDraftPanel>
            <HandoffStrip
              promptTitle={pack.title}
              onCopy={() => toast({ message: "Prompt copied to clipboard", variant: "success" })}
            />
            <PermissionGate permissions={AOS_PERMISSION_KEY.PROMPTS_MANAGE}>
              <ApprovalPanel
                canApprove={hasPermission(AOS_PERMISSION_KEY.PROMPTS_MANAGE) && pack.status === "draft"}
                onApprove={() => setApproveOpen(true)}
                loading={mutations.approvePromptPack.isPending}
              />
            </PermissionGate>
          </>
        )}
        <StickyFooterBar>
          {workflow.gates.promptPackApproved ? (
            <Button onClick={() => navigate(`/aos/delivery/${engagementId}/cursor`)}>Continue to Cursor</Button>
          ) : (
            <Button disabled={!pack} onClick={() => setApproveOpen(true)}>Approve prompt pack</Button>
          )}
        </StickyFooterBar>
        <ApprovalDialog
          open={approveOpen}
          onClose={() => setApproveOpen(false)}
          title="Approve prompt pack?"
          confirmLabel="Approve prompt pack"
          aiAddendum
          isPending={mutations.approvePromptPack.isPending}
          onConfirm={(note) =>
            void mutations.approvePromptPack.mutateAsync(note).then(() => {
              setApproveOpen(false);
              navigate(`/aos/delivery/${engagementId}/cursor`);
            })
          }
        />
      </div>
    </FeatureFlagGate>
  );
};

export default EngagementPromptsScreen;
