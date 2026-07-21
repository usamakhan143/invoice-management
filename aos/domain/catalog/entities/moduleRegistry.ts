import type { AgencyType } from "../../../constants/agencyType";
import type { ModuleType } from "../../../constants/moduleType";

export type ModuleRegistryCatalogStatus = "stable" | "experimental" | "deprecated";

export interface ModuleRegistryListItem {
  moduleId: string;
  moduleName: string;
  moduleType: ModuleType;
  agencyTypes: readonly AgencyType[];
  status: ModuleRegistryCatalogStatus;
  version: string;
  reuseCount: number;
  qualityScore: number;
  tags: readonly string[];
  description: string;
}

export interface ModuleRegistryUsageRow {
  engagementId: string;
  engagementTitle: string;
  usedAt: number;
  versionUsed: string;
}

export interface ModuleRegistryKnowledgeLink {
  patternId: string;
  title: string;
  scope: string;
}

export interface ModuleRegistryEntry extends ModuleRegistryListItem {
  locationReference: string;
  origin: string;
  usageHistory: readonly ModuleRegistryUsageRow[];
  knowledgeLinks: readonly ModuleRegistryKnowledgeLink[];
}
