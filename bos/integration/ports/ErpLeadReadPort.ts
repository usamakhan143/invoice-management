import type { CompanyId } from "../../types";

/** Read-only lead facts — BOS observes, never writes leads. */
export interface ErpLeadReadPort {
  leadExists(companyId: CompanyId, leadId: string): Promise<boolean>;
  getLeadSummary(
    companyId: CompanyId,
    leadId: string,
  ): Promise<{ title: string; status?: string } | null>;
}

export const ERP_LEAD_READ_PORT = Symbol("ErpLeadReadPort");
