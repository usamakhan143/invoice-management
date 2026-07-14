import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePageTitle } from "../../../hooks/usePageTitle";
import { usePermissions } from "../../../hooks/usePermissions";
import { useBosScope } from "../../../hooks/useBosScope";
import { useAuth } from "../../../hooks/useAuth";
import { useCompanyUserOptions } from "../../../hooks/useCompanyUserOptions";
import { bosInitiativeApplicationService } from "../../../bos/application/BosInitiativeApplicationService";
import { bosVentureApplicationService } from "../../../bos/application/BosVentureApplicationService";
import { bosDecisionApplicationService } from "../../../bos/application/BosDecisionApplicationService";
import { bosMilestoneApplicationService } from "../../../bos/application/BosMilestoneApplicationService";
import { bosMilestoneTemplateApplicationService } from "../../../bos/application/BosMilestoneTemplateApplicationService";
import {
  buildMilestoneSituationRows,
  buildMilestoneTimelineEvents,
  computeMilestoneSituation,
} from "../../../bos/application/milestoneSituation";
import {
  bosAttributionApplicationService,
  type InitiativeInvestmentSummary,
} from "../../../bos/application/BosAttributionApplicationService";
import type { BosDecision } from "../../../bos/domain/entities/decision";
import type { BosMilestone } from "../../../bos/domain/entities/milestone";
import type { BosMilestoneTemplate } from "../../../bos/domain/entities/milestoneTemplate";
import type { BosAttribution } from "../../../bos/domain/entities/attribution";
import type { BosInitiative } from "../../../bos/domain/entities/initiative";
import type { BosVenture } from "../../../bos/domain/entities/venture";
import type { ErpExpenseListItem } from "../../../bos/integration/ports/ErpExpenseReadPort";
import {
  INITIATIVE_CLOSURE_OUTCOME,
  INITIATIVE_CLOSURE_OUTCOME_LABELS,
  INITIATIVE_STATUS,
  INITIATIVE_STATUS_LABELS,
} from "../../../bos/constants/initiativeStatus";
import { ATTRIBUTION_ELIGIBLE_INITIATIVE_STATUSES } from "../../../bos/constants/initiativeStatus";
import { MILESTONE_TEMPLATE_VISIBILITY } from "../../../bos/constants/milestoneTemplateVisibility";
import {
  DECISION_TYPE,
  TERMINAL_DECISION_STATUSES,
  type DecisionType,
} from "../../../bos/constants/decisionStatus";
import {
  formatBosDate,
  formatBosMoney,
  formatBosPlannedDateInput,
  parseBosPlannedDate,
  BOS_FIELD_CLASS,
} from "../../../utils/bosFormat";
import { fetchExchangeRates } from "../../../utils/exchangeRates";
import Spinner from "../../../components/Spinner";
import SearchableListSelect from "../../../components/SearchableListSelect";
import BosAccessDenied from "./BosAccessDenied";
import BosFormFieldLabel from "./BosFormFieldLabel";
import BosModal from "./initiativeDetail/BosModal";
import BosSectionShell from "./initiativeDetail/BosSectionShell";
import BosInitiativeHero from "./initiativeDetail/BosInitiativeHero";
import BosMilestoneList from "./initiativeDetail/BosMilestoneList";
import type { MilestoneFormSubmitPayload } from "./initiativeDetail/milestoneFormTypes";
import BosCurrentSituationCard from "./initiativeDetail/BosCurrentSituationCard";
import BosHypothesisCard from "./initiativeDetail/BosHypothesisCard";
import BosOverviewSecondaryMetrics from "./initiativeDetail/BosOverviewSecondaryMetrics";
import BosDecisionTimeline from "./initiativeDetail/BosDecisionTimeline";
import BosInitiativeBusinessTimeline from "./initiativeDetail/BosInitiativeBusinessTimeline";
import {
  buildBusinessTimelineEvents,
  formatBudgetForDisplay,
  formatRoiForDisplay,
  loadInitiativeBusinessFacts,
  type InitiativeBusinessFacts,
} from "./initiativeDetail/initiativeMilestoneEngine";

const SECTION_LINKS = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "investment", label: "Investment" },
  { id: "decisions", label: "Decisions" },
  { id: "learning", label: "Learning" },
] as const;

