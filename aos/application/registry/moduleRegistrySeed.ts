export { getModuleRegistrySeedCatalog } from "../../domain/catalog/seeds/moduleRegistrySeed";
import type { ModuleRegistryDetailDto, ModuleRegistryListItemDto } from "./dto/ModuleRegistryDto";

export function toRegistryListItem(detail: ModuleRegistryDetailDto): ModuleRegistryListItemDto {
  const {
    usageHistory: _usageHistory,
    knowledgeLinks: _knowledgeLinks,
    locationReference: _locationReference,
    origin: _origin,
    ...listItem
  } = detail;
  return listItem;
}
