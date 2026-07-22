import type { AuditEvent, LearningAuditEventType } from "../../domain/audit/entities/auditEvent";
import { createAuditEvent } from "../../domain/audit/rules/auditEventRules";
import type { DeliveryEngagementId } from "../../domain/delivery/valueObjects";
import type { CompanyId, EpochMs, UserId } from "../../types";

export interface LearningAuditContext {
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  actorUserId: UserId;
  occurredAt: EpochMs;
  retrospectiveId?: string;
  extractionRunId?: string;
  candidateId?: string;
  candidateType?: string;
  reason?: string;
}

function learningAuditEventId(type: string, occurredAt: EpochMs): string {
  return `${type}-${occurredAt}-${Math.random().toString(36).slice(2, 10)}`;
}

export function composeLearningAuditEvent(
  type: LearningAuditEventType,
  title: string,
  context: LearningAuditContext,
): AuditEvent {
  const result = createAuditEvent(
    {
      companyId: context.companyId,
      engagementId: context.engagementId,
      type,
      title,
      actorUserId: context.actorUserId,
      occurredAt: context.occurredAt,
      artifactType: "learning",
      source: [
        context.retrospectiveId,
        context.extractionRunId,
        context.candidateId,
      ]
        .filter(Boolean)
        .join(":"),
    },
    learningAuditEventId(type, context.occurredAt),
  );
  if (!result.ok) {
    throw new Error(result.errors[0]?.message ?? "Learning audit event invalid");
  }
  return result.value;
}
