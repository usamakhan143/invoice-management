/**
 * Cross-entity relationship model — Doc 10, Doc 03 Module Blueprint.
 * Describes cardinality and ownership; persistence implements FKs only.
 */

import type {
  BosAttributionId,
  BosDecisionId,
  BosInitiativeId,
  BosMetricDefinitionId,
  BosMetricSnapshotId,
  BosVentureId,
  CompanyId,
} from "../../types";

/** BosPortfolio is implicit — all ventures under one companyId tenant. */
export interface BosPortfolioScope {
  companyId: CompanyId;
}

/**
 * Venture → Initiative (1:N)
 * Ownership: venture is the aggregate root for initiatives.
 */
export interface VentureInitiativeLink {
  ventureId: BosVentureId;
  initiativeId: BosInitiativeId;
}

/**
 * Initiative → Decision (1:N)
 * Decisions may also reference venture without initiative (portfolio-level).
 */
export interface InitiativeDecisionLink {
  initiativeId: BosInitiativeId;
  decisionId: BosDecisionId;
}

/**
 * Initiative → Attribution (1:N)
 * Attribution also references ERP source by (sourceType, sourceId) — sidecar.
 */
export interface InitiativeAttributionLink {
  initiativeId: BosInitiativeId;
  attributionId: BosAttributionId;
  ventureId: BosVentureId;
}

/**
 * KPI definition → snapshots (1:N versioned)
 * Snapshots scoped to initiative | venture | portfolio per KpiScope.
 */
export interface MetricSnapshotLink {
  definitionId: BosMetricDefinitionId;
  snapshotId: BosMetricSnapshotId;
  scopeEntityId: string;
}

/** Forbidden merges — Doc 10 naming law. */
export const FORBIDDEN_ERP_ALIASES = {
  venture: ["business", "businesses", "crm_business"],
  initiative: ["campaign", "campaigns", "project"],
  costCenter: ["expense_category", "expenseCategory"],
} as const;
