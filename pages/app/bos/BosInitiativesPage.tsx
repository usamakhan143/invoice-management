import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePageTitle } from "../../../hooks/usePageTitle";
import { usePermissions } from "../../../hooks/usePermissions";
import { useBosScope } from "../../../hooks/useBosScope";
import { bosInitiativeApplicationService } from "../../../bos/application/BosInitiativeApplicationService";
import { bosVentureApplicationService } from "../../../bos/application/BosVentureApplicationService";
import { bosMilestoneApplicationService } from "../../../bos/application/BosMilestoneApplicationService";
import { bosMilestoneTemplateApplicationService } from "../../../bos/application/BosMilestoneTemplateApplicationService";
import type { BosInitiative } from "../../../bos/domain/entities/initiative";
import type { BosVenture } from "../../../bos/domain/entities/venture";
import type { BosMilestoneTemplate } from "../../../bos/domain/entities/milestoneTemplate";
import type { MilestoneDraftStep } from "../../../bos/domain/entities/milestoneTemplate";
import { buildInitiativeDetailPath } from "../../../bos/config/routes";
import { BOS_FIELD_CLASS, formatBosDate, parseBosPlannedDate } from "../../../utils/bosFormat";
import { INITIATIVE_STATUS_LABELS } from "../../../bos/constants/initiativeStatus";
import Spinner from "../../../components/Spinner";
import { BOS_SECONDARY_BTN } from "./initiativeDetail/bosButtonClasses";
import BosFormFieldLabel from "./BosFormFieldLabel";
import BosMilestoneDraftEditor from "./initiativeDetail/BosMilestoneDraftEditor";

type CreateMode = "blank" | "template";

