import type { CompanyId, UserId } from "../types";

/**
 * Resolved actor context for AOS write operations (Stage B+).
 * Application services require callers to supply companyId from resolveCompanyIdForUser.
 */
export interface AosActorScope {
  companyId: CompanyId;
  actorUserId: UserId;
}

export interface AosReadScope {
  companyId: CompanyId;
}