const BosInitiativeDetailPage: React.FC = () => {
  const { initiativeId = "" } = useParams<{ initiativeId: string }>();
  const { user, userProfile } = useAuth();
  const userOptions = useCompanyUserOptions(user, userProfile);
  const {
    canViewBosInitiatives,
    canManageBosInitiatives,
    canViewBosDecisions,
    canManageBosDecisions,
    canManageBosAttributions,
    canViewBosAttributions,
    canViewBosMilestones,
    canManageBosMilestones,
    canManageBosMilestoneTemplates,
  } = usePermissions();
  const { readScope, actorScope, isReady } = useBosScope();
  const canViewInitiatives = canViewBosInitiatives();
  const canManageInitiatives = canManageBosInitiatives();
  const canViewDecisions = canViewBosDecisions();
  const canManageDecisions = canManageBosDecisions();
  const canManageAttributions = canManageBosAttributions();
  const canViewAttributions = canViewBosAttributions();
  const canViewMilestones = canViewBosMilestones();
  const canManageMilestones = canManageBosMilestones();
  const canManageMilestoneTemplates = canManageBosMilestoneTemplates();

  const [initiative, setInitiative] = useState<BosInitiative | null>(null);
  const [venture, setVenture] = useState<BosVenture | null>(null);
  const [investment, setInvestment] = useState<InitiativeInvestmentSummary | null>(null);
  const [attributions, setAttributions] = useState<BosAttribution[]>([]);
  const [businessFacts, setBusinessFacts] = useState<InitiativeBusinessFacts | null>(null);
  const [decisions, setDecisions] = useState<BosDecision[]>([]);
  const [milestones, setMilestones] = useState<BosMilestone[]>([]);
  const [milestoneTemplates, setMilestoneTemplates] = useState<BosMilestoneTemplate[]>([]);
  const [expenses, setExpenses] = useState<ErpExpenseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateVisibility, setTemplateVisibility] = useState<string>(
    MILESTONE_TEMPLATE_VISIBILITY.COMPANY,
  );

  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionContext, setDecisionContext] = useState("");
  const [decisionText, setDecisionText] = useState("");
  const [decisionType, setDecisionType] = useState<DecisionType>(DECISION_TYPE.STRATEGIC);
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [decisionDate, setDecisionDate] = useState("");

  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContext, setEditContext] = useState("");
  const [editDecisionText, setEditDecisionText] = useState("");
  const [editDecisionType, setEditDecisionType] = useState<DecisionType>(DECISION_TYPE.STRATEGIC);
  const [editExpectedOutcome, setEditExpectedOutcome] = useState("");
  const [editDecisionDate, setEditDecisionDate] = useState("");

  const [selectedExpenseId, setSelectedExpenseId] = useState("");
  const [attributionNotes, setAttributionNotes] = useState("");

  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closureOutcome, setClosureOutcome] = useState<string>(INITIATIVE_CLOSURE_OUTCOME.SUCCESS);
  const [closureReason, setClosureReason] = useState("");
  const [lessonLearned, setLessonLearned] = useState("");

  usePageTitle(initiative?.name ? `BOS — ${initiative.name}` : "BOS Initiative");

  const ownerLabelByUid = useMemo(
    () => new Map(userOptions.map((o) => [o.uid, o.label])),
    [userOptions],
  );

  const resolveOwnerLabel = useCallback(
    (ownerUserId: string): string => {
      const label = ownerLabelByUid.get(ownerUserId);
      if (label) return label;
      if (actorScope?.actorUserId === ownerUserId) {
        return userProfile?.displayName || userProfile?.email || "You";
      }
      return "Team member";
    },
    [ownerLabelByUid, actorScope?.actorUserId, userProfile?.displayName, userProfile?.email],
  );

  const canAttribute = useMemo(() => {
    if (!initiative) return false;
    return ATTRIBUTION_ELIGIBLE_INITIATIVE_STATUSES.includes(initiative.status);
  }, [initiative]);

  const attributedExpenseIds = useMemo(
    () => new Set(investment?.lines.map((l) => l.expenseId) ?? []),
    [investment],
  );

  const availableExpenses = useMemo(
    () => expenses.filter((e) => !attributedExpenseIds.has(e.expenseId)),
    [expenses, attributedExpenseIds],
  );

  const expenseSelectOptions = useMemo(
    () =>
      availableExpenses.map((expense) => {
        const label = `${expense.title} — ${formatBosMoney(expense.amount, expense.currency)} (${formatBosDate(expense.dateMs)})`;
        return {
          value: expense.expenseId,
          label,
          searchText: `${expense.title} ${expense.amount} ${expense.currency} ${formatBosDate(expense.dateMs)}`,
        };
      }),
    [availableExpenses],
  );

  const sortedDecisions = useMemo(
    () =>
      [...decisions].sort(
        (a, b) => (b.decidedAt ?? b.createdAt) - (a.decidedAt ?? a.createdAt),
      ),
    [decisions],
  );

  const ownerLabel = venture
    ? resolveOwnerLabel(venture.ownerUserId)
    : resolveOwnerLabel(initiative?.createdById ?? "");

  const milestoneUserOptions = useMemo(
    () => userOptions.map((o) => ({ uid: o.uid, label: o.label })),
    [userOptions],
  );

  const payloadToMilestoneFields = (input: MilestoneFormSubmitPayload) => ({
    title: input.title,
    description: input.description,
    milestoneType: input.milestoneType,
    phase: input.phase,
    priority: input.priority,
    businessImpact: input.businessImpact,
    estimatedDuration: input.estimatedDuration,
    estimatedDurationUnit: input.estimatedDurationUnit,
    estimatedCostAmount: input.estimatedCostAmount,
    estimatedCostCurrency: input.estimatedCostCurrency,
    plannedEndDate: input.plannedEndDate,
    ownerUserId: input.ownerUserId,
    successCriteria: input.successCriteria,
    completionRequirements: input.completionRequirements,
    dependencyIds: input.dependencyIds,
    tags: input.tags,
  });

  const milestoneStepFromPayload = (input: MilestoneFormSubmitPayload) => ({
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `step-${Date.now()}`,
    title: input.title,
    description: input.description,
    sequence: 0,
    phase: input.phase,
    priority: input.priority,
    milestoneType: input.milestoneType,
    businessImpact: input.businessImpact,
    estimatedDuration: input.estimatedDuration,
    estimatedDurationUnit: input.estimatedDurationUnit,
    estimatedCostAmount: input.estimatedCostAmount,
    estimatedCostCurrency: input.estimatedCostCurrency,
    successCriteria: input.successCriteria,
    completionRequirements: input.completionRequirements,
    tags: input.tags,
  });

  const milestoneSituation = useMemo(
    () => computeMilestoneSituation(milestones),
    [milestones],
  );

  const situationRows = useMemo(
    () => buildMilestoneSituationRows(milestoneSituation),
    [milestoneSituation],
  );

  const nextMilestoneAction = useMemo(() => {
    if (initiative?.status === INITIATIVE_STATUS.CLOSED) return null;
    if (milestoneSituation.blocked.length > 0) {
      return `Unblock: ${milestoneSituation.blocked[0].title}`;
    }
    if (milestoneSituation.active) {
      return `In progress: ${milestoneSituation.active.title}`;
    }
    if (milestoneSituation.next) {
      return `Next: ${milestoneSituation.next.title}`;
    }
    if (milestoneSituation.totalCount === 0) {
      return canManageMilestones ? "Add milestones to track progress" : null;
    }
    return "All milestones complete or skipped";
  }, [initiative?.status, milestoneSituation, canManageMilestones]);

  const businessTimelineEvents = useMemo(() => {
    if (!initiative) return [];
    const milestoneEvents = buildMilestoneTimelineEvents(milestones);
    return buildBusinessTimelineEvents(initiative, decisions, milestoneEvents);
  }, [initiative, decisions, milestones]);

  const loadAll = useCallback(async () => {
    if (!readScope || !initiativeId) return;
    setLoading(true);
    setError(null);
    try {
      const loadedInitiative = await bosInitiativeApplicationService.getInitiative(
        readScope,
        initiativeId,
      );
      if (!loadedInitiative) {
        setError("Initiative not found.");
        setInitiative(null);
        return;
      }
      setInitiative(loadedInitiative);

      const exchangeRates = await fetchExchangeRates();

      const [loadedVenture, investmentSummary, attributionPage, decisionPage, expenseList, milestonePage, templateList] =
        await Promise.all([
          bosVentureApplicationService.getVenture(readScope, loadedInitiative.ventureId),
          bosAttributionApplicationService.getInitiativeInvestmentSummary(readScope, initiativeId, {
            exchangeRates,
          }),
          bosAttributionApplicationService.listInitiativeAttributions(readScope, initiativeId),
          canViewDecisions
            ? bosDecisionApplicationService.listDecisionsByInitiative(readScope, initiativeId, {
                limit: 100,
              })
            : Promise.resolve({ items: [] as BosDecision[], hasMore: false }),
          canManageAttributions || canViewAttributions
            ? bosAttributionApplicationService.listCompanyExpenses(readScope)
            : Promise.resolve([]),
          canViewMilestones
            ? bosMilestoneApplicationService.listMilestonesByInitiative(readScope, initiativeId, {
                limit: 200,
              })
            : Promise.resolve({ items: [] as BosMilestone[] }),
          canManageMilestoneTemplates && actorScope
            ? bosMilestoneTemplateApplicationService.listAvailableTemplates({
                ...readScope,
                actorUserId: actorScope.actorUserId,
              })
            : Promise.resolve([] as BosMilestoneTemplate[]),
        ]);

      setVenture(loadedVenture);
      setInvestment(investmentSummary);
      setAttributions(attributionPage.items);
      setDecisions(decisionPage.items);
      setMilestones(milestonePage.items);
      setMilestoneTemplates(templateList);
      setExpenses(expenseList);

      const facts = await loadInitiativeBusinessFacts(
        readScope.companyId,
        loadedInitiative,
        investmentSummary,
        decisionPage.items,
        attributionPage.items,
        exchangeRates,
      );
      setBusinessFacts(facts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load initiative");
    } finally {
      setLoading(false);
    }
  }, [readScope, initiativeId, canViewDecisions, canManageAttributions, canViewAttributions, canViewMilestones, canManageMilestoneTemplates, actorScope]);

  useEffect(() => {
    if (isReady && canViewInitiatives && initiativeId) {
      void loadAll();
    }
  }, [isReady, canViewInitiatives, initiativeId, loadAll]);

  useEffect(() => {
    if (!selectedExpenseId) return;
    if (availableExpenses.length === 0) {
      setSelectedExpenseId("");
      return;
    }
    const stillAvailable = availableExpenses.some((e) => e.expenseId === selectedExpenseId);
    if (!stillAvailable) setSelectedExpenseId("");
  }, [availableExpenses, selectedExpenseId]);

  const resetDecisionForm = () => {
    setDecisionTitle("");
    setDecisionContext("");
    setDecisionText("");
    setExpectedOutcome("");
    setDecisionDate("");
    setDecisionType(DECISION_TYPE.STRATEGIC);
  };

  if (!canViewInitiatives) return <BosAccessDenied />;

  if (!isReady || !readScope || !actorScope) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (!initiative) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8 text-center">
        <p className="text-gray-600 dark:text-gray-300">{error ?? "Initiative not found."}</p>
        <Link to="/bos/initiatives" className="text-primary-600 hover:underline">
          ← Back to initiatives
        </Link>
      </div>
    );
  }

  const handleActivate = async () => {
    if (!canManageInitiatives) return;
    setActionLoading(true);
    setError(null);
    try {
      await bosInitiativeApplicationService.transitionInitiativeStatus(
        actorScope,
        initiative.id,
        INITIATIVE_STATUS.ACTIVE,
      );
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to activate initiative");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDecision = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageDecisions) return;
    if (!decisionDate) {
      setError("Decision date is required.");
      return;
    }
    const decidedAt = parseBosPlannedDate(decisionDate);
    if (decidedAt === undefined) {
      setError("Decision date is invalid.");
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await bosDecisionApplicationService.createDecision(actorScope, {
        initiativeId: initiative.id,
        ventureId: initiative.ventureId,
        title: decisionTitle.trim(),
        context: decisionContext.trim() || undefined,
        decision: decisionText.trim(),
        decisionType,
        decidedAt,
        expectedOutcome: expectedOutcome.trim() || undefined,
      });
      resetDecisionForm();
      setShowDecisionModal(false);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record decision");
    } finally {
      setActionLoading(false);
    }
  };

  const beginEditDecision = (decision: BosDecision) => {
    setEditingDecisionId(decision.id);
    setEditTitle(decision.title);
    setEditContext(decision.context ?? "");
    setEditDecisionText(decision.decision);
    setEditDecisionType(decision.decisionType);
    setEditExpectedOutcome(decision.expectedOutcome ?? "");
    setEditDecisionDate(formatBosPlannedDateInput(decision.decidedAt));
  };

  const cancelEditDecision = () => setEditingDecisionId(null);

  const handleUpdateDecision = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageDecisions || !editingDecisionId) return;
    if (!editDecisionDate) {
      setError("Decision date is required.");
      return;
    }
    const decidedAt = parseBosPlannedDate(editDecisionDate);
    if (decidedAt === undefined) {
      setError("Decision date is invalid.");
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await bosDecisionApplicationService.updateDecision(actorScope, editingDecisionId, {
        title: editTitle.trim(),
        context: editContext.trim() || undefined,
        decision: editDecisionText.trim(),
        decisionType: editDecisionType,
        decidedAt,
        expectedOutcome: editExpectedOutcome.trim() || undefined,
      });
      setEditingDecisionId(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update decision");
    } finally {
      setActionLoading(false);
    }
  };

  const isDecisionEditable = (decision: BosDecision) =>
    canManageDecisions && !TERMINAL_DECISION_STATUSES.includes(decision.status);

  const handleAttributeExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageAttributions || !selectedExpenseId) return;
    setActionLoading(true);
    setError(null);
    try {
      await bosAttributionApplicationService.createExpenseAttribution(
        actorScope,
        initiative.id,
        selectedExpenseId,
        { notes: attributionNotes.trim() || undefined },
      );
      setAttributionNotes("");
      setSelectedExpenseId("");
      setShowExpenseModal(false);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to attribute expense");
    } finally {
      setActionLoading(false);
    }
  };

  const reorderMilestones = async (orderedIds: string[]) => {
    if (!canManageMilestones) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await bosMilestoneApplicationService.reorderMilestones(
        actorScope,
        initiative.id,
        orderedIds,
      );
      setMilestones(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder milestones");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveMilestoneUp = async (id: string) => {
    const sorted = [...milestones].sort((a, b) => a.sequence - b.sequence);
    const index = sorted.findIndex((m) => m.id === id);
    if (index <= 0) return;
    const ids = sorted.map((m) => m.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await reorderMilestones(ids);
  };

  const handleMoveMilestoneDown = async (id: string) => {
    const sorted = [...milestones].sort((a, b) => a.sequence - b.sequence);
    const index = sorted.findIndex((m) => m.id === id);
    if (index < 0 || index >= sorted.length - 1) return;
    const ids = sorted.map((m) => m.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await reorderMilestones(ids);
  };

  const handleSaveAsTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageMilestoneTemplates || !templateName.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      await bosMilestoneTemplateApplicationService.saveInitiativeMilestonesAsTemplate(
        actorScope,
        initiative.id,
        {
          name: templateName.trim(),
          category: templateCategory.trim() || undefined,
          description: templateDescription.trim() || undefined,
          visibility: templateVisibility as (typeof MILESTONE_TEMPLATE_VISIBILITY)[keyof typeof MILESTONE_TEMPLATE_VISIBILITY],
        },
      );
      setShowSaveTemplateModal(false);
      setTemplateName("");
      setTemplateCategory("");
      setTemplateDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseInitiative = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageInitiatives) return;
    setActionLoading(true);
    setError(null);
    try {
      await bosInitiativeApplicationService.closeInitiative(actorScope, initiative.id, {
        closureOutcome: closureOutcome as (typeof INITIATIVE_CLOSURE_OUTCOME)[keyof typeof INITIATIVE_CLOSURE_OUTCOME],
        closureReason: closureReason.trim() || undefined,
        lessonLearned: lessonLearned.trim() || undefined,
      });
      setShowCloseForm(false);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to close initiative");
    } finally {
      setActionLoading(false);
    }
  };

  const invested = investment?.totalInvested ?? 0;
  const currency = investment?.primaryCurrency ?? initiative.budget?.currency ?? "USD";

  const primaryBtn =
    "inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100";
  const secondaryBtn =
    "inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

  const displayCurrency = businessFacts?.displayCurrency ?? currency;
  const requiresLesson = invested > 0 && closureOutcome !== INITIATIVE_CLOSURE_OUTCOME.KILLED;

  const heroToolbar = (
    <>
      {initiative.status === INITIATIVE_STATUS.DRAFT && canManageInitiatives ? (
        <button type="button" className={primaryBtn} onClick={handleActivate} disabled={actionLoading}>
          Activate
        </button>
      ) : null}
      {canManageAttributions && canAttribute ? (
        <button type="button" className={secondaryBtn} onClick={() => setShowExpenseModal(true)}>
          Link expense
        </button>
      ) : null}
      {canManageDecisions && initiative.status !== INITIATIVE_STATUS.CLOSED ? (
        <button
          type="button"
          className={secondaryBtn}
          onClick={() => {
            resetDecisionForm();
            setShowDecisionModal(true);
          }}
        >
          New decision
        </button>
      ) : null}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50/60 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/bos/initiatives"
            className="text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            ← Initiatives
          </Link>
          <nav className="flex flex-wrap gap-1 rounded-full border border-gray-200/80 bg-white/80 p-1 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
            {SECTION_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="rounded-full px-3 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <BosInitiativeHero
          initiative={initiative}
          statusLabel={INITIATIVE_STATUS_LABELS[initiative.status] ?? initiative.status}
          budgetDisplay={formatBudgetForDisplay(initiative)}
          investedDisplay={formatBosMoney(invested, displayCurrency)}
          revenueDisplay={
            businessFacts
              ? formatBosMoney(businessFacts.totalRevenue, displayCurrency)
              : "—"
          }
          roiDisplay={formatRoiForDisplay(businessFacts?.roiPercent ?? null)}
          nextAction={nextMilestoneAction}
          toolbar={heroToolbar}
        />

        <div id="overview" className="space-y-6 scroll-mt-24">
          {canViewMilestones ? (
            <BosMilestoneList
              milestones={milestones}
              canManage={canManageMilestones && initiative.status !== INITIATIVE_STATUS.CLOSED}
              canManageTemplates={canManageMilestoneTemplates}
              userOptions={milestoneUserOptions}
              defaultCurrency={currency}
              availableTemplates={milestoneTemplates}
              ownerLabelByUserId={resolveOwnerLabel}
              actionLoading={actionLoading}
              onCreate={async (input) => {
                setActionLoading(true);
                setError(null);
                try {
                  const nextSequence = milestones.length
                    ? Math.max(...milestones.map((m) => m.sequence)) + 1
                    : 0;
                  await bosMilestoneApplicationService.createMilestone(actorScope, {
                    initiativeId: initiative.id,
                    sequence: nextSequence,
                    ...payloadToMilestoneFields(input),
                  });
                  await loadAll();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to add milestone");
                  throw e;
                } finally {
                  setActionLoading(false);
                }
              }}
              onUpdate={async (id, input) => {
                setActionLoading(true);
                setError(null);
                try {
                  await bosMilestoneApplicationService.updateMilestone(actorScope, id, payloadToMilestoneFields(input));
                  await loadAll();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to update milestone");
                  throw e;
                } finally {
                  setActionLoading(false);
                }
              }}
              onSaveTemplateStep={
                canManageMilestoneTemplates
                  ? async ({ action, step, templateName, templateId, visibility }) => {
                      setActionLoading(true);
                      setError(null);
                      try {
                        const templateStep = milestoneStepFromPayload(step);
                        if (action === "create") {
                          await bosMilestoneTemplateApplicationService.createTemplateFromMilestoneStep(
                            actorScope,
                            {
                              name: templateName ?? step.title,
                              visibility:
                                (visibility as (typeof MILESTONE_TEMPLATE_VISIBILITY)[keyof typeof MILESTONE_TEMPLATE_VISIBILITY]) ??
                                MILESTONE_TEMPLATE_VISIBILITY.COMPANY,
                              step: templateStep,
                            },
                          );
                        } else if (templateId) {
                          await bosMilestoneTemplateApplicationService.appendStepToTemplate(
                            actorScope,
                            templateId,
                            templateStep,
                          );
                        }
                        const refreshed =
                          await bosMilestoneTemplateApplicationService.listAvailableTemplates({
                            ...readScope,
                            actorUserId: actorScope.actorUserId,
                          });
                        setMilestoneTemplates(refreshed);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Failed to save template");
                        throw e;
                      } finally {
                        setActionLoading(false);
                      }
                    }
                  : undefined
              }
              onStart={async (id) => {
                setActionLoading(true);
                setError(null);
                try {
                  await bosMilestoneApplicationService.startMilestone(actorScope, id);
                  await loadAll();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to start milestone");
                } finally {
                  setActionLoading(false);
                }
              }}
              onComplete={async (id, input) => {
                setActionLoading(true);
                setError(null);
                try {
                  await bosMilestoneApplicationService.completeMilestone(actorScope, id, {
                    completedDate: input.completedDate,
                    evidence: [
                      {
                        type: input.evidenceType,
                        sourceId: input.sourceId,
                        notes: input.notes,
                      },
                    ],
                  });
                  await loadAll();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to complete milestone");
                } finally {
                  setActionLoading(false);
                }
              }}
              onBlock={async (id, reason) => {
                setActionLoading(true);
                setError(null);
                try {
                  await bosMilestoneApplicationService.blockMilestone(actorScope, id, reason);
                  await loadAll();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to block milestone");
                } finally {
                  setActionLoading(false);
                }
              }}
              onSkip={async (id, reason) => {
                setActionLoading(true);
                setError(null);
                try {
                  await bosMilestoneApplicationService.skipMilestone(actorScope, id, reason);
                  await loadAll();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to skip milestone");
                } finally {
                  setActionLoading(false);
                }
              }}
              onDelete={async (id) => {
                setActionLoading(true);
                setError(null);
                try {
                  await bosMilestoneApplicationService.deletePlannedMilestone(actorScope, id);
                  await loadAll();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to delete milestone");
                } finally {
                  setActionLoading(false);
                }
              }}
              onMoveUp={handleMoveMilestoneUp}
              onMoveDown={handleMoveMilestoneDown}
            />
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            {situationRows.length > 0 ? <BosCurrentSituationCard rows={situationRows} /> : null}
            <div className="space-y-4">
              <BosHypothesisCard
                hypothesis={initiative.hypothesis}
                successCriteria={initiative.successCriteria}
              />
              {canManageMilestoneTemplates && milestones.length > 0 ? (
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => setShowSaveTemplateModal(true)}
                >
                  Save milestones as template
                </button>
              ) : null}
            </div>
          </div>
          <BosOverviewSecondaryMetrics
            initiative={initiative}
            investment={investment}
            ownerLabel={ownerLabel}
            displayCurrency={displayCurrency}
          />
        </div>

        <BosSectionShell
          id="timeline"
          label="Timeline"
          title="Business timeline"
          description="Sorted by business date (oldest first). Recorded date shown only as metadata."
        >
          <BosInitiativeBusinessTimeline events={businessTimelineEvents} />
        </BosSectionShell>

        <BosSectionShell
          id="investment"
          label="Investment"
          title="Capital deployed"
          description="Attributed spend in initiative currency. Source expenses in Finance remain unchanged."
          action={
            canManageAttributions && canAttribute ? (
              <button type="button" className={secondaryBtn} onClick={() => setShowExpenseModal(true)}>
                Link expense
              </button>
            ) : null
          }
        >
          <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total invested</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  {formatBosMoney(invested, currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Budget</p>
                <p className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                  {initiative.budget?.amount !== undefined
                    ? formatBosMoney(initiative.budget.amount, initiative.budget.currency)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Utilization</p>
                <p className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                  {investment?.budgetUtilizationPercent !== undefined
                    ? `${investment.budgetUtilizationPercent.toFixed(1)}%`
                    : "—"}
                </p>
                {investment?.budgetUtilizationPercent !== undefined ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-gray-900 transition-all dark:bg-white"
                      style={{ width: `${Math.min(100, investment.budgetUtilizationPercent)}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            {investment && investment.lines.length > 0 ? (
              <ul className="mt-6 divide-y divide-gray-100 dark:divide-gray-800">
                {investment.lines.map((line) => (
                  <li key={line.attributionId} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{line.expenseTitle}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {line.allocationPercent}% allocated · {formatBosDate(line.attributedAt)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                      {formatBosMoney(line.allocatedAmount, line.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No attributed expenses yet.</p>
            )}
          </div>
        </BosSectionShell>

        {canViewDecisions ? (
          <BosSectionShell
            id="decisions"
            label="Decisions"
            title="Strategic decisions"
            description="Institutional memory of choices made during this initiative."
            action={
              canManageDecisions && initiative.status !== INITIATIVE_STATUS.CLOSED ? (
                <button
                  type="button"
                  className={primaryBtn}
                  onClick={() => {
                    resetDecisionForm();
                    setShowDecisionModal(true);
                  }}
                >
                  New decision
                </button>
              ) : null
            }
          >
            <BosDecisionTimeline
              decisions={sortedDecisions}
              editingDecisionId={editingDecisionId}
              editTitle={editTitle}
              editContext={editContext}
              editDecisionText={editDecisionText}
              editDecisionType={editDecisionType}
              editExpectedOutcome={editExpectedOutcome}
              editDecisionDate={editDecisionDate}
              actionLoading={actionLoading}
              canEdit={isDecisionEditable}
              onBeginEdit={beginEditDecision}
              onCancelEdit={cancelEditDecision}
              onEditTitle={setEditTitle}
              onEditContext={setEditContext}
              onEditDecisionText={setEditDecisionText}
              onEditDecisionType={setEditDecisionType}
              onEditExpectedOutcome={setEditExpectedOutcome}
              onEditDecisionDate={setEditDecisionDate}
              onSubmitEdit={handleUpdateDecision}
            />
          </BosSectionShell>
        ) : null}

        <BosSectionShell
          id="learning"
          label="Learning"
          title="Close & reflect"
          description="Capture outcomes and lessons when the bet concludes."
        >
          {initiative.status === INITIATIVE_STATUS.CLOSED ? (
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
              This initiative is closed
              {initiative.closureOutcome
                ? ` (${INITIATIVE_CLOSURE_OUTCOME_LABELS[initiative.closureOutcome]})`
                : ""}
              .
              {initiative.closureReason ? (
                <p className="mt-2 text-emerald-800/90 dark:text-emerald-200/90">{initiative.closureReason}</p>
              ) : null}
            </div>
          ) : canManageInitiatives ? (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-gray-800 dark:bg-gray-900/40">
              {!showCloseForm ? (
                <button type="button" className={secondaryBtn} onClick={() => setShowCloseForm(true)}>
                  Close initiative…
                </button>
              ) : (
                <form onSubmit={handleCloseInitiative} className="grid max-w-xl gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Outcome</span>
                    <select className={BOS_FIELD_CLASS} value={closureOutcome} onChange={(e) => setClosureOutcome(e.target.value)}>
                      {Object.values(INITIATIVE_CLOSURE_OUTCOME).map((o) => (
                        <option key={o} value={o}>{INITIATIVE_CLOSURE_OUTCOME_LABELS[o]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Reason</span>
                    <input className={BOS_FIELD_CLASS} value={closureReason} onChange={(e) => setClosureReason(e.target.value)} />
                  </label>
                  {requiresLesson ? (
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Lesson learned (required when investment &gt; 0)
                      </span>
                      <textarea className={BOS_FIELD_CLASS} rows={3} value={lessonLearned} onChange={(e) => setLessonLearned(e.target.value)} required />
                    </label>
                  ) : null}
                  <div className="flex gap-2">
                    <button type="button" className={secondaryBtn} onClick={() => setShowCloseForm(false)}>Cancel</button>
                    <button type="submit" disabled={actionLoading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                      Confirm close
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Close actions require initiative management permission.</p>
          )}
        </BosSectionShell>
      </div>

      <BosModal
        open={showDecisionModal}
        title="New decision"
        description="Record when the business decision was actually made — you can backdate."
        onClose={() => setShowDecisionModal(false)}
        wide
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={() => setShowDecisionModal(false)}>Cancel</button>
            <button type="submit" form="bos-new-decision-form" disabled={actionLoading} className={primaryBtn}>
              Save decision
            </button>
          </div>
        }
      >
        <form id="bos-new-decision-form" onSubmit={handleCreateDecision} className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Title</span>
            <input className={BOS_FIELD_CLASS} value={decisionTitle} onChange={(e) => setDecisionTitle(e.target.value)} required />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Context</span>
            <textarea className={BOS_FIELD_CLASS} rows={2} value={decisionContext} onChange={(e) => setDecisionContext(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Decision</span>
            <textarea className={BOS_FIELD_CLASS} rows={3} value={decisionText} onChange={(e) => setDecisionText(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Type</span>
            <select className={BOS_FIELD_CLASS} value={decisionType} onChange={(e) => setDecisionType(e.target.value as DecisionType)}>
              {Object.values(DECISION_TYPE).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <div className="block">
            <BosFormFieldLabel htmlFor="bos-decision-date" label="Decision Date" tip="Business date when the decision was made — separate from when it is recorded." />
            <input id="bos-decision-date" type="date" className={BOS_FIELD_CLASS} value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} required />
          </div>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Expected outcome</span>
            <input className={BOS_FIELD_CLASS} value={expectedOutcome} onChange={(e) => setExpectedOutcome(e.target.value)} />
          </label>
        </form>
      </BosModal>

      <BosModal
        open={showExpenseModal}
        title="Link expense"
        description="Connect an existing Finance expense to this initiative. The expense record stays unchanged."
        onClose={() => setShowExpenseModal(false)}
        footer={
          availableExpenses.length > 0 ? (
            <div className="flex justify-end gap-2">
              <button type="button" className={secondaryBtn} onClick={() => setShowExpenseModal(false)}>Cancel</button>
              <button type="submit" form="bos-link-expense-form" disabled={actionLoading || !selectedExpenseId} className={primaryBtn}>
                Attribute expense (100%)
              </button>
            </div>
          ) : null
        }
      >
        {availableExpenses.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No unattributed company expenses available. Create an expense in Finance → Expenses first.
          </p>
        ) : (
          <form id="bos-link-expense-form" onSubmit={handleAttributeExpense} className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Expense</span>
              <div className="mt-1">
                <SearchableListSelect
                  id="bos-link-expense"
                  options={expenseSelectOptions}
                  value={selectedExpenseId}
                  onChange={setSelectedExpenseId}
                  placeholder="Select an expense…"
                  ariaLabel="Expense to link"
                  triggerClassName={BOS_FIELD_CLASS.replace("mt-1 ", "")}
                />
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Notes</span>
              <input className={BOS_FIELD_CLASS} value={attributionNotes} onChange={(e) => setAttributionNotes(e.target.value)} />
            </label>
          </form>
        )}
      </BosModal>

      <BosModal
        open={showSaveTemplateModal}
        title="Save milestones as template"
        description="Capture this initiative's milestone plan as reusable institutional memory."
        onClose={() => setShowSaveTemplateModal(false)}
      >
        <form onSubmit={handleSaveAsTemplate} className="space-y-4">
          <div>
            <BosFormFieldLabel htmlFor="tpl-name" label="Template name" tip="Name for this reusable milestone plan." />
            <input id="tpl-name" className={BOS_FIELD_CLASS} value={templateName} onChange={(e) => setTemplateName(e.target.value)} required />
          </div>
          <div>
            <BosFormFieldLabel htmlFor="tpl-category" label="Category" tip="Optional grouping, e.g. Client Acquisition, Hiring." />
            <input id="tpl-category" className={BOS_FIELD_CLASS} value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)} />
          </div>
          <div>
            <BosFormFieldLabel htmlFor="tpl-desc" label="Description" tip="When to use this template." />
            <textarea id="tpl-desc" className={BOS_FIELD_CLASS} rows={2} value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} />
          </div>
          <div>
            <BosFormFieldLabel htmlFor="tpl-vis" label="Visibility" tip="Private: only you. Company: all team members with template access." />
            <select id="tpl-vis" className={BOS_FIELD_CLASS} value={templateVisibility} onChange={(e) => setTemplateVisibility(e.target.value)}>
              <option value={MILESTONE_TEMPLATE_VISIBILITY.PRIVATE}>Private</option>
              <option value={MILESTONE_TEMPLATE_VISIBILITY.COMPANY}>Company</option>
            </select>
          </div>
          <button type="submit" className={primaryBtn} disabled={actionLoading}>
            Save template
          </button>
        </form>
      </BosModal>
    </div>
  );
};

export default BosInitiativeDetailPage;
