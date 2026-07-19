import type { KnowledgeListItemDto } from "./dto/KnowledgeDto";

const MIN_SEARCH_CHARS = 2;

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function searchRank(item: KnowledgeListItemDto, query: string): number | null {
  const q = normalizeSearch(query);
  if (!q) {
    return 0;
  }
  if (q.length < MIN_SEARCH_CHARS) {
    return null;
  }

  const id = item.patternId.toLowerCase();
  const title = item.title.toLowerCase();
  const body = item.summary.toLowerCase();
  const tagBlob = item.tags.join(" ").toLowerCase();
  const agencyBlob = item.agencyTypes.join(" ").toLowerCase();
  const domain = item.primaryDomain.toLowerCase();

  if (id === q) {
    return 4;
  }
  if (title.startsWith(q)) {
    return 3;
  }
  if (
    title.includes(q) ||
    id.includes(q) ||
    body.includes(q) ||
    tagBlob.includes(q) ||
    agencyBlob.includes(q) ||
    domain.includes(q)
  ) {
    return 2;
  }
  return null;
}

export function filterAndRankKnowledgeItems(
  items: readonly KnowledgeListItemDto[],
  search?: string,
): KnowledgeListItemDto[] {
  const trimmed = search?.trim() ?? "";
  if (!trimmed) {
    return [...items];
  }
  if (trimmed.length < MIN_SEARCH_CHARS) {
    return [];
  }

  return items
    .map((item) => ({ item, rank: searchRank(item, trimmed) }))
    .filter((entry): entry is { item: KnowledgeListItemDto; rank: number } => entry.rank !== null)
    .sort((a, b) => {
      if (b.rank !== a.rank) {
        return b.rank - a.rank;
      }
      return a.title.localeCompare(b.title);
    })
    .map((entry) => entry.item);
}

export { MIN_SEARCH_CHARS as KNOWLEDGE_SEARCH_MIN_CHARS };
