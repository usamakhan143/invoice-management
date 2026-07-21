export { getKnowledgeSeedCatalog } from "../../domain/catalog/seeds/knowledgePatternSeed";
import type { KnowledgeDetailDto, KnowledgeListItemDto } from "./dto/KnowledgeDto";

export function toKnowledgeListItem(detail: KnowledgeDetailDto): KnowledgeListItemDto {
  const {
    body: _body,
    learningOrigin: _learningOrigin,
    sourceReferences: _sourceReferences,
    relatedModules: _relatedModules,
    relatedPrompts: _relatedPrompts,
    relatedPatterns: _relatedPatterns,
    aiSuggestedPatterns: _aiSuggestedPatterns,
    ...listItem
  } = detail;
  return listItem;
}
