import type { EpochMs, UserId } from "../../../types/primitives";
import {
  assertSameCompany,
  versionFailOne,
  versionOk,
  type VersionResult,
} from "../../versioning/versionResult";
import type { CursorSession } from "../../cursor/entities/cursorSession";
import type { PromptVersion } from "../../prompt/entities/promptVersion";
import type { RequirementVersion } from "../../requirements/entities/requirementVersion";
import {
  createEvaluationDraft,
  freezeEvaluation,
  type Evaluation,
  type EvaluationCriterion,
  type EvaluationDraft,
} from "../entities/evaluation";
import type { EvaluationRubricRef } from "../entities/evaluationRubric";

export function createDraftEvaluation(input: {
  id: string;
  companyId: string;
  engagementId: string;
  session: CursorSession;
  promptVersion: PromptVersion;
  requirementVersion: RequirementVersion;
  rubric: EvaluationRubricRef;
  criteria: EvaluationCriterion[];
  scorePercent: number;
  passed: boolean;
  createdAt: EpochMs;
  amendsEvaluationId?: string;
}): VersionResult<EvaluationDraft> {
  const company = assertSameCompany(input.companyId, input.session.companyId, "Evaluation/session");
  if (!company.ok) return company;

  if (input.session.promptVersionId !== input.promptVersion.id) {
    return versionFailOne("VERSION_REF_MISMATCH", "Evaluation promptVersionId must match session");
  }
  if (input.promptVersion.requirementVersionId !== input.requirementVersion.id) {
    return versionFailOne("VERSION_REF_MISMATCH", "PromptVersion requirementVersionId mismatch");
  }
  if (!input.session.promptVersionId?.trim()) {
    return versionFailOne("VERSION_MISSING_REF", "Evaluation requires cursor session with promptVersionId");
  }

  const promptCompany = assertSameCompany(
    input.companyId,
    input.promptVersion.companyId,
    "Evaluation/promptVersion",
  );
  if (!promptCompany.ok) return promptCompany;

  const reqCompany = assertSameCompany(
    input.companyId,
    input.requirementVersion.companyId,
    "Evaluation/requirementVersion",
  );
  if (!reqCompany.ok) return reqCompany;

  if (input.session.engagementId !== input.engagementId) {
    return versionFailOne("VERSION_REF_MISMATCH", "Session engagementId mismatch");
  }

  return versionOk(
    createEvaluationDraft({
      id: input.id,
      companyId: input.companyId,
      engagementId: input.engagementId,
      cursorSessionId: input.session.id,
      promptVersionId: input.promptVersion.id,
      requirementVersionId: input.requirementVersion.id,
      rubric: input.rubric,
      criteria: input.criteria,
      scorePercent: input.scorePercent,
      passed: input.passed,
      createdAt: input.createdAt,
      amendsEvaluationId: input.amendsEvaluationId,
    }),
  );
}

export function updateEvaluationDraftScores(
  draft: EvaluationDraft,
  input: { criteria: EvaluationCriterion[]; scorePercent: number; passed: boolean },
): VersionResult<EvaluationDraft> {
  if (draft.status !== "draft") {
    return versionFailOne("VERSION_IMMUTABLE", "Only draft evaluations can be updated");
  }
  return versionOk({
    ...draft,
    criteria: input.criteria.map((c) => ({ ...c })),
    scorePercent: input.scorePercent,
    passed: input.passed,
  });
}

export function confirmEvaluation(
  draft: EvaluationDraft,
  input: { confirmedAt: EpochMs; confirmedByUserId: UserId },
): VersionResult<Evaluation> {
  if (draft.status !== "draft") {
    return versionFailOne("VERSION_INVALID_STATUS", "Only draft evaluations can be confirmed");
  }
  return versionOk(
    freezeEvaluation(draft, {
      status: "confirmed",
      confirmedAt: input.confirmedAt,
      confirmedByUserId: input.confirmedByUserId,
    }),
  );
}

export function overrideEvaluation(
  draft: EvaluationDraft,
  input: {
    confirmedAt: EpochMs;
    confirmedByUserId: UserId;
    overrideReason: string;
    passed: boolean;
    scorePercent: number;
  },
): VersionResult<Evaluation> {
  if (draft.status !== "draft") {
    return versionFailOne("VERSION_INVALID_STATUS", "Only draft evaluations can be overridden");
  }
  if (!input.overrideReason.trim()) {
    return versionFailOne("VERSION_INVALID_STATUS", "Override requires a reason");
  }
  const adjusted: EvaluationDraft = {
    ...draft,
    passed: input.passed,
    scorePercent: input.scorePercent,
  };
  return versionOk(
    freezeEvaluation(adjusted, {
      status: "overridden",
      confirmedAt: input.confirmedAt,
      confirmedByUserId: input.confirmedByUserId,
      overrideReason: input.overrideReason,
    }),
  );
}

export function amendEvaluation(input: {
  prior: Evaluation;
  newDraftId: string;
  criteria: EvaluationCriterion[];
  scorePercent: number;
  passed: boolean;
  createdAt: EpochMs;
  rubric: EvaluationRubricRef;
}): VersionResult<EvaluationDraft> {
  return versionOk(
    createEvaluationDraft({
      id: input.newDraftId,
      companyId: input.prior.companyId,
      engagementId: input.prior.engagementId,
      cursorSessionId: input.prior.cursorSessionId,
      promptVersionId: input.prior.promptVersionId,
      requirementVersionId: input.prior.requirementVersionId,
      rubric: input.rubric,
      criteria: input.criteria,
      scorePercent: input.scorePercent,
      passed: input.passed,
      createdAt: input.createdAt,
      amendsEvaluationId: input.prior.id,
    }),
  );
}

export function rejectEvaluationMutation(): VersionResult<never> {
  return versionFailOne("VERSION_IMMUTABLE", "Confirmed Evaluation cannot be mutated");
}
