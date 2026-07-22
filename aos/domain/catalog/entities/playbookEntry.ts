import type { AgencyType } from "../../../constants/agencyType";
import type { DeliveryState } from "../../../constants/deliveryState";
import type { LearningSourceRef } from "../../learning/valueObjects/learningSourceRef";

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

export interface PlaybookEntryListItem {
  entryId: string;
  title: string;
  entryType: PlaybookEntryType;
  lifecyclePhase?: DeliveryState;
  agencyTypes: readonly AgencyType[];
  version: string;
  summary: string;
  tags: readonly string[];
}

export interface PlaybookKnowledgeRef {
  patternId: string;
  title: string;
}

export interface PlaybookRelatedEntry {
  entryId: string;
  title: string;
}

export interface PlaybookEntry extends PlaybookEntryListItem {
  body: string;
  checklist: readonly string[];
  knowledgeReferences: readonly PlaybookKnowledgeRef[];
  relatedTemplates: readonly PlaybookRelatedEntry[];
  learningSource?: LearningSourceRef;
  supersedesEntryId?: string;
}
