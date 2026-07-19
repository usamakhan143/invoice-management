import type { EngagementWorkflowDto } from "../../application/workflow/dto/EngagementWorkflowDto";
import type { EngagementWorkflowStore } from "../../application/workflow/EngagementWorkflowStore";

const store = new Map<string, EngagementWorkflowDto>();

function storageKey(companyId: string, engagementId: string): string {
  return `${companyId}:${engagementId}`;
}

function createEmptyWorkflow(engagementId: string): EngagementWorkflowDto {
  return {
    engagementId,
    requirementSet: null,
    reuseAssessment: null,
    promptPack: null,
    cursorSessions: [],
    evaluation: null,
    qualityReport: null,
    retrospective: null,
    timeline: [],
    gates: {
      requirementsApproved: false,
      reuseRecorded: false,
      promptPackApproved: false,
      cursorSubmitted: false,
      evaluationPassed: false,
      qaComplete: false,
      retrospectiveComplete: false,
    },
  };
}

/** In-memory workflow store — presentation Phase 1 until Stage D+ repositories ship. */
export class EngagementWorkflowMemoryStore implements EngagementWorkflowStore {
  getOrCreate(companyId: string, engagementId: string): EngagementWorkflowDto {
    const key = storageKey(companyId, engagementId);
    const existing = store.get(key);
    if (existing) {
      return structuredClone(existing);
    }
    const created = createEmptyWorkflow(engagementId);
    store.set(key, structuredClone(created));
    return created;
  }

  get(companyId: string, engagementId: string): EngagementWorkflowDto | null {
    const existing = store.get(storageKey(companyId, engagementId));
    return existing ? structuredClone(existing) : null;
  }

  listByCompany(companyId: string): EngagementWorkflowDto[] {
    const prefix = `${companyId}:`;
    const results: EngagementWorkflowDto[] = [];
    for (const [key, value] of store.entries()) {
      if (key.startsWith(prefix)) {
        results.push(structuredClone(value));
      }
    }
    return results;
  }

  save(companyId: string, workflow: EngagementWorkflowDto): EngagementWorkflowDto {
    const key = storageKey(companyId, workflow.engagementId);
    store.set(key, structuredClone(workflow));
    return structuredClone(workflow);
  }
}

export function resetEngagementWorkflowMemoryStore(): void {
  store.clear();
}
