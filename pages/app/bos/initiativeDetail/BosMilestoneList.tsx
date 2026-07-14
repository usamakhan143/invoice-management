import React, { useMemo, useState } from "react";
import type { BosMilestone } from "../../../../bos/domain/entities/milestone";
import type { BosMilestoneTemplate } from "../../../../bos/domain/entities/milestoneTemplate";
import {
  MILESTONE_EVIDENCE_TYPE,
  type MilestoneEvidenceType,
} from "../../../../bos/constants/milestoneEvidenceType";
import {
  MILESTONE_STATUS,
  MILESTONE_STATUS_LABELS,
  type MilestoneStatus,
} from "../../../../bos/constants/milestoneStatus";
import { MILESTONE_PRIORITY_LABELS } from "../../../../bos/constants/milestonePriority";
import { MILESTONE_BUSINESS_IMPACT_LABELS } from "../../../../bos/constants/milestoneBusinessImpact";
import { MILESTONE_DURATION_UNIT_LABELS } from "../../../../bos/constants/milestoneDurationUnit";
import { formatBosMoney } from "../../../../utils/bosFormat";
import { MILESTONE_TEMPLATE_VISIBILITY } from "../../../../bos/constants/milestoneTemplateVisibility";
import { computeMilestoneProgressPercent } from "../../../../bos/application/milestoneSituation";
import {
  BOS_FIELD_CLASS,
  formatBosDate,
  formatBosPlannedDateInput,
  parseBosPlannedDate,
} from "../../../../utils/bosFormat";
import BosModal from "./BosModal";
import BosFormFieldLabel from "../BosFormFieldLabel";
import BosMilestoneForm from "./BosMilestoneForm";
import type { MilestoneFormSubmitPayload, UserOption } from "./milestoneFormTypes";

export type { MilestoneFormSubmitPayload };

