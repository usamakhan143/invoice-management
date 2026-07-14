import type { BosAttributionRepository } from "../contracts/BosAttributionRepository";
import type { BosInitiativeRepository } from "../contracts/BosInitiativeRepository";
import type { BosAttribution, CreateBosAttributionInput } from "../domain/entities/attribution";
import type { BosInitiative } from "../domain/entities/initiative";
import type { BosInitiativeId } from "../types";
import { ATTRIBUTION_SOURCE_TYPE } from "../constants/attributionSourceType";
import { ATTRIBUTION_STATUS } from "../constants/attributionStatus";
import { KPI_ELIGIBLE_ATTRIBUTION_STATUSES } from "../constants/attributionStatus";
import type { ErpExpenseReadPort } from "../integration/ports/ErpExpenseReadPort";
import { firestoreBosAttributionRepository } from "../infrastructure/firestore/repositories/FirestoreBosAttributionRepository";
import { firestoreBosInitiativeRepository } from "../infrastructure/firestore/repositories/FirestoreBosInitiativeRepository";
import { firestoreErpExpenseReadAdapter } from "../integration/adapters/FirestoreErpExpenseReadAdapter";
import type { BosActorScope, BosReadScope } from "./types";
import { BosApplicationError, mapRepositoryError } from "./errors";
import {
  convertCurrencyAmount,
  DEFAULT_EXCHANGE_RATES,
} from "../../utils/exchangeRates";

export interface InitiativeInvestmentLine {
  attributionId: string;
  expenseId: string;
  expenseTitle: string;
  grossAmount: number;
  allocatedAmount: number;
  allocationPercent: number;
  currency: string;
  attributedAt: number;
}

export interface InitiativeInvestmentSummary {
  initiativeId: BosInitiativeId;
  initiative: BosInitiative;
  budgetAmount?: number;
  budgetCurrency?: string;
  totalInvested: number;
  primaryCurrency: string;
  budgetUtilizationPercent?: number;
  budgetRemaining?: number;
  activeAttributionCount: number;
  lines: InitiativeInvestmentLine[];
}

export class BosAttributionApplicationService {
  constructor(
    private readonly attributions: BosAttributionRepository = firestoreBosAttributionRepository,
    private readonly initiatives: BosInitiativeRepository = firestoreBosInitiativeRepository,
    private readonly erpExpenses: ErpExpenseReadPort = firestoreErpExpenseReadAdapter,
  ) {}

  async listCompanyExpenses(scope: BosReadScope) {
    try {
      return await this.erpExpenses.listExpensesForCompany(scope.companyId);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async listInitiativeAttributions(scope: BosReadScope, initiativeId: BosInitiativeId) {
    try {
      return await this.attributions.listByInitiative(scope.companyId, initiativeId, { limit: 100 });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async createExpenseAttribution(
    scope: BosActorScope,
    initiativeId: BosInitiativeId,
    expenseId: string,
    options?: { allocationPercent?: number; notes?: string },
  ): Promise<BosAttribution> {
    try {
      const initiative = await this.initiatives.findById(scope.companyId, initiativeId);
      if (!initiative) {
        throw new BosApplicationError("Initiative not found", "BOS_NOT_FOUND");
      }

      const expense = await this.erpExpenses.getExpenseSummary(scope.companyId, expenseId);
      if (!expense) {
        throw new BosApplicationError("Expense not found for this company", "BOS_NOT_FOUND");
      }

      const input: CreateBosAttributionInput = {
        companyId: scope.companyId,
        initiativeId,
        ventureId: initiative.ventureId,
        sourceType: ATTRIBUTION_SOURCE_TYPE.EXPENSE,
        sourceId: expenseId,
        allocationPercent: options?.allocationPercent ?? 100,
        amountSnapshot: expense.amount,
        currencySnapshot: expense.currency,
        notes: options?.notes,
        attributedById: scope.actorUserId,
        createdById: scope.actorUserId,
      };

      return await this.attributions.create(input);
    } catch (error) {
      if (error instanceof BosApplicationError) throw error;
      return mapRepositoryError(error);
    }
  }

  async getInitiativeInvestmentSummary(
    scope: BosReadScope,
    initiativeId: BosInitiativeId,
    options?: { exchangeRates?: Record<string, number> },
  ): Promise<InitiativeInvestmentSummary> {
    try {
      const initiative = await this.initiatives.findById(scope.companyId, initiativeId);
      if (!initiative) {
        throw new BosApplicationError("Initiative not found", "BOS_NOT_FOUND");
      }

      const displayCurrency = initiative.budget?.currency ?? "USD";
      const exchangeRates = options?.exchangeRates ?? DEFAULT_EXCHANGE_RATES;

      const attributionPage = await this.attributions.listByInitiative(scope.companyId, initiativeId, {
        limit: 100,
      });

      const eligible = attributionPage.items.filter((a) =>
        KPI_ELIGIBLE_ATTRIBUTION_STATUSES.includes(a.status),
      );

      const lines: InitiativeInvestmentLine[] = [];
      let totalInvested = 0;

      for (const attribution of eligible) {
        if (attribution.sourceType !== ATTRIBUTION_SOURCE_TYPE.EXPENSE) continue;

        const expense =
          (await this.erpExpenses.getExpenseSummary(scope.companyId, attribution.sourceId)) ??
          (attribution.amountSnapshot !== undefined
            ? {
                amount: attribution.amountSnapshot,
                currency: attribution.currencySnapshot ?? displayCurrency,
                title: `Expense ${attribution.sourceId}`,
              }
            : null);

        if (!expense) continue;

        const expenseCurrency = expense.currency || displayCurrency;
        const allocatedAmount = (expense.amount * attribution.allocationPercent) / 100;
        totalInvested += convertCurrencyAmount(
          allocatedAmount,
          expenseCurrency,
          displayCurrency,
          exchangeRates,
        );

        lines.push({
          attributionId: attribution.id,
          expenseId: attribution.sourceId,
          expenseTitle: expense.title,
          grossAmount: expense.amount,
          allocatedAmount,
          allocationPercent: attribution.allocationPercent,
          currency: expenseCurrency,
          attributedAt: attribution.createdAt,
        });
      }

      lines.sort((a, b) => b.attributedAt - a.attributedAt);

      const budgetAmount = initiative.budget?.amount;
      const budgetCurrency = initiative.budget?.currency;
      let budgetUtilizationPercent: number | undefined;
      let budgetRemaining: number | undefined;

      if (budgetAmount !== undefined && budgetAmount > 0) {
        budgetUtilizationPercent = Math.min(100, (totalInvested / budgetAmount) * 100);
        budgetRemaining = Math.max(0, budgetAmount - totalInvested);
      }

      return {
        initiativeId,
        initiative,
        budgetAmount,
        budgetCurrency,
        totalInvested,
        primaryCurrency: displayCurrency,
        budgetUtilizationPercent,
        budgetRemaining,
        activeAttributionCount: eligible.length,
        lines,
      };
    } catch (error) {
      if (error instanceof BosApplicationError) throw error;
      return mapRepositoryError(error);
    }
  }
}

export const bosAttributionApplicationService = new BosAttributionApplicationService();
