import React, { useMemo, useState } from "react";
import type { BosMilestone } from "../../../../bos/domain/entities/milestone";
import type { CompleteBosMilestoneInput } from "../../../../bos/domain/entities/milestone";
import {
  getMilestoneDisplayStatusBadgeClass,
  getMilestoneDisplayStatusLabel,
} from "../../../../utils/bosMilestoneDisplay";
import { MILESTONE_PRIORITY_LABELS } from "../../../../bos/constants/milestonePriority";
import { MILESTONE_BUSINESS_IMPACT_LABELS } from "../../../../bos/constants/milestoneBusinessImpact";
import { MILESTONE_RISK_LEVEL_LABELS } from "../../../../bos/constants/milestoneRiskLevel";
import { MILESTONE_DURATION_UNIT_LABELS } from "../../../../bos/constants/milestoneDurationUnit";
import { MILESTONE_COMPLETION_REQUIREMENT_LABELS } from "../../../../bos/constants/milestoneCompletionRequirement";
import { MILESTONE_EVIDENCE_SOURCE_LABELS } from "../../../../bos/constants/milestoneEvidenceType";
import { MILESTONE_RESULT_LABELS } from "../../../../bos/constants/milestoneResult";
import { MILESTONE_DELAY_REASON_LABELS } from "../../../../bos/constants/milestoneDelayReason";
import { MILESTONE_FAILURE_ROOT_CAUSE_LABELS } from "../../../../bos/constants/milestoneFailureRootCause";
import { MILESTONE_COMPLETION_NEXT_ACTION_LABELS } from "../../../../bos/constants/milestoneCompletionNextAction";
import type { MilestoneLinkOption } from "../../../../bos/application/milestoneCompletionForm";
import {
  BOS_FIELD_CLASS,
  formatBosDate,
  formatBosMoney,
  formatBosPlannedDateInput,
  parseBosPlannedDate,
} from "../../../../utils/bosFormat";
import {
  BOS_AMBER_BTN,
  BOS_BLUE_BTN,
  BOS_ICON_BTN,
  BOS_PRIMARY_BTN_SM,
  BOS_SECONDARY_BTN_SM,
  BOS_TEXT_BTN_SM,
} from "./bosButtonClasses";
import BosModal from "./BosModal";
import BosFormFieldLabel from "../BosFormFieldLabel";
import BosMilestoneForm from "./BosMilestoneForm";
import BosMilestoneCompleteModal from "./BosMilestoneCompleteModal";
import type { MilestoneFormSubmitPayload, UserOption } from "./milestoneFormTypes";
import { MILESTONE_STATUS } from "../../../../bos/constants/milestoneStatus";

export type { MilestoneFormSubmitPayload };

