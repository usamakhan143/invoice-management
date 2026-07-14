import type {
  CompanyId,
  BosVentureId,
  PaginationQuery,
  PaginatedResult,
} from "../types";
import type { VentureStatus } from "../constants/ventureStatus";
import type {
  BosVenture,
  CreateBosVentureInput,
  UpdateBosVentureInput,
} from "../domain/entities/venture";

/**
 * Persistence contract for BosVenture — implementation in infrastructure layer (Firestore).
 * Application services depend on this interface, not on Firebase APIs.
 */
export interface BosVentureRepository {
  findById(companyId: CompanyId, id: BosVentureId): Promise<BosVenture | null>;

  listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & { status?: VentureStatus },
  ): Promise<PaginatedResult<BosVenture>>;

  create(input: CreateBosVentureInput): Promise<BosVenture>;

  update(
    companyId: CompanyId,
    id: BosVentureId,
    input: UpdateBosVentureInput,
  ): Promise<BosVenture>;

  updateStatus(
    companyId: CompanyId,
    id: BosVentureId,
    status: VentureStatus,
    updatedById: string,
  ): Promise<BosVenture>;
}

export const BOS_VENTURE_REPOSITORY = Symbol("BosVentureRepository");
