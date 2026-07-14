import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../../../hooks/usePageTitle";
import { usePermissions } from "../../../hooks/usePermissions";
import { useBosScope } from "../../../hooks/useBosScope";
import { bosMilestoneTemplateApplicationService } from "../../../bos/application/BosMilestoneTemplateApplicationService";
import type { BosMilestoneTemplate } from "../../../bos/domain/entities/milestoneTemplate";
import type { MilestoneDraftStep } from "../../../bos/domain/entities/milestoneTemplate";
import {
  MILESTONE_TEMPLATE_VISIBILITY,
  MILESTONE_TEMPLATE_VISIBILITY_LABELS,
} from "../../../bos/constants/milestoneTemplateVisibility";
import { BOS_FIELD_CLASS } from "../../../utils/bosFormat";
import Spinner from "../../../components/Spinner";
import BosAccessDenied from "./BosAccessDenied";
import BosFormFieldLabel from "./BosFormFieldLabel";
import BosMilestoneDraftEditor from "./initiativeDetail/BosMilestoneDraftEditor";

const BosMilestoneTemplatesPage: React.FC = () => {
  usePageTitle("BOS Milestone Templates");
  const { canViewBosMilestoneTemplates, canManageBosMilestoneTemplates } = usePermissions();
  const { readScope, actorScope, isReady } = useBosScope();
  const canView = canViewBosMilestoneTemplates();
  const canManage = canManageBosMilestoneTemplates();

  const [templates, setTemplates] = useState<BosMilestoneTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<string>(MILESTONE_TEMPLATE_VISIBILITY.COMPANY);
  const [steps, setSteps] = useState<MilestoneDraftStep[]>([]);
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!readScope || !actorScope) return;
    setLoading(true);
    setError(null);
    try {
      const items = await bosMilestoneTemplateApplicationService.listAvailableTemplates({
        ...readScope,
        actorUserId: actorScope.actorUserId,
      });
      setTemplates(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [readScope, actorScope]);

  useEffect(() => {
    if (isReady && canView && readScope && actorScope) {
      void loadTemplates();
    }
  }, [isReady, canView, readScope, actorScope, loadTemplates]);

  if (!canView) return <BosAccessDenied />;

  if (!isReady || !readScope || !actorScope) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    const validSteps = steps.filter((s) => s.title.trim());
    if (!name.trim() || validSteps.length === 0) {
      setError("Template name and at least one milestone step are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await bosMilestoneTemplateApplicationService.createTemplate(actorScope, {
        name: name.trim(),
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        visibility: visibility as (typeof MILESTONE_TEMPLATE_VISIBILITY)[keyof typeof MILESTONE_TEMPLATE_VISIBILITY],
        steps: validSteps.map((step, index) => ({
          id: step.id,
          title: step.title.trim(),
          description: step.description?.trim(),
          sequence: index,
          defaultDurationDays: step.defaultDurationDays,
        })),
      });
      setShowForm(false);
      setName("");
      setCategory("");
      setDescription("");
      setSteps([]);
      await loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/bos/initiatives" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
            ← Initiatives
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Milestone templates</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Reusable milestone plans — your company's institutional memory for initiative execution.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            {showForm ? "Cancel" : "New template"}
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {showForm && canManage ? (
        <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create template</h2>
          <div className="mt-4 space-y-4">
            <div>
              <BosFormFieldLabel htmlFor="mt-name" label="Template name" tip="e.g. Digikinz Client Acquisition" />
              <input id="mt-name" className={BOS_FIELD_CLASS} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <BosFormFieldLabel htmlFor="mt-cat" label="Category" tip="Optional grouping." />
              <input id="mt-cat" className={BOS_FIELD_CLASS} value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <BosFormFieldLabel htmlFor="mt-desc" label="Description" tip="When to use this template." />
              <textarea id="mt-desc" className={BOS_FIELD_CLASS} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <BosFormFieldLabel htmlFor="mt-vis" label="Visibility" tip="Private or company-wide." />
              <select id="mt-vis" className={BOS_FIELD_CLASS} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value={MILESTONE_TEMPLATE_VISIBILITY.PRIVATE}>Private</option>
                <option value={MILESTONE_TEMPLATE_VISIBILITY.COMPANY}>Company</option>
              </select>
            </div>
            <BosMilestoneDraftEditor steps={steps} onChange={setSteps} disabled={saving} />
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
              {saving ? "Saving…" : "Save template"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600 dark:border-gray-600 dark:text-gray-300">
          No templates yet. Save milestones from an initiative or create one here.
        </div>
      ) : (
        <ul className="space-y-3">
          {templates.map((template) => (
            <li key={template.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                  {template.category ? (
                    <p className="text-xs text-gray-500">{template.category}</p>
                  ) : null}
                  {template.description ? (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{template.description}</p>
                  ) : null}
                </div>
                <span className="text-xs font-medium uppercase text-gray-400">
                  {MILESTONE_TEMPLATE_VISIBILITY_LABELS[template.visibility]}
                </span>
              </div>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                {[...template.steps]
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((step) => (
                    <li key={step.id}>{step.title}</li>
                  ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BosMilestoneTemplatesPage;
