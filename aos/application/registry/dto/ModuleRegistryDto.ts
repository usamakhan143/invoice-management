import type { AgencyType } from "../../constants/agencyType";
import type { ModuleRegistryCatalogStatus } from "../../../domain/catalog/entities/moduleRegistry";

export type {
  ModuleRegistryCatalogStatus,
  ModuleRegistryEntry,
  ModuleRegistryKnowledgeLink,
  ModuleRegistryListItem,
  ModuleRegistryUsageRow,
} from "../../../domain/catalog/entities/moduleRegistry";

import type {
  ModuleRegistryEntry,
  ModuleRegistryListItem,
} from "../../../domain/catalog/entities/moduleRegistry";

/** Preserved for application API stability — alias of domain read model. */
export type ModuleRegistryDetailDto = ModuleRegistryEntry;
export type ModuleRegistryListItemDto = ModuleRegistryListItem;
export type ModuleRegistryUsageRowDto = ModuleRegistryEntry["usageHistory"][number];
export type ModuleRegistryKnowledgeLinkDto = ModuleRegistryEntry["knowledgeLinks"][number];

export interface ListModuleRegistryQuery {
  search?: string;
  agencyType?: AgencyType;
  status?: ModuleRegistryCatalogStatus;
}

export interface ModuleRegistryListDto {
  items: readonly ModuleRegistryListItemDto[];
  totalCount: number;
}
