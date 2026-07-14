import type { BosInitiativeRepository } from "../contracts/BosInitiativeRepository";
import type {
  BosInitiative,
  CloseBosInitiativeInput,
  CreateBosInitiativeInput,
  UpdateBosInitiativeInput,
} from "../domain/entities/initiative";
import type {
  BosInitiativeId,
  BosVentureId,
  PaginatedResult,
  PaginationQuery,
} from "../types";
import type { InitiativeStatus } from "../constants/initiativeStatus";
import { firestoreBosInitiativeRepository } from "../infrastructure/firestore/repositories/FirestoreBosInitiativeRepository";
import type { BosActorScope, BosReadScope } from "./types";
import { mapRepositoryError } from "./errors";

export class BosInitiativeApplicationService {
  constructor(
    private readonly initiatives: BosInitiativeRepository = firestoreBosInitiativeRepository,
  ) {}

  async getInitiative(scope: BosReadScope, id: BosInitiativeId): Promise<BosInitiative | null> {
    try {
      return await this.initiatives.findById(scope.companyId, id);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async listInitiatives(
    scope: BosReadScope,
    query?: PaginationQuery & { ventureId?: BosVentureId; status?: InitiativeStatus },
  ): Promise<PaginatedResult<BosInitiative>> {
    try {
      return await this.initiatives.listByCompany(scope.companyId, query);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async listInitiativesByVenture(
    scope: BosReadScope,
    ventureId: BosVentureId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosInitiative>> {
    try {
      return await this.initiatives.listByVenture(scope.companyId, ventureId, query);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async createInitiative(
    scope: BosActorScope,
    input: Omit<CreateBosInitiativeInput, "companyId" | "createdById">,
  ): Promise<BosInitiative> {
    try {
      return await this.initiatives.create({
        ...input,
        companyId: scope.companyId,
        createdById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async updateInitiative(
    scope: BosActorScope,
    id: BosInitiativeId,
    input: Omit<UpdateBosInitiativeInput, "updatedById">,
  ): Promise<BosInitiative> {
    try {
      return await this.initiatives.update(scope.companyId, id, {
        ...input,
        updatedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async transitionInitiativeStatus(
    scope: BosActorScope,
    id: BosInitiativeId,
    status: InitiativeStatus,
  ): Promise<BosInitiative> {
    try {
      return await this.initiatives.updateStatus(scope.companyId, id, status, scope.actorUserId);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async closeInitiative(
    scope: BosActorScope,
    id: BosInitiativeId,
    input: Omit<CloseBosInitiativeInput, "closedById">,
  ): Promise<BosInitiative> {
    try {
      return await this.initiatives.close(scope.companyId, id, {
        ...input,
        closedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }
}

export const bosInitiativeApplicationService = new BosInitiativeApplicationService();
