import type { CompanyId, PaginatedResult, PaginationQuery } from "../types";
import type { DeliveryQualityReportState } from "../domain/delivery/qualityReportState";
import type {
  CreateDeliveryQualityReportInput,
  DeliveryQualityReport,
  UpdateDeliveryQualityReportDraftInput,
} from "../domain/delivery/entities/deliveryQualityReport";
import type {
  DeliveryEngagementId,
  DeliveryQualityReportId,
} from "../domain/delivery/valueObjects";

/**
 * Persistence contract for DeliveryQualityReport — implementation in infrastructure layer.
 * Physical delete forbidden; approved reports are immutable (domain §01).
 */
export interface DeliveryQualityReportRepository {
  findById(
    companyId: CompanyId,
    id: DeliveryQualityReportId,
  ): Promise<DeliveryQualityReport | null>;

  /** Supports draft history and single approved report per engagement invariant. */
  listByEngagement(
    companyId: CompanyId,
    deliveryEngagementId: DeliveryEngagementId,
    query?: PaginationQuery & { status?: DeliveryQualityReportState },
  ): Promise<PaginatedResult<DeliveryQualityReport>>;

  create(input: CreateDeliveryQualityReportInput): Promise<DeliveryQualityReport>;

  updateDraft(
    companyId: CompanyId,
    id: DeliveryQualityReportId,
    input: UpdateDeliveryQualityReportDraftInput,
  ): Promise<DeliveryQualityReport>;

  /** Persist approve / archive transitions after domain validation. */
  save(
    companyId: CompanyId,
    report: DeliveryQualityReport,
  ): Promise<DeliveryQualityReport>;
}

export const DELIVERY_QUALITY_REPORT_REPOSITORY = Symbol("DeliveryQualityReportRepository");
