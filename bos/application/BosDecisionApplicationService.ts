import type { BosDecisionRepository } from "../contracts/BosDecisionRepository";
import type {
  BosDecision,
  CreateBosDecisionInput,
  EvaluateBosDecisionInput,
  UpdateBosDecisionInput,
} from "../domain/entities/decision";
import type {
  BosDecisionId,
  BosInitiativeId,
  BosVentureId,
  PaginatedResult,
  PaginationQuery,
} from "../types";
import type { DecisionStatus } from "../constants/decisionStatus";
import { firestoreBosDecisionRepository } from "../infrastructure/firestore/repositories/FirestoreBosDecisionRepository";
import type { BosActorScope, BosReadScope } from "./types";
import { mapRepositoryError } from "./errors";

export class BosDecisionApplicationService {
  constructor(
    private readonly decisions: BosDecisionRepository = firestoreBosDecisionRepository,
  ) {}

  async getDecision(scope: BosReadScope, id: BosDecisionId): Promise<BosDecision | null> {
    try {
      return await this.decisions.findById(scope.companyId, id);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async listDecisions(
    scope: BosReadScope,
    query?: PaginationQuery & { status?: DecisionStatus },
  ): Promise<PaginatedResult<BosDecision>> {
    try {
      return await this.decisions.listByCompany(scope.companyId, query);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async listDecisionsByInitiative(
    scope: BosReadScope,
    initiativeId: BosInitiativeId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosDecision>> {
    try {
      return await this.decisions.listByInitiative(scope.companyId, initiativeId, query);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async listDecisionsByVenture(
    scope: BosReadScope,
    ventureId: BosVentureId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosDecision>> {
    try {
      return await this.decisions.listByVenture(scope.companyId, ventureId, query);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async createDecision(
    scope: BosActorScope,
    input: Omit<CreateBosDecisionInput, "companyId" | "createdById">,
  ): Promise<BosDecision> {
    try {
      return await this.decisions.create({
        ...input,
        companyId: scope.companyId,
        createdById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async updateDecision(
    scope: BosActorScope,
    id: BosDecisionId,
    input: Omit<UpdateBosDecisionInput, "updatedById">,
  ): Promise<BosDecision> {
    try {
      return await this.decisions.update(scope.companyId, id, {
        ...input,
        updatedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async transitionDecisionStatus(
    scope: BosActorScope,
    id: BosDecisionId,
    status: DecisionStatus,
  ): Promise<BosDecision> {
    try {
      return await this.decisions.updateStatus(scope.companyId, id, status, scope.actorUserId);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async evaluateDecision(
    scope: BosActorScope,
    id: BosDecisionId,
    input: Omit<EvaluateBosDecisionInput, "evaluatedById">,
  ): Promise<BosDecision> {
    try {
      return await this.decisions.evaluate(scope.companyId, id, {
        ...input,
        evaluatedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }
}

export const bosDecisionApplicationService = new BosDecisionApplicationService();
