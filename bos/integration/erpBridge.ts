import { SIDECAR_LAW_ERP_COLLECTIONS } from "../constants";
import { assertAttributionSidecarLaw } from "../domain/rules/attributionRules";
import type { DomainResult } from "../domain/domainResult";

/**
 * ERP → BOS bridge law (frozen architecture Doc 06, Doc 07 R-001).
 *
 * ERP modules (Expenses, Leads, Invoices, Reports) remain unaware of BOS.
 * BOS reads ERP facts through read ports and writes only to bos* collections.
 */
export const BOS_ERP_BRIDGE_LAW = {
  readOnlyErpCollections: SIDECAR_LAW_ERP_COLLECTIONS,
  writeCollections: ["bosVentures", "bosInitiatives", "bosDecisions", "bosAttributions"] as const,
  forbiddenWritePattern: "Never add BOS fields to ERP documents.",
} as const;

export function assertBridgeWriteTarget(collectionName: string): DomainResult {
  return assertAttributionSidecarLaw(collectionName);
}

export type BosErpSourceModule = "expenses" | "leads" | "invoices" | "reports";

export interface BosErpObservationEnvelope<TFacts> {
  sourceModule: BosErpSourceModule;
  companyId: string;
  sourceId: string;
  facts: TFacts;
  observedAtMs: number;
}
