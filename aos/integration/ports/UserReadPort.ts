import type { CompanyId } from "../../types";

/** Read-only ERP user facts — AOS observes, never writes users. */
export interface UserReadPort {
  userExists(companyId: CompanyId, userId: string): Promise<boolean>;
  getUserSummary(
    companyId: CompanyId,
    userId: string,
  ): Promise<{ displayName: string; email?: string } | null>;
}

export const USER_READ_PORT = Symbol("UserReadPort");
