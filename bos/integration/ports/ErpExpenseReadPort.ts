import type { CompanyId } from "../../types";

export interface ErpExpenseListItem {
  expenseId: string;
  title: string;
  amount: number;
  currency: string;
  dateMs: number;
}

/**
 * Read-only ERP expense facts for BOS attribution (Phase 1B).
 * MUST NOT write to the expenses collection.
 */
export interface ErpExpenseReadPort {
  expenseExists(companyId: CompanyId, expenseId: string): Promise<boolean>;
  getExpenseSummary(
    companyId: CompanyId,
    expenseId: string,
  ): Promise<{ amount: number; currency: string; title: string } | null>;
  listExpensesForCompany(companyId: CompanyId, limit?: number): Promise<ErpExpenseListItem[]>;
}

export const ERP_EXPENSE_READ_PORT = Symbol("ErpExpenseReadPort");
