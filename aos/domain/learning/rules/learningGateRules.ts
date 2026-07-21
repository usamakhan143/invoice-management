import type { LearningCandidateType } from "../entities/learningCandidate";
import type { GateEvaluation, GateStatus } from "../valueObjects/gateResult";
import { buildGateResult } from "../valueObjects/gateResult";
import { extractPromotableText, isRecognizedProposedContent } from "../valueObjects/proposedContent";
import type { LearningProvenance } from "../valueObjects/learningProvenance";
import type { AiRecommendationMetadata } from "../entities/learningCandidate";
import { isLearningCandidateType } from "../entities/learningCandidate";

/**
 * G-003 domain policy: deterministic pattern checks only.
 * Complete PII detection is application sanitization responsibility;
 * AI-assisted detection is future scope.
 */
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/;

export interface GateEvaluationInput {
  retrospectiveApproved: boolean;
  retrospectiveId: string;
  candidateType: string;
  provenance: LearningProvenance;
  promotableText: string;
  aiRecommendation?: AiRecommendationMetadata;
  evaluatedAt: number;
}

export function detectPromotablePii(text: string): string | null {
  if (EMAIL_PATTERN.test(text)) return "email_detected";
  if (PHONE_PATTERN.test(text)) return "phone_detected";
  return null;
}

/** G-001: Source retrospective exists and is closed (approved). */
export function evaluateGateG001(input: GateEvaluationInput): GateEvaluation {
  if (!input.retrospectiveApproved) {
    return {
      gateId: "G-001",
      status: "gate_blocked",
      reasonCode: "RETROSPECTIVE_NOT_CLOSED",
      message: "Retrospective must be approved/closed",
    };
  }
  if (input.provenance.retrospectiveId !== input.retrospectiveId) {
    return {
      gateId: "G-001",
      status: "gate_blocked",
      reasonCode: "RETROSPECTIVE_ID_MISMATCH",
      message: "Provenance retrospectiveId mismatch",
    };
  }
  return {
    gateId: "G-001",
    status: "gate_passed",
    reasonCode: "OK",
    message: "Retrospective approved",
  };
}

/** G-002: At least one grounded source artifact ID. */
export function evaluateGateG002(provenance: LearningProvenance): GateEvaluation {
  const grounded = [
    provenance.requirementVersionId,
    provenance.promptVersionId,
    provenance.cursorSessionId,
    provenance.evaluationId,
  ].filter((id) => id.trim().length > 0);

  if (grounded.length === 0) {
    return {
      gateId: "G-002",
      status: "gate_blocked",
      reasonCode: "NO_GROUNDED_ARTIFACT",
      message: "At least one grounded source artifact ID required",
    };
  }
  return {
    gateId: "G-002",
    status: "gate_passed",
    reasonCode: "OK",
    message: "Grounded artifacts present",
  };
}

/** G-003: No client PII in promotable text (deterministic domain policy). */
export function evaluateGateG003(promotableText: string): GateEvaluation {
  const pii = detectPromotablePii(promotableText);
  if (pii) {
    return {
      gateId: "G-003",
      status: "gate_blocked",
      reasonCode: pii,
      message: "Client PII detected in promotable text",
    };
  }
  return {
    gateId: "G-003",
    status: "gate_passed",
    reasonCode: "OK",
    message: "No deterministic PII patterns detected",
  };
}

/** G-004: AI recommendation requires model version metadata. */
export function evaluateGateG004(
  aiRecommendation?: AiRecommendationMetadata,
): GateEvaluation {
  if (!aiRecommendation) {
    return {
      gateId: "G-004",
      status: "gate_passed",
      reasonCode: "NOT_APPLICABLE",
      message: "No AI recommendation",
    };
  }
  if (
    !aiRecommendation.modelProvider?.trim() ||
    !aiRecommendation.modelId?.trim() ||
    !aiRecommendation.promptVersion?.trim()
  ) {
    return {
      gateId: "G-004",
      status: "gate_blocked",
      reasonCode: "AI_METADATA_MISSING",
      message: "AI recommendation requires model version metadata",
    };
  }
  return {
    gateId: "G-004",
    status: "gate_passed",
    reasonCode: "OK",
    message: "AI metadata present",
  };
}

/** G-005: Candidate type recognized. */
export function evaluateGateG005(candidateType: string): GateEvaluation {
  if (!isLearningCandidateType(candidateType)) {
    return {
      gateId: "G-005",
      status: "gate_blocked",
      reasonCode: "UNKNOWN_CANDIDATE_TYPE",
      message: `Unrecognized candidate type: ${candidateType}`,
    };
  }
  return {
    gateId: "G-005",
    status: "gate_passed",
    reasonCode: "OK",
    message: "Candidate type recognized",
  };
}

export interface EvaluateAllGatesInput {
  retrospectiveApproved: boolean;
  retrospectiveId: string;
  candidateType: LearningCandidateType;
  provenance: LearningProvenance;
  proposedContent: unknown;
  aiRecommendation?: AiRecommendationMetadata;
  evaluatedAt: number;
}

export function evaluateUniversalGates(input: EvaluateAllGatesInput) {
  if (!isRecognizedProposedContent(input.candidateType, input.proposedContent)) {
    const evaluations: GateEvaluation[] = [
      evaluateGateG001({
        retrospectiveApproved: input.retrospectiveApproved,
        retrospectiveId: input.retrospectiveId,
        candidateType: input.candidateType,
        provenance: input.provenance,
        promotableText: "",
        aiRecommendation: input.aiRecommendation,
        evaluatedAt: input.evaluatedAt,
      }),
      evaluateGateG002(input.provenance),
      {
        gateId: "G-005",
        status: "gate_blocked",
        reasonCode: "INVALID_PROPOSED_CONTENT",
        message: "Proposed content does not match candidate type",
      },
    ];
    return buildGateResult(evaluations, input.evaluatedAt);
  }

  const promotableText = extractPromotableText(
    input.candidateType,
    input.proposedContent,
  );

  const evaluations: GateEvaluation[] = [
    evaluateGateG001({
      retrospectiveApproved: input.retrospectiveApproved,
      retrospectiveId: input.retrospectiveId,
      candidateType: input.candidateType,
      provenance: input.provenance,
      promotableText,
      aiRecommendation: input.aiRecommendation,
      evaluatedAt: input.evaluatedAt,
    }),
    evaluateGateG002(input.provenance),
    evaluateGateG003(promotableText),
    evaluateGateG004(input.aiRecommendation),
    evaluateGateG005(input.candidateType),
  ];

  return buildGateResult(evaluations, input.evaluatedAt);
}

export function statusAfterGateResult(overallStatus: GateStatus) {
  switch (overallStatus) {
    case "gate_passed":
      return "pending_review" as const;
    case "gate_blocked":
      return "gate_blocked" as const;
    case "gate_deferred":
      return "gate_deferred" as const;
  }
}
