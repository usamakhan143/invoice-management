import { KPI_KEY, type KpiKey } from "../../constants/kpi";
import type { ComputeKpiInput, KpiValue } from "../entities/kpi";
import { domainFailOne, domainOk, type DomainResult } from "../domainResult";

const KNOWN_KPI_KEYS = new Set<string>(Object.values(KPI_KEY));

export function validateKpiKey(key: string): DomainResult {
  if (!KNOWN_KPI_KEYS.has(key)) {
    return domainFailOne("KPI_KEY_UNKNOWN", `Unknown KPI key: ${key}`);
  }
  return domainOk();
}

export function validateComputeKpiInput(input: ComputeKpiInput): DomainResult {
  const keyResult = validateKpiKey(input.key);
  if (!keyResult.ok) return keyResult;

  if (input.scope === "initiative" && !input.initiativeId) {
    return domainFailOne("KPI_KEY_UNKNOWN", "Initiative scope requires initiativeId.");
  }
  if (input.scope === "venture" && !input.ventureId) {
    return domainFailOne("KPI_KEY_UNKNOWN", "Venture scope requires ventureId.");
  }

  return domainOk();
}

/** Phase 1A — count active initiatives from domain entities (no ERP). */
export function computeActiveInitiativesCount(activeCount: number, asOf: number): KpiValue {
  return {
    key: KPI_KEY.ACTIVE_INITIATIVES,
    scope: "portfolio",
    value: activeCount,
    computedAt: asOf,
  };
}

/**
 * ROI formula reference — Doc 08. Full computation requires attribution + ERP reads (Phase 1B+).
 * Domain defines formula; application layer supplies inputs.
 */
export function computeGrossRoi(investment: number, revenue: number): number {
  if (investment === 0) return 0;
  return ((revenue - investment) / investment) * 100;
}

export type { KpiKey };
