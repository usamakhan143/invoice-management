import type { PlaybookEntryListItemDto } from "./dto/PlaybookDto";

const MIN_SEARCH_CHARS = 2;

function searchRank(item: PlaybookEntryListItemDto, query: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  if (q.length < MIN_SEARCH_CHARS) return null;

  const id = item.entryId.toLowerCase();
  const title = item.title.toLowerCase();
  const summary = item.summary.toLowerCase();
  const tags = item.tags.join(" ").toLowerCase();

  if (id === q) return 4;
  if (title.startsWith(q)) return 3;
  if (title.includes(q) || id.includes(q) || summary.includes(q) || tags.includes(q)) return 2;
  return null;
}

export function filterAndRankPlaybookEntries(
  items: readonly PlaybookEntryListItemDto[],
  search?: string,
): PlaybookEntryListItemDto[] {
  const trimmed = search?.trim() ?? "";
  if (!trimmed) return [...items];
  if (trimmed.length < MIN_SEARCH_CHARS) return [];

  return items
    .map((item) => ({ item, rank: searchRank(item, trimmed) }))
    .filter((entry): entry is { item: PlaybookEntryListItemDto; rank: number } => entry.rank !== null)
    .sort((a, b) => {
      if (b.rank !== a.rank) return b.rank - a.rank;
      return a.title.localeCompare(b.title);
    })
    .map((entry) => entry.item);
}

export { MIN_SEARCH_CHARS as PLAYBOOK_SEARCH_MIN_CHARS };
