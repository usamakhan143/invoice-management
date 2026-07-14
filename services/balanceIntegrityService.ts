import type {
  BankAccount,
  BankDeposit,
  BankReconciliation,
  BankTransfer,
  Expense,
  ExpenseReturn,
  Invoice,
  Loan,
  LoanRepayment,
} from "../types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BalanceIntegrityInput {
  accounts: BankAccount[];
  expenses: Expense[];
  invoices: Invoice[];
  returns: ExpenseReturn[];
  loans: Loan[];
  repayments: LoanRepayment[];
  deposits: BankDeposit[];
  reconciliations: BankReconciliation[];
  transfers: BankTransfer[];
}

export interface BalanceIntegrityRow {
  accountId: string;
  accountName: string;
  bankName: string;
  currency: string;
  currencySymbol: string;
  initialBalance: number;
  storedBalance: number;
  computedBalance: number;
  difference: number;
  ok: boolean;
}

export interface BalanceIntegrityResult {
  rows: BalanceIntegrityRow[];
  mismatchCount: number;
  checkedAt: Date;
}

/**
 * Recompute expected `currentBalance` from the operational ledger events.
 * Transfer fees are counted via expenses; transfer debits use net amount only.
 */
export function computeExpectedBalance(
  accountId: string,
  data: BalanceIntegrityInput,
): number {
  const account = data.accounts.find((a) => a.id === accountId);
  let balance = Number(account?.initialBalance ?? 0);

  for (const inv of data.invoices) {
    if (inv.status === "paid" && inv.bankAccountId === accountId) {
      balance += Number(inv.total || 0);
    }
  }

  for (const exp of data.expenses) {
    if (exp.bankAccountId === accountId) {
      balance -= Number(exp.amount || 0);
    }
  }

  for (const ret of data.returns) {
    if (ret.destinationBankAccountId === accountId) {
      balance += Number(ret.amount || 0);
    }
  }

  for (const loan of data.loans) {
    if (loan.sourceBankAccountId === accountId) {
      balance -= Number(loan.principalAmount || 0);
    }
  }

  for (const rep of data.repayments) {
    if (rep.destinationBankAccountId === accountId) {
      balance += Number(rep.amount || 0);
    }
  }

  for (const dep of data.deposits) {
    if (dep.bankAccountId === accountId) {
      balance += Number(dep.amount || 0);
    }
  }

  for (const rec of data.reconciliations) {
    if (rec.bankAccountId === accountId) {
      balance += Number(rec.adjustmentAmount || 0);
    }
  }

  for (const t of data.transfers) {
    if (t.fromBankAccountId === accountId) {
      const principal = Number(t.principalAmount || 0);
      const fee = Number(t.feeAmount || 0);
      const net =
        t.netTransferAmount != null
          ? Number(t.netTransferAmount)
          : principal - fee;
      balance -= net;
    }
    if (t.toBankAccountId === accountId) {
      balance += Number(t.amountCreditedToDestination || 0);
    }
  }

  return round2(balance);
}

export function runBalanceIntegrityCheck(
  data: BalanceIntegrityInput,
): BalanceIntegrityResult {
  const rows: BalanceIntegrityRow[] = data.accounts.map((account) => {
    const stored = round2(
      Number(account.currentBalance ?? account.initialBalance ?? 0),
    );
    const computed = computeExpectedBalance(account.id, data);
    const difference = round2(stored - computed);
    return {
      accountId: account.id,
      accountName: account.accountName,
      bankName: account.bankName,
      currency: account.currency || "USD",
      currencySymbol: account.currencySymbol || "$",
      initialBalance: round2(Number(account.initialBalance ?? 0)),
      storedBalance: stored,
      computedBalance: computed,
      difference,
      ok: Math.abs(difference) < 0.02,
    };
  });

  rows.sort((a, b) => {
    if (a.ok !== b.ok) return a.ok ? 1 : -1;
    return Math.abs(b.difference) - Math.abs(a.difference);
  });

  return {
    rows,
    mismatchCount: rows.filter((r) => !r.ok).length,
    checkedAt: new Date(),
  };
}
