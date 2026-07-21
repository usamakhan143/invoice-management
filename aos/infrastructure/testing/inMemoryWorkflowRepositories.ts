import type {
  AuditEventRepository,
  EngagementWorkflowRepository,
} from "../../contracts/EngagementWorkflowRepository";
import type { AuditEvent } from "../../domain/audit/entities/auditEvent";
import type { EngagementWorkflow } from "../../domain/workflow/entities/engagementWorkflow";
import { createEmptyEngagementWorkflow } from "../../domain/workflow/entities/engagementWorkflow";
import type { CompanyId } from "../../types";
import type { DeliveryEngagementId } from "../../domain/delivery/valueObjects";

function workflowKey(companyId: CompanyId, engagementId: DeliveryEngagementId): string {
  return `${companyId}:${engagementId}`;
}

/** Test double — implements contract without Firestore. */
export class InMemoryEngagementWorkflowRepository implements EngagementWorkflowRepository {
  private readonly store = new Map<string, EngagementWorkflow>();

  async get(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflow | null> {
    const existing = this.store.get(workflowKey(companyId, engagementId));
    return existing ? structuredClone(existing) : null;
  }

  async getOrCreate(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<EngagementWorkflow> {
    const existing = await this.get(companyId, engagementId);
    if (existing) {
      return existing;
    }
    const created = createEmptyEngagementWorkflow(companyId, engagementId);
    return this.save(companyId, created);
  }

  async listByCompany(companyId: CompanyId): Promise<EngagementWorkflow[]> {
    const prefix = `${companyId}:`;
    const results: EngagementWorkflow[] = [];
    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        results.push(structuredClone(value));
      }
    }
    return results;
  }

  async save(companyId: CompanyId, workflow: EngagementWorkflow): Promise<EngagementWorkflow> {
    this.store.set(workflowKey(companyId, workflow.engagementId), structuredClone(workflow));
    return structuredClone(workflow);
  }

  clear(): void {
    this.store.clear();
  }
}

export class InMemoryAuditEventRepository implements AuditEventRepository {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<AuditEvent> {
    if (this.events.some((existing) => existing.id === event.id)) {
      throw new Error(`Audit event ${event.id} already exists`);
    }
    this.events.push(structuredClone(event));
    return structuredClone(event);
  }

  async listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
    limit = 100,
  ): Promise<AuditEvent[]> {
    return this.events
      .filter((event) => event.companyId === companyId && event.engagementId === engagementId)
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, limit)
      .map((event) => structuredClone(event));
  }

  clear(): void {
    this.events.length = 0;
  }
}
