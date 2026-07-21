import type { ModuleRegistryRepository } from "../../contracts/ModuleRegistryRepository";
import type { AosReadScope } from "../types";
import type {
  ListModuleRegistryQuery,
  ModuleRegistryDetailDto,
  ModuleRegistryListDto,
} from "./dto/ModuleRegistryDto";
import { filterAndRankRegistryModules } from "./registrySearch";
import { toRegistryListItem } from "./moduleRegistrySeed";

export interface ModuleRegistryApplicationServiceDeps {
  repository: ModuleRegistryRepository;
}

export class ModuleRegistryApplicationService {
  private readonly repository: ModuleRegistryRepository;

  constructor(deps: ModuleRegistryApplicationServiceDeps) {
    this.repository = deps.repository;
  }

  async listModules(
    scope: AosReadScope,
    query: ListModuleRegistryQuery = {},
  ): Promise<ModuleRegistryListDto> {
    const catalog = await this.repository.listAll(scope);
    let items = catalog.map(toRegistryListItem);

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
    return this.repository.findById(scope, moduleId);
  }
}
