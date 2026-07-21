import type { DeliveryTraceabilityRefs } from "../../workflow/entities/engagementWorkflow";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";

/** Immutable Phase E evidence references — store IDs only, no entity duplication. */
export interface LearningProvenance {
  readonly requirementVersionId: string;
  readonly promptVersionId: string;
  readonly cursorSessionId: string;
  readonly evaluationId: string;
  readonly retrospectiveId: string;
  readonly rubricVersionId?: string;
  readonly cursorRevisionIds?: readonly string[];
  readonly sourceAuditEventIds: readonly string[];
  readonly reuseAssessmentSnapshotId?: string;
}

export interface CreateLearningProvenanceInput {
  requirementVersionId: string;
  promptVersionId: string;
  cursorSessionId: string;
  evaluationId: string;
  retrospectiveId: string;
  rubricVersionId?: string;
  cursorRevisionIds?: readonly string[];
  sourceAuditEventIds: readonly string[];
  reuseAssessmentSnapshotId?: string;
}

export interface ProvenanceValidationContext {
  companyId: string;
  engagementId: string;
  /** When supplied, each ref metadata entry must match companyId. */
  refCompanyIds?: Partial<Record<keyof LearningProvenance, string>>;
  /** When supplied, engagement-scoped refs must match engagementId. */
  refEngagementIds?: Partial<Record<keyof LearningProvenance, string>>;
}

function isNonEmptyId(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function createLearningProvenance(
  input: CreateLearningProvenanceInput,
): LearningResult<LearningProvenance> {
  const required: Array<[string, string | undefined]> = [
    ["requirementVersionId", input.requirementVersionId],
    ["promptVersionId", input.promptVersionId],
    ["cursorSessionId", input.cursorSessionId],
    ["evaluationId", input.evaluationId],
    ["retrospectiveId", input.retrospectiveId],
  ];

  for (const [field, value] of required) {
    if (!isNonEmptyId(value)) {
      return learningFailOne(
        "LEARNING_PROVENANCE_INCOMPLETE",
        `${field} is required`,
      );
    }
  }

  if (!input.sourceAuditEventIds || input.sourceAuditEventIds.length === 0) {
    return learningFailOne(
      "LEARNING_PROVENANCE_INCOMPLETE",
      "sourceAuditEventIds must contain at least one audit event",
    );
  }

  if (input.cursorRevisionIds?.some((id) => !isNonEmptyId(id))) {
    return learningFailOne(
      "LEARNING_PROVENANCE_INVALID",
      "cursorRevisionIds must be non-empty when provided",
    );
  }

  return learningOk({
    requirementVersionId: input.requirementVersionId.trim(),
    promptVersionId: input.promptVersionId.trim(),
    cursorSessionId: input.cursorSessionId.trim(),
    evaluationId: input.evaluationId.trim(),
    retrospectiveId: input.retrospectiveId.trim(),
    rubricVersionId: input.rubricVersionId?.trim(),
    cursorRevisionIds: input.cursorRevisionIds
      ? Object.freeze([...input.cursorRevisionIds])
      : undefined,
    sourceAuditEventIds: Object.freeze([...input.sourceAuditEventIds]),
    reuseAssessmentSnapshotId: input.reuseAssessmentSnapshotId?.trim(),
  });
}

export function validateLearningProvenanceContext(
  provenance: LearningProvenance,
  context: ProvenanceValidationContext,
): LearningResult<void> {
  if (
    provenance.retrospectiveId.trim().length === 0 ||
    provenance.requirementVersionId.trim().length === 0
  ) {
    return learningFailOne(
      "LEARNING_PROVENANCE_INCOMPLETE",
      "Provenance missing required references",
    );
  }

  if (context.refCompanyIds) {
    for (const [field, refCompanyId] of Object.entries(context.refCompanyIds)) {
      if (!refCompanyId) continue;
      if (refCompanyId !== context.companyId) {
        return learningFailOne(
          "LEARNING_COMPANY_MISMATCH",
          `${field} cross-company evidence reference rejected`,
        );
      }
    }
  }

  if (context.refEngagementIds) {
    for (const [field, expectedEngagementId] of Object.entries(context.refEngagementIds)) {
      if (!expectedEngagementId) continue;
      const key = field as keyof LearningProvenance;
      const refValue = provenance[key];
      if (typeof refValue === "string" && expectedEngagementId !== context.engagementId) {
        return learningFailOne(
          "LEARNING_ENGAGEMENT_MISMATCH",
          `${field} engagement mismatch`,
        );
      }
    }
  }

  return learningOk(undefined);
}

/** Copy Phase E traceability refs into learning provenance — never invent alternate IDs. */
export function buildLearningProvenanceFromTraceability(
  refs: DeliveryTraceabilityRefs,
  retrospectiveId: string,
  sourceAuditEventIds: readonly string[],
  extras?: {
    cursorRevisionIds?: readonly string[];
    reuseAssessmentSnapshotId?: string;
  },
): LearningResult<LearningProvenance> {
  return createLearningProvenance({
    requirementVersionId: refs.requirementVersionId ?? "",
    promptVersionId: refs.promptVersionId ?? "",
    cursorSessionId: refs.cursorSessionId ?? "",
    evaluationId: refs.evaluationId ?? "",
    retrospectiveId,
    rubricVersionId: refs.rubricVersionId,
    cursorRevisionIds: extras?.cursorRevisionIds,
    sourceAuditEventIds,
    reuseAssessmentSnapshotId: extras?.reuseAssessmentSnapshotId,
  });
}
