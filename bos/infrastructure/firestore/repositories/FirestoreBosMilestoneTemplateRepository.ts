import type firebase from "firebase/compat/app";
import { db, Timestamp } from "../../../../services/firebase";
import type { BosMilestoneTemplateRepository } from "../../../contracts/BosMilestoneTemplateRepository";
import type {
  BosMilestoneTemplate,
  CreateBosMilestoneTemplateInput,
  UpdateBosMilestoneTemplateInput,
} from "../../../domain/entities/milestoneTemplate";
import type {
  BosMilestoneTemplateId,
  CompanyId,
  PaginatedResult,
  PaginationQuery,
} from "../../../types";
import {
  validateCreateMilestoneTemplate,
  validateUpdateMilestoneTemplate,
} from "../../../domain/rules/milestoneTemplateRules";
import { assertDomainOk, BosRepositoryError } from "../errors";
import { BOS_COLLECTIONS } from "../collections";
import {
  milestoneTemplateFromFirestore,
  milestoneTemplateToFirestore,
} from "../models/milestoneTemplateDocument";
import { assertCompanyMatch, runPaginatedQueryByCreatedAt } from "../pagination";
import { nowEpochMs } from "../timestamp";

export class FirestoreBosMilestoneTemplateRepository implements BosMilestoneTemplateRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore = db) {}

  private collection() {
    return this.firestore.collection(BOS_COLLECTIONS.MILESTONE_TEMPLATES);
  }

  async findById(
    companyId: CompanyId,
    id: BosMilestoneTemplateId,
  ): Promise<BosMilestoneTemplate | null> {
    const snap = await this.collection().doc(id).get();
    if (!snap.exists) return null;
    const template = milestoneTemplateFromFirestore(snap.id, snap.data());
    if (!template) return null;
    assertCompanyMatch(companyId, template.companyId, "BosMilestoneTemplate");
    return template;
  }

  async listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosMilestoneTemplate>> {
    return runPaginatedQueryByCreatedAt(
      (base) => base.where("companyId", "==", companyId),
      (doc) => {
        const template = milestoneTemplateFromFirestore(doc.id, doc.data());
        if (!template) {
          throw new BosRepositoryError(
            `Invalid BosMilestoneTemplate document: ${doc.id}`,
            "BOS_INVALID_DOC",
          );
        }
        return template;
      },
      this.collection(),
      query,
    );
  }

  async create(input: CreateBosMilestoneTemplateInput): Promise<BosMilestoneTemplate> {
    assertDomainOk(validateCreateMilestoneTemplate(input), "Invalid milestone template");

    const now = nowEpochMs();
    const payload = milestoneTemplateToFirestore({
      companyId: input.companyId,
      name: input.name.trim(),
      category: input.category?.trim(),
      description: input.description?.trim(),
      steps: input.steps.map((step, index) => ({
        ...step,
        sequence: step.sequence ?? index,
      })),
      visibility: input.visibility,
      ownerUserId: input.ownerUserId,
      sourceInitiativeId: input.sourceInitiativeId,
      createdById: input.createdById,
      updatedById: input.createdById,
      createdAt: now,
      updatedAt: now,
    });

    const ref = await this.collection().add(payload);
    const created = await this.findById(input.companyId, ref.id);
    if (!created) {
      throw new BosRepositoryError("Failed to load template after create", "BOS_CREATE_FAILED");
    }
    return created;
  }

  async update(
    companyId: CompanyId,
    id: BosMilestoneTemplateId,
    input: UpdateBosMilestoneTemplateInput,
  ): Promise<BosMilestoneTemplate> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Milestone template not found", "BOS_NOT_FOUND");
    }
    assertDomainOk(validateUpdateMilestoneTemplate(input), "Invalid milestone template update");

    const patch: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    };
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.category !== undefined) patch.category = input.category.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.visibility !== undefined) patch.visibility = input.visibility;
    if (input.steps !== undefined) {
      patch.steps = input.steps.map((step, index) => ({
        id: step.id,
        title: step.title.trim(),
        description: step.description?.trim(),
        sequence: step.sequence ?? index,
        defaultDurationDays: step.defaultDurationDays,
      }));
    }

    await this.collection().doc(id).update(patch);
    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load template after update", "BOS_UPDATE_FAILED");
    }
    return updated;
  }
}

export const firestoreBosMilestoneTemplateRepository =
  new FirestoreBosMilestoneTemplateRepository();
