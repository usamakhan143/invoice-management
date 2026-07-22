import type { LearningCandidate } from "../entities/learningCandidate";
import type { GateEvaluation } from "../valueObjects/gateResult";
import {
  detectPromotablePii,
  evaluateGateG003,
} from "./learningGateRules";
import {
  extractPromotableText,
  type KnowledgePatternProposedContent,
  type ModuleProposedContent,
  type PromptImprovementProposedContent,
  type PlaybookImprovementProposedContent,
  type EvaluationInsightProposedContent,
} from "../valueObjects/proposedContent";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";

const PROMPT_DIFF_BUDGET_CHARS = 10_000;

export interface PromotionGateContext {
  readonly existingKnowledgeTitles: readonly string[];
  readonly existingModuleNames: readonly string[];
  readonly existingPlaybookTitles: readonly string[];
}

function gatePassed(gateId: string, message: string): GateEvaluation {
  return { gateId, status: "gate_passed", reasonCode: "OK", message };
}

function gateBlocked(
  gateId: string,
  reasonCode: string,
  message: string,
): GateEvaluation {
  return { gateId, status: "gate_blocked", reasonCode, message };
}

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function hasDuplicateTitle(
  title: string,
  existing: readonly string[],
): boolean {
  const needle = normalized(title);
  return existing.some((item) => normalized(item) === needle);
}

/** GK-001: Not client_preference type — frozen types exclude client_preference. */
export function evaluateGateGk001(): GateEvaluation {
  return gatePassed("GK-001", "Candidate type is promotable to knowledge");
}

/** GK-002: Confidence >= validated for promotion. */
export function evaluateGateGk002(
  candidate: LearningCandidate,
): GateEvaluation {
  const org = candidate.confidence.organizationalConfidence;
  if (org !== "validated" && org !== "proven") {
    return gateBlocked(
      "GK-002",
      "CONFIDENCE_NOT_VALIDATED",
      "Organizational confidence must be validated before knowledge promotion",
    );
  }
  return gatePassed("GK-002", "Validated confidence for promotion");
}

/** GK-003: Anonymization scan pass (reuses G-003 policy). */
export function evaluateGateGk003(candidate: LearningCandidate): GateEvaluation {
  const text = extractPromotableText(
    candidate.candidateType,
    candidate.proposedContent,
  );
  return evaluateGateG003(text);
}

/** GK-004: No contradicting active pattern without supersession plan. */
export function evaluateGateGk004(
  candidate: LearningCandidate,
  context: PromotionGateContext,
): GateEvaluation {
  const content = candidate.proposedContent as KnowledgePatternProposedContent;
  const title = content.patternName || candidate.title;
  if (
    hasDuplicateTitle(title, context.existingKnowledgeTitles) &&
    candidate.promotionTarget.expectedVersionStrategy !== "supersede" &&
    !candidate.promotionTarget.targetId
  ) {
    return gateBlocked(
      "GK-004",
      "DUPLICATE_ACTIVE_PATTERN",
      "Duplicate active pattern requires supersession strategy",
    );
  }
  return gatePassed("GK-004", "No unresolved pattern contradiction");
}

/** GK-005: >=1 supporting evaluation or knowledge link. */
export function evaluateGateGk005(candidate: LearningCandidate): GateEvaluation {
  if (!candidate.provenance.evaluationId.trim()) {
    return gateBlocked(
      "GK-005",
      "MISSING_SUPPORTING_EVIDENCE",
      "Knowledge promotion requires grounded evaluation ID",
    );
  }
  return gatePassed("GK-005", "Supporting evaluation link present");
}

/** GM-001: Evaluation pass for extracted code. */
export function evaluateGateGm001(candidate: LearningCandidate): GateEvaluation {
  if (!candidate.provenance.evaluationId.trim()) {
    return gateBlocked(
      "GM-001",
      "EVALUATION_MISSING",
      "Module promotion requires evaluation evidence",
    );
  }
  return gatePassed("GM-001", "Evaluation evidence present");
}

