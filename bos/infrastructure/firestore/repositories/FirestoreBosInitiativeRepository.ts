import type firebase from "firebase/compat/app";
import { db, Timestamp } from "../../../../services/firebase";
import type { BosInitiativeRepository } from "../../../contracts/BosInitiativeRepository";
import type { BosVentureRepository } from "../../../contracts/BosVentureRepository";
import type {
  BosInitiative,
  CloseBosInitiativeInput,
  CreateBosInitiativeInput,
  UpdateBosInitiativeInput,
} from "../../../domain/entities/initiative";
import type {
  BosInitiativeId,
  BosVentureId,
  CompanyId,
  PaginatedResult,
  PaginationQuery,
} from "../../../types";
import type { InitiativeStatus } from "../../../constants/initiativeStatus";
import { INITIATIVE_STATUS } from "../../../constants/initiativeStatus";
import {
  validateCloseInitiative,
  validateCreateInitiative,
  validateInitiativeStatusTransition,
  validateUpdateInitiative,
} from "../../../domain/rules/initiativeRules";
import {
  parseKnownInitiativeClosureOutcome,
  parseKnownInitiativeStatus,
} from "../../../domain/guards/statusGuards";
import { canVentureAcceptNewInitiatives } from "../../../domain/rules/ventureRules";
import { assertDomainOk, BosRepositoryError } from "../errors";
import { BOS_COLLECTIONS } from "../collections";
import { initiativeFromFirestore, initiativeToFirestore } from "../models/initiativeDocument";
import { assertCompanyMatch, runPaginatedQuery } from "../pagination";
import { epochMsToTimestamp, nowEpochMs } from "../timestamp";
import { firestoreBosVentureRepository } from "./FirestoreBosVentureRepository";

export class FirestoreBosInitiativeRepository implements BosInitiativeRepository {
  constructor(
    private readonly firestore: firebase.firestore.Firestore = db,
    private readonly ventureRepository: BosVentureRepository = firestoreBosVentureRepository,
  ) {}

  private collection() {
    return this.firestore.collection(BOS_COLLECTIONS.INITIATIVES);
  }

  async findById(companyId: CompanyId, id: BosInitiativeId): Promise<BosInitiative | null> {
    const snap = await this.collection().doc(id).get();
    if (!snap.exists) return null;
    const initiative = initiativeFromFirestore(snap.id, snap.data());
    if (!initiative) return null;
    assertCompanyMatch(companyId, initiative.companyId, "BosInitiative");
    return initiative;
  }

