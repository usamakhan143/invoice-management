import type { AgencyType } from "../../../constants/agencyType";
import type { LearningSourceRef } from "../../learning/valueObjects/learningSourceRef";

export type KnowledgeConfidenceLevel =
  | "hypothesis"
  | "single_observation"
  | "validated"
  | "repeated"
  | "canonical";

export type KnowledgeType =
  | "lesson"
  | "observation"
  | "failure_pattern"
  | "success_pattern"
  | "process_note";

export type KnowledgePromotionStatus =
  | "record_draft"
  | "record_active"
  | "pattern_proposed"
  | "pattern_active"
  | "pattern_stale"
  | "pattern_deprecated"
  | "not_promotable";

export type LearningOrigin =
  | "retrospective"
  | "evaluation"
  | "reuse_assessment"
  | "bootstrap"
  | "manual";

export interface KnowledgeListItem {
  patternId: string;
  title: string;
  primaryDomain: string;
  agencyTypes: readonly AgencyType[];
  knowledgeType: KnowledgeType;
  confidence: KnowledgeConfidenceLevel;
  promotionStatus: KnowledgePromotionStatus;
  patternVersion: number;
  tags: readonly string[];
  summary: string;
}

export interface KnowledgeSourceReference {
  id: string;
  label: string;
  kind: "knowledge_record" | "evaluation" | "retrospective" | "engagement" | "adr";
}

export interface KnowledgeRelatedModule {
  moduleId: string;
  moduleName: string;
}

export interface KnowledgeRelatedPrompt {
  promptId: string;
  title: string;
}

export interface KnowledgeRelatedPattern {
  patternId: string;
  title: string;
}

export interface KnowledgePattern extends KnowledgeListItem {
  body: string;
  learningOrigin: LearningOrigin;
  sourceReferences: readonly KnowledgeSourceReference[];
  relatedModules: readonly KnowledgeRelatedModule[];
  relatedPrompts: readonly KnowledgeRelatedPrompt[];
  relatedPatterns: readonly KnowledgeRelatedPattern[];
  aiSuggestedPatterns: readonly KnowledgeRelatedPattern[];
  /** Backward trace when promoted from Learning Engine — LF-13. */
  learningSource?: LearningSourceRef;
  /** Non-destructive supersession link — LF-08. */
  supersedesPatternId?: string;
}
