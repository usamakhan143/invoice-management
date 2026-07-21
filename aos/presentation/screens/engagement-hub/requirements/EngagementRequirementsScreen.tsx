/** ST-05 — Requirements (founder workflow step 1) */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_PERMISSION_KEY } from "../../../../constants/permissionKeys";
import { AOS_FEATURE_FLAG } from "../../../../config/featureFlags";
import { usePermissions } from "../../../../../hooks/usePermissions";
import { useRequirementVersionHistoryQuery } from "../../../../hooks/queries/useVersionHistoryQueries";
import { FeatureFlagGate, LockedOverlay, PermissionGate } from "../../../gates";
import { StickyFooterBar } from "../../../layouts";
import {
  requirementVersionLabel,
  VersionHistoryPanel,
  type VersionHistoryRow,
} from "../../../components/version-history";
import {
  AiDraftPanel,
  AiExplainBlock,
  ApprovalDialog,
  ApprovalPanel,
  Button,
  ContextPanel,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  RequirementCard,
  SidePanel,
  StatusChip,
  TextArea,
} from "../../../ui";
import { RequirementVersionDetailContent } from "../components/RequirementVersionDetailContent";
import { useEngagementWorkflowScreen } from "../useEngagementWorkflowScreen";

const EngagementRequirementsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission(AOS_PERMISSION_KEY.REQUIREMENTS_APPROVE);
  const { engagementId, workflow, isLoading, isError, error, refetch, mutations } =
    useEngagementWorkflowScreen();
  const [manualBody, setManualBody] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const versionChainsEnabled = workflow?.versionChainsEnabled ?? false;
  const requirementSet = workflow?.requirementSet;
  const historyQuery = useRequirementVersionHistoryQuery(
    engagementId,
    requirementSet?.id,
    versionChainsEnabled && Boolean(requirementSet),
  );

  const historyRows: VersionHistoryRow[] = useMemo(
    () =>
      (historyQuery.data ?? []).map((v) => ({
        id: v.id,
        primaryLabel: requirementVersionLabel(v.versionNumber),
        secondaryLabel: v.title,
        versionNumber: v.versionNumber,
        statusLabel: v.isCurrent ? "Current" : "Historical",
        statusVariant: v.isCurrent ? "approved" : "neutral",
        timestamp: v.publishedAt,
        isCurrent: v.isCurrent,
        readOnly: !v.isCurrent,
      })),
    [historyQuery.data],
  );

  if (isLoading) return <LoadingState message="Loading requirements…" />;
  if (isError) {
    return <ErrorState title="Could not load workflow" message={error?.message} onRetry={() => void refetch()} />;
  }

  return (
    <FeatureFlagGate
      flag={AOS_FEATURE_FLAG.REQUIREMENTS}
      fallback={<ErrorState title="Requirements module disabled" />}
    >
      <div
        id="aos-engagement-panel-requirements"
        role="tabpanel"
        aria-labelledby="aos-engagement-tab-requirements"
        className="grid gap-[var(--space-stack-lg)] lg:grid-cols-[1fr_320px]"
      >
        {!requirementSet ? (
          <EmptyState
            title="No requirements yet"
            description="Generate an AI draft from scope or capture requirements manually."
            action={
              <div className="flex flex-wrap justify-center gap-[var(--space-inline-md)]">
                <Button loading={mutations.generateRequirementsDraft.isPending} onClick={() => void mutations.generateRequirementsDraft.mutateAsync()}>
                  Generate from scope
                </Button>
                <Button variant="secondary" onClick={() => setManualBody(" ")}>Start capture</Button>
              </div>
            }
          />
        ) : (
          <>
            <RequirementCard
              title={requirementSet.title}
              version={requirementSet.version}
              status={requirementSet.status}
              requirementCount={requirementSet.items.length}
              aiGenerated={requirementSet.aiGenerated}
            />
            <div className="flex flex-wrap items-center gap-[var(--space-inline-sm)]">
              <StatusChip
                label={
                  requirementSet.status === "approved"
                    ? `Approved · v${requirementSet.currentApprovedVersionNumber ?? requirementSet.version}`
                    : `Draft · v${requirementSet.version}`
                }
                variant={requirementSet.status === "approved" ? "approved" : "ai"}
              />
              {requirementSet.approvedAt ? (
                <span className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                  Approved {new Date(requirementSet.approvedAt).toLocaleString()}
                </span>
              ) : null}
            </div>
            <AiDraftPanel title={requirementSet.title} versionLabel={`Version ${requirementSet.version}`} loading={mutations.generateRequirementsDraft.isPending}>
              {requirementSet.items.map((item) => (
                <article key={item.id}>
                  <h4 className="font-[var(--font-weight-semibold)]">{item.title}</h4>
                  <p className="text-[var(--color-text-secondary)]">{item.description}</p>
                  {item.acceptanceCriteria ? <AiExplainBlock>{item.acceptanceCriteria}</AiExplainBlock> : null}
                </article>
              ))}
            </AiDraftPanel>
            {!requirementSet.aiGenerated ? (
              <FormField label="Manual capture" htmlFor="req-body">
                <TextArea id="req-body" value={manualBody} onChange={(e) => setManualBody(e.target.value)} rows={6} />
              </FormField>
            ) : null}
            <VersionHistoryPanel
              title="Requirement version history"
              rows={historyRows}
              loading={historyQuery.isLoading}
              error={historyQuery.error}
              onRetry={() => void historyQuery.refetch()}
              disabledMessage={
                !versionChainsEnabled
                  ? "Version history uses the current workflow view while immutable version chains are disabled."
                  : undefined
              }
              emptyDescription={
                requirementSet.status === "approved" && historyRows.length === 0
                  ? "No dedicated historical versions yet. Legacy engagements may show only the current approved set."
                  : "Published immutable versions appear here after approval."
              }
              renderDetail={(row) => <RequirementVersionDetailContent versionId={row.id} />}
            />
          </>
        )}

        <div className="hidden lg:block">
          <ContextPanel>
            <p>Customer and scope context appear here during requirements review.</p>
            <Button variant="ghost" size="sm" onClick={() => setContextOpen(true)} className="mt-[var(--space-stack-sm)] lg:hidden">
              View context
            </Button>
          </ContextPanel>
          <PermissionGate
            permissions={AOS_PERMISSION_KEY.REQUIREMENTS_APPROVE}
            fallback={
              <LockedOverlay message="Approve permission required">
                <ApprovalPanel canApprove={false} onApprove={() => undefined} error="You can edit drafts but not approve." />
              </LockedOverlay>
            }
          >
            <ApprovalPanel
              canApprove={canApprove && requirementSet?.status === "draft"}
              loading={mutations.approveRequirements.isPending}
              onApprove={() => setApproveOpen(true)}
              error={mutations.approveRequirements.error?.message}
            />
          </PermissionGate>
        </div>

        <SidePanel open={contextOpen} onClose={() => setContextOpen(false)} title="Context">
          <ContextPanel>Engagement scope and ERP customer binding.</ContextPanel>
        </SidePanel>

        <StickyFooterBar>
          {requirementSet?.status === "approved" ? (
            <Button onClick={() => navigate(`/aos/delivery/${engagementId}/reuse`)}>Continue to Reuse</Button>
          ) : (
            <>
              {manualBody.trim() ? (
                <Button variant="secondary" loading={mutations.updateRequirementDraft.isPending} onClick={() => void mutations.updateRequirementDraft.mutateAsync(manualBody.trim())}>
                  Save draft
                </Button>
              ) : null}
              <Button disabled={!canApprove || requirementSet?.status !== "draft"} onClick={() => setApproveOpen(true)}>
                Approve requirement set
              </Button>
            </>
          )}
        </StickyFooterBar>

        <ApprovalDialog
          open={approveOpen}
          onClose={() => setApproveOpen(false)}
          title="Approve requirement set?"
          description="This unlocks reuse assessment for the engagement."
          confirmLabel="Approve requirement set"
          aiAddendum={requirementSet?.aiGenerated}
          noteRequired
          isPending={mutations.approveRequirements.isPending}
          onConfirm={(note) => {
            void mutations.approveRequirements.mutateAsync(note).then(() => {
              setApproveOpen(false);
              navigate(`/aos/delivery/${engagementId}/reuse`);
            });
          }}
        />
      </div>
    </FeatureFlagGate>
  );
};

export default EngagementRequirementsScreen;
