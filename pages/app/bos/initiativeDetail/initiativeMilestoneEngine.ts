import type { BosAttribution } from "../../../../bos/domain/entities/attribution";
import type { BosDecision } from "../../../../bos/domain/entities/decision";
import type { BosInitiative } from "../../../../bos/domain/entities/initiative";
import type { InitiativeInvestmentSummary } from "../../../../bos/application/BosAttributionApplicationService";
import { ATTRIBUTION_SOURCE_TYPE } from "../../../../bos/constants/attributionSourceType";
import { KPI_ELIGIBLE_ATTRIBUTION_STATUSES } from "../../../../bos/constants/attributionStatus";
import {
  INITIATIVE_CLOSURE_OUTCOME_LABELS,
} from "../../../../bos/constants/initiativeStatus";
import { computeGrossRoi } from "../../../../bos/domain/rules/kpiRules";
import { firestoreErpInvoiceReadAdapter } from "../../../../bos/integration/adapters/FirestoreErpInvoiceReadAdapter";
import type { CompanyId } from "../../../../bos/types";
import type { MilestoneTimelineEvent } from "../../../../bos/application/milestoneSituation";
import { convertCurrencyAmount } from "../../../../utils/exchangeRates";
import { formatBosDate, formatBosMoney } from "../../../../utils/bosFormat";

export interface InitiativeBusinessFacts {
  initiative: BosInitiative;
  investment: InitiativeInvestmentSummary | null;
  decisions: BosDecision[];
  attributions: BosAttribution[];
  displayCurrency: string;
  totalInvested: number;
  totalRevenue: number;
  attributedLeadCount: number;
  attributedInvoiceCount: number;
  roiPercent: number | null;
}

export type InitiativeTimelineEvent = {
  id: string;
  kind:
    | "created"
    | "planned_start"
    | "planned_end"
    | "decision"
    | "closed"
    | "milestone_created"
    | "milestone_started"
    | "milestone_completed"
    | "milestone_blocked"
    | "milestone_skipped";
  businessDateMs: number;
  title: string;
  detail?: string;
  recordedAtMs?: number;
};

function isKpiEligible(attribution: BosAttribution): boolean {
  return KPI_ELIGIBLE_ATTRIBUTION_STATUSES.includes(attribution.status);
}

export async function loadInitiativeBusinessFacts(
  companyId: CompanyId,
  initiative: BosInitiative,
  investment: InitiativeInvestmentSummary | null,
  decisions: BosDecision[],
  attributions: BosAttribution[],
  exchangeRates: Record<string, number>,
): Promise<InitiativeBusinessFacts> {
  const displayCurrency = investment?.primaryCurrency ?? initiative.budget?.currency ?? "USD";
  const totalInvested = investment?.totalInvested ?? 0;

  const eligible = attributions.filter(isKpiEligible);
  const attributedLeadCount = eligible.filter((a) => a.sourceType === ATTRIBUTION_SOURCE_TYPE.LEAD).length;
  const invoiceAttributions = eligible.filter((a) => a.sourceType === ATTRIBUTION_SOURCE_TYPE.INVOICE);

  let totalRevenue = 0;
  for (const attribution of invoiceAttributions) {
    const invoice = await firestoreErpInvoiceReadAdapter.getInvoiceSummary(
      companyId,
      attribution.sourceId,
    );
    const gross = invoice?.total ?? attribution.amountSnapshot ?? 0;
    const currency = invoice?.currency ?? attribution.currencySnapshot ?? displayCurrency;
    const allocated = (gross * attribution.allocationPercent) / 100;
    totalRevenue += convertCurrencyAmount(allocated, currency, displayCurrency, exchangeRates);
  }

  const roiPercent =
    totalInvested > 0 ? computeGrossRoi(totalInvested, totalRevenue) : null;

  return {
    initiative,
    investment,
    decisions,
    attributions,
    displayCurrency,
    totalInvested,
    totalRevenue,
    attributedLeadCount,
    attributedInvoiceCount: invoiceAttributions.length,
    roiPercent,
  };
}

export function buildBusinessTimelineEvents(
  initiative: BosInitiative,
  decisions: BosDecision[],
  milestoneEvents: MilestoneTimelineEvent[] = [],
): InitiativeTimelineEvent[] {
  const events: InitiativeTimelineEvent[] = [];

  if (initiative.createdAt) {
    events.push({
      id: "created",
      kind: "created",
      businessDateMs: initiative.createdAt,
      title: "Initiative created",
    });
  }

  if (initiative.startDate) {
    events.push({
      id: "planned-start",
      kind: "planned_start",
      businessDateMs: initiative.startDate,
      title: "Planned start date",
      detail: formatBosDate(initiative.startDate),
    });
  }

  if (initiative.endDate) {
    events.push({
      id: "planned-end",
      kind: "planned_end",
      businessDateMs: initiative.endDate,
      title: "Planned end date",
      detail: formatBosDate(initiative.endDate),
    });
  }

  for (const decision of decisions) {
    if (decision.decidedAt === undefined) continue;
    events.push({
      id: `decision-${decision.id}`,
      kind: "decision",
      businessDateMs: decision.decidedAt,
      title: decision.title,
      detail: decision.decision,
      recordedAtMs: decision.createdAt,
    });
  }

  for (const milestoneEvent of milestoneEvents) {
    events.push({
      id: milestoneEvent.id,
      kind: milestoneEvent.kind,
      businessDateMs: milestoneEvent.businessDateMs,
      title: milestoneEvent.title,
      detail: milestoneEvent.detail,
      recordedAtMs: milestoneEvent.recordedAtMs,
    });
  }

  if (initiative.closedAt) {
    events.push({
      id: "closed",
      kind: "closed",
      businessDateMs: initiative.closedAt,
      title: "Initiative closed",
      detail: initiative.closureOutcome
        ? INITIATIVE_CLOSURE_OUTCOME_LABELS[initiative.closureOutcome]
        : undefined,
    });
  }

  return events.sort((a, b) => a.businessDateMs - b.businessDateMs);
}

export function formatRoiForDisplay(roiPercent: number | null): string {
  if (roiPercent === null) return "—";
  return `${roiPercent.toFixed(1)}%`;
}

export function formatBudgetForDisplay(initiative: BosInitiative): string {
  if (initiative.budget?.amount === undefined) return "—";
  return formatBosMoney(initiative.budget.amount, initiative.budget.currency);
}
