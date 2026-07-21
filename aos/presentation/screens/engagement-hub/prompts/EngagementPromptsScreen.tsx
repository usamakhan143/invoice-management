/** ST-07 — Prompt Pack (founder workflow step 3) */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_PERMISSION_KEY } from "../../../../constants/permissionKeys";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { usePermissions } from "../../../../../hooks/usePermissions";
import { usePromptVersionHistoryQuery } from "../../../../hooks/queries/useVersionHistoryQueries";
import { FeatureFlagGate, PermissionGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  promptVersionLabel,
  TraceabilityReference,
  VersionHistoryPanel,
  type VersionHistoryRow,
} from "../../../components/version-history";
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
  SidePanel,
  StatusChip,
  useToast,
  WaitingStatePanel,
} from "../../../ui";
import { PromptVersionDetailContent } from "../components/PromptVersionDetailContent";
import { RequirementVersionDetailContent } from "../components/RequirementVersionDetailContent";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const EngagementPromptsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } = useEngagementWorkflowScreen();
  const [approveOpen, setApproveOpen] = useState(false);
  const [reqDetailId, setReqDetailId] = useState<string | null>(null);
  const pack = workflow?.promptPack;
  const versionChainsEnabled = workflow?.versionChainsEnabled ?? false;
  const primaryArtifact = pack?.artifacts[0];

  const historyQuery = usePromptVersionHistoryQuery(
    primaryArtifact?.id,
    engagementId,
    versionChainsEnabled && Boolean(primaryArtifact),
  );

  const historyRows: VersionHistoryRow[] = useMemo(
    () =>
      (historyQuery.data ?? []).map((v) => ({
        id: v.id,
        primaryLabel: promptVersionLabel(v.versionNumber, v.title),
        secondaryLabel: `Targets requirement ${v.requirementVersionId.slice(0, 12)}…`,
        versionNumber: v.versionNumber,
        statusLabel: v.isCurrent ? "Current" : "Historical",
        statusVariant: v.isCurrent ? "approved" : "neutral",
        timestamp: v.publishedAt,
        isCurrent: v.isCurrent,
        readOnly: !v.isCurrent,
      })),
    [historyQuery.data],
  );

  if (isLoading) return <LoadingState message="Loading prompt pack…" />;
  if (isError) return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  if (!workflow?.gates.reuseRecorded) {
    return <WaitingStatePanel title="Reuse gate blocked" message="Record reuse decisions before generating prompts." />;
  }

  return (
    <FeatureFlagGate flag={AOS_FEATURE_FLAG.PROMPTS} fallback={<ErrorState title="Prompts module disabled" />}>
      <div id="aos-engagement-panel-prompts" role="tabpanel" aria-labelledby="aos-engagement-tab-prompts" className="flex flex-col gap-[var(--space-stack-lg)]">
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
            <div className="flex flex-wrap items-center gap-[var(--space-inline-sm)]">
              <StatusChip
                label={`Pack v${pack.version} · ${pack.status}`}
                variant={pack.status === "approved" ? "approved" : "ai"}
              />
              {primaryArtifact?.currentApprovedVersionNumber ? (
                <StatusChip label={`Artifact v${primaryArtifact.currentApprovedVersionNumber}`} variant="approved" />
              ) : null}
            </div>
            {pack.requirementVersionId ? (
              <TraceabilityReference
                label="Targets Requirement Version"
                technicalId={pack.requirementVersionId}
                onNavigate={versionChainsEnabled ? () => setReqDetailId(pack.requirementVersionId!) : undefined}
                navigateLabel="View requirement version"
              />
            ) : null}
            <AiDraftPanel title={pack.title} versionLabel={`Version ${pack.version}`}>
              {pack.artifacts.map((artifact) => (
                <article key={artifact.id}>
                  <h4 className="font-[var(--font-weight-semibold)]">{artifact.title}</h4>
                  <p className="whitespace-pre-wrap text-[var(--color-text-secondary)]">{artifact.body}</p>
                </article>
              ))}
            </AiDraftPanel>
            {primaryArtifact ? (
              <VersionHistoryPanel
                title={`Prompt history · ${primaryArtifact.title}`}
                rows={historyRows}
                loading={historyQuery.isLoading}
                error={historyQuery.error}
                onRetry={() => void historyQuery.refetch()}
                disabledMessage={
                  !versionChainsEnabled
                    ? "Prompt version history is unavailable while immutable version chains are disabled."
                    : undefined
                }
                renderDetail={(row) => (
                  <PromptVersionDetailContent
                    versionId={row.id}
                    onNavigateRequirement={(id) => setReqDetailId(id)}
                  />
                )}
              />
            ) : null}
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
        <SidePanel open={reqDetailId != null} onClose={() => setReqDetailId(null)} title="Requirement version">
          {reqDetailId ? <RequirementVersionDetailContent versionId={reqDetailId} /> : null}
        </SidePanel>
      </div>
    </FeatureFlagGate>
  );
};

export default EngagementPromptsScreen;
