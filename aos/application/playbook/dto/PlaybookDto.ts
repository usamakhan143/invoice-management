import type { AgencyType } from "../../../constants/agencyType";
import type { DeliveryState } from "../../../constants/deliveryState";

export type {
  PlaybookEntry,
  PlaybookEntryListItem,
  PlaybookEntryType,
  PlaybookKnowledgeRef,
  PlaybookRelatedEntry,
} from "../../../domain/catalog/entities/playbookEntry";

import type { PlaybookEntry, PlaybookEntryListItem, PlaybookEntryType } from "../../../domain/catalog/entities/playbookEntry";

export type PlaybookEntryDetailDto = PlaybookEntry;
export type PlaybookEntryListItemDto = PlaybookEntryListItem;
export type PlaybookKnowledgeRefDto = PlaybookEntry["knowledgeReferences"][number];
export type PlaybookRelatedEntryDto = PlaybookEntry["relatedTemplates"][number];

export interface ListPlaybookQuery {
  search?: string;
  entryType?: PlaybookEntryType;
  lifecyclePhase?: DeliveryState;
  agencyType?: AgencyType;
}

export interface PlaybookListDto {
  items: readonly PlaybookEntryListItemDto[];
  totalCount: number;
}

export const PLAYBOOK_ENTRY_TYPE_LABELS: Record<PlaybookEntryType, string> = {
  agency_playbook: "Agency Playbook",
  template: "Template",
  rubric: "Rubric",
  prompt_template: "Prompt Template",
  quality_standard: "Quality Standard",
  evaluation_template: "Evaluation Template",
  best_practice: "Best Practice",
  delivery_standard: "Reusable Delivery Standard",
  knowledge_reference: "Knowledge Reference",
};
