import type { AuditEvent } from "../domain/audit/entities/auditEvent";
import type { EngagementWorkflow } from "../domain/workflow/entities/engagementWorkflow";
import type { CompanyId } from "../types";
import type { DeliveryEngagementId } from "../domain/delivery/valueObjects";

export interface EngagementWorkflowRepository {
  getOrCreate(companyId: CompanyId, engagementId: DeliveryEngagementId): Promise<EngagementWorkflow>;
  get(companyId: CompanyId, engagementId: DeliveryEngagementId): Promise<EngagementWorkflow | null>;
  listByCompany(companyId: CompanyId): Promise<EngagementWorkflow[]>;
  save(companyId: CompanyId, workflow: EngagementWorkflow): Promise<EngagementWorkflow>;
}

export interface AuditEventRepository {
  append(event: AuditEvent): Promise<AuditEvent>;
  listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
    limit?: number,
  ): Promise<AuditEvent[]>;
}
