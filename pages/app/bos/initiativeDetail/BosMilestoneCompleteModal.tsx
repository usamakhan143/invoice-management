import React, { useMemo, useState } from "react";
import type { BosMilestone } from "../../../../bos/domain/entities/milestone";
import type { CompleteBosMilestoneInput } from "../../../../bos/domain/entities/milestone";
import {
  MILESTONE_COMPLETION_EVIDENCE_SOURCES,
  MILESTONE_EVIDENCE_SOURCE_LABELS,
  MILESTONE_EVIDENCE_TYPE,
  type MilestoneEvidenceType,
} from "../../../../bos/constants/milestoneEvidenceType";
import { MILESTONE_COMPLETION_REQUIREMENT_KEY } from "../../../../bos/constants/milestoneCompletionRequirement";
import { MILESTONE_COMPLETION_REQUIREMENT_LABELS } from "../../../../bos/constants/milestoneCompletionRequirement";
import {
  MILESTONE_RESULT,
  MILESTONE_RESULT_LABELS,
  type MilestoneResult,
} from "../../../../bos/constants/milestoneResult";
import {
  MILESTONE_DELAY_REASON,
  MILESTONE_DELAY_REASON_LABELS,
  type MilestoneDelayReason,
} from "../../../../bos/constants/milestoneDelayReason";
import {
  MILESTONE_FAILURE_ROOT_CAUSE,
  MILESTONE_FAILURE_ROOT_CAUSE_LABELS,
  type MilestoneFailureRootCause,
} from "../../../../bos/constants/milestoneFailureRootCause";
import {
  MILESTONE_COMPLETION_NEXT_ACTION,
  MILESTONE_COMPLETION_NEXT_ACTION_LABELS,
  type MilestoneCompletionNextAction,
} from "../../../../bos/constants/milestoneCompletionNextAction";
import { MILESTONE_STATUS } from "../../../../bos/constants/milestoneStatus";
import {
  createInitialCompleteFormState,
  formStateToCompleteInput,
  getCompletionDateMaxDayKey,
  getCompletionDatePickerMinDayKey,
  hasStructuredEvidenceRequirements,
  isFailureLearningRequired,
  isLessonsLearnedRequired,
  isMilestoneCompletionLate,
  resolveDependentMilestoneTargetId,
  shouldInitializeCompleteForm,
  validateCompletionForm,
  type MilestoneCompleteFormState,
  type MilestoneLinkOption,
} from "../../../../bos/application/milestoneCompletionForm";
import { milestoneReferenceLabel } from "../../../../bos/domain/milestoneNumbering";
import {
  BOS_FIELD_CLASS,
  parseBosPlannedDate,
} from "../../../../utils/bosFormat";
import BosModal from "./BosModal";
import BosFormFieldLabel from "../BosFormFieldLabel";
import { BOS_EMERALD_BTN, BOS_SECONDARY_BTN } from "./bosButtonClasses";

export interface BosMilestoneCompleteModalProps {
  milestone: BosMilestone | null;
  allMilestones: BosMilestone[];
  decisionOptions: MilestoneLinkOption[];
  expenseOptions: MilestoneLinkOption[];
  invoiceOptions: MilestoneLinkOption[];
  actionLoading: boolean;
  onClose: () => void;
  onComplete: (id: string, input: Omit<CompleteBosMilestoneInput, "updatedById">) => Promise<void>;
}

function FounderLinkSelect({
  id,
  label,
  value,
  options,
  onChange,
  required,
  emptyMessage,
}: {
  id: string;
  label: string;
  value: string;
  options: MilestoneLinkOption[];
  onChange: (value: string) => void;
  required?: boolean;
  emptyMessage: string;
}) {
  const hasOptions = options.length > 0;
  return (
    <div>
      <BosFormFieldLabel htmlFor={id} label={label} />
      <select
        id={id}
        className={`${BOS_FIELD_CLASS}${!hasOptions ? " cursor-not-allowed opacity-60" : ""}`}
        value={value}
        disabled={!hasOptions}
        onChange={(e) => onChange(e.target.value)}
        required={required && hasOptions}
      >
        {hasOptions
          ? options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))
          : null}
      </select>
      {!hasOptions ? (
        <p className="mt-1.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          {emptyMessage}
        </p>
      ) : null}
    </div>
  );
}

