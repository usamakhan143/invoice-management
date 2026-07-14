import type {
  BosInitiativeId,
  BosMetricDefinitionId,
  BosMetricSnapshotId,
  BosVentureId,
  CompanyId,
  PaginationQuery,
  PaginatedResult,
} from "../types";
import type { KpiKey, KpiScope } from "../constants/kpi";
import type {
  BosMetricDefinition,
  BosMetricSnapshot,
  ComputeKpiInput,
  KpiValue,
} from "../domain/entities/kpi";

export interface BosMetricDefinitionRepository {
  findByKey(
    companyId: CompanyId,
    key: KpiKey,
    scope: KpiScope,
  ): Promise<BosMetricDefinition | null>;

  listByCompany(companyId: CompanyId): Promise<BosMetricDefinition[]>;

  save(definition: BosMetricDefinition): Promise<BosMetricDefinition>;
}

export interface BosMetricSnapshotRepository {
  findById(companyId: CompanyId, id: BosMetricSnapshotId): Promise<BosMetricSnapshot | null>;

  listByScope(
    companyId: CompanyId,
    query: PaginationQuery & {
      key?: KpiKey;
      scope: KpiScope;
      ventureId?: BosVentureId;
      initiativeId?: BosInitiativeId;
    },
  ): Promise<PaginatedResult<BosMetricSnapshot>>;

  save(snapshot: BosMetricSnapshot): Promise<BosMetricSnapshot>;
}

/**
 * Computes KPI values — may aggregate repository + ERP read ports (Phase 1B+).
 * No persistence unless caller saves a snapshot.
 */
export interface BosKpiCalculator {
  compute(input: ComputeKpiInput): Promise<KpiValue>;
}

export const BOS_METRIC_DEFINITION_REPOSITORY = Symbol("BosMetricDefinitionRepository");
export const BOS_METRIC_SNAPSHOT_REPOSITORY = Symbol("BosMetricSnapshotRepository");
export const BOS_KPI_CALCULATOR = Symbol("BosKpiCalculator");
