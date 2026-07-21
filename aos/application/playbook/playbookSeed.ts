export { getPlaybookSeedCatalog } from "../../domain/catalog/seeds/playbookEntrySeed";
import type { PlaybookEntryDetailDto, PlaybookEntryListItemDto } from "./dto/PlaybookDto";

export function toPlaybookListItem(detail: PlaybookEntryDetailDto): PlaybookEntryListItemDto {
  const {
    body: _body,
    checklist: _checklist,
    knowledgeReferences: _knowledgeReferences,
    relatedTemplates: _relatedTemplates,
    ...listItem
  } = detail;
  return listItem;
}
