import type { CompanyId } from "../../../types";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import type { LearningProvenance } from "../valueObjects/learningProvenance";

export type LearningExtractionRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "partial"
  | "failed";

export const TERMINAL_RUN_STATUSES: readonly LearningExtractionRunStatus[] = [
  "completed",
  "failed",
] as const;

export interface AiJobMetadata {
  readonly provider: string;
  readonly modelId: string;
  readonly promptVersion: string;
}

export interface LearningExtractionRun {
  readonly extractionRunId: string;
  readonly companyId: CompanyId;
  readonly engagementId: DeliveryEngagementId;
  readonly retrospectiveId: string;
  readonly status: LearningExtractionRunStatus;
  readonly provenance: LearningProvenance;
  readonly candidateIds: readonly string[];
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly failureReason?: string;
  readonly aiJobMetadata?: AiJobMetadata;
  readonly idempotencyKey: string;
}

export function isTerminalRunStatus(status: LearningExtractionRunStatus): boolean {
  return (TERMINAL_RUN_STATUSES as readonly string[]).includes(status);
}
