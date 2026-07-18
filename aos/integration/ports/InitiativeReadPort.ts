import type { CompanyId } from "../../types";

/** Read-only BOS initiative facts — AOS observes, never writes initiatives. */
export interface InitiativeReadPort {
  initiativeExists(companyId: CompanyId, initiativeId: string): Promise<boolean>;
  getInitiativeSummary(
    companyId: CompanyId,
    initiativeId: string,
  ): Promise<{ name: string; status?: string; ventureId?: string } | null>;
}

export const INITIATIVE_READ_PORT = Symbol("InitiativeReadPort");
