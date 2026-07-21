import type { WorkflowDomainError, WorkflowDomainErrorCode } from "./errors";

export interface WorkflowSuccess<T> {
  ok: true;
  value: T;
}

export interface WorkflowFailure {
  ok: false;
  errors: WorkflowDomainError[];
}

export type WorkflowResult<T> = WorkflowSuccess<T> | WorkflowFailure;

export function workflowOk<T>(value: T): WorkflowSuccess<T> {
  return { ok: true, value };
}

export function workflowFail(errors: WorkflowDomainError[]): WorkflowFailure {
  return { ok: false, errors };
}

export function workflowFailOne(
  code: WorkflowDomainErrorCode,
  message: string,
): WorkflowFailure {
  return workflowFail([{ code, message }]);
}