  async listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & { ventureId?: BosVentureId; status?: InitiativeStatus },
  ): Promise<PaginatedResult<BosInitiative>> {
    return runPaginatedQuery(
      (base) => {
        let q = base.where("companyId", "==", companyId);
        if (query?.ventureId) {
          q = q.where("ventureId", "==", query.ventureId);
        }
        if (query?.status) {
          q = q.where("status", "==", query.status);
        }
        return q;
      },
      (doc) => {
        const initiative = initiativeFromFirestore(doc.id, doc.data());
        if (!initiative) {
          throw new BosRepositoryError(
            `Invalid BosInitiative document: ${doc.id}`,
            "BOS_INVALID_DOC",
          );
        }
        return initiative;
      },
      this.collection(),
      query,
    );
  }

  async listByVenture(
    companyId: CompanyId,
    ventureId: BosVentureId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosInitiative>> {
    return this.listByCompany(companyId, { ...query, ventureId });
  }

  async create(input: CreateBosInitiativeInput): Promise<BosInitiative> {
    assertDomainOk(validateCreateInitiative(input), "Invalid initiative");

    const venture = await this.ventureRepository.findById(input.companyId, input.ventureId);
    if (!venture) {
      throw new BosRepositoryError("Venture not found for initiative", "BOS_VENTURE_NOT_FOUND");
    }
    if (!canVentureAcceptNewInitiatives(venture)) {
      throw new BosRepositoryError(
        "Venture cannot accept new initiatives in its current status",
        "BOS_VENTURE_CLOSED",
      );
    }

    const now = nowEpochMs();
    const payload = initiativeToFirestore({
      companyId: input.companyId,
      ventureId: input.ventureId,
      name: input.name.trim(),
      hypothesis: input.hypothesis?.trim(),
      successCriteria: input.successCriteria?.trim(),
      status: INITIATIVE_STATUS.DRAFT,
      budget:
        input.budgetAmount !== undefined && input.budgetCurrency
          ? { amount: input.budgetAmount, currency: input.budgetCurrency }
          : undefined,
      startDate: input.startDate,
      endDate: input.endDate,
      createdById: input.createdById,
      updatedById: input.createdById,
      createdAt: now,
      updatedAt: now,
    });

    const ref = await this.collection().add(payload);
    const created = await this.findById(input.companyId, ref.id);
    if (!created) {
      throw new BosRepositoryError("Failed to load initiative after create", "BOS_CREATE_FAILED");
    }
    return created;
  }

  async update(
    companyId: CompanyId,
    id: BosInitiativeId,
    input: UpdateBosInitiativeInput,
  ): Promise<BosInitiative> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Initiative not found", "BOS_NOT_FOUND");
    }
    if (existing.status === INITIATIVE_STATUS.CLOSED) {
      throw new BosRepositoryError("Cannot update a closed initiative", "BOS_INITIATIVE_CLOSED");
    }

    assertDomainOk(validateUpdateInitiative(input), "Invalid initiative update");

    const patch: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    };
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.hypothesis !== undefined) patch.hypothesis = input.hypothesis.trim();
    if (input.successCriteria !== undefined) patch.successCriteria = input.successCriteria.trim();
    if (input.budgetAmount !== undefined) patch.budgetAmount = input.budgetAmount;
    if (input.budgetCurrency !== undefined) patch.budgetCurrency = input.budgetCurrency;

    await this.collection().doc(id).update(patch);
    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load initiative after update", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async updateStatus(
    companyId: CompanyId,
    id: BosInitiativeId,
    status: InitiativeStatus,
    updatedById: string,
  ): Promise<BosInitiative> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Initiative not found", "BOS_NOT_FOUND");
    }

    const statusResult = parseKnownInitiativeStatus(status);
    assertDomainOk(statusResult, "Invalid initiative status");
    if (!statusResult.ok) {
      throw new BosRepositoryError("Invalid initiative status", "BOS_DOMAIN_VALIDATION");
    }
    const nextStatus = statusResult.value;

    assertDomainOk(
      validateInitiativeStatusTransition(existing, nextStatus),
      "Invalid initiative status transition",
    );

    const patch: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: Timestamp.now(),
      updatedById,
    };

    await this.collection().doc(id).update(patch);
    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError(
        "Failed to load initiative after status update",
        "BOS_UPDATE_FAILED",
      );
    }
    return updated;
  }

  async close(
    companyId: CompanyId,
    id: BosInitiativeId,
    input: CloseBosInitiativeInput,
  ): Promise<BosInitiative> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Initiative not found", "BOS_NOT_FOUND");
    }

    const outcomeResult = parseKnownInitiativeClosureOutcome(input.closureOutcome);
    assertDomainOk(outcomeResult, "Invalid initiative closure outcome");
    if (!outcomeResult.ok) {
      throw new BosRepositoryError("Invalid initiative closure outcome", "BOS_DOMAIN_VALIDATION");
    }

    assertDomainOk(validateCloseInitiative(existing, input), "Cannot close initiative");

    const now = nowEpochMs();
    await this.collection().doc(id).update({
      status: INITIATIVE_STATUS.CLOSED,
      closureOutcome: outcomeResult.value,
      closureReason: input.closureReason?.trim() || input.lessonLearned?.trim() || null,
      closedAt: epochMsToTimestamp(now),
      updatedAt: Timestamp.now(),
      updatedById: input.closedById,
    });

    const closed = await this.findById(companyId, id);
    if (!closed) {
      throw new BosRepositoryError("Failed to load initiative after close", "BOS_UPDATE_FAILED");
    }
    return closed;
  }
}

export const firestoreBosInitiativeRepository = new FirestoreBosInitiativeRepository();
