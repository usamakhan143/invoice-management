import type firebase from "firebase/compat/app";
import { Timestamp } from "../../../../services/firebase";
import type { DeliveryEngagementRepository } from "../../../contracts/DeliveryEngagementRepository";
import type {
  CreateDeliveryEngagementInput,
  DeliveryEngagement,
  UpdateDeliveryEngagementInput,
} from "../../../domain/delivery/entities/deliveryEngagement";
import { DELIVERY_STATE } from "../../../domain/delivery/deliveryState";
import type { DeliveryState } from "../../../domain/delivery/deliveryState";
import type { CompanyId, PaginatedResult, PaginationQuery } from "../../../types";
import type { DeliveryEngagementId } from "../../../domain/delivery/valueObjects";
import { AOS_COLLECTIONS } from "../collections";
import {
  deliveryEngagementFromFirestore,
  deliveryEngagementToFirestore,
} from "../models/deliveryEngagementDocument";
import { assertCompanyMatch, AosRepositoryError, runAosFirestoreOperation } from "../errors";
import { runPaginatedQuery } from "../pagination";
import { nowEpochMs } from "../timestamp";

export class DeliveryEngagementFirestoreRepository implements DeliveryEngagementRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.DELIVERY_ENGAGEMENTS);
  }

  async findById(
    companyId: CompanyId,
    id: DeliveryEngagementId,
  ): Promise<DeliveryEngagement | null> {
    return runAosFirestoreOperation("DeliveryEngagement.findById", async () => {
      const snap = await this.collection().doc(id).get();
      if (!snap.exists) return null;

      const engagement = deliveryEngagementFromFirestore(snap.id, snap.data());
      if (!engagement) return null;

      assertCompanyMatch(companyId, engagement.companyId, "DeliveryEngagement");
      return engagement;
    });
  }

  async exists(companyId: CompanyId, id: DeliveryEngagementId): Promise<boolean> {
    const engagement = await this.findById(companyId, id);
    return engagement !== null;
  }

  async listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & { status?: DeliveryState },
  ): Promise<PaginatedResult<DeliveryEngagement>> {
    return runAosFirestoreOperation("DeliveryEngagement.listByCompany", () =>
      runPaginatedQuery(
        (base) => {
          let q = base.where("companyId", "==", companyId);
          if (query?.status) {
            q = q.where("status", "==", query.status);
          }
          return q;
        },
        (doc) => {
          const engagement = deliveryEngagementFromFirestore(doc.id, doc.data());
          if (!engagement) {
            throw new AosRepositoryError(
              `Invalid DeliveryEngagement document: ${doc.id}`,
              "AOS_INVALID_DOC",
            );
          }
          return engagement;
        },
        this.collection(),
        query,
      ),
    );
  }

  async listByCustomer(
    companyId: CompanyId,
    erpCustomerId: string,
    query?: PaginationQuery & { status?: DeliveryState },
  ): Promise<PaginatedResult<DeliveryEngagement>> {
    return runAosFirestoreOperation("DeliveryEngagement.listByCustomer", () =>
      runPaginatedQuery(
        (base) => {
          let q = base
            .where("companyId", "==", companyId)
            .where("erpCustomerId", "==", erpCustomerId);
          if (query?.status) {
            q = q.where("status", "==", query.status);
          }
          return q;
        },
        (doc) => {
          const engagement = deliveryEngagementFromFirestore(doc.id, doc.data());
          if (!engagement) {
            throw new AosRepositoryError(
              `Invalid DeliveryEngagement document: ${doc.id}`,
              "AOS_INVALID_DOC",
            );
          }
          return engagement;
        },
        this.collection(),
        query,
      ),
    );
  }

  async create(input: CreateDeliveryEngagementInput): Promise<DeliveryEngagement> {
    return runAosFirestoreOperation("DeliveryEngagement.create", async () => {
      const now = nowEpochMs();
      const payload = deliveryEngagementToFirestore({
        companyId: input.companyId,
        title: input.title.trim(),
        scopeSummary: input.scopeSummary?.trim(),
        status: DELIVERY_STATE.DRAFT,
        agencyType: input.agencyType,
        engagementType: input.engagementType,
        erpCustomerId: input.erpCustomerId,
        erpLeadId: input.erpLeadId,
        bosInitiativeId: input.bosInitiativeId,
        bosVentureId: input.bosVentureId,
        deliveryTemplateId: input.deliveryTemplateId,
        deliveryLeadUserId: input.deliveryLeadUserId,
        teamMemberUserIds: input.teamMemberUserIds,
        createdById: input.createdById,
        updatedById: input.createdById,
        createdAt: now,
        updatedAt: now,
      });

      const ref = await this.collection().add(payload);
      const created = await this.findById(input.companyId, ref.id);
      if (!created) {
        throw new AosRepositoryError(
          "Failed to load delivery engagement after create",
          "AOS_CREATE_FAILED",
        );
      }
      return created;
    });
  }

  async update(
    companyId: CompanyId,
    id: DeliveryEngagementId,
    input: UpdateDeliveryEngagementInput,
  ): Promise<DeliveryEngagement> {
    return runAosFirestoreOperation("DeliveryEngagement.update", async () => {
      const existing = await this.findById(companyId, id);
      if (!existing) {
        throw new AosRepositoryError("Delivery engagement not found", "AOS_NOT_FOUND");
      }

      const patch: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
        updatedById: input.updatedById,
      };

      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.scopeSummary !== undefined) patch.scopeSummary = input.scopeSummary.trim();
      if (input.erpLeadId !== undefined) patch.erpLeadId = input.erpLeadId;
      if (input.deliveryLeadUserId !== undefined) {
        patch.deliveryLeadUserId = input.deliveryLeadUserId;
      }
      if (input.teamMemberUserIds !== undefined) {
        patch.teamMemberUserIds = input.teamMemberUserIds;
      }
      if (input.agencyType !== undefined) patch.agencyType = input.agencyType;
      if (input.engagementType !== undefined) patch.engagementType = input.engagementType;
      if (input.bosInitiativeId !== undefined) {
        patch.bosInitiativeId = input.bosInitiativeId;
      }
      if (input.bosVentureId !== undefined) {
        patch.bosVentureId = input.bosVentureId;
      }

      await this.collection().doc(id).update(patch);

      const updated = await this.findById(companyId, id);
      if (!updated) {
        throw new AosRepositoryError(
          "Failed to load delivery engagement after update",
          "AOS_UPDATE_FAILED",
        );
      }
      return updated;
    });
  }

  async save(companyId: CompanyId, engagement: DeliveryEngagement): Promise<DeliveryEngagement> {
    return runAosFirestoreOperation("DeliveryEngagement.save", async () => {
      assertCompanyMatch(companyId, engagement.companyId, "DeliveryEngagement");

      const existing = await this.findById(companyId, engagement.id);
      if (!existing) {
        throw new AosRepositoryError("Delivery engagement not found", "AOS_NOT_FOUND");
      }

      const { id, ...entityWithoutId } = engagement;
      await this.collection()
        .doc(id)
        .set(deliveryEngagementToFirestore(entityWithoutId));

      const saved = await this.findById(companyId, id);
      if (!saved) {
        throw new AosRepositoryError(
          "Failed to load delivery engagement after save",
          "AOS_SAVE_FAILED",
        );
      }
      return saved;
    });
  }
}