export interface BosMilestoneListProps {
  milestones: BosMilestone[];
  canManage: boolean;
  canManageTemplates?: boolean;
  userOptions: UserOption[];
  defaultCurrency?: string;
  availableTemplates?: BosMilestoneTemplate[];
  ownerLabelByUserId: (userId: string) => string;
  actionLoading: boolean;
  onCreate: (input: MilestoneFormSubmitPayload) => Promise<void>;
  onUpdate: (id: string, input: MilestoneFormSubmitPayload) => Promise<void>;
  onSaveTemplateStep?: (input: {
    action: "create" | "append";
    step: MilestoneFormSubmitPayload;
    templateName?: string;
    templateId?: string;
    visibility?: string;
  }) => Promise<void>;
  onStart: (id: string) => Promise<void>;
  onComplete: (
    id: string,
    input: { completedDate: number; evidenceType: MilestoneEvidenceType; notes?: string; sourceId?: string },
  ) => Promise<void>;
  onBlock: (id: string, reason: string) => Promise<void>;
  onSkip: (id: string, reason?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMoveUp: (id: string) => Promise<void>;
  onMoveDown: (id: string) => Promise<void>;
}

function statusIcon(status: MilestoneStatus): string {
  switch (status) {
    case MILESTONE_STATUS.COMPLETED:
      return "✓";
    case MILESTONE_STATUS.IN_PROGRESS:
      return "●";
    case MILESTONE_STATUS.BLOCKED:
      return "!";
    case MILESTONE_STATUS.SKIPPED:
      return "—";
    case MILESTONE_STATUS.READY:
      return "○";
    default:
      return "·";
  }
}

function statusColorClass(status: MilestoneStatus): string {
  switch (status) {
    case MILESTONE_STATUS.COMPLETED:
      return "bg-emerald-600 text-white dark:bg-emerald-500";
    case MILESTONE_STATUS.IN_PROGRESS:
      return "bg-blue-600 text-white dark:bg-blue-500";
    case MILESTONE_STATUS.BLOCKED:
      return "bg-amber-500 text-white";
    case MILESTONE_STATUS.SKIPPED:
      return "bg-gray-400 text-white";
    case MILESTONE_STATUS.READY:
      return "border-2 border-blue-500 text-blue-600 dark:text-blue-400";
    default:
      return "border border-gray-300 text-gray-400 dark:border-gray-600";
  }
}

const BosMilestoneList: React.FC<BosMilestoneListProps> = ({
  milestones,
  canManage,
  canManageTemplates,
  userOptions,
  defaultCurrency = "USD",
  availableTemplates = [],
  ownerLabelByUserId,
  actionLoading,
  onCreate,
  onUpdate,
  onSaveTemplateStep,
  onStart,
  onComplete,
  onBlock,
  onSkip,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const sorted = useMemo(
    () => [...milestones].sort((a, b) => a.sequence - b.sequence),
    [milestones],
  );

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<BosMilestone | null>(null);
  const [completeTarget, setCompleteTarget] = useState<BosMilestone | null>(null);
  const [blockTarget, setBlockTarget] = useState<BosMilestone | null>(null);

  const [pendingTemplatePayload, setPendingTemplatePayload] =
    useState<MilestoneFormSubmitPayload | null>(null);
  const [templateAction, setTemplateAction] = useState<"create" | "append">("create");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [appendTemplateId, setAppendTemplateId] = useState("");
  const [templateVisibility, setTemplateVisibility] = useState<string>(
    MILESTONE_TEMPLATE_VISIBILITY.COMPANY,
  );

  const [evidenceType, setEvidenceType] = useState<MilestoneEvidenceType>(
    MILESTONE_EVIDENCE_TYPE.MANUAL,
  );
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [evidenceSourceId, setEvidenceSourceId] = useState("");
  const [completedDate, setCompletedDate] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const openComplete = (milestone: BosMilestone) => {
    setCompleteTarget(milestone);
    setCompletedDate(formatBosPlannedDateInput(Date.now()));
    setEvidenceType(MILESTONE_EVIDENCE_TYPE.MANUAL);
    setEvidenceNotes("");
    setEvidenceSourceId("");
  };

  const handleCreateSubmit = async (payload: MilestoneFormSubmitPayload) => {
    await onCreate(payload);
    setShowCreate(false);
    if (payload.saveAsTemplate && canManageTemplates && onSaveTemplateStep) {
      setPendingTemplatePayload(payload);
      setTemplateAction("create");
      setNewTemplateName(payload.title);
      setAppendTemplateId(availableTemplates[0]?.id ?? "");
    }
  };

  const handleTemplateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTemplatePayload || !onSaveTemplateStep) return;
    if (templateAction === "create" && !newTemplateName.trim()) return;
    if (templateAction === "append" && !appendTemplateId) return;
    await onSaveTemplateStep({
      action: templateAction,
      step: pendingTemplatePayload,
      templateName: newTemplateName.trim(),
      templateId: appendTemplateId,
      visibility: templateVisibility,
    });
    setPendingTemplatePayload(null);
  };

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
            Milestones
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Business outcomes you define — each with explicit success criteria and evidence settings.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
            onClick={() => setShowCreate(true)}
          >
            Add milestone
          </button>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          No milestones yet. {canManage ? "Define your first business outcome." : ""}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {sorted.map((milestone, index) => {
            const progress = computeMilestoneProgressPercent(milestone);
            const target = milestone.plannedEndDate;
            const ownerLabel = milestone.ownerUserId
              ? ownerLabelByUserId(milestone.ownerUserId)
              : "Unassigned";

            return (
              <li
                key={milestone.id}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-950/40"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${statusColorClass(milestone.status)}`}
                    title={MILESTONE_STATUS_LABELS[milestone.status]}
                  >
                    {statusIcon(milestone.status)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {milestone.milestoneNumber ? (
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          {milestone.milestoneNumber}
                        </span>
                      ) : null}
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {milestone.title}
                      </p>
                      {milestone.phase ? (
                        <span className="rounded-full bg-gray-200/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {milestone.phase}
                        </span>
                      ) : null}
                      {milestone.priority ? (
                        <span className="text-[10px] font-medium uppercase text-gray-400">
                          {MILESTONE_PRIORITY_LABELS[milestone.priority]}
                        </span>
                      ) : null}
                      {milestone.businessImpact ? (
                        <span className="text-[10px] font-medium uppercase text-gray-400">
                          Impact: {MILESTONE_BUSINESS_IMPACT_LABELS[milestone.businessImpact]}
                        </span>
                      ) : null}
                      <span className="ml-auto text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        {MILESTONE_STATUS_LABELS[milestone.status]}
                      </span>
                    </div>
                    {milestone.successCriteria ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                        {milestone.successCriteria}
                      </p>
                    ) : milestone.description ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {milestone.description}
                      </p>
                    ) : null}
                    {milestone.tags?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {milestone.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-gray-200/60 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>Owner: {ownerLabel}</span>
                      <span>Target: {target ? formatBosDate(target) : "—"}</span>
                      {milestone.estimatedDuration && milestone.estimatedDurationUnit ? (
                        <span>
                          Est. duration: {milestone.estimatedDuration}{" "}
                          {MILESTONE_DURATION_UNIT_LABELS[milestone.estimatedDurationUnit]}
                        </span>
                      ) : null}
                      {milestone.estimatedCostAmount !== undefined ? (
                        <span>
                          Est. cost:{" "}
                          {formatBosMoney(
                            milestone.estimatedCostAmount,
                            milestone.estimatedCostCurrency ?? defaultCurrency,
                          )}
                        </span>
                      ) : null}
                      {milestone.milestoneType ? <span>Type: {milestone.milestoneType}</span> : null}
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gray-900 transition-all dark:bg-white"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {milestone.blockedReason ? (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        Blocked: {milestone.blockedReason}
                      </p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="rounded px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800" disabled={actionLoading || index === 0} onClick={() => void onMoveUp(milestone.id)}>↑</button>
                      <button type="button" className="rounded px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800" disabled={actionLoading || index === sorted.length - 1} onClick={() => void onMoveDown(milestone.id)}>↓</button>
                      <button type="button" className="rounded px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800" disabled={actionLoading} onClick={() => setEditTarget(milestone)}>Edit</button>
                      {(milestone.status === MILESTONE_STATUS.PLANNED || milestone.status === MILESTONE_STATUS.READY) ? (
                        <button type="button" className="rounded px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" disabled={actionLoading} onClick={() => void onStart(milestone.id)}>Start</button>
                      ) : null}
                      {(milestone.status === MILESTONE_STATUS.IN_PROGRESS || milestone.status === MILESTONE_STATUS.READY) ? (
                        <button type="button" className="rounded px-2 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" disabled={actionLoading} onClick={() => openComplete(milestone)}>Complete</button>
                      ) : null}
                      {milestone.status !== MILESTONE_STATUS.COMPLETED && milestone.status !== MILESTONE_STATUS.SKIPPED ? (
                        <>
                          <button type="button" className="rounded px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" disabled={actionLoading} onClick={() => { setBlockTarget(milestone); setBlockReason(""); }}>Block</button>
                          <button type="button" className="rounded px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" disabled={actionLoading} onClick={() => void onSkip(milestone.id)}>Skip</button>
                        </>
                      ) : null}
                      {milestone.status === MILESTONE_STATUS.PLANNED ? (
                        <button type="button" className="rounded px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" disabled={actionLoading} onClick={() => void onDelete(milestone.id)}>Delete</button>
                      ) : null}
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
          showTemplateSection={Boolean(canManageTemplates && onSaveTemplateStep)}
          actionLoading={actionLoading}
          onSubmit={handleCreateSubmit}
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

      <BosModal
        open={!!pendingTemplatePayload}
        title="Save as template"
        description="Add this milestone definition to your institutional memory."
        onClose={() => setPendingTemplatePayload(null)}
      >
        <form onSubmit={handleTemplateFollowUp} className="space-y-4">
          <div className="flex gap-2">
            <button type="button" className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${templateAction === "create" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "border border-gray-200 text-gray-600 dark:border-gray-700"}`} onClick={() => setTemplateAction("create")}>Create new template</button>
            <button type="button" className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${templateAction === "append" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "border border-gray-200 text-gray-600 dark:border-gray-700"}`} onClick={() => setTemplateAction("append")} disabled={availableTemplates.length === 0}>Append to existing</button>
          </div>
          {templateAction === "create" ? (
            <>
              <div>
                <BosFormFieldLabel htmlFor="tpl-new-name" label="Template name" tip="Name for this reusable milestone plan." />
                <input id="tpl-new-name" className={BOS_FIELD_CLASS} value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} required />
              </div>
              <div>
                <BosFormFieldLabel htmlFor="tpl-new-vis" label="Visibility" tip="Private or company-wide." />
                <select id="tpl-new-vis" className={BOS_FIELD_CLASS} value={templateVisibility} onChange={(e) => setTemplateVisibility(e.target.value)}>
                  <option value={MILESTONE_TEMPLATE_VISIBILITY.PRIVATE}>Private</option>
                  <option value={MILESTONE_TEMPLATE_VISIBILITY.COMPANY}>Company</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <BosFormFieldLabel htmlFor="tpl-append" label="Existing template" tip="Append this milestone step to the end of the template." />
              <select id="tpl-append" className={BOS_FIELD_CLASS} value={appendTemplateId} onChange={(e) => setAppendTemplateId(e.target.value)} required>
                <option value="">Select template…</option>
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900" disabled={actionLoading}>
            Save to template
          </button>
        </form>
      </BosModal>

      <BosModal open={!!completeTarget} title="Complete milestone" onClose={() => setCompleteTarget(null)}>
        {completeTarget ? (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const dateMs = parseBosPlannedDate(completedDate);
            if (dateMs === undefined) return;
            void onComplete(completeTarget.id, { completedDate: dateMs, evidenceType, notes: evidenceNotes.trim() || undefined, sourceId: evidenceSourceId.trim() || undefined }).then(() => setCompleteTarget(null));
          }}>
            {completeTarget.successCriteria ? (
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                <span className="font-medium">Success criteria: </span>
                {completeTarget.successCriteria}
              </div>
            ) : null}
            <p className="text-sm text-gray-600 dark:text-gray-300">Record explicit evidence — no automatic inference.</p>
            <div>
              <BosFormFieldLabel htmlFor="ms-completed" label="Completed date" tip="Business date when achieved." />
              <input id="ms-completed" type="date" className={BOS_FIELD_CLASS} value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} required />
            </div>
            <div>
              <BosFormFieldLabel htmlFor="ms-evidence-type" label="Evidence type" tip="Links completion to a business record." />
              <select id="ms-evidence-type" className={BOS_FIELD_CLASS} value={evidenceType} onChange={(e) => setEvidenceType(e.target.value as MilestoneEvidenceType)}>
                {Object.values(MILESTONE_EVIDENCE_TYPE).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <input className={BOS_FIELD_CLASS} placeholder="Source ID (optional)" value={evidenceSourceId} onChange={(e) => setEvidenceSourceId(e.target.value)} />
            <textarea className={BOS_FIELD_CLASS} rows={2} placeholder="Notes" value={evidenceNotes} onChange={(e) => setEvidenceNotes(e.target.value)} />
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white" disabled={actionLoading}>Mark complete</button>
          </form>
        ) : null}
      </BosModal>

      <BosModal open={!!blockTarget} title="Block milestone" onClose={() => setBlockTarget(null)}>
        {blockTarget ? (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void onBlock(blockTarget.id, blockReason.trim()).then(() => setBlockTarget(null)); }}>
            <textarea className={BOS_FIELD_CLASS} rows={3} placeholder="Why is this milestone blocked?" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} required />
            <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white" disabled={actionLoading}>Block milestone</button>
          </form>
        ) : null}
      </BosModal>
    </div>
  );
};

export default BosMilestoneList;
