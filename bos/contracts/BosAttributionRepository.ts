import type {
  BosAttributionId,
  BosInitiativeId,
  CompanyId,
  PaginationQuery,
  PaginatedResult,
} from "../types";
import type { AttributionSourceType } from "../constants/attributionSourceType";
import type { AttributionStatus } from "../constants/attributionStatus";
import type {
  AttributionSourceRef,
  BosAttribution,
  CreateBosAttributionInput,
  SupersedeBosAttributionInput,
  VoidBosAttributionInput,
} from "../domain/entities/attribution";

/** Phase 1B — sidecar persistence only. */
export interface BosAttributionRepository {
  findById(companyId: CompanyId, id: BosAttributionId): Promise<BosAttribution | null>;

  listByInitiative(
    companyId: CompanyId,
    initiativeId: BosInitiativeId,
    query?: PaginationQuery & { status?: AttributionStatus },
  ): Promise<PaginatedResult<BosAttribution>>;

  listActiveBySource(ref: AttributionSourceRef): Promise<BosAttribution[]>;

  create(input: CreateBosAttributionInput): Promise<BosAttribution>;

  supersede(
    companyId: CompanyId,
    id: BosAttributionId,
    input: SupersedeBosAttributionInput,
  ): Promise<BosAttribution>;

  void(
    companyId: CompanyId,
    id: BosAttributionId,
    input: VoidBosAttributionInput,
  ): Promise<BosAttribution>;

  updateStatus(
    companyId: CompanyId,
    id: BosAttributionId,
    status: AttributionStatus,
    updatedById: string,
  ): Promise<BosAttribution>;
}

export const BOS_ATTRIBUTION_REPOSITORY = Symbol("BosAttributionRepository");

/** Read-only ERP expense lookup for Phase 1B picker — see integration/ports/ErpExpenseReadPort.ts */
export type { ErpExpenseReadPort } from "../integration/ports/ErpExpenseReadPort";
export { ERP_EXPENSE_READ_PORT } from "../integration/ports/ErpExpenseReadPort";
