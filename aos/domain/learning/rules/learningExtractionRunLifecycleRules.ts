import type {
  LearningExtractionRun,
  LearningExtractionRunStatus,
} from "../entities/learningExtractionRun";
import { isTerminalRunStatus } from "../entities/learningExtractionRun";
import type { LearningProvenance } from "../valueObjects/learningProvenance";
import { buildExtractionRunId } from "../valueObjects/learningIdentifiers";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";
import { createLearningProvenance, type CreateLearningProvenanceInput } from "../valueObjects/learningProvenance";

const LEGAL_RUN_TRANSITIONS: Record<
  LearningExtractionRunStatus,
  readonly LearningExtractionRunStatus[]
> = {
  pending: ["running", "failed"],
  running: ["completed", "partial", "failed"],
  completed: [],
  partial: ["running", "completed", "failed"],
  failed: ["running"],
};

export function canTransitionRunStatus(
  from: LearningExtractionRunStatus,
  to: LearningExtractionRunStatus,
): boolean {
  return LEGAL_RUN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertRunTransition(
  from: LearningExtractionRunStatus,
  to: LearningExtractionRunStatus,
): LearningResult<void> {
  if (from === to) return learningOk(undefined);
  if (isTerminalRunStatus(from) && from !== "failed") {
    return learningFailOne(
      "LEARNING_RUN_ILLEGAL_TRANSITION",
      `Cannot transition from terminal run status ${from}`,
    );
  }
  if (!canTransitionRunStatus(from, to)) {
    return learningFailOne(
      "LEARNING_RUN_ILLEGAL_TRANSITION",
      `Illegal run transition ${from} → ${to}`,
    );
  }
  return learningOk(undefined);
}

export interface CreateExtractionRunInput {
  companyId: string;
  engagementId: string;
  retrospectiveId: string;
  provenance: CreateLearningProvenanceInput;
}

export function createLearningExtractionRun(
  input: CreateExtractionRunInput,
): LearningResult<LearningExtractionRun> {
  const provenanceResult = createLearningProvenance(input.provenance);
  if (!provenanceResult.ok) return provenanceResult;

  const extractionRunId = buildExtractionRunId(
    input.companyId,
    input.engagementId,
    input.retrospectiveId,
  );

  return learningOk({
    extractionRunId,
    companyId: input.companyId,
    engagementId: input.engagementId,
    retrospectiveId: input.retrospectiveId,
    status: "pending",
    provenance: provenanceResult.value,
    candidateIds: [],
    idempotencyKey: extractionRunId,
  });
}

export function applyRunStatusTransition(
  run: LearningExtractionRun,
  to: LearningExtractionRunStatus,
  patch: {
    startedAt?: string;
    completedAt?: string;
    failureReason?: string;
    candidateIds?: readonly string[];
  } = {},
): LearningResult<LearningExtractionRun> {
  const check = assertRunTransition(run.status, to);
  if (!check.ok) return check;

  return learningOk({
    ...run,
    status: to,
    startedAt: patch.startedAt ?? run.startedAt,
    completedAt: patch.completedAt ?? run.completedAt,
    failureReason: patch.failureReason ?? run.failureReason,
    candidateIds: patch.candidateIds ?? run.candidateIds,
  });
}

export function validateRunProvenanceSnapshot(
  run: LearningExtractionRun,
  expected: LearningProvenance,
): LearningResult<void> {
  const keys: (keyof LearningProvenance)[] = [
    "requirementVersionId",
    "promptVersionId",
    "cursorSessionId",
    "evaluationId",
    "retrospectiveId",
  ];
  for (const key of keys) {
    if (run.provenance[key] !== expected[key]) {
      return learningFailOne(
        "LEARNING_PROVENANCE_INVALID",
        `Run provenance snapshot mismatch on ${key}`,
      );
    }
  }
  return learningOk(undefined);
}
