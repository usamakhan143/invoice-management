import type { LearningCandidate } from "../entities/learningCandidate";
import { createLearningCandidate, type CreateLearningCandidateInput } from "./learningCandidateRules";
import { supersedeCandidate } from "./learningApprovalRules";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";

export interface CreateAmendmentCandidateInput
  extends Omit<CreateLearningCandidateInput, "amendmentOfCandidateId"> {
  originalCandidate: LearningCandidate;
  expectedOriginalVersion: number;
  supersededAt: string;
  amendedBy: string;
}

/**
 * Amendment flow: supersede original, create new candidate with preserved provenance.
 * Requesting changes MUST NOT mutate the governed original proposal.
 */
export function createAmendmentCandidate(
  input: CreateAmendmentCandidateInput,
): LearningResult<{ original: LearningCandidate; amended: LearningCandidate }> {
  const superseded = supersedeCandidate({
    candidate: input.originalCandidate,
    expectedVersion: input.expectedOriginalVersion,
    actorId: input.amendedBy,
    supersededAt: input.supersededAt,
    reason: "Amendment requested",
  });
  if (!superseded.ok) return superseded;

  const amendedInput: CreateLearningCandidateInput = {
    ...input,
    provenance: input.originalCandidate.provenance,
    amendmentOfCandidateId: input.originalCandidate.candidateId,
  };

  const amended = createLearningCandidate(amendedInput);
  if (!amended.ok) return amended;

  if (amended.value.status !== "pending_review" && amended.value.status !== "gate_blocked") {
    // Amendment starts review cycle — if gates pass it should be pending_review
  }

  const withSupersessionLink: LearningCandidate = {
    ...superseded.value,
    supersession: {
      ...superseded.value.supersession!,
      supersededByCandidateId: amended.value.candidateId,
    },
  };

  return learningOk({
    original: withSupersessionLink,
    amended: {
      ...amended.value,
      status:
        amended.value.gateResult?.mayEnterPendingReview
          ? "pending_review"
          : amended.value.status,
    },
  });
}

export function assertAmendmentProvenancePreserved(
  original: LearningCandidate,
  amended: LearningCandidate,
): LearningResult<void> {
  const keys = [
    "requirementVersionId",
    "promptVersionId",
    "cursorSessionId",
    "evaluationId",
    "retrospectiveId",
  ] as const;

  for (const key of keys) {
    if (original.provenance[key] !== amended.provenance[key]) {
      return learningFailOne(
        "LEARNING_PROVENANCE_INVALID",
        "Amendment must preserve immutable provenance references",
      );
    }
  }
  return learningOk(undefined);
}
