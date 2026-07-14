import type { CompanyId, UserId } from "../types";

/**
 * Resolved actor context for BOS write operations.
 * Application services require callers to supply companyId from resolveCompanyIdForUser (R-014).
 */
export interface BosActorScope {
  companyId: CompanyId;
  actorUserId: UserId;
}

export interface BosReadScope {
  companyId: CompanyId;
}
