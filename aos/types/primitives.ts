/**
 * AOS primitive types — shared identifiers and scalars.
 * Domain entities deferred to Stage B+.
 */

export type CompanyId = string;
export type UserId = string;

export type IsoDateString = string;
export type EpochMs = number;

export interface PaginationQuery {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}
