export type WorkflowDomainErrorCode =
  | "WORKFLOW_NO_REQUIREMENT_SET"
  | "WORKFLOW_NO_PROMPT_PACK"
  | "WORKFLOW_NO_REUSE_ASSESSMENT"
  | "WORKFLOW_NO_QA_REPORT"
  | "WORKFLOW_NO_RETROSPECTIVE"
  | "WORKFLOW_GATE_BLOCKED"
  | "WORKFLOW_QA_INCOMPLETE";

export interface WorkflowDomainError {
  code: WorkflowDomainErrorCode;
  message: string;
}
