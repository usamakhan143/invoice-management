import type { AgencyType } from "../../constants/agencyType";
import type { ModuleType } from "../../constants/moduleType";

/** Registry catalog status — frozen search doc §26 filter values. */
export type ModuleRegistryCatalogStatus = "stable" | "experimental" | "deprecated";

export interface ModuleRegistryListItemDto {
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

export interface ModuleRegistryUsageRowDto {
  engagementId: string;
  engagementTitle: string;
  usedAt: number;
  versionUsed: string;
}

export interface ModuleRegistryKnowledgeLinkDto {
  patternId: string;
  title: string;
  scope: string;
}

export interface ModuleRegistryDetailDto extends ModuleRegistryListItemDto {
  locationReference: string;
  origin: string;
  usageHistory: readonly ModuleRegistryUsageRowDto[];
  knowledgeLinks: readonly ModuleRegistryKnowledgeLinkDto[];
}

export interface ListModuleRegistryQuery {
  search?: string;
  agencyType?: AgencyType;
  status?: ModuleRegistryCatalogStatus;
}

export interface ModuleRegistryListDto {
  items: readonly ModuleRegistryListItemDto[];
  totalCount: number;
}
