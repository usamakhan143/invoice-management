import type { BosVentureRepository } from "../contracts/BosVentureRepository";
import type { BosInitiativeRepository } from "../contracts/BosInitiativeRepository";
import type {
  BosVenture,
  CreateBosVentureInput,
  UpdateBosVentureInput,
} from "../domain/entities/venture";
import type { BosVentureId, PaginatedResult, PaginationQuery } from "../types";
import type { VentureStatus } from "../constants/ventureStatus";
import { VENTURE_STATUS } from "../constants/ventureStatus";
import { INITIATIVE_STATUS } from "../constants/initiativeStatus";
import {
  validateVentureArchivePrerequisites,
  validateVentureStatusTransition,
} from "../domain/rules/ventureRules";
import { firestoreBosInitiativeRepository } from "../infrastructure/firestore/repositories/FirestoreBosInitiativeRepository";
import { firestoreBosVentureRepository } from "../infrastructure/firestore/repositories/FirestoreBosVentureRepository";
import type { BosActorScope, BosReadScope } from "./types";
import { BosApplicationError, mapRepositoryError } from "./errors";
import { assertApplicationDomainOk } from "./validation";

export class BosVentureApplicationService {
  constructor(
    private readonly ventures: BosVentureRepository = firestoreBosVentureRepository,
    private readonly initiatives: BosInitiativeRepository = firestoreBosInitiativeRepository,
  ) {}

  async getVenture(scope: BosReadScope, id: BosVentureId): Promise<BosVenture | null> {
    try {
      return await this.ventures.findById(scope.companyId, id);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async listVentures(
    scope: BosReadScope,
    query?: PaginationQuery & { status?: VentureStatus },
  ): Promise<PaginatedResult<BosVenture>> {
    try {
      return await this.ventures.listByCompany(scope.companyId, query);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async createVenture(
    scope: BosActorScope,
    input: Omit<CreateBosVentureInput, "companyId" | "createdById">,
  ): Promise<BosVenture> {
    try {
      return await this.ventures.create({
        ...input,
        companyId: scope.companyId,
        createdById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async updateVenture(
    scope: BosActorScope,
    id: BosVentureId,
    input: Omit<UpdateBosVentureInput, "updatedById">,
  ): Promise<BosVenture> {
    try {
      return await this.ventures.update(scope.companyId, id, {
        ...input,
        updatedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async transitionVentureStatus(
    scope: BosActorScope,
    id: BosVentureId,
    status: VentureStatus,
  ): Promise<BosVenture> {
    try {
      return await this.ventures.updateStatus(scope.companyId, id, status, scope.actorUserId);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  /** Doc 11 — archive only after all initiatives are closed. */
  async archiveVenture(scope: BosActorScope, id: BosVentureId): Promise<BosVenture> {
    try {
      const venture = await this.ventures.findById(scope.companyId, id);
      if (!venture) {
        throw new BosApplicationError("Venture not found", "BOS_NOT_FOUND");
      }

      const initiatives = await this.initiatives.listByCompany(scope.companyId, {
        ventureId: id,
        limit: 100,
      });
      const openInitiativeCount = initiatives.items.filter(
        (item) => item.status !== INITIATIVE_STATUS.CLOSED,
      ).length;

      assertApplicationDomainOk(
        validateVentureArchivePrerequisites({ openInitiativeCount }),
        "Cannot archive venture",
      );

      let current = venture;
      if (current.status !== VENTURE_STATUS.WINDING_DOWN) {
        assertApplicationDomainOk(
          validateVentureStatusTransition(current, VENTURE_STATUS.WINDING_DOWN),
          "Venture must enter winding down before archive",
        );
        current = await this.ventures.updateStatus(
          scope.companyId,
          id,
          VENTURE_STATUS.WINDING_DOWN,
          scope.actorUserId,
        );
      }

      assertApplicationDomainOk(
        validateVentureStatusTransition(current, VENTURE_STATUS.ARCHIVED),
        "Invalid venture archive transition",
      );

      return await this.ventures.updateStatus(
        scope.companyId,
        id,
        VENTURE_STATUS.ARCHIVED,
        scope.actorUserId,
      );
    } catch (error) {
      if (error instanceof BosApplicationError) {
        throw error;
      }
      return mapRepositoryError(error);
    }
  }
}

export const bosVentureApplicationService = new BosVentureApplicationService();
