import type firebase from "firebase/compat/app";
import { firestoreTimestampNow } from "../timestamp";
import type { DeliveryTemplateRepository } from "../../../contracts/DeliveryTemplateRepository";
import type { AgencyType } from "../../../constants/agencyType";
import type {
  CreateDeliveryTemplateInput,
  DeliveryTemplate,
  UpdateDeliveryTemplateInput,
} from "../../../domain/delivery/entities/deliveryTemplate";
import { DELIVERY_TEMPLATE_STATE } from "../../../domain/delivery/templateState";
import type { DeliveryTemplateState } from "../../../domain/delivery/templateState";
import type { CompanyId, PaginatedResult, PaginationQuery } from "../../../types";
import type { DeliveryTemplateId } from "../../../domain/delivery/valueObjects";
import { AOS_COLLECTIONS } from "../collections";
import {
  deliveryTemplateFromFirestore,
  deliveryTemplateToFirestore,
} from "../models/deliveryTemplateDocument";
import { assertCompanyMatch, AosRepositoryError, runAosFirestoreOperation } from "../errors";
import { runPaginatedQueryByCreatedAt } from "../pagination";
import { nowEpochMs } from "../timestamp";

export class DeliveryTemplateFirestoreRepository implements DeliveryTemplateRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.DELIVERY_TEMPLATES);
  }

  async findById(
    companyId: CompanyId,
    id: DeliveryTemplateId,
  ): Promise<DeliveryTemplate | null> {
    return runAosFirestoreOperation("DeliveryTemplate.findById", async () => {
      const snap = await this.collection().doc(id).get();
      if (!snap.exists) return null;

      const template = deliveryTemplateFromFirestore(snap.id, snap.data());
      if (!template) return null;

      assertCompanyMatch(companyId, template.companyId, "DeliveryTemplate");
      return template;
    });
  }

  async listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & {
      agencyType?: AgencyType;
      status?: DeliveryTemplateState;
    },
  ): Promise<PaginatedResult<DeliveryTemplate>> {
    return runAosFirestoreOperation("DeliveryTemplate.listByCompany", () =>
      runPaginatedQueryByCreatedAt(
        (base) => {
          let q = base.where("companyId", "==", companyId);
          if (query?.agencyType) {
            q = q.where("agencyType", "==", query.agencyType);
          }
          if (query?.status) {
            q = q.where("status", "==", query.status);
          }
          return q;
        },
        (doc) => {
          const template = deliveryTemplateFromFirestore(doc.id, doc.data());
          if (!template) {
            throw new AosRepositoryError(
              `Invalid DeliveryTemplate document: ${doc.id}`,
              "AOS_INVALID_DOC",
            );
          }
          return template;
        },
        this.collection(),
        query,
      ),
    );
  }

  async create(input: CreateDeliveryTemplateInput): Promise<DeliveryTemplate> {
    return runAosFirestoreOperation("DeliveryTemplate.create", async () => {
      const now = nowEpochMs();
      const payload = deliveryTemplateToFirestore({
        companyId: input.companyId,
        name: input.name.trim(),
        agencyType: input.agencyType,
        status: DELIVERY_TEMPLATE_STATE.DRAFT,
        versionNumber: 1,
        lifecyclePhaseKeys: input.lifecyclePhaseKeys,
        description: input.description?.trim(),
        createdById: input.createdById,
        updatedById: input.createdById,
        createdAt: now,
        updatedAt: now,
      });

      const ref = await this.collection().add(payload);
      const created = await this.findById(input.companyId, ref.id);
      if (!created) {
        throw new AosRepositoryError(
          "Failed to load delivery template after create",
          "AOS_CREATE_FAILED",
        );
      }
      return created;
    });
  }

  async update(
    companyId: CompanyId,
    id: DeliveryTemplateId,
    input: UpdateDeliveryTemplateInput,
  ): Promise<DeliveryTemplate> {
    return runAosFirestoreOperation("DeliveryTemplate.update", async () => {
      const existing = await this.findById(companyId, id);
      if (!existing) {
        throw new AosRepositoryError("Delivery template not found", "AOS_NOT_FOUND");
      }

      const patch: Record<string, unknown> = {
        updatedAt: firestoreTimestampNow(),
        updatedById: input.updatedById,
      };

      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.description !== undefined) patch.description = input.description.trim();
      if (input.lifecyclePhaseKeys !== undefined) {
        patch.lifecyclePhaseKeys = [...input.lifecyclePhaseKeys];
      }

      await this.collection().doc(id).update(patch);

      const updated = await this.findById(companyId, id);
      if (!updated) {
        throw new AosRepositoryError(
          "Failed to load delivery template after update",
          "AOS_UPDATE_FAILED",
        );
      }
      return updated;
    });
  }

  async save(companyId: CompanyId, template: DeliveryTemplate): Promise<DeliveryTemplate> {
    return runAosFirestoreOperation("DeliveryTemplate.save", async () => {
      assertCompanyMatch(companyId, template.companyId, "DeliveryTemplate");

      const existing = await this.findById(companyId, template.id);
      if (!existing) {
        throw new AosRepositoryError("Delivery template not found", "AOS_NOT_FOUND");
      }

      const { id, ...entityWithoutId } = template;
      await this.collection().doc(id).set(deliveryTemplateToFirestore(entityWithoutId));

      const saved = await this.findById(companyId, id);
      if (!saved) {
        throw new AosRepositoryError(
          "Failed to load delivery template after save",
          "AOS_SAVE_FAILED",
        );
      }
      return saved;
    });
  }
}
