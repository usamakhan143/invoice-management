export interface KnowledgePatternProposedContent {
  patternName: string;
  category: string;
  description: string;
  applicabilityTags: string[];
  antiPatternNotes?: string;
  generalizationNotes: string;
}

export interface ModuleProposedContent {
  moduleName: string;
  description: string;
  capabilityTags: string[];
  gapRationale: string;
  sidecarComplianceNotes: string;
  promotionAction: "new_module" | "annotate" | "deprecate_hint";
  targetModuleId?: string;
}

export interface PromptImprovementProposedContent {
  targetTemplateId?: string;
  changeSummary: string;
  proposedTemplateDiff: string;
  failureClusterRef?: string;
  exemplarAnonymized: string;
}

export interface PlaybookImprovementProposedContent {
  targetSectionId?: string;
  sectionTitle: string;
  proposedSectionBody: string;
  changeType: "add" | "amend" | "clarify";
}

export interface EvaluationInsightProposedContent {
  insightType: "rubric_calibration" | "constraint_addition" | "failure_pattern";
  description: string;
  proposedRubricChange?: Record<string, unknown>;
  linkedEvaluationOutcome: string;
}

export type LearningProposedContent =
  | KnowledgePatternProposedContent
  | ModuleProposedContent
  | PromptImprovementProposedContent
  | PlaybookImprovementProposedContent
  | EvaluationInsightProposedContent;

export function isRecognizedProposedContent(
  candidateType: string,
  content: unknown,
): content is LearningProposedContent {
  if (!content || typeof content !== "object") return false;
  const record = content as Record<string, unknown>;
  switch (candidateType) {
    case "knowledge_pattern":
      return (
        typeof record.patternName === "string" &&
        typeof record.generalizationNotes === "string"
      );
    case "module":
      return (
        typeof record.moduleName === "string" &&
        typeof record.promotionAction === "string"
      );
    case "prompt_improvement":
      return (
        typeof record.changeSummary === "string" &&
        typeof record.exemplarAnonymized === "string"
      );
    case "playbook_improvement":
      return (
        typeof record.sectionTitle === "string" &&
        typeof record.changeType === "string"
      );
    case "evaluation_insight":
      return (
        typeof record.insightType === "string" &&
        typeof record.linkedEvaluationOutcome === "string"
      );
    default:
      return false;
  }
}

/** Collect promotable text fields for G-003 PII scan. */
export function extractPromotableText(
  candidateType: string,
  content: LearningProposedContent,
): string {
  switch (candidateType) {
    case "knowledge_pattern": {
      const c = content as KnowledgePatternProposedContent;
      return [c.patternName, c.description, c.generalizationNotes, c.antiPatternNotes]
        .filter(Boolean)
        .join(" ");
    }
    case "module": {
      const c = content as ModuleProposedContent;
      return [c.moduleName, c.description, c.gapRationale].join(" ");
    }
    case "prompt_improvement": {
      const c = content as PromptImprovementProposedContent;
      return [c.changeSummary, c.exemplarAnonymized, c.proposedTemplateDiff].join(" ");
    }
    case "playbook_improvement": {
      const c = content as PlaybookImprovementProposedContent;
      return [c.sectionTitle, c.proposedSectionBody].join(" ");
    }
    case "evaluation_insight": {
      const c = content as EvaluationInsightProposedContent;
      return [c.description, c.linkedEvaluationOutcome].join(" ");
    }
    default:
      return "";
  }
}
