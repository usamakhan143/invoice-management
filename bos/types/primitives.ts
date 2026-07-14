/**
 * Shared primitive and branded types for the BOS module.
 * No business rules — identifiers and structural building blocks only.
 */

/** Tenant scope — resolves to owner uid or team member's companyId (same as ERP). */
export type CompanyId = string;

export type UserId = string;

export type BosVentureId = string;
export type BosInitiativeId = string;
export type BosDecisionId = string;
export type BosAttributionId = string;
export type BosMilestoneId = string;
export type BosMilestoneTemplateId = string;
export type BosMetricDefinitionId = string;
export type BosMetricSnapshotId = string;

/** ISO 4217 currency code (e.g. USD, GBP). */
export type CurrencyCode = string;

/** ISO date string YYYY-MM-DD for domain date boundaries. */
export type IsoDateString = string;

/** Unix epoch milliseconds — persistence layers map to Firestore Timestamp. */
export type EpochMs = number;

export interface AuditTimestamps {
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export interface AuditActor {
  createdById: UserId;
  updatedById?: UserId;
}

export interface MoneyAmount {
  amount: number;
  currency: CurrencyCode;
}

/** Percentage 0–100 inclusive. */
export type Percentage = number;

export interface PaginationQuery {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}
