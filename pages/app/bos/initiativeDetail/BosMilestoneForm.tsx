import React, { useEffect, useState } from "react";
import type { BosMilestone } from "../../../../bos/domain/entities/milestone";
import type { BosMilestoneTemplate } from "../../../../bos/domain/entities/milestoneTemplate";
import {
  MILESTONE_COMPLETION_REQUIREMENT_KEY,
  MILESTONE_COMPLETION_REQUIREMENT_LABELS,
  type MilestoneCompletionRequirements,
} from "../../../../bos/constants/milestoneCompletionRequirement";
import {
  MILESTONE_PHASE_PRESET,
  MILESTONE_PHASE_PRESET_OPTIONS,
} from "../../../../bos/constants/milestonePhasePresets";
import {
  MILESTONE_PRIORITY,
  MILESTONE_PRIORITY_LABELS,
  type MilestonePriority,
} from "../../../../bos/constants/milestonePriority";
import {
  MILESTONE_BUSINESS_IMPACT,
  MILESTONE_BUSINESS_IMPACT_LABELS,
  type MilestoneBusinessImpact,
} from "../../../../bos/constants/milestoneBusinessImpact";
import {
  MILESTONE_DURATION_UNIT,
  MILESTONE_DURATION_UNIT_LABELS,
  type MilestoneDurationUnit,
} from "../../../../bos/constants/milestoneDurationUnit";
import {
  MILESTONE_TYPE_PRESET,
  MILESTONE_TYPE_PRESET_OPTIONS,
} from "../../../../bos/constants/milestoneType";
import { milestoneReferenceLabel } from "../../../../bos/domain/milestoneNumbering";
import { BOS_FIELD_CLASS, parseBosPlannedDate } from "../../../../utils/bosFormat";
import BosFormFieldLabel from "../BosFormFieldLabel";
import {
  emptyMilestoneFormValues,
  formValuesToSubmitPayload,
  milestoneToFormValues,
  TAG_SUGGESTIONS,
  type MilestoneFormSubmitPayload,
  type MilestoneFormValues,
  type UserOption,
} from "./milestoneFormTypes";

interface BosMilestoneFormProps {
  mode: "create" | "edit";
  initialMilestone?: BosMilestone;
  milestones: BosMilestone[];
  userOptions: UserOption[];
  defaultCurrency?: string;
  showTemplateSection?: boolean;
  actionLoading?: boolean;
  onSubmit: (payload: MilestoneFormSubmitPayload) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-100 bg-gray-50/40 p-4 dark:border-gray-800 dark:bg-gray-950/30">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
        {icon}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const BosMilestoneForm: React.FC<BosMilestoneFormProps> = ({
  mode,
  initialMilestone,
  milestones,
  userOptions,
  defaultCurrency = "USD",
  showTemplateSection = false,
  actionLoading,
  onSubmit,
  onCancel,
  submitLabel,
}) => {
  const [values, setValues] = useState<MilestoneFormValues>(() =>
    initialMilestone
      ? milestoneToFormValues(initialMilestone, defaultCurrency)
      : emptyMilestoneFormValues(defaultCurrency),
  );
  const [tagInput, setTagInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setValues(
      initialMilestone
        ? milestoneToFormValues(initialMilestone, defaultCurrency)
        : emptyMilestoneFormValues(defaultCurrency),
    );
    setFormError(null);
  }, [initialMilestone, mode, defaultCurrency]);

  const dependencyOptions = milestones.filter(
    (m) => m.id !== initialMilestone?.id,
  );

