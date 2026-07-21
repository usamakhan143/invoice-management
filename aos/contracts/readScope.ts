import type { CompanyId } from "../types";

/** Company-scoped read context for repository contracts (no application-layer dependency). */
export interface CompanyReadScope {
  companyId: CompanyId;
}
