/** Learning candidate review SidePanel — F4 governance surface */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AOS_PERMISSION_KEY } from "../../../../constants/permissionKeys";
import {
  useLearningCandidateDetailQuery,
  useLearningGovernanceMutations,
} from "../../../../hooks/queries/useLearningReviewQueries";
import { PermissionGate } from "../../../gates";
import { TraceabilityReference } from "../../../components/version-history";
import {
  ApprovalDialog,
  Button,
  ConfirmationDialog,
  DangerDialog,
  DataTable,
  ErrorState,
  InAppAlert,
  KnowledgeCard,
  LinkButton,
  LoadingState,
  SidePanel,
  StatusChip,
} from "../../../ui";
import { mapLearningErrorMessage } from "../../../../hooks/learning/mapLearningErrorMessage";
import {
  formatCandidateStatus,
  formatCandidateType,
  formatTargetKind,
  formatVersionStrategy,
  resolvePromotedAssetHref,
  statusChipVariant,
} from "./learningReviewLabels";

export function LearningCandidateDetailSidePanel({
  candidateId,
  onClose,
}: {
  candidateId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const detailQuery = useLearningCandidateDetailQuery(candidateId);
  const mutations = useLearningGovernanceMutations();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deferOpen, setDeferOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const item = detailQuery.data;
  const isPending =
    mutations.approve.isPending ||
    mutations.reject.isPending ||
    mutations.defer.isPending ||
    mutations.promote.isPending;

  if (detailQuery.isLoading) {
    return (
      <SidePanel open title="Learning candidate" onClose={onClose}>
        <LoadingState message="Loading candidate review…" />
      </SidePanel>
    );
  }

  if (detailQuery.isError || !item) {
    return (
      <SidePanel open title="Learning candidate" onClose={onClose}>
        <ErrorState
          title="Candidate unavailable"
          message={mapLearningErrorMessage(detailQuery.error)}
          onRetry={() => void detailQuery.refetch()}
        />
      </SidePanel>
    );
  }

  const canReview =
    item.status === "pending_review" ||
    item.status === "gate_deferred" ||
    item.status === "promotion_failed";
  const canPromote = item.status === "approved" && item.canPromote;

  return (
    <SidePanel open title={item.title} onClose={onClose}>
      <div className="flex flex-col gap-[var(--space-stack-lg)]">
        {actionError ? (
          <InAppAlert variant="error" title="Action failed" message={actionError} />
        ) : null}

        <p className="text-[length:var(--font-size-body)] text-[var(--color-text-primary)]">{item.summary}</p>

        <div className="flex flex-wrap gap-[var(--space-inline-sm)]">
          <StatusChip label={formatCandidateStatus(item.status)} variant={statusChipVariant(item.status)} />
          <StatusChip label={formatCandidateType(item.candidateType)} variant="neutral" />
          <StatusChip
            label={`Confidence: ${item.confidence.organizationalConfidence}`}
            variant={item.confidence.promotionEligible ? "approved" : "neutral"}
          />
        </div>

        <KnowledgeCard
          title={item.engagementTitle}
          scope={item.clientLabel}
          knowledgeType="lesson"
          confidence={item.confidence.evidenceConfidence}
          promotionStatus={item.promotionTarget.targetKind}
          version={item.version}
        />

        <section aria-labelledby="learning-target-heading">
          <h3 id="learning-target-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)]">
            Promotion target
          </h3>
          <p className="text-[length:var(--font-size-body)]">
            {formatTargetKind(item.promotionTarget.targetKind)} —{" "}
            {formatVersionStrategy(item.promotionTarget.expectedVersionStrategy)}
          </p>
          {item.existingTargetLabel ? (
            <p className="mt-1 text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
              Supersedes: {item.existingTargetLabel}
            </p>
          ) : null}
        </section>

        {item.gateResult ? (
          <section aria-labelledby="learning-gates-heading">
            <h3 id="learning-gates-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)]">
              Quality gates
            </h3>
            <DataTable
              density="compact"
              columns={[
                { id: "gate", header: "Gate", cell: (row) => row.gateId },
                {
                  id: "status",
                  header: "Result",
                  cell: (row) => (
                    <StatusChip
                      label={row.status.replace(/_/g, " ")}
                      variant={row.status === "gate_passed" ? "approved" : "error"}
                    />
                  ),
                },
                { id: "message", header: "Detail", cell: (row) => row.message },
              ]}
              rows={item.gateResult.evaluations}
              getRowKey={(row) => row.gateId}
            />
          </section>
        ) : null}

        <section aria-labelledby="learning-provenance-heading">
          <h3 id="learning-provenance-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)]">
            Phase E provenance
          </h3>
          <div className="grid gap-[var(--space-stack-sm)] md:grid-cols-2">
            <TraceabilityReference label="Requirement version" technicalId={item.provenance.requirementVersionId} />
            <TraceabilityReference label="Prompt version" technicalId={item.provenance.promptVersionId} />
            <TraceabilityReference label="Cursor session" technicalId={item.provenance.cursorSessionId} />
            <TraceabilityReference label="Evaluation" technicalId={item.provenance.evaluationId} />
            <TraceabilityReference label="Retrospective" technicalId={item.retrospectiveId} />
            <TraceabilityReference label="Extraction run" technicalId={item.extractionRunId} />
          </div>
        </section>

        {item.aiRecommendation ? (
          <section aria-labelledby="learning-ai-heading">
            <h3 id="learning-ai-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)]">
              AI recommendation metadata
            </h3>
            <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
              {item.aiRecommendation.modelProvider} / {item.aiRecommendation.modelId} (prompt{" "}
              {item.aiRecommendation.promptVersion})
            </p>
          </section>
        ) : null}

        {item.promotion ? (
          <section aria-labelledby="learning-promoted-heading">
            <h3 id="learning-promoted-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)]">
              Promotion result
            </h3>
            <p className="text-[length:var(--font-size-body)]">
              Promoted to {formatTargetKind(item.promotion.promotedAssetKind)} v
              {item.promotion.promotedVersion}
            </p>
            <LinkButton
              onClick={() =>
                navigate(
                  resolvePromotedAssetHref(
                    item.promotion!.promotedAssetKind as import("../../../../constants/learningReview").PromotedAssetKind,
                    item.promotion!.promotedAssetId,
                  ),
                )
              }
            >
              View organizational asset
            </LinkButton>
          </section>
        ) : null}

        {item.promoteBlockReason && item.status === "approved" && !item.canPromote ? (
          <InAppAlert variant="warning" title="Not promotion eligible" message={item.promoteBlockReason} />
        ) : null}

        <div className="flex flex-wrap gap-[var(--space-inline-sm)] border-t border-[var(--color-border-default)] pt-[var(--space-stack-md)]">
          <PermissionGate permissions={[AOS_PERMISSION_KEY.LEARNING_REVIEW, AOS_PERMISSION_KEY.ADMIN]}>
            {canReview ? (
              <>
                <Button disabled={isPending} onClick={() => setApproveOpen(true)}>
                  Approve
                </Button>
                <Button variant="secondary" disabled={isPending} onClick={() => setDeferOpen(true)}>
                  Defer
                </Button>
                <Button variant="danger" disabled={isPending} onClick={() => setRejectOpen(true)}>
                  Reject
                </Button>
              </>
            ) : null}
          </PermissionGate>
          <PermissionGate permissions={[AOS_PERMISSION_KEY.LEARNING_PROMOTE, AOS_PERMISSION_KEY.ADMIN]}>
            {canPromote ? (
              <Button disabled={isPending} onClick={() => setPromoteOpen(true)}>
                Promote to catalog
              </Button>
            ) : null}
          </PermissionGate>
          <LinkButton
            onClick={() =>
              navigate(`/aos/delivery/${item.engagementId}/retrospective`)
            }
          >
            View source retrospective
          </LinkButton>
        </div>

        <ApprovalDialog
          open={approveOpen}
          onClose={() => setApproveOpen(false)}
          title="Approve learning candidate?"
          description="Approved candidates may be promoted into organizational catalogs after explicit promotion."
          confirmLabel="Approve candidate"
          aiAddendum={Boolean(item.aiRecommendation)}
          isPending={mutations.approve.isPending}
          onConfirm={(note) =>
            void mutations.approve
              .mutateAsync({
                candidateId: item.candidateId,
                expectedVersion: item.version,
                approvalNote: note,
              })
              .then(() => {
                setApproveOpen(false);
                setActionError(null);
              })
              .catch((error) => setActionError(mapLearningErrorMessage(error)))
          }
        />

        <DangerDialog
          open={rejectOpen}
          onClose={() => setRejectOpen(false)}
          title="Reject learning candidate?"
          description="Rejected candidates cannot be promoted. This decision is terminal."
          confirmLabel="Reject candidate"
          isPending={mutations.reject.isPending}
          reasonLabel="Rejection reason"
          onConfirm={(reason) =>
            void mutations.reject
              .mutateAsync({
                candidateId: item.candidateId,
                expectedVersion: item.version,
                rejectionReason: reason,
              })
              .then(() => {
                setRejectOpen(false);
                setActionError(null);
              })
              .catch((error) => setActionError(mapLearningErrorMessage(error)))
          }
        />

        <ApprovalDialog
          open={deferOpen}
          onClose={() => setDeferOpen(false)}
          title="Defer for more evidence?"
          description="Deferred candidates remain visible but leave the active review queue."
          confirmLabel="Defer candidate"
          isPending={mutations.defer.isPending}
          onConfirm={(reason) =>
            void mutations.defer
              .mutateAsync({
                candidateId: item.candidateId,
                expectedVersion: item.version,
                deferReason: reason,
              })
              .then(() => {
                setDeferOpen(false);
                setActionError(null);
              })
              .catch((error) => setActionError(mapLearningErrorMessage(error)))
          }
        />

        <ConfirmationDialog
          open={promoteOpen}
          onClose={() => setPromoteOpen(false)}
          title="Promote to organizational catalog?"
          description={`This will create a non-destructive ${formatVersionStrategy(item.promotionTarget.expectedVersionStrategy).toLowerCase()} in ${formatTargetKind(item.promotionTarget.targetKind)}. Promotion requires human governance and cannot be undone automatically.`}
          confirmLabel="Promote now"
          isPending={mutations.promote.isPending}
          onConfirm={() =>
            void mutations.promote
              .mutateAsync({
                candidateId: item.candidateId,
                expectedVersion: item.version,
              })
              .then(() => {
                setPromoteOpen(false);
                setActionError(null);
              })
              .catch((error) => setActionError(mapLearningErrorMessage(error)))
          }
        />
      </div>
    </SidePanel>
  );
}