/** GM-002: Gap documented in reuse assessment. */
export function evaluateGateGm002(candidate: LearningCandidate): GateEvaluation {
  const content = candidate.proposedContent as ModuleProposedContent;
  if (!content.gapRationale?.trim()) {
    return gateBlocked(
      "GM-002",
      "GAP_NOT_DOCUMENTED",
      "Module gap rationale required",
    );
  }
  return gatePassed("GM-002", "Reuse gap documented");
}

/** GM-003: Sidecar law / no ERP duplication check. */
export function evaluateGateGm003(candidate: LearningCandidate): GateEvaluation {
  const content = candidate.proposedContent as ModuleProposedContent;
  if (!content.sidecarComplianceNotes?.trim()) {
    return gateBlocked(
      "GM-003",
      "SIDECAR_COMPLIANCE_MISSING",
      "Sidecar compliance notes required",
    );
  }
  return gatePassed("GM-003", "Sidecar compliance documented");
}

/** GM-004: No duplicate active registry entry. */
export function evaluateGateGm004(
  candidate: LearningCandidate,
  context: PromotionGateContext,
): GateEvaluation {
  const content = candidate.proposedContent as ModuleProposedContent;
  if (
    content.promotionAction === "new_module" &&
    hasDuplicateTitle(content.moduleName, context.existingModuleNames)
  ) {
    return gateBlocked(
      "GM-004",
      "DUPLICATE_MODULE",
      "Duplicate active module registry entry",
    );
  }
  return gatePassed("GM-004", "No duplicate module entry");
}

/** GM-005: Technical reviewer sign-off for new_module (human approval satisfies). */
export function evaluateGateGm005(candidate: LearningCandidate): GateEvaluation {
  const content = candidate.proposedContent as ModuleProposedContent;
  if (content.promotionAction === "new_module" && !candidate.approval) {
    return gateBlocked(
      "GM-005",
      "TECH_REVIEWER_SIGNOFF_REQUIRED",
      "New module promotion requires human approval",
    );
  }
  return gatePassed("GM-005", "Human approval satisfies technical review");
}

/** GP-001: >=2 eval passes OR validated fix for failure cluster. */
export function evaluateGateGp001(candidate: LearningCandidate): GateEvaluation {
  const content = candidate.proposedContent as PromptImprovementProposedContent;
  if (
    !candidate.provenance.evaluationId.trim() &&
    !content.failureClusterRef?.trim()
  ) {
    return gateBlocked(
      "GP-001",
      "INSUFFICIENT_EVAL_EVIDENCE",
      "Prompt promotion requires evaluation or failure cluster reference",
    );
  }
  return gatePassed("GP-001", "Prompt evaluation evidence present");
}

/** GP-002: Exemplar anonymized. */
export function evaluateGateGp002(candidate: LearningCandidate): GateEvaluation {
  const content = candidate.proposedContent as PromptImprovementProposedContent;
  const pii = detectPromotablePii(content.exemplarAnonymized ?? "");
  if (pii) {
    return gateBlocked("GP-002", pii, "Exemplar must be anonymized");
  }
  return gatePassed("GP-002", "Exemplar anonymized");
}

/** GP-003: Template diff size within change budget. */
export function evaluateGateGp003(candidate: LearningCandidate): GateEvaluation {
  const content = candidate.proposedContent as PromptImprovementProposedContent;
  const diff = content.proposedTemplateDiff ?? "";
  if (diff.length > PROMPT_DIFF_BUDGET_CHARS) {
    return gateBlocked(
      "GP-003",
      "DIFF_BUDGET_EXCEEDED",
      "Prompt template diff exceeds change budget",
    );
  }
  return gatePassed("GP-003", "Template diff within budget");
}

/** GP-004: No rubric conflict without version bump. */
export function evaluateGateGp004(candidate: LearningCandidate): GateEvaluation {
  if (
    candidate.promotionTarget.expectedVersionStrategy === "annotate" &&
    candidate.promotionTarget.targetId
  ) {
    return gateBlocked(
      "GP-004",
      "RUBRIC_CONFLICT_REQUIRES_VERSION_BUMP",
      "Material prompt changes require new_version or supersede",
    );
  }
  return gatePassed("GP-004", "No rubric conflict");
}

