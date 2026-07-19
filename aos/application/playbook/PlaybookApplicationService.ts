import type { AosReadScope } from "../types";
import type {
  ListPlaybookQuery,
  PlaybookEntryDetailDto,
  PlaybookListDto,
} from "./dto/PlaybookDto";
import { filterAndRankPlaybookEntries } from "./playbookSearch";
import { getPlaybookSeedCatalog, toPlaybookListItem } from "./playbookSeed";

/** Phase 1A playbook catalog — in-memory seed; no Firestore. */
export class PlaybookApplicationService {
  private catalog(_scope: AosReadScope): readonly PlaybookEntryDetailDto[] {
    return getPlaybookSeedCatalog();
  }

  async listEntries(scope: AosReadScope, query: ListPlaybookQuery = {}): Promise<PlaybookListDto> {
    let items = this.catalog(scope).map(toPlaybookListItem);

    if (query.entryType) {
      items = items.filter((item) => item.entryType === query.entryType);
    }
    if (query.lifecyclePhase) {
      items = items.filter((item) => item.lifecyclePhase === query.lifecyclePhase);
    }
    if (query.agencyType) {
      items = items.filter((item) => item.agencyTypes.includes(query.agencyType!));
    }

    items = filterAndRankPlaybookEntries(items, query.search);

    return { items, totalCount: items.length };
  }

  async getEntry(scope: AosReadScope, entryId: string): Promise<PlaybookEntryDetailDto | null> {
    return this.catalog(scope).find((item) => item.entryId === entryId) ?? null;
  }
}
