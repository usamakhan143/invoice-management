import type firebase from "firebase/compat/app";
import { db, Timestamp } from "../../../../services/firebase";
import type { BosAttributionRepository } from "../../../contracts/BosAttributionRepository";
import type { BosInitiativeRepository } from "../../../contracts/BosInitiativeRepository";
import type {
  AttributionSourceRef,
  BosAttribution,
  CreateBosAttributionInput,
  SupersedeBosAttributionInput,
  VoidBosAttributionInput,
} from "../../../domain/entities/attribution";
import type {
  BosAttributionId,
  BosInitiativeId,
  CompanyId,
  PaginatedResult,
  PaginationQuery,
} from "../../../types";
import type { AttributionStatus } from "../../../constants/attributionStatus";
import { ATTRIBUTION_STATUS } from "../../../constants/attributionStatus";
import {
  validateAttributionSplitTotal,
  validateCreateAttribution,
  validateNoDuplicateActiveAttribution,
} from "../../../domain/rules/attributionRules";
import { parseKnownAttributionStatus } from "../../../domain/guards/statusGuards";
import { assertDomainOk, BosRepositoryError } from "../errors";
import { BOS_COLLECTIONS } from "../collections";
import {
  attributionFromFirestore,
  attributionToFirestore,
} from "../models/attributionDocument";
import { assertCompanyMatch, runPaginatedQueryByCreatedAt } from "../pagination";
import { nowEpochMs } from "../timestamp";
import { firestoreBosInitiativeRepository } from "./FirestoreBosInitiativeRepository";

export class FirestoreBosAttributionRepository implements BosAttributionRepository {
  constructor(
    private readonly firestore: firebase.firestore.Firestore = db,
    private readonly initiativeRepository: BosInitiativeRepository = firestoreBosInitiativeRepository,
  ) {}

  private collection() {
    return this.firestore.collection(BOS_COLLECTIONS.ATTRIBUTIONS);
  }

  async findById(companyId: CompanyId, id: BosAttributionId): Promise<BosAttribution | null> {
    const snap = await this.collection().doc(id).get();
    if (!snap.exists) return null;
    const attribution = attributionFromFirestore(snap.id, snap.data());
    if (!attribution) return null;
    assertCompanyMatch(companyId, attribution.companyId, "BosAttribution");
    return attribution;
  }

  async listByInitiative(
    companyId: CompanyId,
    initiativeId: BosInitiativeId,
    query?: PaginationQuery & { status?: AttributionStatus },
  ): Promise<PaginatedResult<BosAttribution>> {
    return runPaginatedQueryByCreatedAt(
      (base) => {
        let q = base
          .where("companyId", "==", companyId)
          .where("initiativeId", "==", initiativeId);
        if (query?.status) {
          q = q.where("status", "==", query.status);
        }
        return q;
      },
      (doc) => {
        const attribution = attributionFromFirestore(doc.id, doc.data());
        if (!attribution) {
          throw new BosRepositoryError(
            `Invalid BosAttribution document: ${doc.id}`,
            "BOS_INVALID_DOC",
          );
        }
        return attribution;
      },
      this.collection(),
      query,
    );
  }

  async listActiveBySource(ref: AttributionSourceRef): Promise<BosAttribution[]> {
    const snap = await this.collection()
      .where("companyId", "==", ref.companyId)
      .where("sourceType", "==", ref.sourceType)
      .where("sourceId", "==", ref.sourceId)
      .where("status", "==", ATTRIBUTION_STATUS.ACTIVE)
      .get();

    return snap.docs
      .map((doc) => attributionFromFirestore(doc.id, doc.data()))
      .filter((row): row is BosAttribution => row !== null);
  }

  async create(input: CreateBosAttributionInput): Promise<BosAttribution> {
    const initiative = await this.initiativeRepository.findById(
      input.companyId,
      input.initiativeId,
    );
    if (!initiative) {
      throw new BosRepositoryError("Initiative not found for attribution", "BOS_NOT_FOUND");
    }

    assertDomainOk(validateCreateAttribution(initiative, input), "Invalid attribution");

    const existingForSource = await this.listActiveBySource({
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    });
    assertDomainOk(
      validateNoDuplicateActiveAttribution(existingForSource),
      "Duplicate attribution",
    );
    assertDomainOk(
      validateAttributionSplitTotal(existingForSource, input.allocationPercent),
      "Attribution split exceeds limit",
    );

    const now = nowEpochMs();
    const payload = attributionToFirestore({
      companyId: input.companyId,
      initiativeId: input.initiativeId,
      ventureId: input.ventureId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: ATTRIBUTION_STATUS.ACTIVE,
      allocationPercent: input.allocationPercent,
      amountSnapshot: input.amountSnapshot,
      currencySnapshot: input.currencySnapshot,
      notes: input.notes,
      attributedById: input.attributedById,
      createdById: input.createdById,
      updatedById: input.createdById,
      createdAt: now,
      updatedAt: now,
    });

    const ref = await this.collection().add(payload);
    const created = await this.findById(input.companyId, ref.id);
    if (!created) {
      throw new BosRepositoryError("Failed to load attribution after create", "BOS_CREATE_FAILED");
    }
    return created;
  }

  async supersede(
    companyId: CompanyId,
    id: BosAttributionId,
    input: SupersedeBosAttributionInput,
  ): Promise<BosAttribution> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Attribution not found", "BOS_NOT_FOUND");
    }
    if (existing.status !== ATTRIBUTION_STATUS.ACTIVE) {
      throw new BosRepositoryError("Only active attributions can be superseded", "BOS_INVALID_STATE");
    }

    await this.collection().doc(id).update({
      status: ATTRIBUTION_STATUS.SUPERSEDED,
      supersededById: input.supersededById,
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    });

    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load attribution after supersede", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async void(
    companyId: CompanyId,
    id: BosAttributionId,
    input: VoidBosAttributionInput,
  ): Promise<BosAttribution> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Attribution not found", "BOS_NOT_FOUND");
    }

    await this.collection().doc(id).update({
      status: ATTRIBUTION_STATUS.VOID,
      voidReason: input.voidReason.trim(),
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    });

    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load attribution after void", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async updateStatus(
    companyId: CompanyId,
    id: BosAttributionId,
    status: AttributionStatus,
    updatedById: string,
  ): Promise<BosAttribution> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Attribution not found", "BOS_NOT_FOUND");
    }

    const statusResult = parseKnownAttributionStatus(status);
    assertDomainOk(statusResult, "Invalid attribution status");
    if (!statusResult.ok) {
      throw new BosRepositoryError("Invalid attribution status", "BOS_DOMAIN_VALIDATION");
    }

    await this.collection().doc(id).update({
      status: statusResult.value,
      updatedAt: Timestamp.now(),
      updatedById,
    });

    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load attribution after status update", "BOS_UPDATE_FAILED");
    }
    return updated;
  }
}

export const firestoreBosAttributionRepository = new FirestoreBosAttributionRepository();