const BosInitiativesPage: React.FC = () => {
  usePageTitle("BOS Initiatives");
  const {
    canViewBosInitiatives,
    canManageBosInitiatives,
    canManageBosMilestones,
    canViewBosMilestoneTemplates,
  } = usePermissions();
  const { readScope, actorScope, isReady } = useBosScope();
  const canViewInitiatives = canViewBosInitiatives();
  const canManageInitiatives = canManageBosInitiatives();
  const canManageMilestones = canManageBosMilestones();
  const canViewTemplates = canViewBosMilestoneTemplates();

  const [initiatives, setInitiatives] = useState<BosInitiative[]>([]);
  const [ventures, setVentures] = useState<BosVenture[]>([]);
  const [templates, setTemplates] = useState<BosMilestoneTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("blank");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [milestoneDrafts, setMilestoneDrafts] = useState<MilestoneDraftStep[]>([]);
  const [ventureId, setVentureId] = useState("");
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!readScope) return;
    setLoading(true);
    setError(null);
    try {
      const [initiativeResult, ventureResult, templateList] = await Promise.all([
        bosInitiativeApplicationService.listInitiatives(readScope, { limit: 100 }),
        bosVentureApplicationService.listVentures(readScope, { limit: 100 }),
        canViewTemplates && actorScope
          ? bosMilestoneTemplateApplicationService.listAvailableTemplates({
              ...readScope,
              actorUserId: actorScope.actorUserId,
            })
          : Promise.resolve([]),
      ]);
      setInitiatives(initiativeResult.items);
      setVentures(ventureResult.items);
      setTemplates(templateList);
      setVentureId((current) => {
        if (current) return current;
        return ventureResult.items[0]?.id ?? "";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load initiatives");
    } finally {
      setLoading(false);
    }
  }, [readScope, actorScope, canViewTemplates]);

  useEffect(() => {
    if (isReady && canViewInitiatives && readScope) {
      void loadData();
    }
  }, [isReady, canViewInitiatives, readScope, loadData]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      setMilestoneDrafts([]);
      return;
    }
    setMilestoneDrafts(bosMilestoneTemplateApplicationService.templateStepsToDrafts(template));
  };

  const openCreateForm = () => {
    setShowForm(true);
    setCreateMode("blank");
    setMilestoneDrafts([]);
    setSelectedTemplateId("");
  };

  if (!canViewInitiatives) {
    return <BosAccessDenied />;
  }

  if (!isReady || !readScope) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const ventureNameById = new Map(ventures.map((v) => [v.id, v.name]));

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actorScope || !canManageInitiatives) return;
    if (!ventureId || !name.trim()) {
      setError("Venture and initiative name are required.");
      return;
    }
    if (!plannedStartDate) {
      setError("Planned start date is required.");
      return;
    }
    const startDate = parseBosPlannedDate(plannedStartDate);
    if (startDate === undefined) {
      setError("Planned start date is invalid.");
      return;
    }
    const endDate = plannedEndDate ? parseBosPlannedDate(plannedEndDate) : undefined;
    if (plannedEndDate && endDate === undefined) {
      setError("Planned end date is invalid.");
      return;
    }
    if (endDate !== undefined && endDate < startDate) {
      setError("Planned end date cannot be before planned start date.");
      return;
    }

    const validDrafts = milestoneDrafts.filter((s) => s.title.trim());
    if (validDrafts.some((s) => !s.title.trim())) {
      setError("Every milestone step needs a title.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const parsedBudget = budgetAmount.trim() ? Number(budgetAmount) : undefined;
      const created = await bosInitiativeApplicationService.createInitiative(actorScope, {
        ventureId,
        name: name.trim(),
        hypothesis: hypothesis.trim() || undefined,
        startDate,
        endDate,
        budgetAmount: parsedBudget,
        budgetCurrency: parsedBudget !== undefined ? budgetCurrency : undefined,
      });

      if (canManageMilestones && validDrafts.length > 0) {
        await bosMilestoneApplicationService.batchCreateMilestones(
          actorScope,
          created.id,
          validDrafts.map((draft, index) => ({
            title: draft.title.trim(),
            description: draft.description?.trim(),
            sequence: index,
            templateStepId: draft.id,
          })),
          { templateId: createMode === "template" ? selectedTemplateId : undefined },
        );
      }

      setShowForm(false);
      setName("");
      setHypothesis("");
      setPlannedStartDate("");
      setPlannedEndDate("");
      setBudgetAmount("");
      setMilestoneDrafts([]);
      setSelectedTemplateId("");
      await loadData();
      window.location.hash = `#${buildInitiativeDetailPath(created.id)}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create initiative");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Initiatives</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Time-bound strategic bets — define your own milestones and track progress with explicit evidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewTemplates ? (
            <Link
              to="/bos/milestone-templates"
              className={BOS_SECONDARY_BTN}
            >
              Milestone templates
            </Link>
          ) : null}
          {canManageInitiatives ? (
            <button
              type="button"
              onClick={() => (showForm ? setShowForm(false) : openCreateForm())}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              disabled={ventures.length === 0}
            >
              {showForm ? "Cancel" : "New initiative"}
            </button>
          ) : null}
        </div>
      </header>

      {ventures.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Create a{" "}
          <Link to="/bos/ventures" className="font-medium underline">
            venture
          </Link>{" "}
          before adding initiatives.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {showForm && canManageInitiatives ? (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create initiative</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                createMode === "blank"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
              }`}
              onClick={() => {
                setCreateMode("blank");
                setMilestoneDrafts([]);
                setSelectedTemplateId("");
              }}
            >
              Blank initiative
            </button>
            {canViewTemplates ? (
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  createMode === "template"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                }`}
                onClick={() => setCreateMode("template")}
                disabled={templates.length === 0}
              >
                Use template
              </button>
            ) : null}
          </div>

          {createMode === "template" ? (
            <div className="mt-4 block sm:col-span-2">
              <BosFormFieldLabel
                htmlFor="bos-initiative-template"
                label="Milestone template"
                tip="Pick a reusable milestone plan. You can edit, reorder, add, or remove steps before saving."
              />
              <select
                id="bos-initiative-template"
                className={BOS_FIELD_CLASS}
                value={selectedTemplateId}
                onChange={(e) => applyTemplate(e.target.value)}
                required
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.category ? ` (${t.category})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="block sm:col-span-2">
              <BosFormFieldLabel htmlFor="bos-initiative-venture" label="Venture" tip="Which business unit owns this bet." />
              <select
                id="bos-initiative-venture"
                className={BOS_FIELD_CLASS}
                value={ventureId}
                onChange={(e) => setVentureId(e.target.value)}
                required
              >
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="block sm:col-span-2">
              <BosFormFieldLabel htmlFor="bos-initiative-name" label="Initiative name" tip="Short title for this strategic bet." />
              <input
                id="bos-initiative-name"
                className={BOS_FIELD_CLASS}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="block sm:col-span-2">
              <BosFormFieldLabel htmlFor="bos-initiative-hypothesis" label="Success hypothesis" tip="Why you believe this will succeed." />
              <textarea
                id="bos-initiative-hypothesis"
                className={BOS_FIELD_CLASS}
                rows={3}
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
              />
            </div>
            <div className="block">
              <BosFormFieldLabel htmlFor="bos-initiative-planned-start" label="Planned Start Date" tip="When you plan to begin." />
              <input
                id="bos-initiative-planned-start"
                type="date"
                className={BOS_FIELD_CLASS}
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                required
              />
            </div>
            <div className="block">
              <BosFormFieldLabel htmlFor="bos-initiative-planned-end" label="Planned End Date" tip="Optional target end date." />
              <input
                id="bos-initiative-planned-end"
                type="date"
                className={BOS_FIELD_CLASS}
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                min={plannedStartDate || undefined}
              />
            </div>
            <div className="block">
              <BosFormFieldLabel htmlFor="bos-initiative-budget" label="Budget" tip="Optional spending cap." />
              <input
                id="bos-initiative-budget"
                type="number"
                min="0"
                step="0.01"
                className={BOS_FIELD_CLASS}
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </div>
            <div className="block">
              <BosFormFieldLabel htmlFor="bos-initiative-currency" label="Currency" tip="Budget currency code." />
              <input
                id="bos-initiative-currency"
                className={BOS_FIELD_CLASS}
                value={budgetCurrency}
                onChange={(e) => setBudgetCurrency(e.target.value.toUpperCase())}
                maxLength={3}
              />
            </div>
            {canManageMilestones ? (
              <div className="block sm:col-span-2">
                <BosMilestoneDraftEditor
                  steps={milestoneDrafts}
                  onChange={setMilestoneDrafts}
                  disabled={saving}
                />
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Create initiative"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : initiatives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600 dark:border-gray-600 dark:text-gray-300">
          No initiatives yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Initiative</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Venture</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Planned Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {initiatives.map((initiative) => (
                <tr key={initiative.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{initiative.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {ventureNameById.get(initiative.ventureId) ?? "Unknown venture"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {initiative.startDate ? formatBosDate(initiative.startDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {INITIATIVE_STATUS_LABELS[initiative.status] ?? initiative.status}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <Link to={buildInitiativeDetailPath(initiative.id)} className="font-medium text-primary-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BosInitiativesPage;
