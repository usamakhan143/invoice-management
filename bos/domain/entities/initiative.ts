import type {
  AuditActor,
  AuditTimestamps,
  BosInitiativeId,
  BosVentureId,
  CompanyId,
  CurrencyCode,
  EpochMs,
  MoneyAmount,
  UserId,
} from "../../types";
import type {
  InitiativeClosureOutcome,
  InitiativeStatus,
} from "../../constants/initiativeStatus";

/**
 * BosInitiative — time-bound strategic bet within a venture (Doc 10).
 *
 * Responsibilities:
 *   - Hub for attribution, decisions, experiments (future), and KPIs
 *   - Express hypothesis, budget, success criteria
 *   - NOT a CRM campaign or ERP project
 *
 * Ownership:
 *   - Venture Lead / Founder (bos_initiatives_manage)
 *   - Always belongs to exactly one BosVenture
 *
 * Lifecycle: Doc 11 §2 — see initiativeLifecycle.ts
 */
export interface BosInitiative extends AuditTimestamps, AuditActor {
  id: BosInitiativeId;
  companyId: CompanyId;
  ventureId: BosVentureId;
  name: string;
  hypothesis?: string;
  successCriteria?: string;
  status: InitiativeStatus;
  closureOutcome?: InitiativeClosureOutcome;
  closureReason?: string;
  budget?: MoneyAmount;
  startDate?: EpochMs;
  endDate?: EpochMs;
  closedAt?: EpochMs;
  /** Set when initiative is pivoted — links to successor initiative. */
  successorInitiativeId?: BosInitiativeId;
  predecessorInitiativeId?: BosInitiativeId;
}

export interface CreateBosInitiativeInput {
  companyId: CompanyId;
  ventureId: BosVentureId;
  name: string;
  hypothesis?: string;
  successCriteria?: string;
  /** Planned start (local calendar day, start of day epoch ms). */
  startDate?: EpochMs;
  /** Planned end (local calendar day, start of day epoch ms). Optional. */
  endDate?: EpochMs;
  budgetAmount?: number;
  budgetCurrency?: CurrencyCode;
  createdById: UserId;
}

export interface UpdateBosInitiativeInput {
  name?: string;
  hypothesis?: string;
  successCriteria?: string;
  budgetAmount?: number;
  budgetCurrency?: CurrencyCode;
  updatedById: UserId;
}

export interface CloseBosInitiativeInput {
  closureOutcome: InitiativeClosureOutcome;
  closureReason?: string;
  /** Required when closing an initiative with attributed investment (Doc 11). */
  lessonLearned?: string;
  closedById: UserId;
}