  const setRequirement = (key: keyof MilestoneCompletionRequirements, checked: boolean) => {
    setValues((prev) => {
      const next = { ...prev.completionRequirements };
      if (key === "nothingRequired" && checked) {
        return {
          ...prev,
          completionRequirements: { nothingRequired: true },
        };
      }
      const cleared = { ...next, [key]: checked };
      if (key !== "nothingRequired" && checked) {
        delete cleared.nothingRequired;
      }
      return { ...prev, completionRequirements: cleared };
    });
  };

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    setValues((prev) => {
      if (prev.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return prev;
      return { ...prev, tags: [...prev.tags, tag] };
    });
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!values.successCriteria.trim()) {
      setFormError("Success criteria is required — define what “done” means for this milestone.");
      return;
    }
    if (values.phasePreset === MILESTONE_PHASE_PRESET.CUSTOM && !values.customPhase.trim()) {
      setFormError("Enter a custom phase name or choose a preset.");
      return;
    }
    if (
      values.milestoneTypePreset === MILESTONE_TYPE_PRESET.CUSTOM &&
      !values.customMilestoneType.trim()
    ) {
      setFormError("Enter a custom milestone type or choose a preset.");
      return;
    }
    setFormError(null);
    const payload = formValuesToSubmitPayload(values, parseBosPlannedDate);
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {formError}
        </p>
      ) : null}

      <SectionCard
        title="Identity"
        icon={
          <span className="text-base" aria-hidden>
            ◆
          </span>
        }
      >
        <div>
          <BosFormFieldLabel
            htmlFor="msf-title"
            label="Title"
            tip="A meaningful business outcome — e.g. Partnership Signed, CRM Configured."
          />
          <input
            id="msf-title"
            className={BOS_FIELD_CLASS}
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder="What outcome does this milestone represent?"
            required
          />
        </div>
        <div>
          <BosFormFieldLabel
            htmlFor="msf-desc"
            label="Description"
            tip="Optional context — why this milestone matters."
          />
          <textarea
            id="msf-desc"
            className={BOS_FIELD_CLASS}
            rows={2}
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            placeholder="Additional context for your team…"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Planning"
        icon={
          <span className="text-base" aria-hidden>
            ◷
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <BosFormFieldLabel
              htmlFor="msf-phase"
              label="Phase"
              tip="Group milestones by initiative phase. Choose Custom to define your own."
            />
            <select
              id="msf-phase"
              className={BOS_FIELD_CLASS}
              value={values.phasePreset}
              onChange={(e) => setValues((v) => ({ ...v, phasePreset: e.target.value }))}
            >
              <option value="">No phase</option>
              {MILESTONE_PHASE_PRESET_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value={MILESTONE_PHASE_PRESET.CUSTOM}>Custom…</option>
            </select>
          </div>
          {values.phasePreset === MILESTONE_PHASE_PRESET.CUSTOM ? (
            <div>
              <BosFormFieldLabel htmlFor="msf-custom-phase" label="Custom phase" tip="Any label that fits your initiative." />
              <input
                id="msf-custom-phase"
                className={BOS_FIELD_CLASS}
                value={values.customPhase}
                onChange={(e) => setValues((v) => ({ ...v, customPhase: e.target.value }))}
                placeholder="e.g. Fundraising, Compliance"
              />
            </div>
          ) : (
            <div>
              <BosFormFieldLabel htmlFor="msf-priority" label="Priority" tip="Optional signal for sequencing attention." />
              <select
                id="msf-priority"
                className={BOS_FIELD_CLASS}
                value={values.priority}
                onChange={(e) =>
                  setValues((v) => ({ ...v, priority: e.target.value as MilestonePriority | "" }))
                }
              >
                <option value="">None</option>
                {(Object.keys(MILESTONE_PRIORITY) as Array<keyof typeof MILESTONE_PRIORITY>).map(
                  (key) => (
                    <option key={key} value={MILESTONE_PRIORITY[key]}>
                      {MILESTONE_PRIORITY_LABELS[MILESTONE_PRIORITY[key]]}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}
        </div>
        {values.phasePreset !== MILESTONE_PHASE_PRESET.CUSTOM ? (
          <div>
            <BosFormFieldLabel htmlFor="msf-target" label="Target date" tip="When you aim to achieve this outcome." />
            <input
              id="msf-target"
              type="date"
              className={BOS_FIELD_CLASS}
              value={values.targetDate}
              onChange={(e) => setValues((v) => ({ ...v, targetDate: e.target.value }))}
            />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <BosFormFieldLabel htmlFor="msf-priority-custom" label="Priority" tip="Optional signal for sequencing attention." />
              <select
                id="msf-priority-custom"
                className={BOS_FIELD_CLASS}
                value={values.priority}
                onChange={(e) =>
                  setValues((v) => ({ ...v, priority: e.target.value as MilestonePriority | "" }))
                }
              >
                <option value="">None</option>
                {(Object.keys(MILESTONE_PRIORITY) as Array<keyof typeof MILESTONE_PRIORITY>).map(
                  (key) => (
                    <option key={key} value={MILESTONE_PRIORITY[key]}>
                      {MILESTONE_PRIORITY_LABELS[MILESTONE_PRIORITY[key]]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <BosFormFieldLabel htmlFor="msf-target-custom" label="Target date" tip="When you aim to achieve this outcome." />
              <input
                id="msf-target-custom"
                type="date"
                className={BOS_FIELD_CLASS}
                value={values.targetDate}
                onChange={(e) => setValues((v) => ({ ...v, targetDate: e.target.value }))}
              />
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <BosFormFieldLabel
              htmlFor="msf-duration"
              label="Estimated duration"
              tip="Founder estimate for prediction — no automatic calculations."
            />
            <input
              id="msf-duration"
              type="number"
              min={1}
              step={1}
              className={BOS_FIELD_CLASS}
              value={values.estimatedDuration}
              onChange={(e) => setValues((v) => ({ ...v, estimatedDuration: e.target.value }))}
              placeholder="e.g. 5"
            />
          </div>
          <div>
            <BosFormFieldLabel htmlFor="msf-duration-unit" label="Duration unit" tip="Days, weeks, or months." />
            <select
              id="msf-duration-unit"
              className={BOS_FIELD_CLASS}
              value={values.estimatedDurationUnit}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  estimatedDurationUnit: e.target.value as MilestoneDurationUnit | "",
                }))
              }
            >
              <option value="">None</option>
              {(Object.keys(MILESTONE_DURATION_UNIT) as Array<keyof typeof MILESTONE_DURATION_UNIT>).map(
                (key) => (
                  <option key={key} value={MILESTONE_DURATION_UNIT[key]}>
                    {MILESTONE_DURATION_UNIT_LABELS[MILESTONE_DURATION_UNIT[key]]}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <BosFormFieldLabel
              htmlFor="msf-cost"
              label="Estimated cost"
              tip="Expected investment before execution — not linked to Finance yet."
            />
            <input
              id="msf-cost"
              type="number"
              min={0}
              step="0.01"
              className={BOS_FIELD_CLASS}
              value={values.estimatedCostAmount}
              onChange={(e) => setValues((v) => ({ ...v, estimatedCostAmount: e.target.value }))}
              placeholder="Amount"
            />
          </div>
          <div>
            <BosFormFieldLabel htmlFor="msf-cost-currency" label="Cost currency" tip="Currency for the estimated cost." />
            <input
              id="msf-cost-currency"
              className={BOS_FIELD_CLASS}
              value={values.estimatedCostCurrency}
              onChange={(e) => setValues((v) => ({ ...v, estimatedCostCurrency: e.target.value.toUpperCase() }))}
              placeholder="USD"
            />
          </div>
        </div>
        <div>
          <BosFormFieldLabel
            htmlFor="msf-business-impact"
            label="Business impact"
            tip="Strategic importance — separate from execution priority."
          />
          <select
            id="msf-business-impact"
            className={BOS_FIELD_CLASS}
            value={values.businessImpact}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                businessImpact: e.target.value as MilestoneBusinessImpact | "",
              }))
            }
          >
            <option value="">None</option>
            {(Object.keys(MILESTONE_BUSINESS_IMPACT) as Array<keyof typeof MILESTONE_BUSINESS_IMPACT>).map(
              (key) => (
                <option key={key} value={MILESTONE_BUSINESS_IMPACT[key]}>
                  {MILESTONE_BUSINESS_IMPACT_LABELS[MILESTONE_BUSINESS_IMPACT[key]]}
                </option>
              ),
            )}
          </select>
        </div>
      </SectionCard>

      <SectionCard
        title="Ownership"
        icon={
          <span className="text-base" aria-hidden>
            ◉
          </span>
        }
      >
        <div>
          <BosFormFieldLabel htmlFor="msf-owner" label="Owner" tip="Who is accountable for this outcome (optional)." />
          <select
            id="msf-owner"
            className={BOS_FIELD_CLASS}
            value={values.ownerUserId}
            onChange={(e) => setValues((v) => ({ ...v, ownerUserId: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {userOptions.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard
        title="Success criteria"
        icon={
          <span className="text-base" aria-hidden>
            ✦
          </span>
        }
      >
        <div>
          <BosFormFieldLabel
            htmlFor="msf-success"
            label="When is this milestone complete?"
            tip="The most important field — define the exact condition that means success."
          />
          <textarea
            id="msf-success"
            className={`${BOS_FIELD_CLASS} min-h-[120px] text-base leading-relaxed`}
            rows={5}
            value={values.successCriteria}
            onChange={(e) => setValues((v) => ({ ...v, successCriteria: e.target.value }))}
            placeholder="This milestone is considered complete when…"
            required
          />
          <p className="mt-1.5 text-[11px] text-gray-400">
            Examples: Landing page approved · CRM connected · Contract signed · Campaign launched
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Completion requirements"
        icon={
          <span className="text-base" aria-hidden>
            ▣
          </span>
        }
      >
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Choose what evidence you expect when completing this milestone. Saved for later — not enforced yet.
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {(Object.values(MILESTONE_COMPLETION_REQUIREMENT_KEY) as Array<
            keyof typeof MILESTONE_COMPLETION_REQUIREMENT_LABELS
          >).map((key) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm text-gray-700 hover:bg-white/80 dark:text-gray-300 dark:hover:bg-gray-900/60">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                  checked={Boolean(values.completionRequirements[key as keyof MilestoneCompletionRequirements])}
                  onChange={(e) =>
                    setRequirement(key as keyof MilestoneCompletionRequirements, e.target.checked)
                  }
                />
                {MILESTONE_COMPLETION_REQUIREMENT_LABELS[key]}
              </label>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Dependencies"
        icon={
          <span className="text-base" aria-hidden>
            ⛓
          </span>
        }
      >
        <div>
          <BosFormFieldLabel
            htmlFor="msf-dep"
            label="Depends on"
            tip="Optional — this milestone cannot start until the selected one is complete or skipped."
          />
          <select
            id="msf-dep"
            className={BOS_FIELD_CLASS}
            value={values.dependencyId}
            onChange={(e) => setValues((v) => ({ ...v, dependencyId: e.target.value }))}
          >
            <option value="">Independent — no dependency</option>
            {dependencyOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {milestoneReferenceLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard
        title="Classification"
        icon={
          <span className="text-base" aria-hidden>
            #
          </span>
        }
      >
        <div>
          <BosFormFieldLabel
            htmlFor="msf-type"
            label="Milestone type"
            tip="Classify the nature of this milestone for reporting and analytics."
          />
          <select
            id="msf-type"
            className={BOS_FIELD_CLASS}
            value={values.milestoneTypePreset}
            onChange={(e) => setValues((v) => ({ ...v, milestoneTypePreset: e.target.value }))}
          >
            <option value="">None</option>
            {MILESTONE_TYPE_PRESET_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
            <option value={MILESTONE_TYPE_PRESET.CUSTOM}>Custom…</option>
          </select>
        </div>
        {values.milestoneTypePreset === MILESTONE_TYPE_PRESET.CUSTOM ? (
          <div>
            <BosFormFieldLabel
              htmlFor="msf-custom-type"
              label="Custom type"
              tip="Any label that fits your milestone."
            />
            <input
              id="msf-custom-type"
              className={BOS_FIELD_CLASS}
              value={values.customMilestoneType}
              onChange={(e) => setValues((v) => ({ ...v, customMilestoneType: e.target.value }))}
              placeholder="e.g. Vendor onboarding"
            />
          </div>
        ) : null}
        <div>
          <BosFormFieldLabel htmlFor="msf-tags" label="Tags" tip="Type a tag and press Enter. Suggestions are optional." />
          <div className="flex gap-2">
            <input
              id="msf-tags"
              className={BOS_FIELD_CLASS}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Add tag…"
            />
            <button
              type="button"
              className="shrink-0 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-white dark:border-gray-700 dark:text-gray-300"
              onClick={() => addTag(tagInput)}
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TAG_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-full bg-gray-200/80 px-2.5 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300"
                onClick={() => addTag(s)}
              >
                + {s}
              </button>
            ))}
          </div>
          {values.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {values.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-white dark:text-gray-900"
                >
                  {tag}
                  <button
                    type="button"
                    className="opacity-70 hover:opacity-100"
                    onClick={() =>
                      setValues((v) => ({ ...v, tags: v.tags.filter((t) => t !== tag) }))
                    }
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </SectionCard>

      {showTemplateSection && mode === "create" ? (
        <SectionCard
          title="Template"
          icon={
            <span className="text-base" aria-hidden>
              ⎘
            </span>
          }
        >
          <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-gray-300"
              checked={values.saveAsTemplate}
              onChange={(e) => setValues((v) => ({ ...v, saveAsTemplate: e.target.checked }))}
            />
            <span>
              Save this milestone as a reusable template
              <span className="mt-0.5 block text-xs text-gray-400">
                After creation, you can create a new template or append to an existing one.
              </span>
            </span>
          </label>
        </SectionCard>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
          onClick={onCancel}
          disabled={actionLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900"
          disabled={actionLoading}
        >
          {submitLabel ?? (mode === "create" ? "Create milestone" : "Save changes")}
        </button>
      </div>
    </form>
  );
};

export default BosMilestoneForm;
