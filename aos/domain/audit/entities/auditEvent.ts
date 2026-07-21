import type { CompanyId, EpochMs, UserId } from "../../../types";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";

/** Frozen Learning Engine audit taxonomy — Phase F planning doc 06. */
export type LearningAuditEventType =
  | "aos_learning_extraction_started"
  | "aos_learning_extraction_completed"
  | "aos_learning_extraction_failed"
  | "aos_learning_extraction_retriggered"
  | "aos_learning_candidate_created"
  | "aos_learning_gate_evaluated"
  | "aos_learning_candidate_approved"
  | "aos_learning_candidate_rejected"
  | "aos_learning_candidate_deferred"
  | "aos_learning_candidate_superseded"
  | "aos_learning_candidate_promoted"
  | "aos_learning_promotion_failed"
  | "aos_learning_promotion_rollback";

/** Workflow audit events emitted by engagement workflow aggregate. */
export type WorkflowAuditEventType =
  | "requirements.draft_generated"
  | "requirements.draft_updated"
  | "requirements.approved"
  | "reuse.assessment_run"
  | "reuse.module_decision"
  | "reuse.recorded"
  | "prompts.generated"
  | "prompts.approved"
  | "cursor.started"
  | "cursor.capture_submitted"
  | "evaluation.completed"
  | "qa.checklist_updated"
  | "qa.approved"
  | "retro.generated"
  | "retro.approved";

export type AuditEventType = WorkflowAuditEventType | LearningAuditEventType | string;

/** Append-only audit evidence — ADR-014. Immutable after creation. */
export interface AuditEvent {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly engagementId: DeliveryEngagementId;
  readonly type: AuditEventType;
  readonly title: string;
  readonly actorUserId: UserId;
  readonly occurredAt: EpochMs;
  readonly artifactType?: string;
  readonly versionId?: string;
  readonly versionNumber?: number;
  readonly source?: string;
}

export interface CreateAuditEventInput {
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  type: string;
  title: string;
  actorUserId: UserId;
  occurredAt: EpochMs;
  artifactType?: string;
  versionId?: string;
  versionNumber?: number;
  source?: string;
}
