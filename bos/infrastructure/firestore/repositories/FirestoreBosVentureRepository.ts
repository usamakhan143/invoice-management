import type firebase from "firebase/compat/app";
import { db, Timestamp } from "../../../../services/firebase";
import type { BosVentureRepository } from "../../../contracts/BosVentureRepository";
import type {
  BosVenture,
  CreateBosVentureInput,
  UpdateBosVentureInput,
} from "../../../domain/entities/venture";
import type { CompanyId, BosVentureId, PaginatedResult, PaginationQuery } from "../../../types";
import type { VentureStatus } from "../../../constants/ventureStatus";
import { VENTURE_STATUS } from "../../../constants/ventureStatus";
import {
  validateCreateVenture,
  validateUpdateVenture,
  validateVentureStatusTransition,
} from "../../../domain/rules/ventureRules";
import { parseKnownVentureStatus } from "../../../domain/guards/statusGuards";
import { assertDomainOk, BosRepositoryError } from "../errors";
import { BOS_COLLECTIONS } from "../collections";
import { ventureFromFirestore, ventureToFirestore } from "../models/ventureDocument";
import { assertCompanyMatch, runPaginatedQuery } from "../pagination";
import { nowEpochMs } from "../timestamp";

export class FirestoreBosVentureRepository implements BosVentureRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore = db) {}

  private collection() {
    return this.firestore.collection(BOS_COLLECTIONS.VENTURES);
  }

  async findById(companyId: CompanyId, id: BosVentureId): Promise<BosVenture | null> {
    const snap = await this.collection().doc(id).get();
    if (!snap.exists) return null;
    const venture = ventureFromFirestore(snap.id, snap.data());
    if (!venture) return null;
    assertCompanyMatch(companyId, venture.companyId, "BosVenture");
    return venture;
  }

  async listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & { status?: VentureStatus },
  ): Promise<PaginatedResult<BosVenture>> {
    return runPaginatedQuery(
      (base) => {
        let q = base.where("companyId", "==", companyId);
        if (query?.status) {
          q = q.where("status", "==", query.status);
        }
        return q;
      },
      (doc) => {
        const venture = ventureFromFirestore(doc.id, doc.data());
        if (!venture) {
          throw new BosRepositoryError(`Invalid BosVenture document: ${doc.id}`, "BOS_INVALID_DOC");
        }
        return venture;
      },
      this.collection(),
      query,
    );
  }

  async create(input: CreateBosVentureInput): Promise<BosVenture> {
    assertDomainOk(validateCreateVenture(input), "Invalid venture");

    const now = nowEpochMs();
    const payload = ventureToFirestore({
      companyId: input.companyId,
      name: input.name.trim(),
      description: input.description?.trim(),
      status: VENTURE_STATUS.PLANNED,
      ownerUserId: input.ownerUserId,
      createdById: input.createdById,
      updatedById: input.createdById,
      createdAt: now,
      updatedAt: now,
    });

    const ref = await this.collection().add(payload);
    const created = await this.findById(input.companyId, ref.id);
    if (!created) {
      throw new BosRepositoryError("Failed to load venture after create", "BOS_CREATE_FAILED");
    }
    return created;
  }

  async update(
    companyId: CompanyId,
    id: BosVentureId,
    input: UpdateBosVentureInput,
  ): Promise<BosVenture> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Venture not found", "BOS_NOT_FOUND");
    }

    assertDomainOk(validateUpdateVenture(input), "Invalid venture update");

    const patch: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    };
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.ownerUserId !== undefined) patch.ownerUserId = input.ownerUserId.trim();

    await this.collection().doc(id).update(patch);
    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load venture after update", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async updateStatus(
    companyId: CompanyId,
    id: BosVentureId,
    status: VentureStatus,
    updatedById: string,
  ): Promise<BosVenture> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Venture not found", "BOS_NOT_FOUND");
    }

    const statusResult = parseKnownVentureStatus(status);
    assertDomainOk(statusResult, "Invalid venture status");
    if (!statusResult.ok) {
      throw new BosRepositoryError("Invalid venture status", "BOS_DOMAIN_VALIDATION");
    }
    const nextStatus = statusResult.value;

    assertDomainOk(
      validateVentureStatusTransition(existing, nextStatus),
      "Invalid venture status transition",
    );

    await this.collection().doc(id).update({
      status: nextStatus,
      updatedAt: Timestamp.now(),
      updatedById,
    });

    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load venture after status update", "BOS_UPDATE_FAILED");
    }
    return updated;
  }
}

export const firestoreBosVentureRepository = new FirestoreBosVentureRepository();
