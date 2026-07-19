import type { ModuleRegistryListItemDto } from "./dto/ModuleRegistryDto";

const MIN_SEARCH_CHARS = 2;

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function searchRank(module: ModuleRegistryListItemDto, query: string): number | null {
  const q = normalizeSearch(query);
  if (!q) {
    return 0;
  }
  if (q.length < MIN_SEARCH_CHARS) {
    return null;
  }

  const id = module.moduleId.toLowerCase();
  const name = module.moduleName.toLowerCase();
  const description = module.description.toLowerCase();
  const tagBlob = module.tags.join(" ").toLowerCase();
  const agencyBlob = module.agencyTypes.join(" ").toLowerCase();

  if (id === q) {
    return 4;
  }
  if (name.startsWith(q)) {
    return 3;
  }
  if (
    name.includes(q) ||
    id.includes(q) ||
    description.includes(q) ||
    tagBlob.includes(q) ||
    agencyBlob.includes(q)
  ) {
    return 2;
  }
  return null;
}

export function filterAndRankRegistryModules(
  modules: readonly ModuleRegistryListItemDto[],
  search?: string,
): ModuleRegistryListItemDto[] {
  const trimmed = search?.trim() ?? "";
  if (!trimmed) {
    return [...modules];
  }
  if (trimmed.length < MIN_SEARCH_CHARS) {
    return [];
  }

  return modules
    .map((module) => ({ module, rank: searchRank(module, trimmed) }))
    .filter((entry): entry is { module: ModuleRegistryListItemDto; rank: number } => entry.rank !== null)
    .sort((a, b) => {
      if (b.rank !== a.rank) {
        return b.rank - a.rank;
      }
      return a.module.moduleName.localeCompare(b.module.moduleName);
    })
    .map((entry) => entry.module);
}

export { MIN_SEARCH_CHARS as REGISTRY_SEARCH_MIN_CHARS };
