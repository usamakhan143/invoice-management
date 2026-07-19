import type { AgencyType } from "../../../constants/agencyType";

/** Confidence levels — frozen learning engine doc 11. */
export type KnowledgeConfidenceLevel =
  | "hypothesis"
  | "single_observation"
  | "validated"
  | "repeated"
  | "canonical";

/** Knowledge types — frozen domain model §06 / learning engine doc 02. */
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

export interface KnowledgeListItemDto {
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

export interface KnowledgeSourceReferenceDto {
  id: string;
  label: string;
  kind: "knowledge_record" | "evaluation" | "retrospective" | "engagement" | "adr";
}

export interface KnowledgeRelatedModuleDto {
  moduleId: string;
  moduleName: string;
}

export interface KnowledgeRelatedPromptDto {
  promptId: string;
  title: string;
}

export interface KnowledgeRelatedPatternDto {
  patternId: string;
  title: string;
}

export interface KnowledgeDetailDto extends KnowledgeListItemDto {
  body: string;
  learningOrigin: LearningOrigin;
  sourceReferences: readonly KnowledgeSourceReferenceDto[];
  relatedModules: readonly KnowledgeRelatedModuleDto[];
  relatedPrompts: readonly KnowledgeRelatedPromptDto[];
  relatedPatterns: readonly KnowledgeRelatedPatternDto[];
  aiSuggestedPatterns: readonly KnowledgeRelatedPatternDto[];
}

export interface ListKnowledgeQuery {
  search?: string;
  agencyType?: AgencyType;
}

export interface KnowledgeListDto {
  items: readonly KnowledgeListItemDto[];
  totalCount: number;
}
