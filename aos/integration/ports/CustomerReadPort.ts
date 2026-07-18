import type { CompanyId } from "../../types";

/** Read-only ERP customer facts — AOS observes, never writes customers. */
export interface CustomerReadPort {
  customerExists(companyId: CompanyId, customerId: string): Promise<boolean>;
  getCustomerSummary(
    companyId: CompanyId,
    customerId: string,
  ): Promise<{ name: string; status?: string } | null>;
}

export const CUSTOMER_READ_PORT = Symbol("CustomerReadPort");
