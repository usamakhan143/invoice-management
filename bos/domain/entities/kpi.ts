import type {
  AuditTimestamps,
  BosInitiativeId,
  BosMetricDefinitionId,
  BosMetricSnapshotId,
  BosVentureId,
  CompanyId,
  EpochMs,
} from "../../types";
import type { KpiKey, KpiScope, MetricDefinitionStatus } from "../../constants/kpi";

/**
 * BosMetricDefinition — versioned KPI formula (Doc 10).
 * KPI values are computed — never manually entered as source of truth (Doc 08).
 *
 * Responsibilities:
 *   - Define formula, inputs, and scope for a KpiKey
 *   - Version changes deprecate old definitions, retain snapshots
 *
 * Ownership:
 *   - Founder / Admin (bos_metrics_definitions_manage)
 */
export interface BosMetricDefinition extends AuditTimestamps {
  id: BosMetricDefinitionId;
  companyId: CompanyId;
  key: KpiKey;
  name: string;
  description?: string;
  formulaDescription: string;
  scope: KpiScope;
  status: MetricDefinitionStatus;
  version: number;
}

/**
 * BosMetricSnapshot — point-in-time computed KPI (Doc 10).
 *
 * Responsibilities:
 *   - Persist historical KPI for reporting when attributions/formulas change
 *   - Optional in Phase 1A — dashboard may compute live counts from entities
 */
export interface BosMetricSnapshot extends AuditTimestamps {
  id: BosMetricSnapshotId;
  companyId: CompanyId;
  definitionId: BosMetricDefinitionId;
  key: KpiKey;
  scope: KpiScope;
  ventureId?: BosVentureId;
  initiativeId?: BosInitiativeId;
  computedAt: EpochMs;
  value: number;
  unit?: string;
  metadata?: Record<string, unknown>;
}

/**
 * KpiValue — computed result object (not persisted unless snapshotted).
 */
export interface KpiValue {
  key: KpiKey;
  scope: KpiScope;
  value: number;
  unit?: string;
  computedAt: EpochMs;
  ventureId?: BosVentureId;
  initiativeId?: BosInitiativeId;
}

export interface ComputeKpiInput {
  companyId: CompanyId;
  key: KpiKey;
  scope: KpiScope;
  ventureId?: BosVentureId;
  initiativeId?: BosInitiativeId;
  asOf?: EpochMs;
}
