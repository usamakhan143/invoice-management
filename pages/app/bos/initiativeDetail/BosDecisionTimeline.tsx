import React from "react";
import type { BosDecision } from "../../../../bos/domain/entities/decision";
import { DECISION_STATUS_LABELS, DECISION_TYPE } from "../../../../bos/constants/decisionStatus";
import { formatBosDate } from "../../../../utils/bosFormat";
import { BOS_FIELD_CLASS } from "../../../../utils/bosFormat";
import BosFormFieldLabel from "../BosFormFieldLabel";
import type { DecisionType } from "../../../../bos/constants/decisionStatus";

interface BosDecisionTimelineProps {
  decisions: BosDecision[];
  editingDecisionId: string | null;
  editTitle: string;
  editContext: string;
  editDecisionText: string;
  editDecisionType: DecisionType;
  editExpectedOutcome: string;
  editDecisionDate: string;
  actionLoading: boolean;
  canEdit: (decision: BosDecision) => boolean;
  onBeginEdit: (decision: BosDecision) => void;
  onCancelEdit: () => void;
  onEditTitle: (v: string) => void;
  onEditContext: (v: string) => void;
  onEditDecisionText: (v: string) => void;
  onEditDecisionType: (v: DecisionType) => void;
  onEditExpectedOutcome: (v: string) => void;
  onEditDecisionDate: (v: string) => void;
  onSubmitEdit: (e: React.FormEvent) => void;
}

const DECISION_DOT = "bg-violet-500 ring-violet-500/20";

const BosDecisionTimeline: React.FC<BosDecisionTimelineProps> = ({
  decisions,
  editingDecisionId,
  editTitle,
  editContext,
  editDecisionText,
  editDecisionType,
  editExpectedOutcome,
  editDecisionDate,
  actionLoading,
  canEdit,
  onBeginEdit,
  onCancelEdit,
  onEditTitle,
  onEditContext,
  onEditDecisionText,
  onEditDecisionType,
  onEditExpectedOutcome,
  onEditDecisionDate,
  onSubmitEdit,
}) => {
  if (decisions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">No decisions recorded yet.</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Strategic choices appear here as a chronological timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-2">
      <div className="absolute bottom-2 left-[11px] top-2 w-px bg-gray-200 dark:bg-gray-700" />
      <ul className="space-y-6">
        {decisions.map((decision) => {
          const isEditing = editingDecisionId === decision.id;
          return (
            <li key={decision.id} className="relative pl-8">
              <span
                className={`absolute left-0 top-1.5 h-[10px] w-[10px] rounded-full ring-4 ${DECISION_DOT}`}
              />
              {isEditing ? (
                <form
                  onSubmit={onSubmitEdit}
                  className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/60"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Title</span>
                      <input className={BOS_FIELD_CLASS} value={editTitle} onChange={(e) => onEditTitle(e.target.value)} required />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Context</span>
                      <textarea className={BOS_FIELD_CLASS} rows={2} value={editContext} onChange={(e) => onEditContext(e.target.value)} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Decision</span>
                      <textarea className={BOS_FIELD_CLASS} rows={2} value={editDecisionText} onChange={(e) => onEditDecisionText(e.target.value)} required />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Type</span>
                      <select className={BOS_FIELD_CLASS} value={editDecisionType} onChange={(e) => onEditDecisionType(e.target.value as DecisionType)}>
                        {Object.values(DECISION_TYPE).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <div className="block">
                      <BosFormFieldLabel htmlFor={`edit-date-${decision.id}`} label="Decision Date" tip="Business date when the decision was made." />
                      <input id={`edit-date-${decision.id}`} type="date" className={BOS_FIELD_CLASS} value={editDecisionDate} onChange={(e) => onEditDecisionDate(e.target.value)} required />
                    </div>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Expected outcome</span>
                      <input className={BOS_FIELD_CLASS} value={editExpectedOutcome} onChange={(e) => onEditExpectedOutcome(e.target.value)} />
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={onCancelEdit} className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">Cancel</button>
                    <button type="submit" disabled={actionLoading} className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-gray-900">Save</button>
                  </div>
                </form>
              ) : (
                <article className="group">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <time className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        {decision.decidedAt ? formatBosDate(decision.decidedAt) : formatBosDate(decision.createdAt)}
                      </time>
                      <h3 className="mt-1 text-base font-semibold tracking-tight text-gray-900 dark:text-white">
                        {decision.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit(decision) ? (
                        <button type="button" onClick={() => onBeginEdit(decision)} className="text-xs font-medium text-gray-500 opacity-0 transition group-hover:opacity-100 hover:text-gray-900 dark:hover:text-white">
                          Edit
                        </button>
                      ) : null}
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {DECISION_STATUS_LABELS[decision.status] ?? decision.status}
                      </span>
                    </div>
                  </div>
                  {decision.context ? (
                    <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{decision.context}</p>
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed text-gray-800 dark:text-gray-100">{decision.decision}</p>
                  {decision.expectedOutcome ? (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Expected: {decision.expectedOutcome}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-gray-400">
                    Recorded {formatBosDate(decision.createdAt)} · {decision.decisionType}
                  </p>
                </article>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default BosDecisionTimeline;
