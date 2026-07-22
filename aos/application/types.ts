import type { CompanyId, UserId } from "../types";

/**
 * Resolved actor context for AOS write operations (Stage B+).
 * Application services require callers to supply companyId from resolveCompanyIdForUser.
 */
export interface AosActorScope {
  companyId: CompanyId;
  actorUserId: UserId;
  /** Resolved ERP granular permissions for defense-in-depth application authorization. */
  permissions: readonly string[];
  /** Company owners bypass granular permission checks (matches ERP usePermissions). */
  isOwner?: boolean;
}

export interface AosReadScope {
  companyId: CompanyId;
}
