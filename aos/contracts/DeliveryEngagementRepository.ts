import type { CompanyId, PaginatedResult, PaginationQuery } from "../types";
import type { DeliveryState } from "../domain/delivery/deliveryState";
import type {
  CreateDeliveryEngagementInput,
  DeliveryEngagement,
  UpdateDeliveryEngagementInput,
} from "../domain/delivery/entities/deliveryEngagement";
import type { DeliveryEngagementId } from "../domain/delivery/valueObjects";

/**
 * Persistence contract for DeliveryEngagement — implementation in infrastructure layer.
 * Application services depend on this interface, not on storage APIs.
 *
 * Physical delete is forbidden; cancelled engagements remain queryable (domain §01).
 */
export interface DeliveryEngagementRepository {
  findById(
    companyId: CompanyId,
    id: DeliveryEngagementId,
  ): Promise<DeliveryEngagement | null>;

  exists(companyId: CompanyId, id: DeliveryEngagementId): Promise<boolean>;

  listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & { status?: DeliveryState },
  ): Promise<PaginatedResult<DeliveryEngagement>>;

  /** BR-DE-01 — one ERP customer may have many engagements. */
  listByCustomer(
    companyId: CompanyId,
    erpCustomerId: string,
    query?: PaginationQuery & { status?: DeliveryState },
  ): Promise<PaginatedResult<DeliveryEngagement>>;

  create(input: CreateDeliveryEngagementInput): Promise<DeliveryEngagement>;

  update(
    companyId: CompanyId,
    id: DeliveryEngagementId,
    input: UpdateDeliveryEngagementInput,
  ): Promise<DeliveryEngagement>;

  /** Persist lifecycle transitions (pause, resume, cancel, forward states) after domain validation. */
  save(
    companyId: CompanyId,
    engagement: DeliveryEngagement,
  ): Promise<DeliveryEngagement>;
}

export const DELIVERY_ENGAGEMENT_REPOSITORY = Symbol("DeliveryEngagementRepository");
