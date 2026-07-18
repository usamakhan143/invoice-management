import type { CompanyId } from "../../types";

/** Read-only ERP lead facts — AOS observes, never writes leads. */
export interface LeadReadPort {
  leadExists(companyId: CompanyId, leadId: string): Promise<boolean>;
  getLeadSummary(
    companyId: CompanyId,
    leadId: string,
  ): Promise<{ title: string; status?: string } | null>;
}

export const LEAD_READ_PORT = Symbol("LeadReadPort");
