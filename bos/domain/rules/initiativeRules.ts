import {
  INITIATIVE_CLOSURE_OUTCOME,
  INITIATIVE_STATUS,
} from "../../constants/initiativeStatus";
import type { BosInitiative, CloseBosInitiativeInput, CreateBosInitiativeInput, UpdateBosInitiativeInput } from "../entities/initiative";
import type { InitiativeStatus } from "../../constants/initiativeStatus";
import {
  isInvalidInitiativeTransition,
  isInitiativeTransitionAllowed,
} from "../lifecycle/initiativeLifecycle";
import { domainFailOne, domainOk, type DomainResult } from "../domainResult";

export function validateCreateInitiative(input: CreateBosInitiativeInput): DomainResult {
  if (!input.ventureId?.trim()) {
    return domainFailOne("INITIATIVE_VENTURE_REQUIRED", "Initiative must belong to a venture.");
  }
  if (!input.name?.trim()) {
    return domainFailOne("INITIATIVE_NAME_REQUIRED", "Initiative name is required.");
  }
  const budgetResult = validateBudgetPair(input.budgetAmount, input.budgetCurrency);
  if (!budgetResult.ok) return budgetResult;
  return validatePlannedDateRange(input.startDate, input.endDate);
}

export function validatePlannedDateRange(startDate?: number, endDate?: number): DomainResult {
  if (startDate === undefined) {
    return domainFailOne(
      "INITIATIVE_START_DATE_REQUIRED",
      "Planned start date is required.",
    );
  }
  if (endDate !== undefined && endDate < startDate) {
    return domainFailOne(
      "INITIATIVE_DATE_RANGE_INVALID",
      "Planned end date cannot be before planned start date.",
    );
  }
  return domainOk();
}

export function validateUpdateInitiative(input: UpdateBosInitiativeInput): DomainResult {
  if (input.name !== undefined && !input.name.trim()) {
    return domainFailOne("INITIATIVE_NAME_REQUIRED", "Initiative name cannot be empty.");
  }
  if (
    input.budgetAmount !== undefined ||
    input.budgetCurrency !== undefined
  ) {
    return validateBudgetPair(input.budgetAmount, input.budgetCurrency);
  }
  return domainOk();
}

export function validateBudgetPair(
  amount?: number,
  currency?: string,
): DomainResult {
  const hasAmount = amount !== undefined;
  const hasCurrency = Boolean(currency?.trim());
  if (hasAmount !== hasCurrency) {
    return domainFailOne(
      "INITIATIVE_BUDGET_INCOMPLETE",
      "Budget amount and currency must be provided together.",
    );
  }
  if (hasAmount && amount! < 0) {
    return domainFailOne("INITIATIVE_BUDGET_INVALID", "Budget amount cannot be negative.");
  }
  return domainOk();
}

export function validateInitiativeStatusTransition(
  initiative: BosInitiative,
  nextStatus: InitiativeStatus,
): DomainResult {
  if (isInvalidInitiativeTransition(initiative.status, nextStatus)) {
    return domainFailOne(
      "INITIATIVE_INVALID_TRANSITION",
      `Cannot reactivate closed initiative ${initiative.id}. Create a new initiative instead.`,
    );
  }
  if (!isInitiativeTransitionAllowed(initiative.status, nextStatus)) {
    return domainFailOne(
      "INITIATIVE_INVALID_TRANSITION",
      `Transition from ${initiative.status} to ${nextStatus} is not allowed.`,
    );
  }
  return domainOk();
}

export function validateCloseInitiative(
  initiative: BosInitiative,
  input: CloseBosInitiativeInput,
  options?: { attributedInvestmentTotal?: number; lessonProvided?: boolean },
): DomainResult {
  if (initiative.status === INITIATIVE_STATUS.CLOSED) {
    return domainFailOne("INITIATIVE_INVALID_TRANSITION", "Initiative is already closed.");
  }

  const invested = options?.attributedInvestmentTotal ?? 0;
  const lessonProvided =
    options?.lessonProvided ??
    Boolean(input.lessonLearned?.trim() || input.closureReason?.trim());
  if (
    invested > 0 &&
    !lessonProvided &&
    input.closureOutcome !== INITIATIVE_CLOSURE_OUTCOME.KILLED
  ) {
    return domainFailOne(
      "INITIATIVE_CLOSE_LESSON_REQUIRED",
      "Lesson learned is required when closing an initiative with attributed investment (Doc 11).",
    );
  }

  return domainOk();
}