const BosMilestoneCompleteModal: React.FC<BosMilestoneCompleteModalProps> = ({
  milestone,
  allMilestones,
  decisionOptions,
  expenseOptions,
  invoiceOptions,
  actionLoading,
  onClose,
  onComplete,
}) => {
  const [form, setForm] = useState<MilestoneCompleteFormState>(() => createInitialCompleteFormState());
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [formError, setFormError] = useState<string | null>(null);
  const activeMilestoneIdRef = React.useRef<string | null>(null);

  const open = !!milestone;

  React.useEffect(() => {
    const nextId = milestone?.id ?? null;
    if (shouldInitializeCompleteForm(activeMilestoneIdRef.current, nextId)) {
      setForm(createInitialCompleteFormState());
      setStep("form");
      setFormError(null);
    }
    activeMilestoneIdRef.current = nextId;
  }, [milestone?.id]);

  const maxDate = getCompletionDateMaxDayKey();
  const minDate = milestone ? getCompletionDatePickerMinDayKey(milestone) : undefined;

  const completedDateMs = parseBosPlannedDate(form.completedDate);
  const showDelayReason =
    milestone &&
    completedDateMs !== undefined &&
    isMilestoneCompletionLate(completedDateMs, milestone.plannedEndDate);

  const lessonsRequired = milestone ? isLessonsLearnedRequired(milestone) : false;
  const failureLearningRequired = isFailureLearningRequired(form.milestoneResult);
  const requirements = milestone?.completionRequirements;
  const hasRequiredEvidenceFields = hasStructuredEvidenceRequirements(requirements);
  const requirementEntries = requirements
    ? Object.entries(requirements).filter(
        ([key, value]) =>
          value &&
          key !== MILESTONE_COMPLETION_REQUIREMENT_KEY.NOTHING_REQUIRED &&
          !(hasRequiredEvidenceFields && key === MILESTONE_COMPLETION_REQUIREMENT_KEY.NOTES_REQUIRED),
      )
    : [];

  const dependentMilestoneOptions = useMemo(() => {
    if (!milestone) return [];
    return allMilestones
      .filter(
        (m) =>
          m.id !== milestone.id &&
          m.dependencyIds?.includes(milestone.id) &&
          m.status !== MILESTONE_STATUS.COMPLETED &&
          m.status !== MILESTONE_STATUS.SKIPPED,
      )
      .sort((a, b) => a.sequence - b.sequence)
      .map((m) => ({ id: m.id, label: milestoneReferenceLabel(m) }));
  }, [allMilestones, milestone]);

  React.useEffect(() => {
    if (form.completionNextAction !== MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE) {
      return;
    }
    const resolved = resolveDependentMilestoneTargetId(
      form.completionNextAction,
      form.completionNextActionTargetId,
      dependentMilestoneOptions,
    );
    if (resolved !== form.completionNextActionTargetId) {
      setForm((prev) => ({ ...prev, completionNextActionTargetId: resolved }));
    }
  }, [form.completionNextAction, form.completionNextActionTargetId, dependentMilestoneOptions]);

  const patchForm = (partial: Partial<MilestoneCompleteFormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...partial };
      if (partial.completedDate !== undefined && milestone) {
        const ms = parseBosPlannedDate(partial.completedDate);
        if (ms !== undefined && !isMilestoneCompletionLate(ms, milestone.plannedEndDate)) {
          next.delayReason = "";
        }
      }
      if (
        partial.milestoneResult !== undefined &&
        !isFailureLearningRequired(partial.milestoneResult)
      ) {
        next.failureRootCause = "";
        next.failureRootCauseNotes = "";
      }
      return next;
    });
    setFormError(null);
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone) return;
    const dateMs = parseBosPlannedDate(form.completedDate);
    if (dateMs === undefined) {
      setFormError("Enter a valid completion date.");
      return;
    }
    const error = validateCompletionForm(milestone, form, dateMs, Date.now(), allMilestones);
    if (error) {
      setFormError(error);
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!milestone) return;
    const dateMs = parseBosPlannedDate(form.completedDate);
    if (dateMs === undefined) return;
    const validationError = validateCompletionForm(
      milestone,
      form,
      dateMs,
      Date.now(),
      allMilestones,
    );
    if (validationError) {
      setStep("form");
      setFormError(validationError);
      return;
    }
    const input = formStateToCompleteInput(milestone, form, dateMs, "ui");
    const { updatedById: _, ...payload } = input;
    try {
      await onComplete(milestone.id, payload);
      onClose();
    } catch (e) {
      console.error("Milestone completion failed:", e);
      setStep("form");
      setFormError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not complete milestone. Check your entries and try again.",
      );
    }
  };

  const renderEvidenceField = (type: MilestoneEvidenceType, required = false) => {
    switch (type) {
      case MILESTONE_EVIDENCE_TYPE.DECISION:
        return (
          <FounderLinkSelect
            id="ms-evidence-decision"
            label={MILESTONE_COMPLETION_REQUIREMENT_LABELS.decisionRequired}
            value={form.selectedDecisionId}
            options={decisionOptions}
            onChange={(v) => patchForm({ selectedDecisionId: v })}
            required={required}
            emptyMessage="No decisions recorded yet. Create a decision before completing this milestone."
          />
        );
      case MILESTONE_EVIDENCE_TYPE.EXPENSE:
        return (
          <FounderLinkSelect
            id="ms-evidence-expense"
            label={MILESTONE_COMPLETION_REQUIREMENT_LABELS.expenseLinked}
            value={form.selectedExpenseId}
            options={expenseOptions}
            onChange={(v) => patchForm({ selectedExpenseId: v })}
            required={required}
            emptyMessage="No expenses available. Create an expense in Finance first."
          />
        );
      case MILESTONE_EVIDENCE_TYPE.INVOICE:
        return (
          <FounderLinkSelect
            id="ms-evidence-invoice"
            label={MILESTONE_COMPLETION_REQUIREMENT_LABELS.revenueLinked}
            value={form.selectedInvoiceId}
            options={invoiceOptions}
            onChange={(v) => patchForm({ selectedInvoiceId: v })}
            required={required}
            emptyMessage="No invoices linked to this initiative yet."
          />
        );
      case MILESTONE_EVIDENCE_TYPE.DOCUMENT:
        return (
          <div className="space-y-2">
            <BosFormFieldLabel
              htmlFor="ms-document-file"
              label={MILESTONE_COMPLETION_REQUIREMENT_LABELS.documentAttached}
            />
            <input
              id="ms-document-file"
              type="file"
              className={`${BOS_FIELD_CLASS} py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:file:bg-gray-800`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                patchForm({ documentEvidence: file?.name ?? "" });
              }}
              required={required}
            />
            {form.documentEvidence ? (
              <p className="text-xs text-gray-500">Selected: {form.documentEvidence}</p>
            ) : null}
          </div>
        );
      case MILESTONE_EVIDENCE_TYPE.SCREENSHOT:
        return (
          <div className="space-y-2">
            <BosFormFieldLabel
              htmlFor="ms-screenshot-file"
              label={MILESTONE_COMPLETION_REQUIREMENT_LABELS.screenshotRequired}
            />
            <input
              id="ms-screenshot-file"
              type="file"
              accept="image/*"
              className={`${BOS_FIELD_CLASS} py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-xs file:font-medium dark:file:bg-gray-800`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                patchForm({ screenshotEvidence: file?.name ?? "" });
              }}
              required={required}
            />
            {form.screenshotEvidence ? (
              <p className="text-xs text-gray-500">Selected: {form.screenshotEvidence}</p>
            ) : null}
          </div>
        );
      case MILESTONE_EVIDENCE_TYPE.URL:
        return (
          <div>
            <BosFormFieldLabel
              htmlFor="ms-url"
              label={MILESTONE_COMPLETION_REQUIREMENT_LABELS.urlAttached}
            />
            <input
              id="ms-url"
              type="url"
              className={BOS_FIELD_CLASS}
              placeholder="https://..."
              value={form.urlEvidence}
              onChange={(e) => patchForm({ urlEvidence: e.target.value })}
              required={required}
            />
          </div>
        );
      case MILESTONE_EVIDENCE_TYPE.MANUAL:
        return (
          <div>
            <BosFormFieldLabel htmlFor="ms-supporting" label="Supporting evidence" />
            <textarea
              id="ms-supporting"
              className={BOS_FIELD_CLASS}
              rows={3}
              placeholder="Describe the evidence for this completion"
              value={form.supportingEvidence}
              onChange={(e) => patchForm({ supportingEvidence: e.target.value })}
              required={required}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderRequiredEvidenceSection = () => {
    if (!requirements) return null;

    return (
      <div className="space-y-4 rounded-lg border border-amber-200/80 bg-amber-50/30 px-3 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
          Complete each required evidence item below.
        </p>
        {requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.DECISION_REQUIRED]
          ? renderEvidenceField(MILESTONE_EVIDENCE_TYPE.DECISION, true)
          : null}
        {requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.EXPENSE_LINKED]
          ? renderEvidenceField(MILESTONE_EVIDENCE_TYPE.EXPENSE, true)
          : null}
        {requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.REVENUE_LINKED]
          ? renderEvidenceField(MILESTONE_EVIDENCE_TYPE.INVOICE, true)
          : null}
        {requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.DOCUMENT_ATTACHED]
          ? renderEvidenceField(MILESTONE_EVIDENCE_TYPE.DOCUMENT, true)
          : null}
        {requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.URL_ATTACHED]
          ? renderEvidenceField(MILESTONE_EVIDENCE_TYPE.URL, true)
          : null}
        {requirements[MILESTONE_COMPLETION_REQUIREMENT_KEY.SCREENSHOT_REQUIRED]
          ? renderEvidenceField(MILESTONE_EVIDENCE_TYPE.SCREENSHOT, true)
          : null}
      </div>
    );
  };

  const renderOptionalEvidenceSection = () => (
    <>
      <div>
        <BosFormFieldLabel htmlFor="ms-evidence-source" label="Evidence source" />
        <select
          id="ms-evidence-source"
          className={BOS_FIELD_CLASS}
          value={form.evidenceSource}
          onChange={(e) => patchForm({ evidenceSource: e.target.value as MilestoneEvidenceType })}
        >
          {MILESTONE_COMPLETION_EVIDENCE_SOURCES.map((type) => (
            <option key={type} value={type}>
              {MILESTONE_EVIDENCE_SOURCE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
      {renderEvidenceField(form.evidenceSource, form.evidenceSource === MILESTONE_EVIDENCE_TYPE.MANUAL)}
    </>
  );

  const renderNextActionFields = () => {
    switch (form.completionNextAction) {
      case MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE:
        return (
          <div>
            <BosFormFieldLabel htmlFor="ms-dependent-target" label="Dependent milestone" />
            <select
              id="ms-dependent-target"
              className={BOS_FIELD_CLASS}
              value={form.completionNextActionTargetId}
              onChange={(e) => patchForm({ completionNextActionTargetId: e.target.value })}
              required
            >
              {dependentMilestoneOptions.length === 0 ? (
                <option value="">No dependent milestones ready</option>
              ) : (
                <>
                  <option value="" disabled>
                    Select dependent milestone
                  </option>
                  {dependentMilestoneOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </>
              )}
            </select>
            {dependentMilestoneOptions.length === 0 ? (
              <p className="mt-1.5 text-xs text-gray-500">
                Add milestones that depend on this one to enable this option.
              </p>
            ) : null}
          </div>
        );
      case MILESTONE_COMPLETION_NEXT_ACTION.RECORD_DECISION:
        return (
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
            After completion, you&apos;ll be prompted to record a new decision.
          </p>
        );
      case MILESTONE_COMPLETION_NEXT_ACTION.LINK_EXPENSE:
        return (
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
            After completion, you&apos;ll be prompted to link an expense to this initiative.
          </p>
        );
      case MILESTONE_COMPLETION_NEXT_ACTION.CREATE_FOLLOW_UP_MILESTONE:
        return (
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
            After completion, the milestone creation form will open for your follow-up.
          </p>
        );
      case MILESTONE_COMPLETION_NEXT_ACTION.CUSTOM:
        return (
          <div>
            <BosFormFieldLabel htmlFor="ms-next-custom" label="Custom next step" />
            <textarea
              id="ms-next-custom"
              className={BOS_FIELD_CLASS}
              rows={2}
              value={form.completionNextActionCustom}
              onChange={(e) => patchForm({ completionNextActionCustom: e.target.value })}
              required
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <BosModal
      open={open}
      title={step === "confirm" ? "Confirm completion" : "Complete milestone"}
      onClose={onClose}
    >
      {milestone && step === "form" ? (
        <form className="space-y-4" onSubmit={handleReview}>
          {milestone.successCriteria ? (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-950 dark:text-gray-300">
              <span className="font-medium">Success criteria: </span>
              {milestone.successCriteria}
            </div>
          ) : null}

          {requirementEntries.length ? (
            <div className="rounded-lg border border-gray-200 px-3 py-2 text-xs dark:border-gray-700">
              <p className="font-medium text-gray-700 dark:text-gray-200">Completion requirements</p>
              <ul className="mt-1 list-inside list-disc text-gray-500 dark:text-gray-400">
                {requirementEntries.map(([key]) => (
                  <li key={key}>
                    {
                      MILESTONE_COMPLETION_REQUIREMENT_LABELS[
                        key as keyof typeof MILESTONE_COMPLETION_REQUIREMENT_LABELS
                      ]
                    }
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <BosFormFieldLabel
              htmlFor="ms-completed"
              label="Actual completion date"
              tip="Cannot be in the future or before work began."
            />
            <input
              id="ms-completed"
              type="date"
              className={BOS_FIELD_CLASS}
              value={form.completedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => patchForm({ completedDate: e.target.value })}
              required
            />
          </div>

          <div>
            <BosFormFieldLabel htmlFor="ms-outcome" label="Outcome summary" />
            <textarea
              id="ms-outcome"
              className={BOS_FIELD_CLASS}
              rows={2}
              placeholder="What actually happened when this milestone was completed?"
              value={form.outcomeSummary}
              onChange={(e) => patchForm({ outcomeSummary: e.target.value })}
              required={Boolean(requirements?.notesRequired)}
            />
          </div>

          <div>
            <BosFormFieldLabel
              htmlFor="ms-lessons"
              label="Lessons learned"
              tip={
                lessonsRequired
                  ? "Required for high or critical business impact."
                  : "Optional — stored for founder intelligence."
              }
            />
            <textarea
              id="ms-lessons"
              className={BOS_FIELD_CLASS}
              rows={2}
              placeholder="What would you do differently next time?"
              value={form.lessonsLearned}
              onChange={(e) => patchForm({ lessonsLearned: e.target.value })}
              required={lessonsRequired}
            />
          </div>

          <div>
            <BosFormFieldLabel htmlFor="ms-result" label="Milestone result" />
            <select
              id="ms-result"
              className={BOS_FIELD_CLASS}
              value={form.milestoneResult}
              onChange={(e) => patchForm({ milestoneResult: e.target.value as MilestoneResult })}
              required
            >
              {Object.values(MILESTONE_RESULT).map((value) => (
                <option key={value} value={value}>
                  {MILESTONE_RESULT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          {failureLearningRequired ? (
            <>
              <div>
                <BosFormFieldLabel htmlFor="ms-root-cause" label="Root cause" />
                <select
                  id="ms-root-cause"
                  className={BOS_FIELD_CLASS}
                  value={form.failureRootCause}
                  onChange={(e) =>
                    patchForm({ failureRootCause: e.target.value as MilestoneFailureRootCause })
                  }
                  required
                >
                  <option value="">Select root cause</option>
                  {Object.values(MILESTONE_FAILURE_ROOT_CAUSE).map((value) => (
                    <option key={value} value={value}>
                      {MILESTONE_FAILURE_ROOT_CAUSE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <BosFormFieldLabel htmlFor="ms-root-cause-notes" label="Root cause explanation" />
                <textarea
                  id="ms-root-cause-notes"
                  className={BOS_FIELD_CLASS}
                  rows={2}
                  placeholder="Brief explanation of what went wrong"
                  value={form.failureRootCauseNotes}
                  onChange={(e) => patchForm({ failureRootCauseNotes: e.target.value })}
                  required
                />
              </div>
            </>
          ) : null}

          {showDelayReason ? (
            <div>
              <BosFormFieldLabel
                htmlFor="ms-delay"
                label="Delay reason"
                tip="Required because completion is after the target date."
              />
              <select
                id="ms-delay"
                className={BOS_FIELD_CLASS}
                value={form.delayReason}
                onChange={(e) =>
                  patchForm({ delayReason: e.target.value as MilestoneDelayReason })
                }
                required
              >
                <option value="">Select delay reason</option>
                {Object.values(MILESTONE_DELAY_REASON).map((value) => (
                  <option key={value} value={value}>
                    {MILESTONE_DELAY_REASON_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {hasRequiredEvidenceFields
            ? renderRequiredEvidenceSection()
            : renderOptionalEvidenceSection()}

          <div>
            <BosFormFieldLabel htmlFor="ms-next-action" label="What happens next?" />
            <select
              id="ms-next-action"
              className={BOS_FIELD_CLASS}
              value={form.completionNextAction}
              onChange={(e) => {
                const nextAction = e.target.value as MilestoneCompletionNextAction;
                patchForm({
                  completionNextAction: nextAction,
                  completionNextActionCustom: "",
                  completionNextActionTargetId: resolveDependentMilestoneTargetId(
                    nextAction,
                    "",
                    dependentMilestoneOptions,
                  ),
                });
              }}
              required
            >
              {Object.values(MILESTONE_COMPLETION_NEXT_ACTION).map((value) => (
                <option key={value} value={value}>
                  {MILESTONE_COMPLETION_NEXT_ACTION_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          {renderNextActionFields()}

          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            className={BOS_EMERALD_BTN}
            disabled={actionLoading}
          >
            Review completion
          </button>
        </form>
      ) : null}

      {milestone && step === "confirm" ? (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">
            You are about to complete{" "}
            <span className="font-semibold">
              {milestone.milestoneNumber ?? milestone.title}
            </span>
            .
            <br />
            This becomes part of your permanent business history.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={BOS_SECONDARY_BTN}
              onClick={onClose}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={BOS_EMERALD_BTN}
              onClick={() => void handleConfirm()}
              disabled={actionLoading}
            >
              Complete milestone
            </button>
          </div>
        </div>
      ) : null}
    </BosModal>
  );
};

export default BosMilestoneCompleteModal;
