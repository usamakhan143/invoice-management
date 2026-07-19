import type { AosReadScope } from "../types";
import type {
  ListModuleRegistryQuery,
  ModuleRegistryDetailDto,
  ModuleRegistryListDto,
} from "./dto/ModuleRegistryDto";
import { filterAndRankRegistryModules } from "./registrySearch";
import { getModuleRegistrySeedCatalog, toRegistryListItem } from "./moduleRegistrySeed";

/** Phase 1A registry catalog — in-memory seed; no Firestore. */
export class ModuleRegistryApplicationService {
  private catalogForCompany(_scope: AosReadScope): readonly ModuleRegistryDetailDto[] {
    return getModuleRegistrySeedCatalog();
  }

  async listModules(
    scope: AosReadScope,
    query: ListModuleRegistryQuery = {},
  ): Promise<ModuleRegistryListDto> {
    let items = this.catalogForCompany(scope).map(toRegistryListItem);

    if (query.agencyType) {
      items = items.filter((item) => item.agencyTypes.includes(query.agencyType!));
    }
    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }

    items = filterAndRankRegistryModules(items, query.search);

    return { items, totalCount: items.length };
  }

  async getModule(
    scope: AosReadScope,
    moduleId: string,
  ): Promise<ModuleRegistryDetailDto | null> {
    return this.catalogForCompany(scope).find((item) => item.moduleId === moduleId) ?? null;
  }
}
