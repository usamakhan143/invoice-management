import type { WorkflowDomainError } from "../../domain/workflow/errors";

export class EngagementWorkflowApplicationError extends Error {
  readonly code: WorkflowDomainError["code"];

  constructor(error: WorkflowDomainError) {
    super(error.message);
    this.name = "EngagementWorkflowApplicationError";
    this.code = error.code;
  }
}

export function assertWorkflowOk<T>(result: { ok: true; value: T } | { ok: false; errors: WorkflowDomainError[] }): T {
  if (!result.ok) {
    throw new EngagementWorkflowApplicationError(result.errors[0]!);
  }
  return result.value;
}
