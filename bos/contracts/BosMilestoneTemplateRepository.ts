import type { BosMilestoneTemplateId, CompanyId, PaginatedResult, PaginationQuery } from "../types";
import type {
  BosMilestoneTemplate,
  CreateBosMilestoneTemplateInput,
  UpdateBosMilestoneTemplateInput,
} from "../domain/entities/milestoneTemplate";

export interface BosMilestoneTemplateRepository {
  findById(companyId: CompanyId, id: BosMilestoneTemplateId): Promise<BosMilestoneTemplate | null>;

  listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosMilestoneTemplate>>;

  create(input: CreateBosMilestoneTemplateInput): Promise<BosMilestoneTemplate>;

  update(
    companyId: CompanyId,
    id: BosMilestoneTemplateId,
    input: UpdateBosMilestoneTemplateInput,
  ): Promise<BosMilestoneTemplate>;
}

export const BOS_MILESTONE_TEMPLATE_REPOSITORY = Symbol("BosMilestoneTemplateRepository");
