import type firebase from "firebase/compat/app";
import { firestoreTimestampNow } from "../timestamp";
import type { DeliveryQualityReportRepository } from "../../../contracts/DeliveryQualityReportRepository";
import type {
  CreateDeliveryQualityReportInput,
  DeliveryQualityReport,
  UpdateDeliveryQualityReportDraftInput,
} from "../../../domain/delivery/entities/deliveryQualityReport";
import { DELIVERY_QUALITY_REPORT_STATE } from "../../../domain/delivery/qualityReportState";
import type { DeliveryQualityReportState } from "../../../domain/delivery/qualityReportState";
import type { CompanyId, PaginatedResult, PaginationQuery } from "../../../types";
import type {
  DeliveryEngagementId,
  DeliveryQualityReportId,
} from "../../../domain/delivery/valueObjects";
import { AOS_COLLECTIONS } from "../collections";
import {
  deliveryQualityReportFromFirestore,
  deliveryQualityReportToFirestore,
} from "../models/deliveryQualityReportDocument";
import { assertCompanyMatch, AosRepositoryError, runAosFirestoreOperation } from "../errors";
import { runPaginatedQuery } from "../pagination";
import { nowEpochMs } from "../timestamp";

export class DeliveryQualityReportFirestoreRepository implements DeliveryQualityReportRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.DELIVERY_QUALITY_REPORTS);
  }

  async findById(
    companyId: CompanyId,
    id: DeliveryQualityReportId,
  ): Promise<DeliveryQualityReport | null> {
    return runAosFirestoreOperation("DeliveryQualityReport.findById", async () => {
      const snap = await this.collection().doc(id).get();
      if (!snap.exists) return null;

      const report = deliveryQualityReportFromFirestore(snap.id, snap.data());
      if (!report) return null;

      assertCompanyMatch(companyId, report.companyId, "DeliveryQualityReport");
      return report;
    });
  }

  async listByEngagement(
    companyId: CompanyId,
    deliveryEngagementId: DeliveryEngagementId,
    query?: PaginationQuery & { status?: DeliveryQualityReportState },
  ): Promise<PaginatedResult<DeliveryQualityReport>> {
    return runAosFirestoreOperation("DeliveryQualityReport.listByEngagement", () =>
      runPaginatedQuery(
        (base) => {
          let q = base
            .where("companyId", "==", companyId)
            .where("deliveryEngagementId", "==", deliveryEngagementId);
          if (query?.status) {
            q = q.where("status", "==", query.status);
          }
          return q;
        },
        (doc) => {
          const report = deliveryQualityReportFromFirestore(doc.id, doc.data());
          if (!report) {
            throw new AosRepositoryError(
              `Invalid DeliveryQualityReport document: ${doc.id}`,
              "AOS_INVALID_DOC",
            );
          }
          return report;
        },
        this.collection(),
        query,
      ),
    );
  }

  async create(input: CreateDeliveryQualityReportInput): Promise<DeliveryQualityReport> {
    return runAosFirestoreOperation("DeliveryQualityReport.create", async () => {
      const now = nowEpochMs();
      const payload = deliveryQualityReportToFirestore({
        companyId: input.companyId,
        deliveryEngagementId: input.deliveryEngagementId,
        status: DELIVERY_QUALITY_REPORT_STATE.GENERATING,
        createdById: input.createdById,
        updatedById: input.createdById,
        createdAt: now,
        updatedAt: now,
      });

      const ref = await this.collection().add(payload);
      const created = await this.findById(input.companyId, ref.id);
      if (!created) {
        throw new AosRepositoryError(
          "Failed to load delivery quality report after create",
          "AOS_CREATE_FAILED",
        );
      }
      return created;
    });
  }

  async updateDraft(
    companyId: CompanyId,
    id: DeliveryQualityReportId,
    input: UpdateDeliveryQualityReportDraftInput,
  ): Promise<DeliveryQualityReport> {
    return runAosFirestoreOperation("DeliveryQualityReport.updateDraft", async () => {
      const existing = await this.findById(companyId, id);
      if (!existing) {
        throw new AosRepositoryError("Delivery quality report not found", "AOS_NOT_FOUND");
      }

      const patch: Record<string, unknown> = {
        updatedAt: firestoreTimestampNow(),
        updatedById: input.updatedById,
      };

      if (input.summaryNotes !== undefined) {
        patch.summaryNotes = input.summaryNotes.trim();
      }

      await this.collection().doc(id).update(patch);

      const updated = await this.findById(companyId, id);
      if (!updated) {
        throw new AosRepositoryError(
          "Failed to load delivery quality report after draft update",
          "AOS_UPDATE_FAILED",
        );
      }
      return updated;
    });
  }

  async save(companyId: CompanyId, report: DeliveryQualityReport): Promise<DeliveryQualityReport> {
    return runAosFirestoreOperation("DeliveryQualityReport.save", async () => {
      assertCompanyMatch(companyId, report.companyId, "DeliveryQualityReport");

      const existing = await this.findById(companyId, report.id);
      if (!existing) {
        throw new AosRepositoryError("Delivery quality report not found", "AOS_NOT_FOUND");
      }

      const { id, ...entityWithoutId } = report;
      await this.collection().doc(id).set(deliveryQualityReportToFirestore(entityWithoutId));

      const saved = await this.findById(companyId, id);
      if (!saved) {
        throw new AosRepositoryError(
          "Failed to load delivery quality report after save",
          "AOS_SAVE_FAILED",
        );
      }
      return saved;
    });
  }
}
