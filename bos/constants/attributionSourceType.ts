/**
 * BosSourceModule — origin of an attributed ERP record (Doc 10).
 * Sidecar law: attribution never modifies the source document.
 */

export const ATTRIBUTION_SOURCE_TYPE = {
  EXPENSE: "expense",
  INVOICE: "invoice",
  LEAD: "lead",
  LOAN: "loan",
  DEPOSIT: "deposit",
  MANUAL: "manual",
  EXTERNAL_ADAPTER: "external_adapter",
} as const;

export type AttributionSourceType =
  (typeof ATTRIBUTION_SOURCE_TYPE)[keyof typeof ATTRIBUTION_SOURCE_TYPE];

export const ATTRIBUTION_SOURCE_TYPE_LABELS: Record<AttributionSourceType, string> = {
  [ATTRIBUTION_SOURCE_TYPE.EXPENSE]: "Expense",
  [ATTRIBUTION_SOURCE_TYPE.INVOICE]: "Invoice",
  [ATTRIBUTION_SOURCE_TYPE.LEAD]: "Lead",
  [ATTRIBUTION_SOURCE_TYPE.LOAN]: "Loan",
  [ATTRIBUTION_SOURCE_TYPE.DEPOSIT]: "Deposit",
  [ATTRIBUTION_SOURCE_TYPE.MANUAL]: "Manual entry",
  [ATTRIBUTION_SOURCE_TYPE.EXTERNAL_ADAPTER]: "External adapter",
};

/** Phase 1B — first integrated source module. */
export const PHASE_1B_ATTRIBUTION_SOURCE_TYPES: readonly AttributionSourceType[] = [
  ATTRIBUTION_SOURCE_TYPE.EXPENSE,
  ATTRIBUTION_SOURCE_TYPE.MANUAL,
];
