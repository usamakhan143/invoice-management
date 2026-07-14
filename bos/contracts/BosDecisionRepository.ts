import type {
  BosDecisionId,
  BosInitiativeId,
  BosVentureId,
  CompanyId,
  PaginationQuery,
  PaginatedResult,
} from "../types";
import type { DecisionStatus } from "../constants/decisionStatus";
import type {
  BosDecision,
  CreateBosDecisionInput,
  EvaluateBosDecisionInput,
  UpdateBosDecisionInput,
} from "../domain/entities/decision";

export interface BosDecisionRepository {
  findById(companyId: CompanyId, id: BosDecisionId): Promise<BosDecision | null>;

  listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & { status?: DecisionStatus },
  ): Promise<PaginatedResult<BosDecision>>;

  listByInitiative(
    companyId: CompanyId,
    initiativeId: BosInitiativeId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosDecision>>;

  listByVenture(
    companyId: CompanyId,
    ventureId: BosVentureId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosDecision>>;

  create(input: CreateBosDecisionInput): Promise<BosDecision>;

  update(
    companyId: CompanyId,
    id: BosDecisionId,
    input: UpdateBosDecisionInput,
  ): Promise<BosDecision>;

  updateStatus(
    companyId: CompanyId,
    id: BosDecisionId,
    status: DecisionStatus,
    updatedById: string,
  ): Promise<BosDecision>;

  evaluate(
    companyId: CompanyId,
    id: BosDecisionId,
    input: EvaluateBosDecisionInput,
  ): Promise<BosDecision>;
}

export const BOS_DECISION_REPOSITORY = Symbol("BosDecisionRepository");
