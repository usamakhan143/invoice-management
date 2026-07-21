import type { AgencyType } from "../../../constants/agencyType";

export type {
  KnowledgeConfidenceLevel,
  KnowledgeListItem,
  KnowledgePattern,
  KnowledgePromotionStatus,
  KnowledgeRelatedModule,
  KnowledgeRelatedPattern,
  KnowledgeRelatedPrompt,
  KnowledgeSourceReference,
  KnowledgeType,
  LearningOrigin,
} from "../../../domain/catalog/entities/knowledgePattern";

import type { KnowledgeListItem, KnowledgePattern } from "../../../domain/catalog/entities/knowledgePattern";

export type KnowledgeDetailDto = KnowledgePattern;
export type KnowledgeListItemDto = KnowledgeListItem;
export type KnowledgeSourceReferenceDto = KnowledgePattern["sourceReferences"][number];
export type KnowledgeRelatedModuleDto = KnowledgePattern["relatedModules"][number];
export type KnowledgeRelatedPromptDto = KnowledgePattern["relatedPrompts"][number];
export type KnowledgeRelatedPatternDto = KnowledgePattern["relatedPatterns"][number];

export interface ListKnowledgeQuery {
  search?: string;
  agencyType?: AgencyType;
}

export interface KnowledgeListDto {
  items: readonly KnowledgeListItemDto[];
  totalCount: number;
}