/** GB-001: Process lesson generalizable. */
export function evaluateGateGb001(candidate: LearningCandidate): GateEvaluation {
  const content = candidate.proposedContent as PlaybookImprovementProposedContent;
  if (!content.proposedSectionBody?.trim() || content.proposedSectionBody.length < 20) {
    return gateBlocked(
      "GB-001",
      "NOT_GENERALIZABLE",
      "Playbook lesson must be generalizable content",
    );
  }
  return gatePassed("GB-001", "Playbook lesson generalizable");
}

/** GB-002: ADR compatibility check pass — no ADR store in V1; approval satisfies. */
export function evaluateGateGb002(candidate: LearningCandidate): GateEvaluation {
  if (!candidate.approval) {
    return gateBlocked(
      "GB-002",
      "ADR_COMPATIBILITY_REVIEW_REQUIRED",
      "Playbook promotion requires human approval",
    );
  }
  return gatePassed("GB-002", "Human approval satisfies ADR compatibility review");
}

/** GB-003: Linked retrospective lesson ID. */
export function evaluateGateGb003(candidate: LearningCandidate): GateEvaluation {
  if (!candidate.provenance.retrospectiveId.trim()) {
    return gateBlocked(
      "GB-003",
      "RETROSPECTIVE_LINK_MISSING",
      "Playbook promotion requires retrospective link",
    );
  }
  return gatePassed("GB-003", "Retrospective link present");
}

/** GE-001: Pattern appears in >=2 evaluations OR single critical failure. */
export function evaluateGateGe001(candidate: LearningCandidate): GateEvaluation {
  const content = candidate.proposedContent as EvaluationInsightProposedContent;
  if (
    !candidate.provenance.evaluationId.trim() &&
    content.insightType !== "failure_pattern"
  ) {
    return gateBlocked(
      "GE-001",
      "INSUFFICIENT_EVAL_PATTERN",
      "Evaluation insight requires evaluation evidence",
    );
  }
  return gatePassed("GE-001", "Evaluation insight evidence sufficient");
}

/** GE-002: Root cause categorized. */
export function evaluateGateGe002(candidate: LearningCandidate): GateEvaluation {
  const content = candidate.proposedContent as EvaluationInsightProposedContent;
  if (!content.insightType?.trim()) {
    return gateBlocked(
      "GE-002",
      "ROOT_CAUSE_NOT_CATEGORIZED",
      "Evaluation insight type required",
    );
  }
  return gatePassed("GE-002", "Root cause categorized");
}

export function evaluateTargetPromotionGates(
  candidate: LearningCandidate,
  context: PromotionGateContext,
): readonly GateEvaluation[] {
  switch (candidate.candidateType) {
    case "knowledge_pattern":
      return [
        evaluateGateGk001(),
        evaluateGateGk002(candidate),
        evaluateGateGk003(candidate),
        evaluateGateGk004(candidate, context),
        evaluateGateGk005(candidate),
      ];
    case "module":
      return [
        evaluateGateGm001(candidate),
        evaluateGateGm002(candidate),
        evaluateGateGm003(candidate),
        evaluateGateGm004(candidate, context),
        evaluateGateGm005(candidate),
      ];
    case "prompt_improvement":
      return [
        evaluateGateGp001(candidate),
        evaluateGateGp002(candidate),
        evaluateGateGp003(candidate),
        evaluateGateGp004(candidate),
      ];
    case "playbook_improvement":
      return [
        evaluateGateGb001(candidate),
        evaluateGateGb002(candidate),
        evaluateGateGb003(candidate),
      ];
    case "evaluation_insight":
      return [
        evaluateGateGe001(candidate),
        evaluateGateGe002(candidate),
      ];
    default:
      return [
        gateBlocked("G-005", "UNKNOWN_CANDIDATE_TYPE", "Unrecognized candidate type"),
      ];
  }
}

export function assertTargetPromotionGatesPassed(
  candidate: LearningCandidate,
  context: PromotionGateContext,
): LearningResult<readonly GateEvaluation[]> {
  const evaluations = evaluateTargetPromotionGates(candidate, context);
  const blocked = evaluations.find((gate) => gate.status === "gate_blocked");
  if (blocked) {
    return learningFailOne(
      "LEARNING_PROMOTION_GATE_BLOCKED",
      `${blocked.gateId}: ${blocked.message}`,
    );
  }
  return learningOk(evaluations);
}
