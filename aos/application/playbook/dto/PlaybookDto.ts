import type { AgencyType } from "../../../constants/agencyType";
import type { DeliveryState } from "../../../constants/deliveryState";

export type PlaybookEntryType =
  | "agency_playbook"
  | "template"
  | "rubric"
  | "prompt_template"
  | "quality_standard"
  | "evaluation_template"
  | "best_practice"
  | "delivery_standard"
  | "knowledge_reference";

export interface PlaybookEntryListItemDto {
  entryId: string;
  title: string;
  entryType: PlaybookEntryType;
  lifecyclePhase?: DeliveryState;
  agencyTypes: readonly AgencyType[];
  version: string;
  summary: string;
  tags: readonly string[];
}

export interface PlaybookKnowledgeRefDto {
  patternId: string;
  title: string;
}

export interface PlaybookRelatedEntryDto {
  entryId: string;
  title: string;
}

export interface PlaybookEntryDetailDto extends PlaybookEntryListItemDto {
  body: string;
  checklist: readonly string[];
  knowledgeReferences: readonly PlaybookKnowledgeRefDto[];
  relatedTemplates: readonly PlaybookRelatedEntryDto[];
}

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
