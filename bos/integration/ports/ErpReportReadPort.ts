import type { CompanyId } from "../../types";

/**
 * Read-only aggregate facts for BOS reporting enrichment.
 * ERP ReportsPage remains unchanged; BOS joins in memory when enabled.
 */
export interface ErpReportReadPort {
  listExpenseTotalsByCompany(
    companyId: CompanyId,
    options?: { fromMs?: number; toMs?: number },
  ): Promise<Array<{ expenseId: string; amount: number; currency: string; dateMs: number }>>;
}

export const ERP_REPORT_READ_PORT = Symbol("ErpReportReadPort");
