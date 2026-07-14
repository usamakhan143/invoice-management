import type firebase from "firebase/compat/app";
import { db, Timestamp } from "../../../../services/firebase";
import type { BosInitiativeRepository } from "../../../contracts/BosInitiativeRepository";
import type {
  BosMilestoneRepository,
  ReorderBosMilestonesInput,
} from "../../../contracts/BosMilestoneRepository";
import type {
  BlockBosMilestoneInput,
  BosMilestone,
  BosMilestoneEvidence,
  CompleteBosMilestoneInput,
  CreateBosMilestoneInput,
  SkipBosMilestoneInput,
  StartBosMilestoneInput,
  UpdateBosMilestoneInput,
} from "../../../domain/entities/milestone";
import type {
  BosInitiativeId,
  BosMilestoneId,
  CompanyId,
  PaginatedResult,
  PaginationQuery,
} from "../../../types";
import { MILESTONE_STATUS } from "../../../constants/milestoneStatus";
import { parseKnownMilestoneStatus } from "../../../domain/guards/statusGuards";
import {
  validateCompleteMilestone,
  validateCreateMilestone,
  validateMilestoneDependenciesMet,
  validateMilestoneStatusTransition,
  validateUpdateMilestone,
} from "../../../domain/rules/milestoneRules";
import {
  formatMilestoneNumber,
  resolveNextMilestoneNumberIndex,
} from "../../../domain/milestoneNumbering";
import { assertDomainOk, BosRepositoryError, normalizePageLimit } from "../errors";
import { BOS_COLLECTIONS } from "../collections";
import { milestoneFromFirestore, milestoneToFirestore } from "../models/milestoneDocument";
import { assertCompanyMatch } from "../pagination";
import { epochMsToTimestamp, nowEpochMs } from "../timestamp";
import { firestoreBosInitiativeRepository } from "./FirestoreBosInitiativeRepository";

function newEvidenceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export class FirestoreBosMilestoneRepository implements BosMilestoneRepository {
  constructor(
    private readonly firestore: firebase.firestore.Firestore = db,
    private readonly initiativeRepository: BosInitiativeRepository = firestoreBosInitiativeRepository,
  ) {}

  private collection() {
    return this.firestore.collection(BOS_COLLECTIONS.MILESTONES);
  }

  async findById(companyId: CompanyId, id: BosMilestoneId): Promise<BosMilestone | null> {
    const snap = await this.collection().doc(id).get();
    if (!snap.exists) return null;
    const milestone = milestoneFromFirestore(snap.id, snap.data());
    if (!milestone) return null;
    assertCompanyMatch(companyId, milestone.companyId, "BosMilestone");
    return milestone;
  }

  async listByInitiative(
    companyId: CompanyId,
    initiativeId: BosInitiativeId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosMilestone>> {
    const limit = normalizePageLimit(query?.limit);
    let q = this.collection()
      .where("companyId", "==", companyId)
      .where("initiativeId", "==", initiativeId)
      .orderBy("sequence", "asc")
      .limit(limit + 1);

    if (query?.cursor) {
      const cursorDoc = await this.collection().doc(query.cursor).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    const snap = await q.get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const pageDocs = hasMore ? docs.slice(0, limit) : docs;

    const items: BosMilestone[] = [];
    for (const doc of pageDocs) {
      const milestone = milestoneFromFirestore(doc.id, doc.data());
      if (!milestone) {
        throw new BosRepositoryError(
          `Invalid BosMilestone document: ${doc.id}`,
          "BOS_INVALID_DOC",
        );
      }
      items.push(milestone);
    }

    return {
      items,
      nextCursor: hasMore ? pageDocs[pageDocs.length - 1]?.id : undefined,
    };
  }

  private async assertInitiativeExists(companyId: CompanyId, initiativeId: BosInitiativeId) {
    const initiative = await this.initiativeRepository.findById(companyId, initiativeId);
    if (!initiative) {
      throw new BosRepositoryError("Initiative not found for milestone", "BOS_INITIATIVE_NOT_FOUND");
    }
    return initiative;
  }

  private async loadInitiativeMilestones(
    companyId: CompanyId,
    initiativeId: BosInitiativeId,
  ): Promise<BosMilestone[]> {
    const result = await this.listByInitiative(companyId, initiativeId, { limit: 200 });
    return result.items;
  }

  private assignMilestoneNumbers(
    existing: BosMilestone[],
    count: number,
  ): Array<{ milestoneNumberIndex: number; milestoneNumber: string }> {
    let nextIndex = resolveNextMilestoneNumberIndex(existing);
    const assigned: Array<{ milestoneNumberIndex: number; milestoneNumber: string }> = [];
    for (let i = 0; i < count; i++) {
      assigned.push({
        milestoneNumberIndex: nextIndex,
        milestoneNumber: formatMilestoneNumber(nextIndex),
      });
      nextIndex += 1;
    }
    return assigned;
  }

  async create(input: CreateBosMilestoneInput): Promise<BosMilestone> {
    assertDomainOk(validateCreateMilestone(input), "Invalid milestone");
    await this.assertInitiativeExists(input.companyId, input.initiativeId);

    const existing = await this.loadInitiativeMilestones(input.companyId, input.initiativeId);
    const [{ milestoneNumberIndex, milestoneNumber }] = this.assignMilestoneNumbers(existing, 1);

    const now = nowEpochMs();
    const payload = milestoneToFirestore({
      companyId: input.companyId,
      initiativeId: input.initiativeId,
      templateId: input.templateId,
      templateStepId: input.templateStepId,
      milestoneNumber,
      milestoneNumberIndex,
      title: input.title.trim(),
      description: input.description?.trim(),
      milestoneType: input.milestoneType?.trim(),
      phase: input.phase?.trim(),
      priority: input.priority,
      businessImpact: input.businessImpact,
      estimatedDuration: input.estimatedDuration,
      estimatedDurationUnit: input.estimatedDurationUnit,
      estimatedCostAmount: input.estimatedCostAmount,
      estimatedCostCurrency: input.estimatedCostCurrency,
      successCriteria: input.successCriteria?.trim(),
      completionRequirements: input.completionRequirements,
      tags: input.tags,
      sequence: input.sequence,
      plannedStartDate: input.plannedStartDate,
      plannedEndDate: input.plannedEndDate,
      status: MILESTONE_STATUS.PLANNED,
      ownerUserId: input.ownerUserId,
      notes: input.notes?.trim(),
      dependencyIds: input.dependencyIds,
      createdById: input.createdById,
      updatedById: input.createdById,
      createdAt: now,
      updatedAt: now,
    });

    const ref = await this.collection().add(payload);
    const created = await this.findById(input.companyId, ref.id);
    if (!created) {
      throw new BosRepositoryError("Failed to load milestone after create", "BOS_CREATE_FAILED");
    }
    return created;
  }

  async batchCreate(inputs: CreateBosMilestoneInput[]): Promise<BosMilestone[]> {
    if (!inputs.length) return [];
    const companyId = inputs[0].companyId;
    const initiativeId = inputs[0].initiativeId;
    for (const input of inputs) {
      assertDomainOk(validateCreateMilestone(input), "Invalid milestone");
      if (input.companyId !== companyId || input.initiativeId !== initiativeId) {
        throw new BosRepositoryError(
          "Batch create requires same company and initiative",
          "BOS_DOMAIN_VALIDATION",
        );
      }
    }
    await this.assertInitiativeExists(companyId, initiativeId);

    const existing = await this.loadInitiativeMilestones(companyId, initiativeId);
    const assignedNumbers = this.assignMilestoneNumbers(existing, inputs.length);

    const batch = this.firestore.batch();
    const refs: firebase.firestore.DocumentReference[] = [];
    const now = nowEpochMs();

    inputs.forEach((input, index) => {
      const { milestoneNumberIndex, milestoneNumber } = assignedNumbers[index];
      const ref = this.collection().doc();
      refs.push(ref);
      const payload = milestoneToFirestore({
        companyId: input.companyId,
        initiativeId: input.initiativeId,
        templateId: input.templateId,
        templateStepId: input.templateStepId,
        milestoneNumber,
        milestoneNumberIndex,
        title: input.title.trim(),
        description: input.description?.trim(),
        milestoneType: input.milestoneType?.trim(),
        phase: input.phase?.trim(),
        priority: input.priority,
        businessImpact: input.businessImpact,
        estimatedDuration: input.estimatedDuration,
        estimatedDurationUnit: input.estimatedDurationUnit,
        estimatedCostAmount: input.estimatedCostAmount,
        estimatedCostCurrency: input.estimatedCostCurrency,
        successCriteria: input.successCriteria?.trim(),
        completionRequirements: input.completionRequirements,
        tags: input.tags,
        sequence: input.sequence,
        plannedStartDate: input.plannedStartDate,
        plannedEndDate: input.plannedEndDate,
        status: MILESTONE_STATUS.PLANNED,
        ownerUserId: input.ownerUserId,
        notes: input.notes?.trim(),
        dependencyIds: input.dependencyIds,
        createdById: input.createdById,
        updatedById: input.createdById,
        createdAt: now,
        updatedAt: now,
      });
      batch.set(ref, payload);
    });

    await batch.commit();

    const created: BosMilestone[] = [];
    for (const ref of refs) {
      const milestone = await this.findById(companyId, ref.id);
      if (!milestone) {
        throw new BosRepositoryError("Failed to load milestone after batch create", "BOS_CREATE_FAILED");
      }
      created.push(milestone);
    }
    return created.sort((a, b) => a.sequence - b.sequence);
  }

  async update(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: UpdateBosMilestoneInput,
  ): Promise<BosMilestone> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Milestone not found", "BOS_NOT_FOUND");
    }
    assertDomainOk(validateUpdateMilestone(existing, input), "Invalid milestone update");

    const patch: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.milestoneType !== undefined) patch.milestoneType = input.milestoneType.trim();
    if (input.phase !== undefined) patch.phase = input.phase.trim();
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.businessImpact !== undefined) patch.businessImpact = input.businessImpact;
    if (input.estimatedDuration !== undefined) patch.estimatedDuration = input.estimatedDuration;
    if (input.estimatedDurationUnit !== undefined) {
      patch.estimatedDurationUnit = input.estimatedDurationUnit;
    }
    if (input.estimatedCostAmount !== undefined) patch.estimatedCostAmount = input.estimatedCostAmount;
    if (input.estimatedCostCurrency !== undefined) {
      patch.estimatedCostCurrency = input.estimatedCostCurrency;
    }
    if (input.successCriteria !== undefined) patch.successCriteria = input.successCriteria.trim();
    if (input.completionRequirements !== undefined) {
      patch.completionRequirements = input.completionRequirements;
    }
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.sequence !== undefined) patch.sequence = input.sequence;
    if (input.plannedStartDate !== undefined) {
      patch.plannedStartDate = epochMsToTimestamp(input.plannedStartDate);
    }
    if (input.plannedEndDate !== undefined) {
      patch.plannedEndDate = epochMsToTimestamp(input.plannedEndDate);
    }
    if (input.ownerUserId !== undefined) patch.ownerUserId = input.ownerUserId;
    if (input.notes !== undefined) patch.notes = input.notes.trim();
    if (input.dependencyIds !== undefined) patch.dependencyIds = input.dependencyIds;

    await this.collection().doc(id).update(patch);
    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load milestone after update", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async markReady(companyId: CompanyId, id: BosMilestoneId, updatedById: string): Promise<BosMilestone> {
    return this.transitionStatus(companyId, id, MILESTONE_STATUS.READY, updatedById);
  }

  async start(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: StartBosMilestoneInput,
  ): Promise<BosMilestone> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Milestone not found", "BOS_NOT_FOUND");
    }

    const all = await this.loadInitiativeMilestones(companyId, existing.initiativeId);
    assertDomainOk(validateMilestoneDependenciesMet(existing, all), "Milestone dependencies unmet");
    assertDomainOk(
      validateMilestoneStatusTransition(existing, MILESTONE_STATUS.IN_PROGRESS),
      "Invalid milestone transition",
    );

    await this.collection().doc(id).update({
      status: MILESTONE_STATUS.IN_PROGRESS,
      startedAt: epochMsToTimestamp(input.startedAt),
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    });

    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load milestone after start", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async complete(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: CompleteBosMilestoneInput,
  ): Promise<BosMilestone> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Milestone not found", "BOS_NOT_FOUND");
    }

    const all = await this.loadInitiativeMilestones(companyId, existing.initiativeId);
    assertDomainOk(validateMilestoneDependenciesMet(existing, all), "Milestone dependencies unmet");
    assertDomainOk(validateCompleteMilestone(existing, input), "Invalid milestone completion");

    const now = nowEpochMs();
    const newEvidence: BosMilestoneEvidence[] = input.evidence.map((e) => ({
      id: newEvidenceId(),
      type: e.type,
      sourceId: e.sourceId,
      notes: e.notes?.trim(),
      recordedAt: now,
      recordedById: input.updatedById,
    }));

    const mergedEvidence = [...(existing.evidence ?? []), ...newEvidence];

    await this.collection().doc(id).update({
      status: MILESTONE_STATUS.COMPLETED,
      completedDate: epochMsToTimestamp(input.completedDate),
      evidence: mergedEvidence.map((e) => ({
        id: e.id,
        type: e.type,
        sourceId: e.sourceId,
        notes: e.notes,
        recordedAt: epochMsToTimestamp(e.recordedAt),
        recordedById: e.recordedById,
      })),
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    });

    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load milestone after complete", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async block(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: BlockBosMilestoneInput,
  ): Promise<BosMilestone> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Milestone not found", "BOS_NOT_FOUND");
    }
    assertDomainOk(
      validateMilestoneStatusTransition(existing, MILESTONE_STATUS.BLOCKED),
      "Invalid milestone transition",
    );
    if (!input.blockedReason?.trim()) {
      throw new BosRepositoryError("Blocked reason is required", "BOS_DOMAIN_VALIDATION");
    }

    await this.collection().doc(id).update({
      status: MILESTONE_STATUS.BLOCKED,
      blockedReason: input.blockedReason.trim(),
      blockedAt: epochMsToTimestamp(input.blockedAt),
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    });

    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load milestone after block", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async skip(
    companyId: CompanyId,
    id: BosMilestoneId,
    input: SkipBosMilestoneInput,
  ): Promise<BosMilestone> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Milestone not found", "BOS_NOT_FOUND");
    }
    assertDomainOk(
      validateMilestoneStatusTransition(existing, MILESTONE_STATUS.SKIPPED),
      "Invalid milestone transition",
    );

    await this.collection().doc(id).update({
      status: MILESTONE_STATUS.SKIPPED,
      skippedReason: input.skippedReason?.trim() || undefined,
      skippedAt: epochMsToTimestamp(input.skippedAt),
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    });

    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load milestone after skip", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  private async transitionStatus(
    companyId: CompanyId,
    id: BosMilestoneId,
    nextStatus: typeof MILESTONE_STATUS.READY,
    updatedById: string,
  ): Promise<BosMilestone> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Milestone not found", "BOS_NOT_FOUND");
    }

    const parsed = parseKnownMilestoneStatus(nextStatus);
    assertDomainOk(parsed, "Invalid milestone status");
    if (!parsed.ok) {
      throw new BosRepositoryError("Invalid milestone status", "BOS_DOMAIN_VALIDATION");
    }

    assertDomainOk(
      validateMilestoneStatusTransition(existing, parsed.value),
      "Invalid milestone transition",
    );

    await this.collection().doc(id).update({
      status: parsed.value,
      updatedAt: Timestamp.now(),
      updatedById,
    });

    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load milestone after status update", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async reorder(
    companyId: CompanyId,
    initiativeId: BosInitiativeId,
    input: ReorderBosMilestonesInput,
  ): Promise<BosMilestone[]> {
    const all = await this.loadInitiativeMilestones(companyId, initiativeId);
    const byId = new Map(all.map((m) => [m.id, m]));

    if (input.orderedIds.length !== all.length) {
      throw new BosRepositoryError(
        "Reorder must include all milestone ids for the initiative",
        "BOS_DOMAIN_VALIDATION",
      );
    }

    for (const id of input.orderedIds) {
      if (!byId.has(id)) {
        throw new BosRepositoryError(`Unknown milestone id in reorder: ${id}`, "BOS_DOMAIN_VALIDATION");
      }
    }

    const batch = this.firestore.batch();
    input.orderedIds.forEach((id, index) => {
      batch.update(this.collection().doc(id), {
        sequence: index,
        updatedAt: Timestamp.now(),
        updatedById: input.updatedById,
      });
    });
    await batch.commit();

    return this.loadInitiativeMilestones(companyId, initiativeId);
  }

  async deletePlanned(companyId: CompanyId, id: BosMilestoneId): Promise<void> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Milestone not found", "BOS_NOT_FOUND");
    }
    if (existing.status !== MILESTONE_STATUS.PLANNED) {
      throw new BosRepositoryError(
        "Only planned milestones can be deleted",
        "BOS_DOMAIN_VALIDATION",
      );
    }
    await this.collection().doc(id).delete();
  }
}

export const firestoreBosMilestoneRepository = new FirestoreBosMilestoneRepository();
