import type { BosMilestoneTemplateRepository } from "../contracts/BosMilestoneTemplateRepository";
import type { BosMilestoneRepository } from "../contracts/BosMilestoneRepository";
import type {
  BosMilestoneTemplate,
  CreateBosMilestoneTemplateInput,
  MilestoneDraftStep,
  UpdateBosMilestoneTemplateInput,
} from "../domain/entities/milestoneTemplate";
import type { BosInitiativeId, BosMilestoneTemplateId, PaginatedResult, PaginationQuery } from "../types";
import { MILESTONE_TEMPLATE_VISIBILITY } from "../constants/milestoneTemplateVisibility";
import { firestoreBosMilestoneTemplateRepository } from "../infrastructure/firestore/repositories/FirestoreBosMilestoneTemplateRepository";
import { firestoreBosMilestoneRepository } from "../infrastructure/firestore/repositories/FirestoreBosMilestoneRepository";
import type { BosActorScope, BosReadScope } from "./types";
import { mapRepositoryError } from "./errors";

export class BosMilestoneTemplateApplicationService {
  constructor(
    private readonly templates: BosMilestoneTemplateRepository = firestoreBosMilestoneTemplateRepository,
    private readonly milestones: BosMilestoneRepository = firestoreBosMilestoneRepository,
  ) {}

  async getTemplate(
    scope: BosReadScope,
    id: BosMilestoneTemplateId,
  ): Promise<BosMilestoneTemplate | null> {
    try {
      return await this.templates.findById(scope.companyId, id);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async listTemplates(
    scope: BosReadScope,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosMilestoneTemplate>> {
    try {
      return await this.templates.listByCompany(scope.companyId, query);
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  /** Templates visible to the actor (private own + company-wide). */
  async listAvailableTemplates(
    scope: BosReadScope & { actorUserId: string },
    query?: PaginationQuery,
  ): Promise<BosMilestoneTemplate[]> {
    try {
      const result = await this.templates.listByCompany(scope.companyId, { ...query, limit: 100 });
      return result.items.filter(
        (t) =>
          t.visibility === MILESTONE_TEMPLATE_VISIBILITY.COMPANY ||
          (t.visibility === MILESTONE_TEMPLATE_VISIBILITY.PRIVATE &&
            t.ownerUserId === scope.actorUserId),
      );
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async createTemplate(
    scope: BosActorScope,
    input: Omit<CreateBosMilestoneTemplateInput, "companyId" | "createdById" | "ownerUserId">,
  ): Promise<BosMilestoneTemplate> {
    try {
      return await this.templates.create({
        ...input,
        companyId: scope.companyId,
        ownerUserId: scope.actorUserId,
        createdById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async updateTemplate(
    scope: BosActorScope,
    id: BosMilestoneTemplateId,
    input: Omit<UpdateBosMilestoneTemplateInput, "updatedById">,
  ): Promise<BosMilestoneTemplate> {
    try {
      return await this.templates.update(scope.companyId, id, {
        ...input,
        updatedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  templateStepsToDrafts(template: BosMilestoneTemplate): MilestoneDraftStep[] {
    return [...template.steps]
      .sort((a, b) => a.sequence - b.sequence)
      .map((step, index) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        sequence: index,
        defaultDurationDays: step.defaultDurationDays,
      }));
  }

  async createTemplateFromMilestoneStep(
    scope: BosActorScope,
    input: {
      name: string;
      category?: string;
      description?: string;
      visibility: CreateBosMilestoneTemplateInput["visibility"];
      step: CreateBosMilestoneTemplateInput["steps"][number];
    },
  ): Promise<BosMilestoneTemplate> {
    try {
      return await this.templates.create({
        companyId: scope.companyId,
        name: input.name.trim(),
        category: input.category?.trim(),
        description: input.description?.trim(),
        steps: [{ ...input.step, sequence: 0 }],
        visibility: input.visibility,
        ownerUserId: scope.actorUserId,
        createdById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async appendStepToTemplate(
    scope: BosActorScope,
    templateId: BosMilestoneTemplateId,
    step: CreateBosMilestoneTemplateInput["steps"][number],
  ): Promise<BosMilestoneTemplate> {
    try {
      const existing = await this.templates.findById(scope.companyId, templateId);
      if (!existing) {
        throw new Error("Template not found.");
      }
      const nextSequence = existing.steps.length
        ? Math.max(...existing.steps.map((s) => s.sequence)) + 1
        : 0;
      return await this.templates.update(scope.companyId, templateId, {
        steps: [...existing.steps, { ...step, sequence: nextSequence }],
        updatedById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }

  async saveInitiativeMilestonesAsTemplate(
    scope: BosActorScope,
    initiativeId: BosInitiativeId,
    input: {
      name: string;
      category?: string;
      description?: string;
      visibility: CreateBosMilestoneTemplateInput["visibility"];
    },
  ): Promise<BosMilestoneTemplate> {
    try {
      const milestonePage = await this.milestones.listByInitiative(scope.companyId, initiativeId, {
        limit: 200,
      });
      const steps = milestonePage.items
        .sort((a, b) => a.sequence - b.sequence)
        .map((m, index) => ({
          id: m.templateStepId ?? m.id,
          title: m.title,
          description: m.description,
          sequence: index,
          phase: m.phase,
          priority: m.priority,
          milestoneType: m.milestoneType,
          businessImpact: m.businessImpact,
          riskLevel: m.riskLevel,
          estimatedDuration: m.estimatedDuration,
          estimatedDurationUnit: m.estimatedDurationUnit,
          estimatedCostAmount: m.estimatedCostAmount,
          estimatedCostCurrency: m.estimatedCostCurrency,
          successCriteria: m.successCriteria,
          completionRequirements: m.completionRequirements,
          tags: m.tags,
        }));

      if (!steps.length) {
        throw new Error("Initiative has no milestones to save as a template.");
      }

      return await this.templates.create({
        companyId: scope.companyId,
        name: input.name.trim(),
        category: input.category?.trim(),
        description: input.description?.trim(),
        steps,
        visibility: input.visibility,
        ownerUserId: scope.actorUserId,
        sourceInitiativeId: initiativeId,
        createdById: scope.actorUserId,
      });
    } catch (error) {
      return mapRepositoryError(error);
    }
  }
}

export const bosMilestoneTemplateApplicationService = new BosMilestoneTemplateApplicationService();
