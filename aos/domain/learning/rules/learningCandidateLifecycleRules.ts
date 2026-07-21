import type {
  LearningCandidate,
  LearningCandidateStatus,
} from "../entities/learningCandidate";
import { isTerminalCandidateStatus } from "../entities/learningCandidate";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";

const LEGAL_TRANSITIONS: Record<
  LearningCandidateStatus,
  readonly LearningCandidateStatus[]
> = {
  extracted: ["gate_blocked", "gate_deferred", "pending_review", "superseded"],
  gate_blocked: [],
  gate_deferred: ["pending_review", "superseded"],
  pending_review: ["approved", "rejected", "gate_deferred", "superseded"],
  approved: ["promoted", "promotion_failed", "superseded"],
  rejected: [],
  promoted: [],
  promotion_failed: ["promoted", "rejected"],
  superseded: [],
};

export function canTransitionCandidateStatus(
  from: LearningCandidateStatus,
  to: LearningCandidateStatus,
): boolean {
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCandidateTransition(
  from: LearningCandidateStatus,
  to: LearningCandidateStatus,
): LearningResult<void> {
  if (from === to) {
    return learningOk(undefined);
  }
  if (isTerminalCandidateStatus(from) && from !== "promotion_failed") {
    return learningFailOne(
      "LEARNING_ALREADY_TERMINAL",
      `Cannot transition from terminal status ${from}`,
    );
  }
  if (!canTransitionCandidateStatus(from, to)) {
    return learningFailOne(
      "LEARNING_ILLEGAL_TRANSITION",
      `Illegal transition ${from} → ${to}`,
    );
  }
  return learningOk(undefined);
}

export function applyCandidateStatusTransition(
  candidate: LearningCandidate,
  to: LearningCandidateStatus,
  updatedAt: string,
): LearningResult<LearningCandidate> {
  const check = assertCandidateTransition(candidate.status, to);
  if (!check.ok) return check;

  return learningOk({
    ...candidate,
    status: to,
    version: candidate.version + 1,
    updatedAt,
  });
}

export function assertNotGateBlockedForReview(
  candidate: LearningCandidate,
): LearningResult<void> {
  if (candidate.status === "gate_blocked") {
    return learningFailOne(
      "LEARNING_GATE_BLOCKED",
      "gate_blocked candidates cannot enter review queue",
    );
  }
  return learningOk(undefined);
}
