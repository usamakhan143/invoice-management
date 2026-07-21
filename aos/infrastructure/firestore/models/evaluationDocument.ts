import type {
  Evaluation,
  EvaluationDraft,
} from "../../../domain/evaluation/entities/evaluation";
import type firebase from "firebase/compat/app";
import { deepOmitUndefinedFields } from "../documentPayload";
import { epochMsToTimestamp, requireTimestampMs } from "../timestamp";

export interface EvaluationDocument {
  companyId: string;
  engagementId: string;
  cursorSessionId: string;
  promptVersionId: string;
  requirementVersionId: string;
  rubricVersionId: string;
  rubricSnapshot: Evaluation["rubricSnapshot"] | EvaluationDraft["rubricSnapshot"];
  status: Evaluation["status"] | EvaluationDraft["status"];
  scorePercent: number;
  passed: boolean;
  criteria: Evaluation["criteria"] | EvaluationDraft["criteria"];
  createdAt: firebase.firestore.Timestamp;
  confirmedAt?: firebase.firestore.Timestamp;
  confirmedByUserId?: string;
  overrideReason?: string;
  amendsEvaluationId?: string;
}

export function evaluationToFirestore(
  evaluation: Evaluation | EvaluationDraft,
): EvaluationDocument {
  return deepOmitUndefinedFields({
    companyId: evaluation.companyId,
    engagementId: evaluation.engagementId,
    cursorSessionId: evaluation.cursorSessionId,
    promptVersionId: evaluation.promptVersionId,
    requirementVersionId: evaluation.requirementVersionId,
    rubricVersionId: evaluation.rubricVersionId,
    rubricSnapshot: {
      rubricVersionId: evaluation.rubricSnapshot.rubricVersionId,
      name: evaluation.rubricSnapshot.name,
      criteriaLabels: [...evaluation.rubricSnapshot.criteriaLabels],
    },
    status: evaluation.status,
    scorePercent: evaluation.scorePercent,
    passed: evaluation.passed,
    criteria: evaluation.criteria.map((c) => ({ ...c })),
    createdAt: epochMsToTimestamp(evaluation.createdAt),
    confirmedAt:
      evaluation.status !== "draft"
        ? epochMsToTimestamp((evaluation as Evaluation).confirmedAt)
        : undefined,
    confirmedByUserId:
      evaluation.status !== "draft" ? (evaluation as Evaluation).confirmedByUserId : undefined,
    overrideReason:
      evaluation.status === "overridden" ? (evaluation as Evaluation).overrideReason : undefined,
    amendsEvaluationId: evaluation.amendsEvaluationId,
  }) as EvaluationDocument;
}

export function evaluationFromFirestore(
  id: string,
  data: firebase.firestore.DocumentData | undefined,
): Evaluation | EvaluationDraft | null {
  if (!data || typeof data.companyId !== "string") return null;
  const createdAt = requireTimestampMs(data.createdAt, "createdAt");
  if (createdAt === null) return null;

  const rubricSnapshot = data.rubricSnapshot as EvaluationDocument["rubricSnapshot"] | undefined;
  if (!rubricSnapshot || typeof rubricSnapshot.name !== "string") return null;

  const base = {
    id,
    companyId: data.companyId,
    engagementId: String(data.engagementId ?? ""),
    cursorSessionId: String(data.cursorSessionId ?? ""),
    promptVersionId: String(data.promptVersionId ?? ""),
    requirementVersionId: String(data.requirementVersionId ?? ""),
    rubricVersionId: String(data.rubricVersionId ?? ""),
    rubricSnapshot: {
      rubricVersionId: String(rubricSnapshot.rubricVersionId ?? ""),
      name: rubricSnapshot.name,
      criteriaLabels: Array.isArray(rubricSnapshot.criteriaLabels)
        ? rubricSnapshot.criteriaLabels.map(String)
        : [],
    },
    scorePercent: Number(data.scorePercent ?? 0),
    passed: Boolean(data.passed),
    criteria: Array.isArray(data.criteria) ? data.criteria.map((c) => ({ ...c })) : [],
    createdAt,
    amendsEvaluationId:
      typeof data.amendsEvaluationId === "string" ? data.amendsEvaluationId : undefined,
  };

  if (data.status === "draft") {
    return { ...base, status: "draft" as const };
  }

  const confirmedAt = requireTimestampMs(data.confirmedAt, "confirmedAt");
  if (confirmedAt === null) return null;

  return {
    ...base,
    status: data.status as "confirmed" | "overridden",
    confirmedAt,
    confirmedByUserId: String(data.confirmedByUserId ?? ""),
    overrideReason: typeof data.overrideReason === "string" ? data.overrideReason : undefined,
  };
}

export function isEvaluationFinalizedStatus(
  status: EvaluationDocument["status"],
): boolean {
  return status === "confirmed" || status === "overridden";
}
