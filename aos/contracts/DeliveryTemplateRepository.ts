import type { AgencyType } from "../constants/agencyType";
import type { CompanyId, PaginatedResult, PaginationQuery } from "../types";
import type { DeliveryTemplateState } from "../domain/delivery/templateState";
import type {
  CreateDeliveryTemplateInput,
  DeliveryTemplate,
  UpdateDeliveryTemplateInput,
} from "../domain/delivery/entities/deliveryTemplate";
import type { DeliveryTemplateId } from "../domain/delivery/valueObjects";

/**
 * Persistence contract for DeliveryTemplate — implementation in infrastructure layer.
 * Physical delete forbidden; templates are deprecated, not removed (domain §01).
 */
export interface DeliveryTemplateRepository {
  findById(
    companyId: CompanyId,
    id: DeliveryTemplateId,
  ): Promise<DeliveryTemplate | null>;

  /** BR-DE-03 — engagement type / agency type drives template selection. */
  listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & {
      agencyType?: AgencyType;
      status?: DeliveryTemplateState;
    },
  ): Promise<PaginatedResult<DeliveryTemplate>>;

  create(input: CreateDeliveryTemplateInput): Promise<DeliveryTemplate>;

  update(
    companyId: CompanyId,
    id: DeliveryTemplateId,
    input: UpdateDeliveryTemplateInput,
  ): Promise<DeliveryTemplate>;

  /** Persist lifecycle transitions (activate, deprecate) and version bumps after domain validation. */
  save(companyId: CompanyId, template: DeliveryTemplate): Promise<DeliveryTemplate>;
}

export const DELIVERY_TEMPLATE_REPOSITORY = Symbol("DeliveryTemplateRepository");
