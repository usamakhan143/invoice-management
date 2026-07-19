import type { EngagementWorkflowDto } from "./dto/EngagementWorkflowDto";

export interface EngagementWorkflowStore {
  getOrCreate(companyId: string, engagementId: string): EngagementWorkflowDto;
  get(companyId: string, engagementId: string): EngagementWorkflowDto | null;
  listByCompany(companyId: string): EngagementWorkflowDto[];
  save(companyId: string, workflow: EngagementWorkflowDto): EngagementWorkflowDto;
}
