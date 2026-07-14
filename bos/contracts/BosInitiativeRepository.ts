import type {
  BosInitiativeId,
  BosVentureId,
  CompanyId,
  PaginationQuery,
  PaginatedResult,
} from "../types";
import type { InitiativeStatus } from "../constants/initiativeStatus";
import type {
  BosInitiative,
  CloseBosInitiativeInput,
  CreateBosInitiativeInput,
  UpdateBosInitiativeInput,
} from "../domain/entities/initiative";

export interface BosInitiativeRepository {
  findById(companyId: CompanyId, id: BosInitiativeId): Promise<BosInitiative | null>;

  listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & { ventureId?: BosVentureId; status?: InitiativeStatus },
  ): Promise<PaginatedResult<BosInitiative>>;

  listByVenture(
    companyId: CompanyId,
    ventureId: BosVentureId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosInitiative>>;

  create(input: CreateBosInitiativeInput): Promise<BosInitiative>;

  update(
    companyId: CompanyId,
    id: BosInitiativeId,
    input: UpdateBosInitiativeInput,
  ): Promise<BosInitiative>;

  updateStatus(
    companyId: CompanyId,
    id: BosInitiativeId,
    status: InitiativeStatus,
    updatedById: string,
  ): Promise<BosInitiative>;

  close(
    companyId: CompanyId,
    id: BosInitiativeId,
    input: CloseBosInitiativeInput,
  ): Promise<BosInitiative>;
}

export const BOS_INITIATIVE_REPOSITORY = Symbol("BosInitiativeRepository");
