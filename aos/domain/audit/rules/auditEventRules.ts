import type { AuditEvent, CreateAuditEventInput } from "../entities/auditEvent";
import { workflowFailOne, workflowOk, type WorkflowResult } from "../../workflow/workflowResult";

export function createAuditEvent(
  input: CreateAuditEventInput,
  eventId: string,
): WorkflowResult<AuditEvent> {
  const type = input.type.trim();
  const title = input.title.trim();

  if (!type) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Audit event type is required.");
  }
  if (!title) {
    return workflowFailOne("WORKFLOW_GATE_BLOCKED", "Audit event title is required.");
  }

  return workflowOk({
    id: eventId,
    companyId: input.companyId,
    engagementId: input.engagementId,
    type,
    title,
    actorUserId: input.actorUserId,
    occurredAt: input.occurredAt,
    artifactType: input.artifactType,
    versionId: input.versionId,
    versionNumber: input.versionNumber,
    source: input.source,
  });
}