export interface BosMilestoneListProps {
  milestones: BosMilestone[];
  canManage: boolean;
  canManageTemplates?: boolean;
  userOptions: UserOption[];
  defaultCurrency?: string;
  decisionOptions?: MilestoneLinkOption[];
  expenseOptions?: MilestoneLinkOption[];
  invoiceOptions?: MilestoneLinkOption[];
  ownerLabelByUserId: (userId: string) => string;
  milestoneLabelById?: (id: string) => string;
  actionLoading: boolean;
  onCreate: (input: MilestoneFormSubmitPayload) => Promise<void>;
  onUpdate: (id: string, input: MilestoneFormSubmitPayload) => Promise<void>;
  onSaveInitiativeAsTemplate?: () => void;
  actorUserId?: string;
  actorLabel?: string;
  onStart: (
    id: string,
    input: { startedAt: number; startedNotes?: string; startedByUserId?: string },
  ) => Promise<void>;
  onComplete: (
    id: string,
    input: Omit<CompleteBosMilestoneInput, "updatedById">,
  ) => Promise<void>;
  onBlock: (id: string, reason: string) => Promise<void>;
  onSkip: (id: string, reason?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveUp: (id: string) => Promise<void>;
  onMoveDown: (id: string) => Promise<void>;
  requestOpenCreate?: boolean;
  onRequestOpenCreateHandled?: () => void;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {title}
      </p>
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  return (
    <p>
      <span className="font-medium text-gray-500">{label}: </span>
      {value}
    </p>
  );
}

function MilestoneDetails({
  milestone,
  defaultCurrency,
  ownerLabel,
  startedByLabel,
  dependencyLabels,
}: {
  milestone: BosMilestone;
  defaultCurrency: string;
  ownerLabel: string;
  startedByLabel?: string;
  dependencyLabels: string[];
}) {
  const requirementKeys = milestone.completionRequirements
    ? Object.entries(milestone.completionRequirements)
        .filter(([, v]) => v)
        .map(([k]) => k as keyof typeof MILESTONE_COMPLETION_REQUIREMENT_LABELS)
    : [];

  const hasPlanning =
    milestone.phase ||
    milestone.milestoneType ||
    milestone.priority ||
    milestone.plannedStartDate ||
    milestone.plannedEndDate ||
    milestone.estimatedDuration ||
    milestone.estimatedCostAmount !== undefined ||
    milestone.tags?.length;

  const hasOwnership = ownerLabel || milestone.startedAt || startedByLabel;
  const hasSuccess = milestone.successCriteria || requirementKeys.length;
  const hasEvidence =
    milestone.evidence?.length ||
    milestone.completionNotes ||
    milestone.lessonsLearned ||
    milestone.completedDate ||
    milestone.milestoneResult ||
    milestone.delayReason ||
    milestone.failureRootCause;
  const hasDependencies = dependencyLabels.length > 0;
  const hasRisk = milestone.riskLevel || milestone.businessImpact || milestone.blockedReason;
  const hasNotes = milestone.description || milestone.notes || milestone.startedNotes;

  return (
    <div className="mt-4 space-y-5 border-t border-gray-100 pt-4 dark:border-gray-800">
      {hasPlanning ? (
        <DetailSection title="Planning">
          <DetailRow label="Phase" value={milestone.phase ?? "—"} />
          <DetailRow label="Type" value={milestone.milestoneType} />
          <DetailRow
            label="Priority"
            value={milestone.priority ? MILESTONE_PRIORITY_LABELS[milestone.priority] : undefined}
          />
          <DetailRow
            label="Target start"
            value={milestone.plannedStartDate ? formatBosDate(milestone.plannedStartDate) : undefined}
          />
          <DetailRow
            label="Target date"
            value={milestone.plannedEndDate ? formatBosDate(milestone.plannedEndDate) : undefined}
          />
          {milestone.estimatedDuration && milestone.estimatedDurationUnit ? (
            <DetailRow
              label="Est. duration"
              value={`${milestone.estimatedDuration} ${MILESTONE_DURATION_UNIT_LABELS[milestone.estimatedDurationUnit]}`}
            />
          ) : null}
          {milestone.estimatedCostAmount !== undefined ? (
            <DetailRow
              label="Est. cost"
              value={formatBosMoney(
                milestone.estimatedCostAmount,
                milestone.estimatedCostCurrency ?? defaultCurrency,
              )}
            />
          ) : null}
          {milestone.tags?.length ? (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {milestone.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-200/60 px-2 py-0.5 text-[10px] dark:bg-gray-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </DetailSection>
      ) : null}

      {hasOwnership ? (
        <DetailSection title="Ownership">
          <DetailRow label="Owner" value={ownerLabel} />
          <DetailRow
            label="Started date"
            value={milestone.startedAt ? formatBosDate(milestone.startedAt) : undefined}
          />
          <DetailRow label="Started by" value={startedByLabel} />
        </DetailSection>
      ) : null}

      {hasSuccess ? (
        <DetailSection title="Success criteria">
          <DetailRow label="Criteria" value={milestone.successCriteria} />
          {requirementKeys.length ? (
            <DetailRow
              label="Requirements"
              value={requirementKeys.map((k) => MILESTONE_COMPLETION_REQUIREMENT_LABELS[k]).join(", ")}
            />
          ) : null}
        </DetailSection>
      ) : null}

      {hasEvidence ? (
        <DetailSection title="Evidence">
          <DetailRow
            label="Completed date"
            value={milestone.completedDate ? formatBosDate(milestone.completedDate) : undefined}
          />
          <DetailRow label="Outcome summary" value={milestone.completionNotes} />
          <DetailRow label="Lessons learned" value={milestone.lessonsLearned} />
          <DetailRow
            label="Milestone result"
            value={
              milestone.milestoneResult
                ? MILESTONE_RESULT_LABELS[milestone.milestoneResult]
                : undefined
            }
          />
          <DetailRow
            label="Delay reason"
            value={
              milestone.delayReason ? MILESTONE_DELAY_REASON_LABELS[milestone.delayReason] : undefined
            }
          />
          <DetailRow
            label="Root cause"
            value={
              milestone.failureRootCause
                ? MILESTONE_FAILURE_ROOT_CAUSE_LABELS[milestone.failureRootCause]
                : undefined
            }
          />
          <DetailRow label="Root cause explanation" value={milestone.failureRootCauseNotes} />
          <DetailRow
            label="Next action"
            value={
              milestone.completionNextAction
                ? milestone.completionNextActionCustom?.trim()
                  ? milestone.completionNextActionCustom
                  : MILESTONE_COMPLETION_NEXT_ACTION_LABELS[milestone.completionNextAction]
                : undefined
            }
          />
          {milestone.evidence?.length ? (
            <ul className="list-inside list-disc space-y-0.5 text-gray-500">
              {milestone.evidence.map((e) => (
                <li key={e.id}>
                  {MILESTONE_EVIDENCE_SOURCE_LABELS[e.type] ?? e.type}
                  {e.notes ? ` — ${e.notes}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </DetailSection>
      ) : null}

      {hasDependencies ? (
        <DetailSection title="Dependencies">
          <p>{dependencyLabels.join(", ")}</p>
        </DetailSection>
      ) : null}

      {hasRisk ? (
        <DetailSection title="Risk">
          <DetailRow
            label="Risk level"
            value={milestone.riskLevel ? MILESTONE_RISK_LEVEL_LABELS[milestone.riskLevel] : undefined}
          />
          <DetailRow
            label="Business impact"
            value={
              milestone.businessImpact
                ? MILESTONE_BUSINESS_IMPACT_LABELS[milestone.businessImpact]
                : undefined
            }
          />
          <DetailRow label="Block reason" value={milestone.blockedReason} />
        </DetailSection>
      ) : null}

      {hasNotes ? (
        <DetailSection title="Notes">
          <DetailRow label="Description" value={milestone.description} />
          <DetailRow label="Notes" value={milestone.notes} />
          <DetailRow label="Start notes" value={milestone.startedNotes} />
        </DetailSection>
      ) : null}
    </div>
  );
}

const BosMilestoneList: React.FC<BosMilestoneListProps> = ({
  milestones,
  canManage,
  canManageTemplates,
  userOptions,
  defaultCurrency = "USD",
  ownerLabelByUserId,
  milestoneLabelById,
  actionLoading,
  onCreate,
  onUpdate,
  onSaveInitiativeAsTemplate,
  actorUserId,
  actorLabel,
  decisionOptions = [],
  expenseOptions = [],
  invoiceOptions = [],
  onStart,
  onComplete,
  onBlock,
  onSkip,
  onDelete,
  onMoveUp,
  onMoveDown,
  requestOpenCreate,
  onRequestOpenCreateHandled,
}) => {
  const sorted = useMemo(
    () => [...milestones].sort((a, b) => a.sequence - b.sequence),
    [milestones],
  );

  const [showCreate, setShowCreate] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<BosMilestone | null>(null);
  const [startTarget, setStartTarget] = useState<BosMilestone | null>(null);
  const [completeTarget, setCompleteTarget] = useState<BosMilestone | null>(null);
  const [blockTarget, setBlockTarget] = useState<BosMilestone | null>(null);

  const [startedDate, setStartedDate] = useState("");
  const [startedNotes, setStartedNotes] = useState("");
  const [blockReason, setBlockReason] = useState("");

  React.useEffect(() => {
    if (requestOpenCreate) {
      setShowCreate(true);
      onRequestOpenCreateHandled?.();
    }
  }, [requestOpenCreate, onRequestOpenCreateHandled]);

  const toggleDetails = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openStart = (milestone: BosMilestone) => {
    setStartTarget(milestone);
    const todayKey = formatBosPlannedDateInput(Date.now());
    const plannedKey = milestone.plannedStartDate
      ? formatBosPlannedDateInput(milestone.plannedStartDate)
      : undefined;
    setStartedDate(plannedKey && plannedKey <= todayKey ? plannedKey : todayKey);
    setStartedNotes("");
  };

  const openComplete = (milestone: BosMilestone) => {
    setCompleteTarget(milestone);
  };

  const completeMilestone = useMemo(() => {
    if (!completeTarget) return null;
    return sorted.find((m) => m.id === completeTarget.id) ?? completeTarget;
  }, [completeTarget, sorted]);

  const handleMilestoneAction = (milestone: BosMilestone, action: string) => {
    switch (action) {
      case "edit":
        setEditTarget(milestone);
        break;
      case "start":
        openStart(milestone);
        break;
      case "complete":
        openComplete(milestone);
        break;
      case "block":
        setBlockTarget(milestone);
        setBlockReason("");
        break;
      case "skip":
        void onSkip(milestone.id);
        break;
      case "delete":
        void onDelete(milestone.id);
        break;
      default:
        break;
    }
  };

  const actionOptionsFor = (milestone: BosMilestone): { value: string; label: string }[] => {
    const options: { value: string; label: string }[] = [{ value: "edit", label: "Edit" }];
    if (
      milestone.status === MILESTONE_STATUS.PLANNED ||
      milestone.status === MILESTONE_STATUS.READY
    ) {
      options.push({ value: "start", label: "Start" });
    }
    if (
      milestone.status === MILESTONE_STATUS.IN_PROGRESS ||
      milestone.status === MILESTONE_STATUS.READY
    ) {
      options.push({ value: "complete", label: "Complete" });
    }
    if (
      milestone.status !== MILESTONE_STATUS.COMPLETED &&
      milestone.status !== MILESTONE_STATUS.SKIPPED
    ) {
      options.push({ value: "block", label: "Block" }, { value: "skip", label: "Skip" });
    }
    if (milestone.status === MILESTONE_STATUS.PLANNED) {
      options.push({ value: "delete", label: "Delete" });
    }
    return options;
  };

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
            Milestones
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Your business outcomes — status reflects stored records only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageTemplates && onSaveInitiativeAsTemplate && sorted.length > 0 ? (
            <button
              type="button"
              className={BOS_SECONDARY_BTN_SM}
              onClick={onSaveInitiativeAsTemplate}
            >
              Save as template
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className={BOS_PRIMARY_BTN_SM}
              onClick={() => setShowCreate(true)}
            >
              Add milestone
            </button>
          ) : null}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          No milestones yet. {canManage ? "Define your first business outcome." : ""}
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {sorted.map((milestone, index) => {
            const target = milestone.plannedEndDate;
            const ownerLabel = milestone.ownerUserId
              ? ownerLabelByUserId(milestone.ownerUserId)
              : "Unassigned";
            const expanded = expandedIds.has(milestone.id);
            const dependencyLabels =
              milestone.dependencyIds?.map(
                (id) => milestoneLabelById?.(id) ?? id,
              ) ?? [];
            const startedByLabel = milestone.startedByUserId
              ? ownerLabelByUserId(milestone.startedByUserId)
              : undefined;

            return (
              <li
                key={milestone.id}
                className="rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950/30"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {milestone.milestoneNumber ? (
                        <span className="font-mono text-xs font-semibold text-gray-400">
                          {milestone.milestoneNumber}
                        </span>
                      ) : null}
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {milestone.title}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getMilestoneDisplayStatusBadgeClass(milestone)}`}
                      >
                        {getMilestoneDisplayStatusLabel(milestone)}
                      </span>
                    </div>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="inline text-gray-400">Phase: </dt>
                        <dd className="inline text-gray-700 dark:text-gray-200">
                          {milestone.phase ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-gray-400">Target: </dt>
                        <dd className="inline text-gray-700 dark:text-gray-200">
                          {target ? formatBosDate(target) : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-gray-400">Owner: </dt>
                        <dd className="inline text-gray-700 dark:text-gray-200">{ownerLabel}</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      className={BOS_TEXT_BTN_SM}
                      onClick={() => toggleDetails(milestone.id)}
                    >
                      {expanded ? "Hide details" : "Details"}
                    </button>
                    {expanded ? (
                      <MilestoneDetails
                        milestone={milestone}
                        defaultCurrency={defaultCurrency}
                        ownerLabel={ownerLabel}
                        startedByLabel={startedByLabel}
                        dependencyLabels={dependencyLabels}
                      />
                    ) : null}
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={BOS_ICON_BTN}
                          disabled={actionLoading || index === 0}
                          onClick={() => void onMoveUp(milestone.id)}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={BOS_ICON_BTN}
                          disabled={actionLoading || index === sorted.length - 1}
                          onClick={() => void onMoveDown(milestone.id)}
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                      <select
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                        defaultValue=""
                        disabled={actionLoading}
                        onChange={(e) => {
                          const action = e.target.value;
                          e.target.value = "";
                          if (!action) return;
                          handleMilestoneAction(milestone, action);
                        }}
                        aria-label={`Actions for ${milestone.title}`}
                      >
                        <option value="">Actions</option>
                        {actionOptionsFor(milestone).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BosModal open={showCreate} title="New milestone" onClose={() => setShowCreate(false)} wide>
        <BosMilestoneForm
          mode="create"
          milestones={sorted}
          userOptions={userOptions}
          defaultCurrency={defaultCurrency}
          actionLoading={actionLoading}
          onSubmit={async (payload) => {
            await onCreate(payload);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      </BosModal>

      <BosModal open={!!editTarget} title="Edit milestone" onClose={() => setEditTarget(null)} wide>
        {editTarget ? (
          <BosMilestoneForm
            mode="edit"
            initialMilestone={editTarget}
            milestones={sorted}
            userOptions={userOptions}
            defaultCurrency={defaultCurrency}
            actionLoading={actionLoading}
            onSubmit={async (payload) => {
              await onUpdate(editTarget.id, payload);
              setEditTarget(null);
            }}
            onCancel={() => setEditTarget(null)}
            submitLabel="Save changes"
          />
        ) : null}
      </BosModal>

      <BosModal open={!!startTarget} title="Start milestone" onClose={() => setStartTarget(null)}>
        {startTarget ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const dateMs = parseBosPlannedDate(startedDate);
              if (dateMs === undefined) return;
              void onStart(startTarget.id, {
                startedAt: dateMs,
                startedNotes: startedNotes.trim() || undefined,
                startedByUserId: actorUserId,
              }).then(() => setStartTarget(null));
            }}
          >
            <div>
              <BosFormFieldLabel
                htmlFor="ms-started-date"
                label="Started date"
                tip="When work on this milestone began — separate from the target date."
              />
              <input
                id="ms-started-date"
                type="date"
                className={BOS_FIELD_CLASS}
                value={startedDate}
                max={formatBosPlannedDateInput(Date.now())}
                onChange={(e) => setStartedDate(e.target.value)}
                required
              />
            </div>
            <div>
              <BosFormFieldLabel
                htmlFor="ms-started-notes"
                label="Notes (optional)"
                tip="Context recorded when starting this milestone."
              />
              <textarea
                id="ms-started-notes"
                className={BOS_FIELD_CLASS}
                rows={2}
                placeholder="Optional context for starting this milestone"
                value={startedNotes}
                onChange={(e) => setStartedNotes(e.target.value)}
              />
            </div>
            <div>
              <BosFormFieldLabel htmlFor="ms-started-by" label="Started by" />
              <input
                id="ms-started-by"
                type="text"
                className={`${BOS_FIELD_CLASS} bg-gray-50 dark:bg-gray-950`}
                value={actorLabel ?? "You"}
                readOnly
              />
            </div>
            <button
              type="submit"
              className={BOS_BLUE_BTN}
              disabled={actionLoading}
            >
              Save & start
            </button>
          </form>
        ) : null}
      </BosModal>

      <BosMilestoneCompleteModal
        milestone={completeMilestone}
        allMilestones={sorted}
        decisionOptions={decisionOptions}
        expenseOptions={expenseOptions}
        invoiceOptions={invoiceOptions}
        actionLoading={actionLoading}
        onClose={() => setCompleteTarget(null)}
        onComplete={onComplete}
      />

      <BosModal open={!!blockTarget} title="Block milestone" onClose={() => setBlockTarget(null)}>
        {blockTarget ? (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void onBlock(blockTarget.id, blockReason.trim()).then(() => setBlockTarget(null)); }}>
            <BosFormFieldLabel htmlFor="ms-block-reason" label="Block reason" tip="Stored on the milestone for situation and timeline." />
            <textarea id="ms-block-reason" className={BOS_FIELD_CLASS} rows={3} placeholder="Why is this milestone blocked?" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} required />
            <button type="submit" className={BOS_AMBER_BTN} disabled={actionLoading}>Block milestone</button>
          </form>
        ) : null}
      </BosModal>
    </div>
  );
};

export default BosMilestoneList;
