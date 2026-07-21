import type { CompanyId, EpochMs, UserId } from "../../../types/primitives";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import { freezePublishedRecord } from "../../versioning/versionResult";
import type { EvaluationRubricRef } from "./evaluationRubric";

export interface EvaluationCriterion {
  id: string;
  label: string;
  passed: boolean;
  score: number;
}

export type EvaluationStatus = "draft" | "confirmed" | "overridden";

export interface EvaluationRubricSnapshot extends EvaluationRubricRef {
  criteriaLabels: readonly string[];
}

/** Mutable draft — only editable while status is draft. */
export interface EvaluationDraft {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  cursorSessionId: string;
  promptVersionId: string;
  requirementVersionId: string;
  rubricVersionId: string;
  rubricSnapshot: EvaluationRubricSnapshot;
  status: "draft";
  scorePercent: number;
  passed: boolean;
  criteria: EvaluationCriterion[];
  createdAt: EpochMs;
  amendsEvaluationId?: string;
}

/** Immutable evaluation after confirm or override (ADR-007). */
export interface Evaluation {
  readonly id: string;
  readonly companyId: CompanyId;
  readonly engagementId: DeliveryEngagementId;
  readonly cursorSessionId: string;
  readonly promptVersionId: string;
  readonly requirementVersionId: string;
  readonly rubricVersionId: string;
  readonly rubricSnapshot: EvaluationRubricSnapshot;
  readonly status: "confirmed" | "overridden";
  readonly scorePercent: number;
  readonly passed: boolean;
  readonly criteria: readonly EvaluationCriterion[];
  readonly createdAt: EpochMs;
  readonly confirmedAt: EpochMs;
  readonly confirmedByUserId: UserId;
  readonly overrideReason?: string;
  readonly amendsEvaluationId?: string;
}

export function createEvaluationDraft(input: {
  id: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  cursorSessionId: string;
  promptVersionId: string;
  requirementVersionId: string;
  rubric: EvaluationRubricRef;
  criteria: EvaluationCriterion[];
  scorePercent: number;
  passed: boolean;
  createdAt: EpochMs;
  amendsEvaluationId?: string;
}): EvaluationDraft {
  return {
    id: input.id,
    companyId: input.companyId,
    engagementId: input.engagementId,
    cursorSessionId: input.cursorSessionId,
    promptVersionId: input.promptVersionId,
    requirementVersionId: input.requirementVersionId,
    rubricVersionId: input.rubric.rubricVersionId,
    rubricSnapshot: {
      rubricVersionId: input.rubric.rubricVersionId,
      name: input.rubric.name,
      criteriaLabels: input.criteria.map((c) => c.label),
    },
    status: "draft",
    scorePercent: input.scorePercent,
    passed: input.passed,
    criteria: input.criteria.map((c) => ({ ...c })),
    createdAt: input.createdAt,
    amendsEvaluationId: input.amendsEvaluationId,
  };
}

export function freezeEvaluation(
  draft: EvaluationDraft,
  input: {
    status: "confirmed" | "overridden";
    confirmedAt: EpochMs;
    confirmedByUserId: UserId;
    overrideReason?: string;
  },
): Evaluation {
  return freezePublishedRecord({
    id: draft.id,
    companyId: draft.companyId,
    engagementId: draft.engagementId,
    cursorSessionId: draft.cursorSessionId,
    promptVersionId: draft.promptVersionId,
    requirementVersionId: draft.requirementVersionId,
    rubricVersionId: draft.rubricVersionId,
    rubricSnapshot: {
      rubricVersionId: draft.rubricSnapshot.rubricVersionId,
      name: draft.rubricSnapshot.name,
      criteriaLabels: [...draft.rubricSnapshot.criteriaLabels],
    },
    status: input.status,
    scorePercent: draft.scorePercent,
    passed: draft.passed,
    criteria: draft.criteria.map((c) => ({ ...c })),
    createdAt: draft.createdAt,
    confirmedAt: input.confirmedAt,
    confirmedByUserId: input.confirmedByUserId,
    overrideReason: input.overrideReason,
    amendsEvaluationId: draft.amendsEvaluationId,
  });
}

export function isEvaluationFinalized(evaluation: Evaluation | EvaluationDraft): boolean {
  return evaluation.status !== "draft";
}
