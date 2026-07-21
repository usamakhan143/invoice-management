import type { UserId } from "../../../types";
import type { LearningCandidate } from "../entities/learningCandidate";
import {
  applyCandidateStatusTransition,
  assertNotGateBlockedForReview,
} from "./learningCandidateLifecycleRules";
import {
  assertHumanGovernedActor,
  type GovernedActorInput,
} from "./learningCandidateRules";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";

export interface ApproveCandidateInput extends GovernedActorInput {
  candidate: LearningCandidate;
  expectedVersion: number;
  approvedAt: string;
  approvalNote?: string;
}

export function approveCandidate(
  input: ApproveCandidateInput,
): LearningResult<LearningCandidate> {
  const actorCheck = assertHumanGovernedActor(input);
  if (!actorCheck.ok) return actorCheck;

  if (input.candidate.version !== input.expectedVersion) {
    return learningFailOne(
      "LEARNING_VERSION_CONFLICT",
      "Candidate version conflict — concurrent modification detected",
    );
  }

  const reviewCheck = assertNotGateBlockedForReview(input.candidate);
  if (!reviewCheck.ok) return reviewCheck;

  if (input.candidate.status !== "pending_review") {
    return learningFailOne(
      "LEARNING_ILLEGAL_TRANSITION",
      "Only pending_review candidates may be approved",
    );
  }

  const transitioned = applyCandidateStatusTransition(
    input.candidate,
    "approved",
    input.approvedAt,
  );
  if (!transitioned.ok) return transitioned;

  return learningOk({
    ...transitioned.value,
    approval: {
      approvedBy: input.actorId as UserId,
      approvedAt: input.approvedAt,
      approvalNote: input.approvalNote,
    },
    confidence: {
      ...transitioned.value.confidence,
      organizationalConfidence: "validated",
    },
  });
}

export interface RejectCandidateInput extends GovernedActorInput {
  candidate: LearningCandidate;
  expectedVersion: number;
  rejectedAt: string;
  rejectionReason: string;
}

export function rejectCandidate(
  input: RejectCandidateInput,
): LearningResult<LearningCandidate> {
  const actorCheck = assertHumanGovernedActor(input);
  if (!actorCheck.ok) return actorCheck;

  if (input.candidate.version !== input.expectedVersion) {
    return learningFailOne(
      "LEARNING_VERSION_CONFLICT",
      "Candidate version conflict",
    );
  }

  const allowedFrom: LearningCandidate["status"][] = [
    "pending_review",
    "promotion_failed",
  ];
  if (!allowedFrom.includes(input.candidate.status)) {
    return learningFailOne(
      "LEARNING_ILLEGAL_TRANSITION",
      `Cannot reject candidate in status ${input.candidate.status}`,
    );
  }

  const transitioned = applyCandidateStatusTransition(
    input.candidate,
    "rejected",
    input.rejectedAt,
  );
  if (!transitioned.ok) return transitioned;

  return learningOk({
    ...transitioned.value,
    rejection: {
      rejectedBy: input.actorId as UserId,
      rejectedAt: input.rejectedAt,
      rejectionReason: input.rejectionReason,
    },
  });
}

export interface DeferCandidateInput extends GovernedActorInput {
  candidate: LearningCandidate;
  expectedVersion: number;
  deferredAt: string;
  deferReason?: string;
}

export function deferCandidate(
  input: DeferCandidateInput,
): LearningResult<LearningCandidate> {
  const actorCheck = assertHumanGovernedActor(input);
  if (!actorCheck.ok) return actorCheck;

  if (input.candidate.version !== input.expectedVersion) {
    return learningFailOne(
      "LEARNING_VERSION_CONFLICT",
      "Candidate version conflict",
    );
  }

  if (input.candidate.status !== "pending_review") {
    return learningFailOne(
      "LEARNING_ILLEGAL_TRANSITION",
      "Only pending_review candidates may be deferred",
    );
  }

  const transitioned = applyCandidateStatusTransition(
    input.candidate,
    "gate_deferred",
    input.deferredAt,
  );
  if (!transitioned.ok) return transitioned;

  return learningOk({
    ...transitioned.value,
    defer: {
      deferredBy: input.actorId as UserId,
      deferredAt: input.deferredAt,
      deferReason: input.deferReason,
    },
  });
}

export interface SupersedeCandidateInput extends GovernedActorInput {
  candidate: LearningCandidate;
  expectedVersion: number;
  supersededAt: string;
  supersededByCandidateId?: string;
  reason?: string;
}

export function supersedeCandidate(
  input: SupersedeCandidateInput,
): LearningResult<LearningCandidate> {
  const actorCheck = assertHumanGovernedActor(input);
  if (!actorCheck.ok) return actorCheck;

  if (input.candidate.version !== input.expectedVersion) {
    return learningFailOne(
      "LEARNING_VERSION_CONFLICT",
      "Candidate version conflict",
    );
  }

  const allowedFrom: LearningCandidate["status"][] = [
    "extracted",
    "pending_review",
    "approved",
    "gate_deferred",
  ];
  if (!allowedFrom.includes(input.candidate.status)) {
    return learningFailOne(
      "LEARNING_ILLEGAL_TRANSITION",
      `Cannot supersede candidate in status ${input.candidate.status}`,
    );
  }

  const transitioned = applyCandidateStatusTransition(
    input.candidate,
    "superseded",
    input.supersededAt,
  );
  if (!transitioned.ok) return transitioned;

  return learningOk({
    ...transitioned.value,
    supersession: {
      supersededAt: input.supersededAt,
      supersededBy: input.actorId as UserId,
      supersededByCandidateId: input.supersededByCandidateId,
      reason: input.reason,
    },
  });
}

/** AI cannot approve — explicit rejection helper for LF-05. */
export function rejectAiApprovalAttempt(
  candidate: LearningCandidate,
  actorId: string,
): LearningResult<LearningCandidate> {
  if (actorId !== "ai") {
    return learningFailOne(
      "LEARNING_INVALID_ACTOR",
      "Use approveCandidate for human actors",
    );
  }
  return learningFailOne(
    "LEARNING_AI_ACTOR_FORBIDDEN",
    "AI cannot approve candidates",
  );
}

/** AI cannot promote — explicit rejection helper for LF-05. */
export function rejectAiPromotionAttempt(
  actorId: string,
): LearningResult<void> {
  if (actorId === "ai") {
    return learningFailOne(
      "LEARNING_AI_ACTOR_FORBIDDEN",
      "AI cannot promote candidates",
    );
  }
  return learningOk(undefined);
}
