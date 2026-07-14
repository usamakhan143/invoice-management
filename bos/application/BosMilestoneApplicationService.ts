import type { BosMilestoneRepository } from "../contracts/BosMilestoneRepository";
import type {
  BlockBosMilestoneInput,
  BosMilestone,
  CompleteBosMilestoneInput,
  CreateBosMilestoneInput,
  SkipBosMilestoneInput,
  StartBosMilestoneInput,
  UpdateBosMilestoneInput,
} from "../domain/entities/milestone";
import type {
  BosInitiativeId,
  BosMilestoneId,
  PaginatedResult,
  PaginationQuery,
} from "../types";
import { firestoreBosMilestoneRepository } from "../infrastructure/firestore/repositories/FirestoreBosMilestoneRepository";
import type { BosActorScope, BosReadScope } from "./types";
import { mapRepositoryError } from "./errors";
import { nowEpochMs } from "../infrastructure/firestore/timestamp";

export interface CreateMilestoneDraftInput {
  title: string;
  description?: string;
  sequence: number;
  plannedStartDate?: number;
  plannedEndDate?: number;
  ownerUserId?: string;
  templateStepId?: string;
}

export class BosMilestoneApplicationService {
  constructor(
    private readonly milestones: BosMilestoneRepository = firestoreBosMilestoneRepository,
  ) {}

  async getMilestone(scope: BosReadScope, id: BosMilestoneId): Promise<BosMilestone | null> {
    try {
      return await this.milestones.findById(scope.companyId, id);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async listMilestonesByInitiative(
    scope: BosReadScope,
    initiativeId: BosInitiativeId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosMilestone>> {
    try {
      return await this.milestones.listByInitiative(scope.companyId, initiativeId, query);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async createMilestone(
    scope: BosActorScope,
    input: Omit<CreateBosMilestoneInput, "companyId" | "createdById">,
  ): Promise<BosMilestone> {
    try {
      return await this.milestones.create({
        ...input,
        companyId: scope.companyId,
        createdById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async batchCreateMilestones(
    scope: BosActorScope,
    initiativeId: BosInitiativeId,
    drafts: CreateMilestoneDraftInput[],
    options?: { templateId?: string },
  ): Promise<BosMilestone[]> {
    try {
      const inputs: CreateBosMilestoneInput[] = drafts.map((draft) => ({
        companyId: scope.companyId,
        initiativeId,
        templateId: options?.templateId,
        templateStepId: draft.templateStepId,
        title: draft.title,
        description: draft.description,
        sequence: draft.sequence,
        plannedStartDate: draft.plannedStartDate,
        plannedEndDate: draft.plannedEndDate,
        ownerUserId: draft.ownerUserId,
        createdById: scope.actorUserId,
      }));
      return await this.milestones.batchCreate(inputs);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async updateMilestone(
    scope: BosActorScope,
    id: BosMilestoneId,
    input: Omit<UpdateBosMilestoneInput, "updatedById">,
  ): Promise<BosMilestone> {
    try {
      return await this.milestones.update(scope.companyId, id, {
        ...input,
        updatedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async markMilestoneReady(scope: BosActorScope, id: BosMilestoneId): Promise<BosMilestone> {
    try {
      return await this.milestones.markReady(scope.companyId, id, scope.actorUserId);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async startMilestone(
    scope: BosActorScope,
    id: BosMilestoneId,
    startedAt?: number,
  ): Promise<BosMilestone> {
    try {
      const input: StartBosMilestoneInput = {
        startedAt: startedAt ?? nowEpochMs(),
        updatedById: scope.actorUserId,
      };
      return await this.milestones.start(scope.companyId, id, input);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async completeMilestone(
    scope: BosActorScope,
    id: BosMilestoneId,
    input: Omit<CompleteBosMilestoneInput, "updatedById">,
  ): Promise<BosMilestone> {
    try {
      return await this.milestones.complete(scope.companyId, id, {
        ...input,
        updatedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async blockMilestone(
    scope: BosActorScope,
    id: BosMilestoneId,
    blockedReason: string,
    blockedAt?: number,
  ): Promise<BosMilestone> {
    try {
      const input: BlockBosMilestoneInput = {
        blockedReason,
        blockedAt: blockedAt ?? nowEpochMs(),
        updatedById: scope.actorUserId,
      };
      return await this.milestones.block(scope.companyId, id, input);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async skipMilestone(
    scope: BosActorScope,
    id: BosMilestoneId,
    skippedReason?: string,
    skippedAt?: number,
  ): Promise<BosMilestone> {
    try {
      const input: SkipBosMilestoneInput = {
        skippedReason,
        skippedAt: skippedAt ?? nowEpochMs(),
        updatedById: scope.actorUserId,
      };
      return await this.milestones.skip(scope.companyId, id, input);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async reorderMilestones(
    scope: BosActorScope,
    initiativeId: BosInitiativeId,
    orderedIds: BosMilestoneId[],
  ): Promise<BosMilestone[]> {
    try {
      return await this.milestones.reorder(scope.companyId, initiativeId, {
        orderedIds,
        updatedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async deletePlannedMilestone(scope: BosActorScope, id: BosMilestoneId): Promise<void> {
    try {
      await this.milestones.deletePlanned(scope.companyId, id);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }
}

export const bosMilestoneApplicationService = new BosMilestoneApplicationService();
