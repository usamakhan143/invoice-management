import type { CompanyId } from "../../types";

/** Read-only invoice facts — BOS observes, never writes invoices. */
export interface ErpInvoiceReadPort {
  invoiceExists(companyId: CompanyId, invoiceId: string): Promise<boolean>;
  getInvoiceSummary(
    companyId: CompanyId,
    invoiceId: string,
  ): Promise<{ total: number; currency: string; customerName?: string } | null>;
}

export const ERP_INVOICE_READ_PORT = Symbol("ErpInvoiceReadPort");
